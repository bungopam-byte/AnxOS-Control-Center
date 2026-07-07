const { EventEmitter } = require("events");
const path = require("path");
const unzipper = require("unzipper");
const agentClient = require("./agentClient");
const { getNodeAgentConfig } = require("./nodeService");
const modrinthProvider = require("./providers/modrinthProvider");
const curseforgeProvider = require("./providers/curseforgeProvider");

const INSTALL_FOLDERS = ["mods", "config", "defaultconfigs", "kubejs", "kubejs/scripts", "world", "logs", "backups"];
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

function truncateForLog(value, maxLength = 4000) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function logMarketplaceInstallFailure(error, context = {}) {
  console.error("[Marketplace][Install] Install failed.", {
    ...context,
    code: error?.code || null,
    message: error?.message || null,
    details: error?.details || null,
    stack: error?.stack || null,
  });
}

function logMarketplaceInstallStep(message, context = {}) {
  console.info("[Marketplace][Install]", {
    message,
    ...context,
  });
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
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new MarketplaceInstallError("Download URL is not allowed.", "DOWNLOAD_URL_UNSAFE", { url });
  }
  return parsed;
}

async function fetchJson(url, label) {
  try {
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
  } catch (error) {
    const effectiveError = error instanceof MarketplaceInstallError
      ? error
      : new MarketplaceInstallError(`${label}: Network timeout or connection failure - ${error?.message || "request failed"}`, "NETWORK_FAILED", {
        url,
        message: error?.message || "request failed",
      });
    logMarketplaceInstallFailure(effectiveError, { label, url });
    throw effectiveError;
  }
}

async function fetchBuffer(url, label) {
  try {
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
  } catch (error) {
    const effectiveError = error instanceof MarketplaceInstallError
      ? error
      : new MarketplaceInstallError(`${label}: Network timeout or connection failure - ${error?.message || "request failed"}`, "NETWORK_FAILED", {
        url,
        message: error?.message || "request failed",
      });
    logMarketplaceInstallFailure(effectiveError, { label, url });
    throw effectiveError;
  }
}

