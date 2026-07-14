const { EventEmitter } = require("events");
const { app, autoUpdater, BrowserWindow, shell } = require("electron");
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const { openExternalUrl } = require("./externalUrlService");
const { OFFICIAL_SITE_ORIGIN } = require("../shared/officialSite");
const { getReleaseInfo } = require("../shared/releaseConfig");

const UPDATE_REPOSITORY = process.env.ANXOS_UPDATE_REPOSITORY || "bungopam-byte/AnxOS-Control-Center-Releases";
const UPDATE_RELEASES_URL = `https://api.github.com/repos/${UPDATE_REPOSITORY}/releases/latest`;
const WEBSITE_CONFIG_URLS = [
  process.env.ANXOS_WEBSITE_CONFIG_URL,
  `${OFFICIAL_SITE_ORIGIN}/config.js`,
].filter(Boolean);
const UPDATE_MANIFEST_URLS = [
  process.env.ANXOS_UPDATE_MANIFEST_URL,
  process.env.ANXHUB_UPDATE_MANIFEST_URL,
  `https://github.com/${UPDATE_REPOSITORY}/releases/latest/download/update-manifest.json`,
].filter(Boolean);
const UPDATE_STATUS_CHANNEL = "updates:status";
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

function normalizeVersion(value) {
  return String(value || "")
    .trim()
    .replace(/^v/i, "")
    .split(/[+-]/)[0];
}

function compareVersions(left, right) {
  const leftParts = normalizeVersion(left).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = normalizeVersion(right).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    if ((leftParts[index] || 0) > (rightParts[index] || 0)) return 1;
    if ((leftParts[index] || 0) < (rightParts[index] || 0)) return -1;
  }
  return 0;
}

function normalizeBuild(value) {
  const build = Number.parseInt(value, 10);
  if (Number.isInteger(build) && build >= 0) return build;
  const parsed = String(value || "").match(/\bbuild[-_. ]?(\d+)\b/i)?.[1];
  if (parsed) return normalizeBuild(parsed);
  return null;
}

function extractReleaseBuild(...values) {
  for (const value of values) {
    const build = normalizeBuild(value);
    if (build !== null) return build;
  }
  return null;
}

function compareReleaseBuilds(left, right) {
  const versionCompare = compareVersions(left?.version, right?.version);
  if (versionCompare !== 0) return versionCompare;
  return (normalizeBuild(left?.build) || 0) - (normalizeBuild(right?.build) || 0);
}

function formatReleaseLabel(version, build, channel = "") {
  const parts = [];
  if (version) parts.push(`Version ${version}`);
  if (normalizeBuild(build) !== null) parts.push(`Build ${normalizeBuild(build)}`);
  if (channel) parts.push(channel);
  return parts.join(" ");
}

function sanitizeFileName(value) {
  return String(value || "AnxOS-Control-Center-update.exe").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
}

function getRequestModule(url) {
  return String(url || "").startsWith("http://") ? http : https;
}

function resolveRedirectUrl(location, currentUrl) {
  try {
    return new URL(location, currentUrl).toString();
  } catch {
    return location;
  }
}

function isGitHubDownloadUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "github.com" || parsed.hostname.endsWith(".githubusercontent.com");
  } catch {
    return false;
  }
}

function isBlockedDownloadStatus(statusCode) {
  return statusCode === 401 || statusCode === 403 || statusCode === 404;
}

function normalizeManifestAsset(asset) {
  const downloadUrl = asset?.browser_download_url || asset?.downloadUrl || asset?.url;
  if (!downloadUrl) return null;
  return {
    name: asset.name || path.basename(new URL(downloadUrl).pathname) || "AnxOS-Control-Center-update",
    size: Number(asset.size || 0),
    browser_download_url: downloadUrl,
  };
}

function normalizeManifestRelease(manifest, sourceUrl) {
  const rawAssets = Array.isArray(manifest?.assets) ? manifest.assets : [];
  const latestVersion = normalizeVersion(manifest?.version || manifest?.tag_name || manifest?.name);
  const build = extractReleaseBuild(manifest?.build, manifest?.buildNumber, manifest?.tag_name, manifest?.name);
  const channel = manifest?.channel || "";
  const releaseLabel = manifest?.releaseLabel || formatReleaseLabel(latestVersion, build, channel);
  return {
    tag_name: latestVersion ? `v${latestVersion}` : null,
    name: manifest?.name || releaseLabel || (latestVersion ? `v${latestVersion}` : "AnxOS update"),
    version: latestVersion || null,
    build,
    channel,
    releaseLabel,
    body: manifest?.body || manifest?.notes || manifest?.releaseNotes || "",
    html_url: manifest?.html_url || manifest?.releaseUrl || sourceUrl,
    published_at: manifest?.published_at || manifest?.publishedAt || null,
    assets: rawAssets.map(normalizeManifestAsset).filter(Boolean),
  };
}

