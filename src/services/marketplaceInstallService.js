const { EventEmitter } = require("events");
const path = require("path");
const unzipper = require("unzipper");
const agentClient = require("./agentClient");
const { getNodeAgentConfig } = require("./nodeService");
const modrinthProvider = require("./providers/modrinthProvider");
const curseforgeProvider = require("./providers/curseforgeProvider");

const INSTALL_FOLDERS = ["mods", "config", "defaultconfigs", "kubejs", "kubejs/scripts", "world", "logs", "backups"];
const PAPER_DOWNLOADS_API = "https://fill.papermc.io/v3";
const FORGE_PROMOTIONS_URL = "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json";
const FORGE_MAVEN_METADATA_URL = "https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml";
const NEOFORGE_MAVEN_METADATA_URL = "https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml";
const marketplaceInstallEvents = new EventEmitter();

class MarketplaceInstallError extends Error {
  constructor(message, code = "MARKETPLACE_INSTALL_FAILED", details = {}) {
    super(message);
    this.name = "MarketplaceInstallError";
    this.code = code;
    this.details = details;
  }
}

function serializeError(error, context = {}) {
  const details = error?.details && typeof error.details === "object" ? error.details : {};
  return {
    ...context,
    name: error?.name || null,
    code: error?.code || null,
    message: error?.message || null,
    stack: error?.stack || null,
    status: details.status || error?.status || error?.statusCode || null,
    responseBody: details.body || details.responseBody || null,
    url: details.url || context.url || null,
    invalidUrl: details.invalidUrl || null,
    details,
  };
}

function truncateForLog(value, maxLength = 4000) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function logMarketplaceInstallFailure(error, context = {}) {
  console.error("[Marketplace][Install] Install failed.", serializeError(error, context));
}

function logMarketplaceInstallStep(message, context = {}) {
  console.info("[Marketplace][Install]", {
    message,
    ...context,
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientStatus(status) {
  return [408, 409, 425, 429, 500, 502, 503, 504].includes(Number(status));
}

function isTransientError(error) {
  const status = error?.details?.status || error?.status || error?.statusCode;
  const code = error?.code || error?.payload?.error?.code || "";
  const name = error?.name || error?.payload?.error?.details?.name || "";
  return isTransientStatus(status) ||
    ["NETWORK_FAILED", "AGENT_TIMEOUT", "AGENT_UNAVAILABLE", "UND_ERR_CONNECT_TIMEOUT", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"].includes(code) ||
    ["AbortError", "TimeoutError"].includes(name);
}

async function withRetry(operation, context = {}) {
  const attempts = Math.max(1, Number(context.attempts) || 3);
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientError(error)) {
        throw error;
      }
      const waitMs = Number(context.delayMs) || 500;
      logMarketplaceInstallStep("Retrying transient Marketplace operation.", {
        label: context.label || null,
        attempt,
        nextAttempt: attempt + 1,
        code: error?.code || null,
        status: error?.details?.status || error?.status || null,
        url: error?.details?.url || context.url || null,
        message: error?.message || null,
      });
      await delay(waitMs * attempt);
    }
  }

  throw lastError;
}

function friendlyHttpMessage(label, status, body = "") {
  const detail = (() => {
    try {
      const parsed = JSON.parse(body);
      return parsed.error || parsed.message || parsed.description || "";
    } catch {
      return String(body || "").trim().slice(0, 240);
    }
  })();
  if (status === 401) return `${label}: 401 Invalid API key.`;
  if (status === 403) return `${label}: 403 Forbidden.`;
  if (status === 404) return `${label}: 404 Project not found.`;
  if (status === 429) return `${label}: 429 Rate limited. Try again later.`;
  return `${label}: HTTP ${status}${detail ? ` - ${detail}` : ""}`;
}

function friendlyError(error) {
  if (error?.code === "CURSEFORGE_API_KEY_REQUIRED") {
    return "CurseForge API key is required to install CurseForge packs.";
  }
  return error?.message || "Marketplace install failed.";
}

function buildDetailedErrorMessage(error, fallback = "Marketplace install failed.") {
  const details = error?.details && typeof error.details === "object" ? error.details : {};
  const parts = [];
  const code = error?.code || details.code;
  const message = error?.message && error.message !== "URL" ? error.message : "";
  parts.push(message || fallback);
  if (code) parts.push(`code=${code}`);
  if (details.status || error?.status || error?.statusCode) parts.push(`status=${details.status || error.status || error.statusCode}`);
  if (details.provider) parts.push(`provider=${details.provider}`);
  if (details.fileName) parts.push(`file=${details.fileName}`);
  if (details.url) parts.push(`url=${details.url}`);
  if (details.invalidUrl) parts.push(`invalidUrl=${details.invalidUrl}`);
  if (details.body || details.responseBody) parts.push(`body=${truncateForLog(details.body || details.responseBody, 1000)}`);
  if (details.recovery) parts.push(`recovery=${details.recovery}`);
  if (details.suggestion) parts.push(`suggestion=${details.suggestion}`);
  if (error?.name && error.name !== "Error") parts.push(`error=${error.name}`);
  if (error?.message === "URL" && !details.invalidUrl && !details.url) {
    parts.push("hint=A URL constructor failed, but the invalid value was not attached by the throwing code.");
  }
  return parts.join(" | ");
}

function emitProgress(payload = {}) {
  const total = Number(payload.total) || 0;
  const current = Number(payload.current) || 0;
  const percent = Number.isFinite(Number(payload.percent))
    ? Number(payload.percent)
    : total > 0 ? Math.round((current / total) * 100) : 0;
  const event = {
    instanceId: payload.instanceId || "",
    stage: payload.stage || "resolving",
    message: payload.message || "",
    current,
    total,
    percent: Math.max(0, Math.min(percent, 100)),
  };
  marketplaceInstallEvents.emit("progress", event);
  return event;
}

function slugify(value, fallback = "minecraft-server") {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || fallback;
}

function displayName(value, fallback = "Minecraft Server") {
  return String(value || "").trim().slice(0, 96) || fallback;
}

function normalizeMemory(value, fallback = "4G") {
  const text = String(value || "").trim().toUpperCase();
  return /^\d+\s*(M|G|MB|GB)$/.test(text) ? text.replace(/\s+/g, "") : fallback;
}

function normalizeLoader(loader) {
  return String(loader || "").trim().toLowerCase() || "vanilla";
}

function resolvePort(value) {
  const port = Number.parseInt(value, 10);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : 25565;
}

function validateDownloadUrl(url) {
  const rawUrl = String(url || "").trim();
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (error) {
    throw new MarketplaceInstallError("Invalid download URL.", "INVALID_DOWNLOAD_URL", {
      invalidUrl: rawUrl || String(url),
      message: error?.message || "Invalid URL",
      stack: error?.stack || null,
    });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new MarketplaceInstallError("Download URL is not allowed.", "DOWNLOAD_URL_UNSAFE", { url: rawUrl });
  }
  return parsed;
}

function getUrlPathBasename(url, fallback = "download") {
  try {
    return path.basename(validateDownloadUrl(url).pathname) || fallback;
  } catch (error) {
    logMarketplaceInstallFailure(error, { label: "derive download file name", url });
    throw error;
  }
}

async function fetchJson(url, label) {
  try {
    return await withRetry(async () => {
      const response = await fetch(validateDownloadUrl(url));
      const body = await response.text();
      if (!response.ok) {
        throw new MarketplaceInstallError(friendlyHttpMessage(label, response.status, body), "DOWNLOAD_RESOLVE_FAILED", {
          status: response.status,
          body: truncateForLog(body),
          url,
        });
      }
      try {
        return JSON.parse(body);
      } catch (error) {
        throw new MarketplaceInstallError(`${label} returned invalid JSON.`, "DOWNLOAD_RESOLVE_FAILED", {
          message: error.message,
          body: truncateForLog(body),
          url,
        });
      }
    }, { label, url });
  } catch (error) {
    const effectiveError = error instanceof MarketplaceInstallError
      ? error
      : new MarketplaceInstallError(`${label}: Network timeout or connection failure - ${error?.message || "request failed"}`, "NETWORK_FAILED", {
        url,
        message: error?.message || "request failed",
        stack: error?.stack || null,
      });
    logMarketplaceInstallFailure(effectiveError, { label, url });
    throw effectiveError;
  }
}

async function fetchBuffer(url, label) {
  try {
    return await withRetry(async () => {
      const response = await fetch(validateDownloadUrl(url));
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new MarketplaceInstallError(friendlyHttpMessage(label, response.status, body), "DOWNLOAD_FAILED", {
          status: response.status,
          body: truncateForLog(body),
          url,
        });
      }
      return Buffer.from(await response.arrayBuffer());
    }, { label, url });
  } catch (error) {
    const effectiveError = error instanceof MarketplaceInstallError
      ? error
      : new MarketplaceInstallError(`${label}: Network timeout or connection failure - ${error?.message || "request failed"}`, "NETWORK_FAILED", {
        url,
        message: error?.message || "request failed",
        stack: error?.stack || null,
      });
    logMarketplaceInstallFailure(effectiveError, { label, url });
    throw effectiveError;
  }
}

