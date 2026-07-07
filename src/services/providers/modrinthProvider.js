const fs = require("fs");
const path = require("path");

const MODRINTH_API = "https://api.modrinth.com/v2";
const USER_AGENT = "AnxOS-Control-Center/1.0 (+https://anxos.local)";

class ModrinthProviderError extends Error {
  constructor(message, code = "MODRINTH_ERROR", details = {}) {
    super(message);
    this.name = "ModrinthProviderError";
    this.code = code;
    this.details = details;
  }
}

function normalizeLoader(loader) {
  return String(loader || "").trim().toLowerCase();
}

function normalizeSide(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["required", "optional", "unsupported"].includes(normalized) ? normalized : "unknown";
}

function isServerCapableProject(project = {}) {
  const side = normalizeSide(project.server_side);
  return side === "required" || side === "optional" || side === "unknown";
}

function shouldInstallProjectFile(project = {}, options = {}) {
  if (options.allowClientFiles) {
    return true;
  }
  return isServerCapableProject(project);
}

function buildSearchFacets(minecraftVersion, loader) {
  const facets = [["project_type:modpack"]];
  if (minecraftVersion) {
    facets.push([`versions:${minecraftVersion}`]);
  }
  if (loader) {
    facets.push([`categories:${normalizeLoader(loader)}`]);
  }
  facets.push(["server_side:required", "server_side:optional"]);
  return facets;
}