function extractConfigString(configText, key) {
  const pattern = new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`);
  return configText.match(pattern)?.[1] || "";
}

function parseWebsiteConfigRelease(configText, sourceUrl) {
  const latestVersion = normalizeVersion(extractConfigString(configText, "latestVersion") || extractConfigString(configText, "releaseTag"));
  if (!latestVersion) return null;

  const releaseUrl = extractConfigString(configText, "releaseUrl") || `${sourceUrl.replace(/\/[^/]*$/, "")}/release-notes.html`;
  const releaseDate = extractConfigString(configText, "releaseDate") || null;
  const build = normalizeBuild(extractConfigString(configText, "build") || extractConfigString(configText, "buildNumber"));
  const channel = extractConfigString(configText, "channel");
  const releaseLabel = extractConfigString(configText, "releaseLabel") || formatReleaseLabel(latestVersion, build, channel);
  const assetMatches = [...String(configText || "").matchAll(/fileName\s*:\s*["']([^"']+)["'][\s\S]{0,300}?url\s*:\s*["']([^"']+)["']/g)];
  const assets = assetMatches.map((match) => ({
    name: match[1],
    size: 10 * 1024 * 1024,
    browser_download_url: match[2],
  }));

  return {
    tag_name: `v${latestVersion}`,
    name: releaseLabel || `v${latestVersion}`,
    version: latestVersion,
    build,
    channel,
    releaseLabel,
    body: "",
    html_url: releaseUrl,
    published_at: releaseDate,
    assets,
  };
}

function pickUpdateAsset(release) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const viableAssets = assets.filter((asset) => {
    const name = String(asset?.name || "").toLowerCase();
    const downloadUrl = String(asset?.browser_download_url || "");
    const size = Number(asset?.size || 0);
    return downloadUrl && size > 5 * 1024 * 1024 && (name.endsWith(".exe") || name.endsWith(".zip") || name.endsWith(".appimage") || name.endsWith(".deb"));
  });
  const platformMatchers = process.platform === "win32"
    ? [/setup.*\.exe$/i, /installer.*\.exe$/i, /control-center-setup.*\.exe$/i, /portable.*\.exe$/i, /win.*\.exe$/i, /\.exe$/i]
    : process.platform === "linux"
      ? [/\.deb$/i, /\.appimage$/i]
      : [/\.dmg$/i, /\.zip$/i];
  for (const matcher of platformMatchers) {
    const match = viableAssets.find((asset) => matcher.test(asset.name || ""));
    if (match) return match;
  }
  return viableAssets[0] || null;
}

class UpdateManager extends EventEmitter {
  constructor() {
    super();
    this.state = {
      status: "idle",
      latest: null,
      downloadedPath: null,
      downloadInFlight: false,
      checkInFlight: false,
      lastCheckedAt: null,
      error: null,
      progress: null,
    };
    this.logs = [];
    this.skippedVersions = new Set();
    this.notifiedVersions = new Set();
    this.interval = null;
    this.storePath = "";
  }

  initialize() {
    this.storePath = path.join(app.getPath("userData"), "config", "updates.json");
    this.loadStore();
    this.bindAutoUpdaterEvents();
    this.log("UpdateManager initialized.", { autoUpdaterAvailable: Boolean(autoUpdater) });
  }

  bindAutoUpdaterEvents() {
    if (!autoUpdater) return;
    autoUpdater.on("checking-for-update", () => this.log("autoUpdater checking-for-update."));
    autoUpdater.on("update-available", (info) => this.log("autoUpdater update-available.", info));
    autoUpdater.on("update-not-available", (info) => this.log("autoUpdater update-not-available.", info));
    autoUpdater.on("update-downloaded", (event, releaseNotes, releaseName) => this.log("autoUpdater update-downloaded.", { releaseName, releaseNotes: Boolean(releaseNotes) }));
    autoUpdater.on("error", (error) => this.log("autoUpdater error.", { message: error?.message || String(error) }, "error"));
  }

  start() {
    this.check({ silent: true, source: "startup" }).catch(() => {});
    this.interval = setInterval(() => {
      this.check({ silent: true, source: "periodic" }).catch(() => {});
    }, UPDATE_CHECK_INTERVAL_MS);
    this.interval.unref?.();
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  loadStore() {
    try {
      const store = JSON.parse(fs.readFileSync(this.storePath, "utf8"));
      this.skippedVersions = new Set(Array.isArray(store.skippedVersions) ? store.skippedVersions.map(normalizeVersion).filter(Boolean) : []);
    } catch {
      this.skippedVersions = new Set();
    }
  }

  saveStore() {
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
    fs.writeFileSync(this.storePath, `${JSON.stringify({ skippedVersions: [...this.skippedVersions] }, null, 2)}\n`);
  }

  log(message, details = {}, level = "info") {
    const entry = { at: new Date().toISOString(), level, message, details };
    this.logs.push(entry);
    this.logs = this.logs.slice(-250);
    const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
    logger("[Updates]", message, details);
  }

  emitStatus(type, payload = {}) {
    const message = { type, state: this.getState(), ...payload };
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) window.webContents.send(UPDATE_STATUS_CHANNEL, message);
    });
    this.emit("status", message);
  }

  getState() {
    return {
      ...this.state,
      skippedVersions: [...this.skippedVersions],
      logs: this.logs,
    };
  }

  requestText(url, headers = {}) {
    return new Promise((resolve, reject) => {
      const request = getRequestModule(url).get(url, {
        headers: {
          ...headers,
          "User-Agent": `AnxOS-Control-Center/${app.getVersion()}`,
        },
      }, (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
          response.resume();
          this.requestText(resolveRedirectUrl(response.headers.location, url), headers).then(resolve, reject);
          return;
        }
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            const error = new Error(`Update metadata request failed with HTTP ${response.statusCode}: ${body.slice(0, 240)}`);
            error.statusCode = response.statusCode;
            reject(error);
            return;
          }
          resolve(body);
        });
      });
      request.setTimeout(15000, () => request.destroy(new Error("Update metadata request timed out.")));
      request.on("error", reject);
    });
  }

  async requestJson(url) {
    const body = await this.requestText(url, { "Accept": "application/vnd.github+json" });
    try {
      return JSON.parse(body);
    } catch (error) {
      throw new Error(`Update metadata response was not valid JSON: ${error.message}`);
    }
  }

  resolveUpdateResult(release, sourceUrl) {
    const currentRelease = getReleaseInfo();
    const latestVersion = normalizeVersion(release?.version || release?.tag_name || release?.name);
    const latestBuild = extractReleaseBuild(release?.build, release?.buildNumber, release?.tag_name, release?.name);
    const currentVersion = currentRelease.version;
    const currentBuild = currentRelease.build;
    const asset = pickUpdateAsset(release);
    const releaseKey = latestBuild === null ? latestVersion : `${latestVersion}-build${latestBuild}`;
    const skipped = releaseKey ? this.skippedVersions.has(releaseKey) : false;
    const hasUpdate = Boolean(latestVersion && compareReleaseBuilds({ version: latestVersion, build: latestBuild }, { version: currentVersion, build: currentBuild }) > 0 && asset);
    const latestLabel = release?.releaseLabel || formatReleaseLabel(latestVersion, latestBuild, release?.channel || "");
    const currentLabel = currentRelease.compactLabel;
    return {
      hasUpdate,
      skipped,
      currentVersion: currentLabel,
      currentReleaseVersion: currentVersion,
      currentBuild,
      latestVersion: latestLabel || latestVersion || null,
      latestReleaseVersion: latestVersion || null,
      latestBuild,
      channel: release?.channel || null,
      releaseKey,
      releaseName: release?.name || release?.tag_name || null,
      releaseDate: release?.published_at || null,
      releaseNotes: release?.body || "",
      releaseUrl: release?.html_url || sourceUrl || `https://github.com/${UPDATE_REPOSITORY}/releases`,
      publishedAt: release?.published_at || null,
      sourceUrl,
      asset: asset ? { name: asset.name, size: asset.size, downloadUrl: asset.browser_download_url } : null,
    };
  }

  async check(options = {}) {
    if (this.state.checkInFlight) {
      this.log("Update check already running.", { source: options.source || "manual" }, "warn");
      return this.getState();
    }
    this.state.checkInFlight = true;
    this.state.status = "checking";
    this.state.error = null;
    this.log("Checking for updates.", { source: options.source || "manual", silent: Boolean(options.silent) });
    this.emitStatus("checking");
    const checkedSources = [];
    try {
      let release = null;
      let sourceUrl = "";
      try {
        checkedSources.push(UPDATE_RELEASES_URL);
        release = await this.requestJson(UPDATE_RELEASES_URL);
        sourceUrl = UPDATE_RELEASES_URL;
      } catch (error) {
        this.log("GitHub release check failed.", { message: error?.message || String(error), url: UPDATE_RELEASES_URL }, error?.statusCode === 404 ? "warn" : "error");
      }
      if (!release) {
        for (const websiteConfigUrl of WEBSITE_CONFIG_URLS) {
          try {
            checkedSources.push(websiteConfigUrl);
            release = parseWebsiteConfigRelease(await this.requestText(websiteConfigUrl), websiteConfigUrl);
            if (release) {
              sourceUrl = websiteConfigUrl;
              break;
            }
          } catch (error) {
            this.log("Website update config check failed.", { message: error?.message || String(error), url: websiteConfigUrl }, "warn");
          }
        }
      }
      if (!release) {
        for (const manifestUrl of UPDATE_MANIFEST_URLS) {
          try {
            checkedSources.push(manifestUrl);
            release = normalizeManifestRelease(await this.requestJson(manifestUrl), manifestUrl);
            sourceUrl = manifestUrl;
            break;
          } catch (error) {
            this.log("Update manifest check failed.", { message: error?.message || String(error), url: manifestUrl }, "warn");
          }
        }
      }
      if (!release) {
        this.state.status = "unavailable";
        this.state.latest = { hasUpdate: false, releaseUnavailable: true, message: "No update release is published yet.", checkedSources };
        this.state.lastCheckedAt = new Date().toISOString();
        this.state.checkInFlight = false;
        this.log("No update release is published yet.", { checkedSources }, "warn");
        this.emitStatus("unavailable", { update: this.state.latest });
        return this.state.latest;
      }
      const result = this.resolveUpdateResult(release, sourceUrl);
      this.state.latest = result;
      this.state.lastCheckedAt = new Date().toISOString();
      if (result.hasUpdate) {
        this.state.status = result.skipped ? "skipped" : "available";
        this.log("Update available.", { latestVersion: result.latestVersion, skipped: result.skipped, asset: result.asset?.name || null });
        const shouldNotify = !result.skipped && (!this.notifiedVersions.has(result.latestVersion) || options.forceNotify);
        if (shouldNotify) this.notifiedVersions.add(result.latestVersion);
        this.state.checkInFlight = false;
        this.emitStatus("available", { update: result, notify: shouldNotify });
      } else {
        this.state.status = "up-to-date";
        this.state.checkInFlight = false;
        this.log("No updates available.", { currentVersion: result.currentVersion, latestVersion: result.latestVersion });
        this.emitStatus("not-available", { update: result });
      }
      return result;
    } catch (error) {
      this.state.status = "error";
      this.state.checkInFlight = false;
      this.state.error = error?.message || "Update check failed.";
      this.log("Update check failed.", { message: this.state.error, stack: error?.stack || null }, "error");
      this.emitStatus("error", { message: this.state.error });
      return { hasUpdate: false, error: this.state.error };
    } finally {
      this.state.checkInFlight = false;
    }
  }

  downloadFile(url, destinationPath, onProgress, redirectCount = 0) {
    return new Promise((resolve, reject) => {
      if (redirectCount > 5) {
        reject(new Error("Too many redirects while downloading update."));
        return;
      }
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      const cleanupPartial = (callback) => fs.rm(destinationPath, { force: true }, () => callback?.());
      const request = getRequestModule(url).get(url, {
        headers: {
          "Accept": "application/octet-stream",
          "User-Agent": `AnxOS-Control-Center/${app.getVersion()}`,
        },
      }, (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
          response.resume();
          this.downloadFile(resolveRedirectUrl(response.headers.location, url), destinationPath, onProgress, redirectCount + 1).then(resolve, reject);
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          let body = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            if (body.length < 512) body += chunk;
          });
          response.on("end", () => {
            const suffix = isBlockedDownloadStatus(response.statusCode) && isGitHubDownloadUrl(url)
              ? " The release asset is not publicly downloadable by the desktop app. Open the release in your browser, or publish/mirror the release assets to public storage."
              : "";
            cleanupPartial(() => reject(new Error(`Update download failed with HTTP ${response.statusCode}.${suffix}${body ? ` ${body.slice(0, 160)}` : ""}`)));
          });
          return;
        }
        const totalBytes = Number.parseInt(response.headers["content-length"], 10) || 0;
        let receivedBytes = 0;
        const fileStream = fs.createWriteStream(destinationPath, { mode: 0o600 });
        response.on("data", (chunk) => {
          receivedBytes += chunk.length;
          onProgress?.({ receivedBytes, totalBytes, percent: totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : null });
        });
        response.on("error", (error) => cleanupPartial(() => reject(error)));
        response.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close(() => {
            if (totalBytes > 0 && receivedBytes !== totalBytes) {
              cleanupPartial(() => reject(new Error(`Update download was incomplete (${receivedBytes} of ${totalBytes} bytes).`)));
              return;
            }
            resolve(destinationPath);
          });
        });
        fileStream.on("error", (error) => cleanupPartial(() => reject(error)));
      });
      request.setTimeout(120000, () => request.destroy(new Error("Update download timed out.")));
      request.on("error", (error) => cleanupPartial(() => reject(error)));
    });
  }

  async download() {
    if (this.state.downloadInFlight) {
      this.log("Download request ignored; update is already downloading.", {}, "warn");
      return { downloading: true, state: this.getState() };
    }
    const update = this.state.latest?.hasUpdate ? this.state.latest : await this.check({ silent: false, source: "download" });
    if (!update?.hasUpdate || !update.asset?.downloadUrl) {
      return { downloaded: false, message: "No update is available.", state: this.getState() };
    }
    this.state.downloadInFlight = true;
    this.state.downloadedPath = null;
    this.state.status = "downloading";
    this.state.progress = { receivedBytes: 0, totalBytes: update.asset.size || 0, percent: 0 };
    const destinationPath = path.join(app.getPath("downloads"), sanitizeFileName(update.asset.name));
    this.log("Download started.", { asset: update.asset.name, destinationPath });
    this.emitStatus("download-started", { update, path: destinationPath });
    try {
      const downloadedPath = await this.downloadFile(update.asset.downloadUrl, destinationPath, (progress) => {
        this.state.progress = progress;
        this.log("Download progress.", progress);
        this.emitStatus("download-progress", { progress });
      });
      this.state.downloadedPath = downloadedPath;
      this.state.status = "downloaded";
      this.state.progress = { ...this.state.progress, percent: 100 };
      this.log("Download completed.", { path: downloadedPath });
      this.emitStatus("downloaded", { update, path: downloadedPath });
      return { downloaded: true, path: downloadedPath, update, state: this.getState() };
    } catch (error) {
      this.state.status = "error";
      this.state.error = error?.message || "Update download failed.";
      this.log("Download failed.", { message: this.state.error, stack: error?.stack || null }, "error");
      this.emitStatus("download-error", { message: this.state.error });
      return { downloaded: false, error: this.state.error, state: this.getState() };
    } finally {
      this.state.downloadInFlight = false;
    }
  }

  async install() {
    if (!this.state.downloadedPath) return { installed: false, message: "No downloaded update is ready." };
    this.log("Install requested.", { path: this.state.downloadedPath });
    await shell.openPath(this.state.downloadedPath);
    this.log("Install handoff completed.", { path: this.state.downloadedPath });
    return { installed: true };
  }

  async openRelease() {
    const releaseUrl = this.state.latest?.releaseUrl || `https://github.com/${UPDATE_REPOSITORY}/releases/latest`;
    await openExternalUrl(releaseUrl, { source: "updates-release" });
    return { opened: true };
  }

  async openDownload() {
    const downloadUrl = this.state.latest?.asset?.downloadUrl || this.state.latest?.releaseUrl || `https://github.com/${UPDATE_REPOSITORY}/releases/latest`;
    await openExternalUrl(downloadUrl, { source: "updates-download" });
    return { opened: true };
  }

  skip(version) {
    const target = this.state.latest?.releaseKey || normalizeVersion(version || this.state.latest?.latestReleaseVersion || this.state.latest?.latestVersion);
    if (target) {
      this.skippedVersions.add(target);
      this.saveStore();
      this.state.status = "skipped";
      if (this.state.latest && (this.state.latest.releaseKey === target || normalizeVersion(this.state.latest.latestVersion) === target)) {
        this.state.latest = { ...this.state.latest, skipped: true };
      }
      this.log("Skipped update version.", { version: target });
      this.emitStatus("skipped", { version: target });
    }
    return this.getState();
  }
}

module.exports = {
  UPDATE_STATUS_CHANNEL,
  UpdateManager,
  compareVersions,
  compareReleaseBuilds,
  extractReleaseBuild,
  formatReleaseLabel,
  normalizeVersion,
  parseWebsiteConfigRelease,
  resolveRedirectUrl,
};