async function fetchText(url, label) {
  try {
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
  } catch (error) {
    const effectiveError = error instanceof MarketplaceInstallError
      ? error
      : new MarketplaceInstallError(`${label}: Network timeout or connection failure - ${error?.message || "request failed"}`, "NETWORK_FAILED", {
        url,
        message: error?.message || "request failed",
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
  return agentClient.writeInstanceFile(instanceId, filePath, content, { config: agentConfig });
}

async function writeBuffer(instanceId, filePath, buffer, agentConfig) {
  logMarketplaceInstallStep("Writing binary file.", { instanceId, filePath, bytes: Buffer.byteLength(buffer || Buffer.alloc(0)) });
  return agentClient.writeInstanceFile(instanceId, filePath, Buffer.from(buffer).toString("base64"), {
    encoding: "base64",
    config: agentConfig,
  });
}

async function writeIfMissing(instanceId, filePath, buffer, agentConfig) {
  try {
    await agentClient.readInstanceFile(instanceId, filePath, agentConfig);
    logMarketplaceInstallStep("Skipping existing file.", { instanceId, filePath });
    return false;
  } catch {
    await writeBuffer(instanceId, filePath, buffer, agentConfig);
    return true;
  }
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
  const projectMeta = await fetchJson(`https://api.papermc.io/v2/projects/${encodeURIComponent(project)}`, "PaperMC project metadata");
  const versionId = minecraftVersion && minecraftVersion !== "latest"
    ? minecraftVersion
    : (projectMeta.versions || [])[projectMeta.versions.length - 1];
  const builds = await fetchJson(`https://api.papermc.io/v2/projects/${encodeURIComponent(project)}/versions/${encodeURIComponent(versionId)}/builds`, "PaperMC builds");
  const build = (builds.builds || [])[builds.builds.length - 1];
  const appName = project === "paper" ? "paper" : project;
  const fileName = build?.downloads?.application?.name || `${appName}-${versionId}-${build?.build}.jar`;
  if (!build?.build || !fileName) {
    throw new MarketplaceInstallError("No PaperMC server jar was found.", "PAPER_VERSION_NOT_FOUND");
  }
  return {
    url: `https://api.papermc.io/v2/projects/${encodeURIComponent(project)}/versions/${encodeURIComponent(versionId)}/builds/${build.build}/downloads/${encodeURIComponent(fileName)}`,
    fileName,
    serverJar: fileName,
    minecraftVersion: versionId,
    loaderVersion: String(build.build),
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
    serverJar: "purpur.jar",
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
          const modBuffer = await fetchBuffer(fileUrl, path.posix.basename(filePath));
          await writeIfMissing(instanceId, filePath, modBuffer, agentConfig);
          mods.push({ file: filePath, sha1: file.hashes?.sha1 || null, provider: "modrinth" });
          downloads.push({ file: filePath, provider: "modrinth" });
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
      const fileName = file.filename || path.basename(new URL(file.url).pathname);
      emitProgress({ ...progressState, stage: "downloading", message: `Downloading ${current}/${files.length} mods...`, current, total: files.length });
      const buffer = await fetchBuffer(file.url, fileName);
      const target = `mods/${safeArchivePath(fileName)}`;
      await writeIfMissing(instanceId, target, buffer, agentConfig);
      mods.push({ file: target, sha1: file.hashes?.sha1 || null, provider: "modrinth", versionId: resolvedVersion.id });
      downloads.push({ file: target, provider: "modrinth" });
    }
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
      const manifestProjectId = manifestFile.projectID || manifestFile.projectId || manifestFile.project_id;
      const manifestFileId = manifestFile.fileID || manifestFile.fileId || manifestFile.file_id;
      ensureSupportedModpack(manifestProjectId && manifestFileId, "CurseForge", "manifest contains a file without projectID/fileID");
      if (!dedupe.add(`${manifestProjectId}:${manifestFileId}`)) {
        continue;
      }
      emitProgress({ ...progressState, stage: "downloading", message: `Downloading ${current}/${manifestFiles.length} mods...`, current, total: manifestFiles.length });
      const modFile = await curseforgeProvider.getFile(manifestProjectId, manifestFileId);
      const modDownload = await curseforgeProvider.downloadFile(modFile);
      const target = `mods/${safeArchivePath(modDownload.fileName)}`;
      await writeIfMissing(instanceId, target, modDownload.buffer, agentConfig);
      mods.push({ file: target, provider: "curseforge", projectId: manifestProjectId, fileId: manifestFileId });
      downloads.push({ file: target, provider: "curseforge" });
    }
  } else {
    const files = [downloaded, ...(await curseforgeProvider.resolveDependencies(file)).map((entry) => entry.file)];
    ensureServerFiles(files, "CurseForge");
    let current = 0;
    for (const item of files) {
      current += 1;
      if (!dedupe.add(`${item.projectId}:${item.id}`)) {
        continue;
      }
      const modDownload = item.buffer ? item : await curseforgeProvider.downloadFile(item);
      const target = `mods/${safeArchivePath(modDownload.fileName)}`;
      emitProgress({ ...progressState, stage: "downloading", message: `Downloading ${current}/${files.length} mods...`, current, total: files.length });
      await writeIfMissing(instanceId, target, modDownload.buffer, agentConfig);
      mods.push({ file: target, provider: "curseforge", projectId: item.projectId, fileId: item.id });
      downloads.push({ file: target, provider: "curseforge" });
    }
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
    const createResult = await agentClient.createInstance(instancePayload, agentConfig);
    created = true;
    for (const folder of INSTALL_FOLDERS) {
      await agentClient.createInstanceFolder(instanceId, folder, agentConfig);
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
    await agentClient.updateInstance(instanceId, metadata, agentConfig);
    if (options.start) {
      emitProgress({ instanceId, stage: "writing", message: "Starting instance...", current: 1, total: 1 });
      await agentClient.startInstance(instanceId, agentConfig);
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
    emitProgress({ instanceId, stage: "error", message: friendlyError(error), current: 0, total: 0, percent: 0 });
    if (created) {
      try {
        await agentClient.deleteInstance(instanceId, agentConfig);
      } catch {
        // Failed cleanup should not hide the original install error.
      }
    }
    throw new MarketplaceInstallError(friendlyError(error), error?.code || "MARKETPLACE_INSTALL_FAILED", error?.details || {});
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
    safeArchivePath,
    stripArchiveRoot,
  },
  installPack,
  marketplaceInstallEvents,
  searchProviderPacks,
  getProviderPackVersions,
  getProviderPackDetails,
};