async function fetchText(url, label) {
  try {
    return await withRetry(async () => {
      const response = await fetch(validateDownloadUrl(url));
      const body = await response.text();
      if (!response.ok) {
        throw new MarketplaceInstallError(friendlyHttpMessage(label, response.status, body), "DOWNLOAD_RESOLVE_FAILED", {
          status: response.status,
          body: truncateForLog(body),
          url,
        });
      }
      return body;
    }, { label, url });
  } catch (error) {
    const effectiveError = error instanceof MarketplaceInstallError
      ? error
      : new MarketplaceInstallError(`${label}: Network timeout or connection failure - ${error?.message || "request failed"}`, "NETWORK_FAILED", {
        url,
        message: error?.message || "request failed",
        stack: error?.stack || null,
      });
    logMarketplaceInstallFailure(effectiveError, { label, url });
    throw effectiveError;
  }
}

function ensureProviderProjectId(projectId, provider) {
  if (!projectId) {
    throw new MarketplaceInstallError(`${provider} install failed: Invalid provider metadata. Missing providerProjectId.`, "INVALID_PROVIDER_METADATA");
  }
}

function ensureServerFiles(files, provider) {
  if (!files.length) {
    throw new MarketplaceInstallError(`${provider} modpack has no server files for the selected Minecraft version/loader.`, "MISSING_SERVER_FILES");
  }
}

function ensureSupportedModpack(condition, provider, reason = "Unsupported modpack") {
  if (!condition) {
    throw new MarketplaceInstallError(`${provider} install failed: ${reason}.`, "UNSUPPORTED_MODPACK");
  }
}

function isRecoverableProviderFileError(error) {
  return [
    "CURSEFORGE_DOWNLOAD_URL_MISSING",
    "CURSEFORGE_INVALID_DOWNLOAD_URL",
    "CURSEFORGE_UNSAFE_URL",
    "CURSEFORGE_DOWNLOAD_FAILED",
    "MODRINTH_INVALID_DOWNLOAD_URL",
    "MODRINTH_UNSAFE_URL",
    "MODRINTH_DOWNLOAD_FAILED",
  ].includes(error?.code);
}

function extractXmlTag(xml, tagName) {
  const match = String(xml || "").match(new RegExp(`<${tagName}>([^<]+)</${tagName}>`));
  return match ? match[1].trim() : "";
}

function extractXmlTags(xml, tagName) {
  return [...String(xml || "").matchAll(new RegExp(`<${tagName}>([^<]+)</${tagName}>`, "g"))].map((match) => match[1].trim());
}

function inferNeoForgeMinecraftVersion(version) {
  const text = String(version || "");
  const literal = text.match(/\b1\.\d+(?:\.\d+)?\b/)?.[0];
  if (literal) {
    return literal;
  }
  const modern = text.match(/^(\d{2})\.(\d+)\./);
  return modern ? `1.${Number.parseInt(modern[1], 10)}.${Number.parseInt(modern[2], 10)}` : "";
}

