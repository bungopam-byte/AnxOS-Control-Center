const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const CURSEFORGE_API = "https://api.curseforge.com/v1";
const MINECRAFT_GAME_ID = 432;
const MODPACK_CLASS_ID = 4471;
const REQUIRED_DEPENDENCY = 3;
const OPTIONAL_DEPENDENCY = 2;
const USER_AGENT = "AnxOS-Control-Center/1.0 (+https://anxos.local)";

const API_KEY_FIELDS = ["apiKey", "curseForgeApiKey", "curseforgeApiKey", "cfApiKey"];
const API_KEY_ENV = ["CURSEFORGE_API_KEY", "CF_API_KEY", "ANXHUB_CURSEFORGE_API_KEY"];
const API_KEY_FILE_FIELDS = ["apiKeyFile", "curseForgeApiKeyFile", "curseforgeApiKeyFile", "cfApiKeyFile"];
const API_KEY_FILE_ENV = ["CURSEFORGE_API_KEY_FILE", "CF_API_KEY_FILE", "ANXHUB_CURSEFORGE_API_KEY_FILE"];
let envLoaded = false;
let envLoadInfo = null;
let startupStatusLogged = false;

class CurseForgeProviderError extends Error {
  constructor(message, code = "CURSEFORGE_ERROR", details = {}) {
    super(message);
    this.name = "CurseForgeProviderError";
    this.code = code;
    this.details = details;
  }
}

function truncateForLog(value, maxLength = 4000) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function friendlyHttpMessage(label, status, body = "") {
  const detail = (() => {
    try {
      const parsed = JSON.parse(body);
      return parsed.message || parsed.error || parsed.detail || "";
    } catch {
      return String(body || "").trim().slice(0, 240);
    }
  })();
  const prefix = `CurseForge ${label}`;
  if (status === 401) return `${prefix}: 401 Invalid API key. Check CF_API_KEY${detail ? ` - ${detail}` : ""}.`;
  if (status === 403) return `${prefix}: 403 Forbidden. Your API key may not have access${detail ? ` - ${detail}` : ""}.`;
  if (status === 404) return `${prefix}: 404 Project not found${detail ? ` - ${detail}` : ""}.`;
  if (status === 429) return `${prefix}: 429 Rate limited. Try again later${detail ? ` - ${detail}` : ""}.`;
  return `${prefix}: HTTP ${status}${detail ? ` - ${detail}` : ""}`;
}

function logProviderFailure(error, context = {}) {
  console.error("[Marketplace][CurseForge] Provider request failed.", {
    ...context,
    code: error?.code || null,
    message: error?.message || null,
    details: error?.details || null,
    stack: error?.stack || null,
  });
}

function trimValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function uniquePaths(paths) {
  return [...new Set(paths.filter(Boolean))];
}

function getElectronApp() {
  try {
    const electron = require("electron");
    return electron && typeof electron === "object" ? electron.app || null : null;
  } catch {
    return null;
  }
}

function getElectronConfigDirectory() {
  const app = getElectronApp();

  if (!app) {
    return null;
  }

  try {
    return path.join(app.getPath("userData"), "config");
  } catch {
    return null;
  }
}

function isPackagedElectronRuntime() {
  return Boolean(getElectronApp()?.isPackaged);
}

function getRepoEnvPath() {
  return path.join(__dirname, "..", "..", "..", ".env");
}

function getEnvCandidates() {
  const electronConfigDirectory = getElectronConfigDirectory();
  const packagedEnvPath = isPackagedElectronRuntime() && electronConfigDirectory
    ? path.join(electronConfigDirectory, ".env")
    : null;

  return uniquePaths([
    process.env.ANXHUB_ENV_PATH,
    packagedEnvPath,
    getRepoEnvPath(),
    path.join(process.cwd(), ".env"),
    process.execPath ? path.join(path.dirname(process.execPath), ".env") : null,
    process.resourcesPath ? path.join(process.resourcesPath, ".env") : null,
    process.resourcesPath ? path.join(process.resourcesPath, "app", ".env") : null,
  ]);
}

function findEnvPath() {
  return getEnvCandidates().find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  }) || null;
}

function loadEnv() {
  if (envLoaded) {
    return envLoadInfo;
  }
  envLoaded = true;
  const resolvedEnvPath = findEnvPath();

  envLoadInfo = {
    cwd: process.cwd(),
    resolvedEnvPath,
    envFileExists: Boolean(resolvedEnvPath),
    envLoaded: false,
    envLoadErrorCode: null,
  };

  if (!resolvedEnvPath) {
    return envLoadInfo;
  }

  try {
    const result = dotenv.config({ path: resolvedEnvPath, quiet: true });
    envLoadInfo.envLoaded = !result.error;
    envLoadInfo.envLoadErrorCode = result.error?.code || result.error?.name || null;
  } catch (error) {
    envLoadInfo.envLoadErrorCode = error?.code || error?.name || "ENV_LOAD_FAILED";
  }

  return envLoadInfo;
}