function createUrl(pathname, params = {}) {
  const url = new URL(`${MODRINTH_API}${pathname}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    }
  });
  return url;
}

async function requestJson(url, label) {
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new ModrinthProviderError(`${label} failed with HTTP ${response.status}.`, "MODRINTH_REQUEST_FAILED", {
      status: response.status,
      body,
      url: String(url),
    });
  }
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new ModrinthProviderError(`${label} returned invalid JSON.`, "MODRINTH_INVALID_JSON", {
      message: error.message,
      body,
      url: String(url),
    });
  }
}

async function requestBuffer(url, label) {
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new ModrinthProviderError(`${label} has an unsafe download URL.`, "MODRINTH_UNSAFE_URL", { url });
  }
  const response = await fetch(parsed, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new ModrinthProviderError(`${label} failed with HTTP ${response.status}.`, "MODRINTH_DOWNLOAD_FAILED", {
      status: response.status,
      url,
    });
  }
  return Buffer.from(await response.arrayBuffer());
}

function normalizeProject(project = {}) {
  return {
    id: project.project_id || project.id,
    slug: project.slug,
    name: project.title || project.name || project.slug || project.id,
    description: project.description || "",
    iconUrl: project.icon_url || null,
    provider: "modrinth",
    providerProjectId: project.project_id || project.id || project.slug,
    minecraftVersions: project.versions || project.game_versions || [],
    loaders: project.categories || project.loaders || [],
    serverSide: project.server_side || null,
    clientSide: project.client_side || null,
    raw: project,
  };
}

function normalizeVersion(version = {}) {
  const files = Array.isArray(version.files) ? version.files : [];
  const primary = files.find((file) => file.primary) || files[0] || null;
  return {
    id: version.id,
    projectId: version.project_id,
    name: version.name || version.version_number || version.id,
    versionNumber: version.version_number || version.name || version.id,
    minecraftVersions: version.game_versions || [],
    loaders: version.loaders || [],
    type: version.version_type || "release",
    datePublished: version.date_published || null,
    files,
    primaryFile: primary,
    dependencies: Array.isArray(version.dependencies) ? version.dependencies : [],
    raw: version,
  };
}

function versionMatches(version, minecraftVersion, loader) {
  const loaders = (version.loaders || []).map(normalizeLoader);
  return (!minecraftVersion || (version.game_versions || []).includes(minecraftVersion)) &&
    (!loader || loaders.includes(normalizeLoader(loader)));
}

async function searchModpacks(query = "", minecraftVersion = "", loader = "") {
  const url = createUrl("/search", {
    query,
    index: "relevance",
    limit: 25,
    facets: buildSearchFacets(minecraftVersion, loader),
  });
  const payload = await requestJson(url, "Modrinth search");
  return {
    provider: "modrinth",
    results: (payload.hits || []).filter(isServerCapableProject).map(normalizeProject),
  };
}

async function getProject(projectIdOrSlug) {
  if (!projectIdOrSlug) {
    throw new ModrinthProviderError("Modrinth project id is required.", "MODRINTH_PROJECT_REQUIRED");
  }
  const project = await requestJson(createUrl(`/project/${encodeURIComponent(projectIdOrSlug)}`), "Modrinth project");
  return normalizeProject(project);
}

async function getVersions(projectIdOrSlug, minecraftVersion = "", loader = "") {
  if (!projectIdOrSlug) {
    throw new ModrinthProviderError("Modrinth project id is required.", "MODRINTH_PROJECT_REQUIRED");
  }
  const params = {};
  if (minecraftVersion) {
    params.game_versions = JSON.stringify([minecraftVersion]);
  }
  if (loader) {
    params.loaders = JSON.stringify([normalizeLoader(loader)]);
  }
  const versions = await requestJson(createUrl(`/project/${encodeURIComponent(projectIdOrSlug)}/version`, params), "Modrinth versions");
  return (Array.isArray(versions) ? versions : []).map(normalizeVersion);
}

async function getVersion(versionId) {
  if (!versionId) {
    throw new ModrinthProviderError("Modrinth version id is required.", "MODRINTH_VERSION_REQUIRED");
  }
  return normalizeVersion(await requestJson(createUrl(`/version/${encodeURIComponent(versionId)}`), "Modrinth version"));
}

async function resolveVersion(projectIdOrSlug, minecraftVersion = "", loader = "", requestedVersionId = "") {
  if (requestedVersionId && requestedVersionId !== "latest") {
    const version = await getVersion(requestedVersionId);
    if (versionMatches(version.raw || version, minecraftVersion, loader)) {
      return version;
    }
  }
  const versions = await getVersions(projectIdOrSlug, minecraftVersion, loader);
  const release = versions.find((version) => version.type === "release") || versions[0];
  if (!release) {
    throw new ModrinthProviderError("No compatible Modrinth server version was found.", "MODRINTH_VERSION_NOT_FOUND");
  }
  return release;
}

async function resolveDependencies(version, minecraftVersion = "", loader = "", options = {}, state = null) {
  const resolved = state || {
    seenProjects: new Set(),
    seenVersions: new Set(),
    dependencies: [],
  };
  const dependencyRows = Array.isArray(version?.dependencies) ? version.dependencies : [];
  for (const dependency of dependencyRows) {
    if (!["required", "optional"].includes(dependency.dependency_type)) {
      continue;
    }
    let childVersion = null;
    if (dependency.version_id && !resolved.seenVersions.has(dependency.version_id)) {
      childVersion = await getVersion(dependency.version_id);
    } else if (dependency.project_id && !resolved.seenProjects.has(dependency.project_id)) {
      childVersion = await resolveVersion(dependency.project_id, minecraftVersion, loader);
    }
    if (!childVersion) {
      continue;
    }
    const project = await getProject(childVersion.projectId || dependency.project_id);
    if (!shouldInstallProjectFile(project.raw || project, options)) {
      continue;
    }
    resolved.seenProjects.add(childVersion.projectId || dependency.project_id);
    resolved.seenVersions.add(childVersion.id);
    resolved.dependencies.push({ version: childVersion, project, dependencyType: dependency.dependency_type });
    await resolveDependencies(childVersion, minecraftVersion, loader, options, resolved);
  }
  return resolved.dependencies;
}

async function downloadVersionFiles(version, destination, options = {}) {
  const files = (Array.isArray(version?.files) ? version.files : []).filter((file) => file?.url);
  const downloads = [];
  for (const file of files) {
    const buffer = await requestBuffer(file.url, file.filename || "Modrinth file");
    const record = {
      fileName: file.filename || path.basename(new URL(file.url).pathname),
      url: file.url,
      hashes: file.hashes || {},
      size: file.size || buffer.length,
      buffer,
    };
    downloads.push(record);
    if (destination) {
      fs.mkdirSync(destination, { recursive: true });
      fs.writeFileSync(path.join(destination, record.fileName), buffer);
    }
    if (options.primaryOnly) {
      break;
    }
  }
  return downloads;
}

module.exports = {
  _test: {
    buildSearchFacets,
    isServerCapableProject,
    normalizeProject,
    normalizeSide,
    normalizeVersion,
    shouldInstallProjectFile,
    versionMatches,
  },
  ModrinthProviderError,
  downloadVersionFiles,
  getProject,
  getVersion,
  getVersions,
  resolveDependencies,
  resolveVersion,
  searchModpacks,
};