function safeArchivePath(entryPath) {
  const normalized = String(entryPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const clean = path.posix.normalize(normalized);
  if (!clean || clean === "." || clean.startsWith("../") || clean === ".." || path.posix.isAbsolute(clean)) {
    throw new MarketplaceInstallError(`Archive contains an unsafe path: ${entryPath}`, "ARCHIVE_PATH_UNSAFE", { entryPath });
  }
  return clean;
}

function stripArchiveRoot(entryPath) {
  const safe = safeArchivePath(entryPath);
  if (safe.startsWith("overrides/")) return safe.slice("overrides/".length);
  if (safe.startsWith("server-overrides/")) return safe.slice("server-overrides/".length);
  return safe;
}

async function extractZipBuffer(buffer, onFile) {
  logMarketplaceInstallStep("Opening zip archive.", { bytes: Buffer.byteLength(buffer || Buffer.alloc(0)) });
  const directory = await unzipper.Open.buffer(Buffer.from(buffer));
  for (const entry of directory.files) {
    if (entry.type === "Directory") {
      continue;
    }
    const safePath = safeArchivePath(entry.path);
    logMarketplaceInstallStep("Extracting archive entry.", { path: safePath, compressedSize: entry.compressedSize || null, uncompressedSize: entry.uncompressedSize || null });
    const content = await entry.buffer();
    await onFile(safePath, content);
  }
}

function createDeduper() {
  const seen = new Set();
  return {
    has(key) {
      return seen.has(String(key || ""));
    },
    add(key) {
      const value = String(key || "");
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    },
    size() {
      return seen.size;
    },
  };
}

async function writeText(instanceId, filePath, content, agentConfig) {
  logMarketplaceInstallStep("Writing text file.", { instanceId, filePath, bytes: Buffer.byteLength(String(content || ""), "utf8") });
  return withRetry(
    () => agentClient.writeInstanceFile(instanceId, filePath, content, { config: agentConfig }),
    { label: "agent write text", attempts: 3 }
  );
}

async function writeBuffer(instanceId, filePath, buffer, agentConfig) {
  logMarketplaceInstallStep("Writing binary file.", { instanceId, filePath, bytes: Buffer.byteLength(buffer || Buffer.alloc(0)) });
  return withRetry(
    () => agentClient.writeInstanceFile(instanceId, filePath, Buffer.from(buffer).toString("base64"), {
      encoding: "base64",
      config: agentConfig,
    }),
    { label: "agent write binary", attempts: 3 }
  );
}

async function writeIfMissing(instanceId, filePath, buffer, agentConfig) {
  const exists = await withRetry(
    () => agentClient.instanceFileExists(instanceId, filePath, agentConfig),
    { label: "agent file exists", attempts: 3 }
  );
  if (exists?.exists) {
    logMarketplaceInstallStep("Skipping existing file.", { instanceId, filePath });
    return false;
  }
  await writeBuffer(instanceId, filePath, buffer, agentConfig);
  return true;
}

async function validateInstalledServerJar(instanceId, serverInfo, agentConfig) {
  const serverJar = String(serverInfo?.serverJar || "").trim();
  if (!serverJar) {
    throw new MarketplaceInstallError("Marketplace install did not configure a server jar.", "SERVER_JAR_NOT_CONFIGURED", {
      instanceId,
      suggestion: "Install failed before launch metadata could be written.",
    });
  }
  const exists = await withRetry(
    () => agentClient.instanceFileExists(instanceId, serverJar, agentConfig),
    { label: "validate installed server jar", attempts: 3 }
  );
  if (!exists?.exists) {
    throw new MarketplaceInstallError(`Marketplace install did not create the configured server jar: ${serverJar}.`, "SERVER_JAR_MISSING", {
      instanceId,
      fileName: serverJar,
      recovery: "install-failed-before-success",
      suggestion: "Retry the Marketplace install; the server runtime download or loader installer did not produce the expected jar.",
    });
  }
  return {
    serverJar,
    exists,
  };
}

async function resolveVanillaServerJar(minecraftVersion) {
  const manifest = await fetchJson("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json", "Mojang version manifest");
  const versionId = minecraftVersion && minecraftVersion !== "latest"
    ? minecraftVersion
    : manifest.latest?.release;
  const version = (manifest.versions || []).find((entry) => entry.id === versionId);
  if (!version?.url) {
    throw new MarketplaceInstallError("No matching Minecraft server jar was found.", "MOJANG_VERSION_NOT_FOUND");
  }
  const metadata = await fetchJson(version.url, "Mojang version metadata");
  if (!metadata.downloads?.server?.url) {
    throw new MarketplaceInstallError("Selected Minecraft version has no server jar.", "MOJANG_SERVER_JAR_MISSING");
  }
  return { url: metadata.downloads.server.url, fileName: "server.jar", serverJar: "server.jar", minecraftVersion: versionId };
}

async function resolvePaperServerJar(minecraftVersion, project = "paper") {
  const projectMeta = await fetchJson(`${PAPER_DOWNLOADS_API}/projects/${encodeURIComponent(project)}`, "Paper Downloads project metadata");
  const versionGroups = projectMeta.versions && typeof projectMeta.versions === "object" && !Array.isArray(projectMeta.versions)
    ? Object.values(projectMeta.versions).flat()
    : projectMeta.versions || [];
  const versionId = minecraftVersion && minecraftVersion !== "latest"
    ? minecraftVersion
    : versionGroups[0];
  if (!versionId) {
    throw new MarketplaceInstallError("No Paper version was found.", "PAPER_VERSION_NOT_FOUND", {
      url: `${PAPER_DOWNLOADS_API}/projects/${encodeURIComponent(project)}`,
    });
  }
  const buildsPayload = await fetchJson(`${PAPER_DOWNLOADS_API}/projects/${encodeURIComponent(project)}/versions/${encodeURIComponent(versionId)}/builds`, "Paper Downloads builds");
  const builds = Array.isArray(buildsPayload) ? buildsPayload : buildsPayload.builds || [];
  const build = [...builds].reverse().find((entry) => entry?.downloads?.["server:default"]?.url) ||
    [...builds].reverse().find((entry) => entry?.downloads && Object.keys(entry.downloads).length > 0);
  const serverDownload = build?.downloads?.["server:default"] || build?.downloads?.server || Object.values(build?.downloads || {})[0];
  if (!build?.id || !serverDownload?.url || !serverDownload?.name) {
    throw new MarketplaceInstallError("No Paper server jar was found in the Paper Downloads API response.", "PAPER_VERSION_NOT_FOUND", {
      url: `${PAPER_DOWNLOADS_API}/projects/${encodeURIComponent(project)}/versions/${encodeURIComponent(versionId)}/builds`,
      body: truncateForLog(JSON.stringify(buildsPayload)),
    });
  }
  return {
    url: serverDownload.url,
    fileName: serverDownload.name,
    serverJar: "server.jar",
    minecraftVersion: versionId,
    loaderVersion: String(build.id),
  };
}

async function resolvePurpurServerJar(minecraftVersion) {
  const project = await fetchJson("https://api.purpurmc.org/v2/purpur", "Purpur project metadata");
  const versionId = minecraftVersion && minecraftVersion !== "latest"
    ? minecraftVersion
    : (project.versions || [])[project.versions.length - 1];
  const builds = await fetchJson(`https://api.purpurmc.org/v2/purpur/${encodeURIComponent(versionId)}`, "Purpur builds");
  const latest = builds.builds?.latest;
  if (!latest) {
    throw new MarketplaceInstallError("No Purpur server jar was found.", "PURPUR_VERSION_NOT_FOUND");
  }
  return {
    url: `https://api.purpurmc.org/v2/purpur/${encodeURIComponent(versionId)}/${encodeURIComponent(String(latest))}/download`,
    fileName: "purpur.jar",
    serverJar: "server.jar",
    minecraftVersion: versionId,
    loaderVersion: String(latest),
  };
}

async function resolveFabricServerJar(minecraftVersion, loaderVersion = "") {
  const loaders = await fetchJson("https://meta.fabricmc.net/v2/versions/loader", "Fabric loader metadata");
  const installers = await fetchJson("https://meta.fabricmc.net/v2/versions/installer", "Fabric installer metadata");
  const loader = loaderVersion && loaderVersion !== "latest"
    ? loaderVersion
    : loaders.find((entry) => entry.stable)?.version || loaders[0]?.version;
  const installer = installers.find((entry) => entry.stable)?.version || installers[0]?.version;
  if (!minecraftVersion || minecraftVersion === "latest") {
    throw new MarketplaceInstallError("Select a Minecraft version for Fabric installs.", "FABRIC_VERSION_REQUIRED");
  }
  return {
    url: `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(minecraftVersion)}/${encodeURIComponent(loader)}/${encodeURIComponent(installer)}/server/jar`,
    fileName: "fabric-server.jar",
    serverJar: "fabric-server.jar",
    minecraftVersion,
    loaderVersion: loader,
  };
}

async function resolveForgeInstaller(minecraftVersion) {
  const requestedVersion = minecraftVersion || "latest";
  let forgeVersion = "";
  if (String(requestedVersion).toLowerCase() !== "latest") {
    const promotions = await fetchJson(FORGE_PROMOTIONS_URL, "Forge promotions lookup");
    const promos = promotions?.promos || {};
    const forgeBuild = promos[`${requestedVersion}-recommended`] || promos[`${requestedVersion}-latest`];
    if (forgeBuild) {
      forgeVersion = `${requestedVersion}-${forgeBuild}`;
    }
  }
  if (!forgeVersion) {
    const metadata = await fetchText(FORGE_MAVEN_METADATA_URL, "Forge metadata lookup");
    const versions = extractXmlTags(metadata, "version");
    if (String(requestedVersion).toLowerCase() !== "latest") {
      forgeVersion = versions.filter((version) => String(version).startsWith(`${requestedVersion}-`)).at(-1) || "";
    }
    forgeVersion = forgeVersion || extractXmlTag(metadata, "release") || extractXmlTag(metadata, "latest");
  }
  if (!forgeVersion) {
    throw new MarketplaceInstallError("Unable to download Forge installer.", "FORGE_RESOLVE_FAILED");
  }
  return {
    url: `https://maven.minecraftforge.net/net/minecraftforge/forge/${encodeURIComponent(forgeVersion)}/forge-${encodeURIComponent(forgeVersion)}-installer.jar`,
    fileName: "forge-installer.jar",
    serverJar: "forge-installer.jar",
    minecraftVersion: forgeVersion.split("-")[0],
    loaderVersion: forgeVersion,
    installer: { jar: "forge-installer.jar", args: ["--installServer"], startup: { executable: "bash", args: ["run.sh", "nogui"] } },
  };
}

async function resolveNeoForgeInstaller(minecraftVersion) {
  const requestedVersion = minecraftVersion || "latest";
  const metadata = await fetchText(NEOFORGE_MAVEN_METADATA_URL, "NeoForge metadata lookup");
  const versions = extractXmlTags(metadata, "version");
  let neoForgeVersion = extractXmlTag(metadata, "release") || extractXmlTag(metadata, "latest");
  if (String(requestedVersion).toLowerCase() !== "latest") {
    neoForgeVersion = versions.filter((version) => inferNeoForgeMinecraftVersion(version) === String(requestedVersion)).at(-1) ||
      versions.filter((version) => version.startsWith(`${requestedVersion}.`)).at(-1) ||
      neoForgeVersion;
  }
  if (!neoForgeVersion) {
    throw new MarketplaceInstallError("Unable to download NeoForge installer.", "NEOFORGE_RESOLVE_FAILED");
  }
  return {
    url: `https://maven.neoforged.net/releases/net/neoforged/neoforge/${encodeURIComponent(neoForgeVersion)}/neoforge-${encodeURIComponent(neoForgeVersion)}-installer.jar`,
    fileName: "neoforge-installer.jar",
    serverJar: "neoforge-installer.jar",
    minecraftVersion: String(requestedVersion).toLowerCase() === "latest" ? inferNeoForgeMinecraftVersion(neoForgeVersion) || requestedVersion : requestedVersion,
    loaderVersion: neoForgeVersion,
    installer: { jar: "neoforge-installer.jar", args: ["--installServer"], startup: { executable: "bash", args: ["run.sh", "nogui"] } },
  };
}

async function resolveServerJar(options = {}) {
  const loader = normalizeLoader(options.loader || options.serverType);
  const minecraftVersion = options.minecraftVersion || options.version || "latest";
  if (loader === "paper") return resolvePaperServerJar(minecraftVersion, "paper");
  if (loader === "purpur") return resolvePurpurServerJar(minecraftVersion);
  if (loader === "fabric") return resolveFabricServerJar(minecraftVersion, options.loaderVersion);
  if (loader === "forge") return resolveForgeInstaller(minecraftVersion);
  if (loader === "neoforge") return resolveNeoForgeInstaller(minecraftVersion);
  return resolveVanillaServerJar(minecraftVersion);
}

function buildInstancePayload(options, serverInfo) {
  const name = displayName(options.instanceName || options.name || options.displayName);
  const id = slugify(options.instanceId || name);
  const memory = normalizeMemory(options.memory || options.ram || options.memoryLimit, "4G");
  const port = resolvePort(options.port || (Array.isArray(options.ports) ? options.ports[0] : 25565));
  return {
    id,
    displayName: name,
    type: "java-app",
    game: "minecraft",
    minecraftVersion: serverInfo.minecraftVersion || options.minecraftVersion || options.version || null,
    serverVersion: serverInfo.minecraftVersion || options.minecraftVersion || options.version || null,
    serverSoftware: options.loader || options.serverType || "Minecraft",
    loader: options.loader || options.serverType || "vanilla",
    loaderVersion: serverInfo.loaderVersion || options.loaderVersion || null,
    workingDirectory: "data",
    executable: "java",
    args: [`-Xmx${memory}`, "-jar", serverInfo.serverJar || "server.jar", "nogui"],
    jar: serverInfo.serverJar || "server.jar",
    serverJar: serverInfo.serverJar || "server.jar",
    serverJarPath: serverInfo.serverJar || "server.jar",
    startJar: serverInfo.serverJar || "server.jar",
    restartPolicy: "on-failure",
    startupTimeoutMs: 60000,
    shutdownTimeoutMs: 15000,
    memoryLimit: memory,
    ports: [port],
    primaryPort: port,
    status: "stopped",
    tags: ["minecraft", options.provider || "marketplace", options.loader || options.serverType || "vanilla"].filter(Boolean),
  };
}

async function waitForInstaller(instanceId, timeoutMs, agentConfig) {
  const startedAt = Date.now();
  let lastState = "";
  while (Date.now() - startedAt < timeoutMs) {
    const status = await agentClient.getInstanceStatus(instanceId, agentConfig);
    lastState = status?.instance?.state || status?.state || "";
    if (lastState === "Stopped") {
      return status;
    }
    if (lastState === "Failed") {
      throw new MarketplaceInstallError("Server installer failed.", "SERVER_INSTALLER_FAILED");
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  try {
    await agentClient.forceKillInstance(instanceId, agentConfig);
  } catch {}
  throw new MarketplaceInstallError("Server installer did not finish in time.", "SERVER_INSTALLER_TIMEOUT", { lastState });
}

async function runServerInstaller(instanceId, serverInfo, agentConfig) {
  if (!serverInfo.installer) {
    return;
  }
  emitProgress({ instanceId, stage: "extracting", message: "Running server loader installer..." });
  await agentClient.updateInstance(instanceId, {
    executable: "java",
    args: ["-jar", serverInfo.installer.jar, ...(serverInfo.installer.args || ["--installServer"])],
    workingDirectory: "data",
    restartPolicy: "never",
    startupTimeoutMs: 300000,
  }, agentConfig);
  await agentClient.startInstance(instanceId, agentConfig);
  await waitForInstaller(instanceId, 300000, agentConfig);
  await agentClient.updateInstance(instanceId, {
    executable: serverInfo.installer.startup?.executable || "bash",
    args: serverInfo.installer.startup?.args || ["run.sh", "nogui"],
    workingDirectory: "data",
    restartPolicy: "on-failure",
    startupTimeoutMs: 60000,
  }, agentConfig);
}

function buildInstallMetadata(options, serverInfo, records) {
  return {
    name: displayName(options.instanceName || options.name || options.displayName),
    provider: options.provider || "manual",
    providerProjectId: options.providerProjectId || options.projectId || "",
    providerVersionId: options.providerVersionId || options.versionId || "",
    minecraftVersion: serverInfo.minecraftVersion || options.minecraftVersion || options.version || "",
    loader: options.loader || options.serverType || "vanilla",
    loaderVersion: serverInfo.loaderVersion || options.loaderVersion || "",
    serverJar: serverInfo.serverJar || "server.jar",
    serverJarPath: serverInfo.serverJar || "server.jar",
    startJar: serverInfo.serverJar || "server.jar",
    installedAt: new Date().toISOString(),
    mods: records.mods || [],
    downloads: records.downloads || [],
    source: records.source || {},
  };
}

async function installModrinthPack(instanceId, payload, agentConfig, progressState) {
  const projectId = payload.providerProjectId || payload.projectId;
  ensureProviderProjectId(projectId, "Modrinth");
  emitProgress({ ...progressState, stage: "resolving", message: "Resolving Modrinth version..." });
  const version = await modrinthProvider.resolveVersion(projectId, payload.minecraftVersion || payload.version, payload.loader, payload.providerVersionId || payload.versionId);
  const primary = version.primaryFile || version.files?.[0];
  ensureSupportedModpack(primary?.url, "Modrinth", "selected version does not expose downloadable files");
  const mods = [];
  const downloads = [];
  const dedupe = createDeduper();

  if (primary?.filename?.endsWith(".mrpack")) {
    emitProgress({ ...progressState, stage: "downloading", message: "Downloading Modrinth pack..." });
    const pack = await fetchBuffer(primary.url, primary.filename);
    emitProgress({ ...progressState, stage: "extracting", message: "Extracting Modrinth overrides..." });
    await extractZipBuffer(pack, async (entryPath, content) => {
      if (entryPath === "modrinth.index.json") {
        const index = JSON.parse(content.toString("utf8"));
        const files = Array.isArray(index.files) ? index.files : [];
        ensureServerFiles(files, "Modrinth");
        let current = 0;
        for (const file of files) {
          current += 1;
          const env = file.env || {};
          if (!payload.allowClientFiles && env.server === "unsupported") {
            continue;
          }
          const fileUrl = Array.isArray(file.downloads) ? file.downloads[0] : "";
          const filePath = safeArchivePath(file.path || "");
          if (!fileUrl || !dedupe.add(file.hashes?.sha1 || fileUrl || filePath)) {
            continue;
          }
          emitProgress({ ...progressState, stage: "downloading", message: `Downloading ${current}/${files.length} mods...`, current, total: files.length });
          try {
            const modBuffer = await fetchBuffer(fileUrl, path.posix.basename(filePath));
            await writeIfMissing(instanceId, filePath, modBuffer, agentConfig);
            mods.push({ file: filePath, sha1: file.hashes?.sha1 || null, provider: "modrinth" });
            downloads.push({ file: filePath, provider: "modrinth" });
          } catch (error) {
            if (!isRecoverableProviderFileError(error)) {
              throw error;
            }
            logMarketplaceInstallFailure(error, {
              provider: "modrinth",
              instanceId,
              fileName: path.posix.basename(filePath),
              url: fileUrl,
              recovery: "skipped-file",
            });
          }
        }
        return;
      }
      if (entryPath.startsWith("overrides/") || entryPath.startsWith("server-overrides/")) {
        const target = stripArchiveRoot(entryPath);
        if (target) {
          await writeBuffer(instanceId, target, content, agentConfig);
          downloads.push({ file: target, provider: "modrinth-overrides" });
        }
      }
    });
  } else {
    const dependencies = await modrinthProvider.resolveDependencies(version, payload.minecraftVersion || payload.version, payload.loader, {
      allowClientFiles: payload.allowClientFiles,
    });
    const files = [version, ...dependencies.map((entry) => entry.version)];
    ensureServerFiles(files, "Modrinth");
    let current = 0;
    for (const resolvedVersion of files) {
      current += 1;
      const file = resolvedVersion.primaryFile || resolvedVersion.files?.[0];
      if (!file?.url || !dedupe.add(file.hashes?.sha1 || file.url)) {
        continue;
      }
      const fileName = file.filename || getUrlPathBasename(file.url, "modrinth-file.jar");
      emitProgress({ ...progressState, stage: "downloading", message: `Downloading ${current}/${files.length} mods...`, current, total: files.length });
      try {
        const buffer = await fetchBuffer(file.url, fileName);
        const target = `mods/${safeArchivePath(fileName)}`;
        await writeIfMissing(instanceId, target, buffer, agentConfig);
        mods.push({ file: target, sha1: file.hashes?.sha1 || null, provider: "modrinth", versionId: resolvedVersion.id });
        downloads.push({ file: target, provider: "modrinth" });
      } catch (error) {
        if (current === 1 || !isRecoverableProviderFileError(error)) {
          throw error;
        }
        logMarketplaceInstallFailure(error, {
          provider: "modrinth",
          instanceId,
          fileName,
          url: file.url,
          recovery: "skipped-file",
        });
      }
    }
  }

  if (mods.length === 0 && downloads.length === 0) {
    throw new MarketplaceInstallError("Modrinth install failed: no usable modpack files could be downloaded.", "MISSING_SERVER_FILES", {
      projectId,
      versionId: version.id,
    });
  }

  return {
    mods,
    downloads,
    source: { modrinthVersion: version.id, modrinthVersionName: version.name },
  };
}

async function installCurseForgePack(instanceId, payload, agentConfig, progressState) {
  const projectId = payload.providerProjectId || payload.projectId;
  ensureProviderProjectId(projectId, "CurseForge");
  emitProgress({ ...progressState, stage: "resolving", message: "Resolving CurseForge file..." });
  const file = await curseforgeProvider.resolveFile(projectId, payload.minecraftVersion || payload.version, payload.loader, payload.providerVersionId || payload.fileId);
  const serverFile = file.serverPackFileId
    ? await curseforgeProvider.getFile(projectId, file.serverPackFileId)
    : file;
  ensureSupportedModpack(!file.serverPackFileId || serverFile?.id, "CurseForge", "server pack file could not be resolved");
  if (!file.serverPackFileId) {
    logMarketplaceInstallStep("CurseForge file has no explicit server pack; using selected file.", {
      instanceId,
      projectId,
      fileId: file.id,
      fileName: file.fileName,
    });
  } else {
    logMarketplaceInstallStep("Resolved CurseForge server pack file.", {
      instanceId,
      projectId,
      clientFileId: file.id,
      serverPackFileId: serverFile.id,
      fileName: serverFile.fileName,
    });
  }
  const downloaded = await curseforgeProvider.downloadFile(serverFile);
  const mods = [];
  const downloads = [];
  const dedupe = createDeduper();
  const isDedicatedServerPack = Boolean(file.serverPackFileId && serverFile.id !== file.id);

  if (/\.zip$/i.test(downloaded.fileName)) {
    emitProgress({ ...progressState, stage: "extracting", message: "Extracting CurseForge manifest..." });
    let manifest = null;
    let bundledModCount = 0;
    await extractZipBuffer(downloaded.buffer, async (entryPath, content) => {
      if (entryPath === "manifest.json") {
        logMarketplaceInstallStep("Parsing CurseForge manifest.", { instanceId, projectId, fileName: downloaded.fileName });
        try {
          manifest = JSON.parse(content.toString("utf8"));
        } catch (error) {
          throw new MarketplaceInstallError("CurseForge server pack manifest is invalid JSON.", "INVALID_MANIFEST", {
            message: error.message,
            fileName: downloaded.fileName,
          });
        }
        if (isDedicatedServerPack) {
          await writeBuffer(instanceId, entryPath, content, agentConfig);
          downloads.push({ file: entryPath, provider: "curseforge-server-pack" });
        }
        return;
      }
      if (isDedicatedServerPack) {
        await writeBuffer(instanceId, entryPath, content, agentConfig);
        downloads.push({ file: entryPath, provider: "curseforge-server-pack" });
        if (entryPath.startsWith("mods/") && /\.jar$/i.test(entryPath)) {
          bundledModCount += 1;
          mods.push({ file: entryPath, provider: "curseforge-server-pack", bundled: true });
        }
        return;
      }
      if (!entryPath.startsWith("overrides/")) {
        return;
      }
      const target = stripArchiveRoot(entryPath);
      if (target) {
        await writeBuffer(instanceId, target, content, agentConfig);
        downloads.push({ file: target, provider: "curseforge-overrides" });
      }
    });
    const manifestFiles = Array.isArray(manifest?.files) ? manifest.files : [];
    ensureSupportedModpack(manifest, "CurseForge", "server pack did not include a manifest.json");
    if (isDedicatedServerPack && bundledModCount > 0) {
      logMarketplaceInstallStep("Using bundled CurseForge server pack files.", {
        instanceId,
        projectId,
        bundledModCount,
        manifestFiles: manifestFiles.length,
      });
      return {
        mods,
        downloads,
        source: { curseForgeFileId: file.id, curseForgeServerPackFileId: serverFile.id, curseForgeFileName: downloaded.fileName },
      };
    }
    ensureServerFiles(manifestFiles, "CurseForge");
    let current = 0;
    for (const manifestFile of manifestFiles) {
      current += 1;
      if (manifestFile.required === false || manifestFile.optional === true) {
        logMarketplaceInstallStep("Skipping optional CurseForge manifest file.", { instanceId, manifestFile });
        continue;
      }
      const manifestProjectId = manifestFile.projectID || manifestFile.projectId || manifestFile.project_id;
      const manifestFileId = manifestFile.fileID || manifestFile.fileId || manifestFile.file_id;
      ensureSupportedModpack(manifestProjectId && manifestFileId, "CurseForge", "manifest contains a file without projectID/fileID");
      if (!dedupe.add(`${manifestProjectId}:${manifestFileId}`)) {
        continue;
      }
      emitProgress({ ...progressState, stage: "downloading", message: `Downloading ${current}/${manifestFiles.length} mods...`, current, total: manifestFiles.length });
      try {
        const modFile = await curseforgeProvider.getFile(manifestProjectId, manifestFileId);
        const modDownload = await curseforgeProvider.downloadFile(modFile);
        const target = `mods/${safeArchivePath(modDownload.fileName)}`;
        await writeIfMissing(instanceId, target, modDownload.buffer, agentConfig);
        mods.push({ file: target, provider: "curseforge", projectId: manifestProjectId, fileId: manifestFileId });
        downloads.push({ file: target, provider: "curseforge" });
      } catch (error) {
        if (!isRecoverableProviderFileError(error)) {
          throw error;
        }
        logMarketplaceInstallFailure(error, {
          provider: "curseforge",
          instanceId,
          fileName: manifestFile.fileName || null,
          projectId: manifestProjectId,
          fileId: manifestFileId,
          recovery: "skipped-file",
        });
      }
    }
  } else {
    const files = [downloaded, ...(await curseforgeProvider.resolveDependencies(file, {}, null, {
      includeOptional: payload.includeOptionalDependencies === true,
    })).map((entry) => entry.file)];
    ensureServerFiles(files, "CurseForge");
    let current = 0;
    for (const item of files) {
      current += 1;
      if (!dedupe.add(`${item.projectId}:${item.id}`)) {
        continue;
      }
      try {
        const modDownload = item.buffer ? item : await curseforgeProvider.downloadFile(item);
        const target = `mods/${safeArchivePath(modDownload.fileName)}`;
        emitProgress({ ...progressState, stage: "downloading", message: `Downloading ${current}/${files.length} mods...`, current, total: files.length });
        await writeIfMissing(instanceId, target, modDownload.buffer, agentConfig);
        mods.push({ file: target, provider: "curseforge", projectId: item.projectId, fileId: item.id });
        downloads.push({ file: target, provider: "curseforge" });
      } catch (error) {
        if (current === 1 || !isRecoverableProviderFileError(error)) {
          throw error;
        }
        logMarketplaceInstallFailure(error, {
          provider: "curseforge",
          instanceId,
          fileName: item.fileName || null,
          projectId: item.projectId,
          fileId: item.id,
          recovery: "skipped-file",
        });
      }
    }
  }
  if (mods.length === 0 && downloads.length === 0) {
    throw new MarketplaceInstallError("CurseForge install failed: no usable modpack files could be downloaded.", "MISSING_SERVER_FILES", {
      projectId,
      fileId: file.id,
      serverPackFileId: serverFile.id,
    });
  }
  return {
    mods,
    downloads,
    source: { curseForgeFileId: file.id, curseForgeFileName: file.fileName },
  };
}

async function installPack(payload = {}) {
  const provider = String(payload.provider || payload.template?.provider || "anxhub").toLowerCase();
  const options = {
    ...payload.template,
    ...payload.options,
    ...payload,
    provider,
    providerProjectId: payload.providerProjectId || payload.template?.providerProjectId || payload.projectId,
  };
  if (["modrinth", "curseforge"].includes(provider)) {
    ensureProviderProjectId(options.providerProjectId, provider === "modrinth" ? "Modrinth" : "CurseForge");
  }
  if (provider === "curseforge") {
    curseforgeProvider.ensureConfigured();
  }
  const agentConfig = payload.nodeId && payload.nodeId !== "default" ? getNodeAgentConfig(payload.nodeId) : null;
  const serverInfo = await resolveServerJar(options);
  const instancePayload = buildInstancePayload(options, serverInfo);
  const instanceId = instancePayload.id;
  let created = false;

  try {
    emitProgress({ instanceId, stage: "resolving", message: "Creating instance folder...", current: 0, total: 1 });
    const createResult = await withRetry(
      () => agentClient.createInstance(instancePayload, agentConfig),
      { label: "agent create instance", attempts: 3 }
    );
    created = true;
    for (const folder of INSTALL_FOLDERS) {
      await withRetry(
        () => agentClient.createInstanceFolder(instanceId, folder, agentConfig),
        { label: "agent create folder", attempts: 3 }
      );
    }

    emitProgress({ instanceId, stage: "downloading", message: "Downloading server runtime...", current: 0, total: 1 });
    await writeBuffer(instanceId, serverInfo.serverJar, await fetchBuffer(serverInfo.url, serverInfo.fileName), agentConfig);
    await runServerInstaller(instanceId, serverInfo, agentConfig);

    let installRecords = { mods: [], downloads: [], source: {} };
    if (provider === "modrinth") {
      installRecords = await installModrinthPack(instanceId, options, agentConfig, { instanceId });
    } else if (provider === "curseforge") {
      installRecords = await installCurseForgePack(instanceId, options, agentConfig, { instanceId });
    }

    emitProgress({ instanceId, stage: "writing", message: "Writing instance metadata...", current: 1, total: 1 });
    await writeText(instanceId, "eula.txt", `eula=${options.acceptEula === false ? "false" : "true"}\n`, agentConfig);
    await agentClient.saveMinecraftProperties(instanceId, {
      "server-port": String(instancePayload.primaryPort || 25565),
      "max-players": String(options.maxPlayers || 20),
      motd: options.motd || `${instancePayload.displayName} on AnxOS`,
      "online-mode": options.onlineMode === false ? "false" : "true",
      "level-seed": options.seed || "",
    }, agentConfig);
    const metadata = buildInstallMetadata(options, serverInfo, installRecords);
    await writeText(instanceId, "metadata.json", `${JSON.stringify(metadata, null, 2)}\n`, agentConfig);
    await writeText(instanceId, "config.json", `${JSON.stringify({ ...instancePayload, status: "stopped", port: instancePayload.primaryPort }, null, 2)}\n`, agentConfig);
    await validateInstalledServerJar(instanceId, serverInfo, agentConfig);
    await agentClient.updateInstance(instanceId, {
      ...metadata,
      jar: serverInfo.serverJar,
      serverJar: serverInfo.serverJar,
      serverJarPath: serverInfo.serverJar,
      startJar: serverInfo.serverJar,
    }, agentConfig);
    if (options.start) {
      emitProgress({ instanceId, stage: "writing", message: "Starting instance...", current: 1, total: 1 });
      await withRetry(
        () => agentClient.startInstance(instanceId, agentConfig),
        { label: "agent start instance", attempts: 2 }
      );
    }

    emitProgress({ instanceId, stage: "done", message: "Done", current: 1, total: 1, percent: 100 });
    return {
      instance: { ...(createResult?.instance || createResult || {}), id: instanceId, displayName: instancePayload.displayName },
      metadata,
      progress: [{ label: "Done", status: "complete", detail: "Marketplace pack installed." }],
    };
  } catch (error) {
    logMarketplaceInstallFailure(error, {
      provider,
      instanceId,
      providerProjectId: options.providerProjectId || null,
      providerVersionId: options.providerVersionId || options.versionId || null,
      minecraftVersion: options.minecraftVersion || options.version || null,
      loader: options.loader || options.serverType || null,
    });
    const detailedMessage = buildDetailedErrorMessage(error, friendlyError(error));
    emitProgress({ instanceId, stage: "error", message: detailedMessage, current: 0, total: 0, percent: 0 });
    if (created) {
      try {
        await agentClient.deleteInstance(instanceId, agentConfig);
      } catch {
        // Failed cleanup should not hide the original install error.
      }
    }
    throw new MarketplaceInstallError(detailedMessage, error?.code || "MARKETPLACE_INSTALL_FAILED", {
      ...(error?.details || {}),
      originalName: error?.name || null,
      originalMessage: error?.message || null,
      originalStack: error?.stack || null,
    });
  }
}

async function searchProviderPacks(payload = {}) {
  const provider = String(payload.provider || "modrinth").toLowerCase();
  if (provider === "curseforge") {
    return curseforgeProvider.searchModpacks(payload);
  }
  if (provider === "modrinth") {
    return modrinthProvider.searchModpacks(payload);
  }
  return { provider, results: [] };
}

async function getProviderPackVersions(payload = {}) {
  const provider = String(payload.provider || "modrinth").toLowerCase();
  const projectId = payload.providerProjectId || payload.projectId;
  if (provider === "curseforge") {
    const files = await curseforgeProvider.getFiles(projectId, payload.minecraftVersion || payload.version || "", payload.loader || "");
    return { provider, versions: files.map((file) => ({ id: file.id, name: file.name, fileName: file.fileName, minecraftVersions: file.minecraftVersions })) };
  }
  if (provider === "modrinth") {
    const versions = await modrinthProvider.getVersions(projectId, payload.minecraftVersion || payload.version || "", payload.loader || "");
    return { provider, versions: versions.map((version) => ({ id: version.id, name: version.name, versionNumber: version.versionNumber, minecraftVersions: version.minecraftVersions, loaders: version.loaders })) };
  }
  return { provider, versions: [] };
}

async function getProviderPackDetails(payload = {}) {
  const provider = String(payload.provider || "modrinth").toLowerCase();
  const projectId = payload.providerProjectId || payload.projectId;
  if (provider === "curseforge") {
    return { provider, project: await curseforgeProvider.getMod(projectId) };
  }
  if (provider === "modrinth") {
    return { provider, project: await modrinthProvider.getProject(projectId) };
  }
  return { provider, project: null };
}

module.exports = {
  _test: {
    buildInstallMetadata,
    buildInstancePayload,
    createDeduper,
    friendlyHttpMessage,
    isRecoverableProviderFileError,
    isTransientError,
    resolvePaperServerJar,
    safeArchivePath,
    stripArchiveRoot,
    withRetry,
  },
  installPack,
  marketplaceInstallEvents,
  searchProviderPacks,
  getProviderPackVersions,
  getProviderPackDetails,
};
