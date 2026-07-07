const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const CURSEFORGE_API = "https://api.curseforge.com/v1";
const MINECRAFT_GAME_ID = 432;
const MODPACK_CLASS_ID = 4471;
const REQUIRED_DEPENDENCY = 3;
const OPTIONAL_DEPENDENCY = 2;

let envLoaded = false;
const API_KEY_FIELDS = ["apiKey", "curseForgeApiKey", "curseforgeApiKey", "cfApiKey"];
const API_KEY_ENV = ["CURSEFORGE_API_KEY", "CF_API_KEY", "ANXHUB_CURSEFORGE_API_KEY"];
const API_KEY_FILE_FIELDS = ["apiKeyFile", "curseForgeApiKeyFile", "curseforgeApiKeyFile", "cfApiKeyFile"];
const API_KEY_FILE_ENV = ["CURSEFORGE_API_KEY_FILE", "CF_API_KEY_FILE", "ANXHUB_CURSEFORGE_API_KEY_FILE"];

class CurseForgeProviderError extends Error {
  constructor(message, code = "CURSEFORGE_ERROR", details = {}) {
    super(message);
    this.name = "CurseForgeProviderError";
    this.code = code;
    this.details = details;
  }
}

function loadEnv() {
  if (envLoaded) {
    return;
  }
  envLoaded = true;
  try {
    dotenv.config({ path: process.env.ANXHUB_ENV_PATH || path.join(process.cwd(), ".env"), quiet: true });
  } catch {
    // Optional local environment support only.
  }
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
  if (value === "neoforge") return "neoForge";
  return value;
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

async function requestJson(url, label, config = {}) {
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "x-api-key": requireApiKey(config),
    },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new CurseForgeProviderError(`${label} failed with HTTP ${response.status}.`, "CURSEFORGE_REQUEST_FAILED", {
      status: response.status,
      body,
      url: String(url),
    });
  }
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new CurseForgeProviderError(`${label} returned invalid JSON.`, "CURSEFORGE_INVALID_JSON", {
      message: error.message,
      body,
      url: String(url),
    });
  }
}

async function requestBuffer(url, label) {
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new CurseForgeProviderError(`${label} has an unsafe download URL.`, "CURSEFORGE_UNSAFE_URL", { url });
  }
  const response = await fetch(parsed);
  if (!response.ok) {
    throw new CurseForgeProviderError(`${label} failed with HTTP ${response.status}.`, "CURSEFORGE_DOWNLOAD_FAILED", {
      status: response.status,
      url,
    });
  }
  return Buffer.from(await response.arrayBuffer());
}

function normalizeMod(mod = {}) {
  return {
    id: mod.id,
    slug: mod.slug,
    name: mod.name || mod.slug || String(mod.id || ""),
    description: mod.summary || "",
    iconUrl: mod.logo?.url || null,
    provider: "curseforge",
    providerProjectId: mod.id,
    minecraftVersions: mod.latestFilesIndexes?.map((entry) => entry.gameVersion).filter(Boolean) || [],
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
    raw: file,
  };
}

async function searchModpacks(query = "", minecraftVersion = "", loader = "", config = {}) {
  const url = createUrl("/mods/search", {
    gameId: MINECRAFT_GAME_ID,
    classId: MODPACK_CLASS_ID,
    searchFilter: query,
    gameVersion: minecraftVersion,
    modLoaderType: normalizeLoader(loader),
    sortField: 2,
    sortOrder: "desc",
    pageSize: 25,
  });
  const payload = await requestJson(url, "CurseForge search", config);
  return {
    provider: "curseforge",
    results: (payload.data || []).map(normalizeMod),
  };
}

async function getMod(projectId, config = {}) {
  if (!projectId) {
    throw new CurseForgeProviderError("CurseForge project id is required.", "CURSEFORGE_PROJECT_REQUIRED");
  }
  const payload = await requestJson(createUrl(`/mods/${encodeURIComponent(projectId)}`), "CurseForge mod", config);
  return normalizeMod(payload.data || {});
}

async function getFiles(projectId, minecraftVersion = "", loader = "", config = {}) {
  if (!projectId) {
    throw new CurseForgeProviderError("CurseForge project id is required.", "CURSEFORGE_PROJECT_REQUIRED");
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
  if (!file?.downloadUrl) {
    throw new CurseForgeProviderError(`${file?.fileName || "CurseForge file"} has no download URL.`, "CURSEFORGE_DOWNLOAD_URL_MISSING");
  }
  const buffer = await requestBuffer(file.downloadUrl, file.fileName || "CurseForge file");
  if (destination) {
    fs.mkdirSync(destination, { recursive: true });
    fs.writeFileSync(path.join(destination, file.fileName), buffer);
  }
  if (options.returnBuffer === false) {
    return { ...file, buffer: null };
  }
  return { ...file, buffer };
}

module.exports = {
  _test: {
    cleanSecretValue,
    getCurseForgeApiKey,
    normalizeFile,
    normalizeLoader,
    normalizeMod,
    requireApiKey,
  },
  CurseForgeProviderError,
  downloadFile,
  ensureConfigured: requireApiKey,
  getFile,
  getFiles,
  getMod,
  resolveDependencies,
  resolveFile,
  searchModpacks,
};