function cleanSecretValue(value) {
  const text = String(value || "").trim();
  if (
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith('"') && text.endsWith('"'))
  ) {
    return text.slice(1, -1).trim();
  }
  return text;
}

function firstSecretValue(config = {}, fields = [], envNames = []) {
  for (const field of fields) {
    const value = cleanSecretValue(config[field]);
    if (value) {
      return value;
    }
  }
  for (const envName of envNames) {
    const value = cleanSecretValue(process.env[envName]);
    if (value) {
      return value;
    }
  }
  return "";
}

function readSecretFile(filePath) {
  const cleanPath = cleanSecretValue(filePath);
  if (!cleanPath) {
    return "";
  }
  try {
    return cleanSecretValue(fs.readFileSync(cleanPath, "utf8"));
  } catch (error) {
    throw new CurseForgeProviderError(
      `CurseForge API key file could not be read: ${cleanPath}`,
      "CURSEFORGE_API_KEY_FILE_UNREADABLE",
      { path: cleanPath, message: error.message }
    );
  }
}

function getCurseForgeApiKey(config = {}) {
  loadEnv();
  const direct = firstSecretValue(config, API_KEY_FIELDS, API_KEY_ENV);
  if (direct) {
    return direct;
  }
  const secretFile = firstSecretValue(config, API_KEY_FILE_FIELDS, API_KEY_FILE_ENV);
  return readSecretFile(secretFile);
}

function getApiKeyStatus(config = {}) {
  const envInfo = loadEnv();
  const directConfigField = API_KEY_FIELDS.find((field) => cleanSecretValue(config[field]));
  const directEnvName = API_KEY_ENV.find((envName) => cleanSecretValue(process.env[envName]));
  const fileConfigField = API_KEY_FILE_FIELDS.find((field) => cleanSecretValue(config[field]));
  const fileEnvName = API_KEY_FILE_ENV.find((envName) => cleanSecretValue(process.env[envName]));
  const source = directConfigField
    ? `config:${directConfigField}`
    : directEnvName
      ? `env:${directEnvName}`
      : fileConfigField
        ? `config:${fileConfigField}`
        : fileEnvName
          ? `env:${fileEnvName}`
          : null;
  let loaded = false;
  let errorCode = null;

  try {
    loaded = Boolean(getCurseForgeApiKey(config));
  } catch (error) {
    errorCode = error?.code || error?.name || "CURSEFORGE_API_KEY_STATUS_FAILED";
  }

  return {
    loaded,
    source,
    errorCode,
    env: envInfo,
  };
}

function logStartupStatus() {
  if (startupStatusLogged) {
    return getApiKeyStatus();
  }

  startupStatusLogged = true;
  const status = getApiKeyStatus();

  console.info("[Marketplace][CurseForge] API key status.", {
    loaded: status.loaded,
    source: status.source,
    envFileExists: status.env.envFileExists,
    envLoaded: status.env.envLoaded,
    envLoadErrorCode: status.env.envLoadErrorCode,
    apiKeyErrorCode: status.errorCode,
    resolvedEnvPath: status.env.resolvedEnvPath,
    cwd: status.env.cwd,
  });

  return status;
}

function requireApiKey(config = {}) {
  const apiKey = getCurseForgeApiKey(config);
  if (!apiKey) {
    throw new CurseForgeProviderError(
      "CurseForge API key is required to install CurseForge packs.",
      "CURSEFORGE_API_KEY_REQUIRED"
    );
  }
  return apiKey;
}

function normalizeLoader(loader) {
  const value = String(loader || "").trim().toLowerCase();
  const loaderMap = {
    forge: 1,
    fabric: 4,
    quilt: 5,
    neoforge: 6,
  };
  return loaderMap[value] || "";
}

function createUrl(pathname, params = {}) {
  const url = new URL(`${CURSEFORGE_API}${pathname}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
}

function buildApiHeaders(config = {}) {
  return {
    "Accept": "application/json",
    "User-Agent": USER_AGENT,
    "x-api-key": requireApiKey(config),
  };
}

async function requestJson(url, label, config = {}) {
  try {
    const response = await fetch(url, {
      headers: buildApiHeaders(config),
    });
    const body = await response.text();
    if (!response.ok) {
      throw new CurseForgeProviderError(friendlyHttpMessage(label, response.status, body), "CURSEFORGE_REQUEST_FAILED", {
        status: response.status,
        body: truncateForLog(body),
        url: String(url),
      });
    }
    try {
      return JSON.parse(body);
    } catch (error) {
      throw new CurseForgeProviderError(`${label} returned invalid JSON.`, "CURSEFORGE_INVALID_JSON", {
        message: error.message,
        body: truncateForLog(body),
        url: String(url),
      });
    }
  } catch (error) {
    const effectiveError = error instanceof CurseForgeProviderError
      ? error
      : new CurseForgeProviderError(`${label}: Network timeout or connection failure - ${error?.message || "request failed"}`, "CURSEFORGE_NETWORK_FAILED", {
        url: String(url),
        message: error?.message || "request failed",
      });
    logProviderFailure(effectiveError, { label, url: String(url) });
    throw effectiveError;
  }
}

async function requestBuffer(url, label) {
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new CurseForgeProviderError(`${label} has an unsafe download URL.`, "CURSEFORGE_UNSAFE_URL", { url });
  }
  try {
    const response = await fetch(parsed, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new CurseForgeProviderError(friendlyHttpMessage(label, response.status, body), "CURSEFORGE_DOWNLOAD_FAILED", {
        status: response.status,
        body: truncateForLog(body),
        url,
      });
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    const effectiveError = error instanceof CurseForgeProviderError
      ? error
      : new CurseForgeProviderError(`${label}: Network timeout or connection failure - ${error?.message || "request failed"}`, "CURSEFORGE_NETWORK_FAILED", {
        url,
        message: error?.message || "request failed",
      });
    logProviderFailure(effectiveError, { label, url });
    throw effectiveError;
  }
}

function assertProviderMetadata(projectId, context = "CurseForge project") {
  if (!projectId) {
    throw new CurseForgeProviderError(`${context}: Invalid provider metadata. Missing providerProjectId.`, "INVALID_PROVIDER_METADATA", {
      projectId,
    });
  }
}

function normalizeMod(mod = {}) {
  return {
    id: mod.id,
    slug: mod.slug,
    name: mod.name || mod.slug || String(mod.id || ""),
    description: mod.summary || "",
    iconUrl: mod.logo?.url || null,
    author: Array.isArray(mod.authors) ? mod.authors.map((entry) => entry.name).filter(Boolean).join(", ") : "CurseForge",
    downloads: mod.downloadCount || 0,
    provider: "curseforge",
    providerProjectId: mod.id,
    minecraftVersions: [...new Set(mod.latestFilesIndexes?.map((entry) => entry.gameVersion).filter(Boolean) || [])],
    loaders: [...new Set(mod.latestFilesIndexes?.map((entry) => entry.modLoader).filter(Boolean) || [])],
    updatedAt: mod.dateModified || mod.dateReleased || null,
    raw: mod,
  };
}

function normalizeFile(file = {}) {
  return {
    id: file.id,
    projectId: file.modId,
    name: file.displayName || file.fileName || String(file.id || ""),
    fileName: file.fileName || file.displayName || `${file.id}.jar`,
    downloadUrl: file.downloadUrl || null,
    minecraftVersions: file.gameVersions || [],
    releaseType: file.releaseType || null,
    dependencies: Array.isArray(file.dependencies) ? file.dependencies : [],
    modules: Array.isArray(file.modules) ? file.modules : [],
    serverPackFileId: file.serverPackFileId || null,
    raw: file,
  };
}

function normalizeSearchOptions(queryOrOptions = "", minecraftVersion = "", loader = "", config = {}) {
  if (queryOrOptions && typeof queryOrOptions === "object") {
    return {
      query: queryOrOptions.query || "",
      minecraftVersion: queryOrOptions.minecraftVersion || queryOrOptions.version || "",
      loader: queryOrOptions.loader || "",
      mode: queryOrOptions.mode || "featured",
      offset: Math.max(Number.parseInt(queryOrOptions.offset, 10) || 0, 0),
      limit: Math.min(Math.max(Number.parseInt(queryOrOptions.limit, 10) || 25, 1), 50),
      config,
    };
  }
  return {
    query: queryOrOptions || "",
    minecraftVersion,
    loader,
    mode: "featured",
    offset: 0,
    limit: 25,
    config,
  };
}

function getSortField(mode, query) {
  if (query) return 2;
  if (mode === "trending") return 6;
  if (mode === "updated") return 3;
  return 2;
}

async function searchModpacks(queryOrOptions = "", minecraftVersion = "", loader = "", config = {}) {
  const options = normalizeSearchOptions(queryOrOptions, minecraftVersion, loader, config);
  const url = createUrl("/mods/search", {
    gameId: MINECRAFT_GAME_ID,
    classId: MODPACK_CLASS_ID,
    searchFilter: options.query,
    gameVersion: options.minecraftVersion,
    modLoaderType: normalizeLoader(options.loader),
    sortField: getSortField(options.mode, options.query),
    sortOrder: "desc",
    index: options.offset,
    pageSize: options.limit,
  });
  const payload = await requestJson(url, "CurseForge search", options.config);
  const results = (payload.data || []).map(normalizeMod);
  const total = payload.pagination?.totalCount || results.length;
  return {
    provider: "curseforge",
    mode: options.mode,
    offset: options.offset,
    limit: options.limit,
    total,
    nextOffset: options.offset + results.length,
    hasMore: options.offset + results.length < total,
    results,
  };
}

async function getMod(projectId, config = {}) {
  if (!projectId) {
    assertProviderMetadata(projectId, "CurseForge mod");
  }
  const payload = await requestJson(createUrl(`/mods/${encodeURIComponent(projectId)}`), "CurseForge mod", config);
  return normalizeMod(payload.data || {});
}

async function getFiles(projectId, minecraftVersion = "", loader = "", config = {}) {
  if (!projectId) {
    assertProviderMetadata(projectId, "CurseForge files");
  }
  const payload = await requestJson(createUrl(`/mods/${encodeURIComponent(projectId)}/files`, {
    gameVersion: minecraftVersion,
    modLoaderType: normalizeLoader(loader),
    pageSize: 50,
  }), "CurseForge files", config);
  return (payload.data || []).map(normalizeFile);
}

async function getFile(projectId, fileId, config = {}) {
  const payload = await requestJson(
    createUrl(`/mods/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}`),
    "CurseForge file",
    config
  );
  return normalizeFile(payload.data || {});
}

async function getFileDownloadUrl(projectId, fileId, config = {}) {
  const payload = await requestJson(
    createUrl(`/mods/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}/download-url`),
    "CurseForge download URL",
    config
  );
  return typeof payload.data === "string" ? payload.data : "";
}

async function resolveFile(projectId, minecraftVersion = "", loader = "", requestedFileId = "", config = {}) {
  if (requestedFileId && requestedFileId !== "latest") {
    return getFile(projectId, requestedFileId, config);
  }
  const files = await getFiles(projectId, minecraftVersion, loader, config);
  const file = files[0];
  if (!file) {
    throw new CurseForgeProviderError("No compatible CurseForge server file was found.", "CURSEFORGE_FILE_NOT_FOUND");
  }
  return file;
}

async function resolveDependencies(file, config = {}, state = null) {
  const resolved = state || {
    seenProjects: new Set(),
    seenFiles: new Set(),
    dependencies: [],
  };
  for (const dependency of Array.isArray(file?.dependencies) ? file.dependencies : []) {
    if (![REQUIRED_DEPENDENCY, OPTIONAL_DEPENDENCY].includes(dependency.relationType)) {
      continue;
    }
    if (!dependency.modId || resolved.seenProjects.has(dependency.modId)) {
      continue;
    }
    const dependencyFile = await resolveFile(dependency.modId, "", "", "", config);
    if (!dependencyFile || resolved.seenFiles.has(dependencyFile.id)) {
      continue;
    }
    resolved.seenProjects.add(dependency.modId);
    resolved.seenFiles.add(dependencyFile.id);
    resolved.dependencies.push({
      file: dependencyFile,
      projectId: dependency.modId,
      dependencyType: dependency.relationType === REQUIRED_DEPENDENCY ? "required" : "optional",
    });
    await resolveDependencies(dependencyFile, config, resolved);
  }
  return resolved.dependencies;
}

async function downloadFile(file, destination = "", options = {}) {
  const downloadUrl = file?.downloadUrl || await getFileDownloadUrl(file?.projectId, file?.id);
  if (!downloadUrl) {
    throw new CurseForgeProviderError(`${file?.fileName || "CurseForge file"} has no download URL.`, "CURSEFORGE_DOWNLOAD_URL_MISSING", {
      projectId: file?.projectId || null,
      fileId: file?.id || null,
    });
  }
  const buffer = await requestBuffer(downloadUrl, file.fileName || "CurseForge file");
  if (destination) {
    fs.mkdirSync(destination, { recursive: true });
    fs.writeFileSync(path.join(destination, file.fileName), buffer);
  }
  if (options.returnBuffer === false) {
    return { ...file, buffer: null };
  }
  return { ...file, downloadUrl, buffer };
}

module.exports = {
  _test: {
    buildApiHeaders,
    cleanSecretValue,
    friendlyHttpMessage,
    getApiKeyStatus,
    getCurseForgeApiKey,
    getEnvCandidates,
    normalizeFile,
    normalizeLoader,
    normalizeMod,
    requireApiKey,
  },
  CurseForgeProviderError,
  downloadFile,
  ensureConfigured: requireApiKey,
  getFile,
  getFileDownloadUrl,
  getFiles,
  getMod,
  logStartupStatus,
  resolveDependencies,
  resolveFile,
  searchModpacks,
};
