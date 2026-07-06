const fs = require("fs");
const path = require("path");
const agentClient = require("./agentClient");
const { getNodeAgentConfig } = require("./nodeService");

const TEMPLATE_PATH = path.join(__dirname, "..", "..", "config", "marketplace-templates.json");
const CATEGORIES = ["Minecraft", "Game Servers", "Applications", "Databases", "Media", "Bots", "Development", "Networking", "Utilities"];
const PAPER_DEFAULT_BUILD = "latest";
const MOJANG_VERSION_MANIFEST_URL = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
const FABRIC_META_URL = "https://meta.fabricmc.net/v2";
const FORGE_PROMOTIONS_URL = "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json";
const FORGE_MAVEN_METADATA_URL = "https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml";
const NEOFORGE_MAVEN_METADATA_URL = "https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml";
const BUNGEECORD_JAR_URL = "https://hub.spigotmc.org/jenkins/job/BungeeCord/lastSuccessfulBuild/artifact/bootstrap/target/BungeeCord.jar";
const COMMUNITY_TEMPLATE_FORMAT_VERSION = 1;

const downloads = new Map();

function createMarketplaceError(message, code = "MARKETPLACE_ERROR", details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function truncateText(value, maxLength = 1200) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function formatErrorDetails(details = {}) {
  const parts = [];
  if (details.templateId) parts.push(`templateId=${details.templateId}`);
  if (details.step) parts.push(`step=${details.step}`);
  if (details.url) parts.push(`url=${details.url}`);
  if (details.status) parts.push(`status=${details.status}`);
  if (details.body) parts.push(`body=${truncateText(details.body, 500)}`);
  if (details.message) parts.push(`message=${details.message}`);
  return parts.length ? ` (${parts.join(" | ")})` : "";
}

function createMarketplaceStepError(message, code, details = {}) {
  return createMarketplaceError(`${message}${formatErrorDetails(details)}`, code, details);
}

function getAgentErrorCode(error) {
  return error?.payload?.error?.code || error?.code || null;
}

function mapMarketplaceError(error, fallback = "Template install failed.") {
  const code = getAgentErrorCode(error);
  const friendlyMessages = {
    INSTANCE_ALREADY_EXISTS: "An instance with this ID already exists.",
    INSTANCE_NOT_FOUND: "The target instance was not found. The install was stopped before file setup.",
    NOT_FOUND: "The target instance was not found. The install was stopped before file setup.",
    INSTANCE_VERIFICATION_FAILED: error?.message || "Created instance could not be verified.",
    PATH_NOT_FOUND: "A required install file or folder was not found.",
    DOWNLOAD_FAILED: "The template download failed.",
    DOWNLOAD_REQUIRED: "This template requires a downloadable server file.",
    DOWNLOAD_URL_INCOMPLETE: "The template download URL is incomplete.",
    DOWNLOAD_RESOLVE_FAILED: "Unable to resolve the latest server download.",
    INSTALLER_NOT_SUPPORTED: "This server template cannot be fully automated yet.",
    MANUAL_SETUP_REQUIRED: "This server requires manual setup before AnxHub can start it.",
    FABRIC_RESOLVE_FAILED: "Unable to resolve Fabric download.",
    FORGE_RESOLVE_FAILED: "Unable to download Forge installer.",
    NEOFORGE_RESOLVE_FAILED: "Unable to download NeoForge installer.",
    PROXY_RESOLVE_FAILED: "Unable to resolve proxy download.",
    TEMPLATE_NOT_READY: "This template is not ready yet.",
    TEMPLATE_INSTALL_TIMEOUT: "The template installer did not finish in time.",
    TEMPLATE_INSTALL_FAILED: "The server installer failed. Check the instance logs for setup details.",
    STARTUP_CONFIGURATION_FAILED: "The startup command could not be configured.",
  };

  return friendlyMessages[code] || error?.message || fallback;
}

function readTemplatesFile() {
  const raw = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw createMarketplaceError("Template catalog must contain an array.", "INVALID_TEMPLATE_CATALOG");
  }

  return parsed.map((template) => ({
    screenshots: [],
    author: "AnxOS",
    version: "1.0.0",
    defaultPorts: [],
    configurationSchema: [],
    installScript: [],
    ...template,
  }));
}

function listTemplates() {
  const templates = readTemplatesFile();
  return {
    categories: CATEGORIES,
    templates,
  };
}

function findTemplate(templateId, templateOverride = null) {
  if (templateOverride && typeof templateOverride === "object") {
    return {
      screenshots: [],
      author: "AnxOS",
      version: "1.0.0",
      defaultPorts: [],
      configurationSchema: [],
      installScript: [],
      ...templateOverride,
    };
  }

  const template = readTemplatesFile().find((entry) => entry.id === templateId);
  if (!template) {
    throw createMarketplaceError(`Template ${templateId || "unknown"} was not found.`, "TEMPLATE_NOT_FOUND");
  }

  return template;
}

function validateCommunityTemplate(template = {}) {
  const id = String(template.id || "").trim();
  const hasDownloadSource = Boolean(template.downloadSource) || (Array.isArray(template.downloads) && template.downloads.length > 0) || Boolean(template.installer);
  const hasDockerImage = template.runtime === "docker" && Boolean(template.docker?.image || template.downloadSource?.image);
  if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(id)) {
    throw createMarketplaceError("Community template id is invalid.", "INVALID_COMMUNITY_TEMPLATE");
  }
  if (!String(template.displayName || "").trim()) {
    throw createMarketplaceError("Community template displayName is required.", "INVALID_COMMUNITY_TEMPLATE");
  }
  if (!String(template.category || "").trim()) {
    throw createMarketplaceError("Community template category is required.", "INVALID_COMMUNITY_TEMPLATE");
  }
  if (template.disabled !== true && template.comingSoon !== true && !hasDownloadSource && !hasDockerImage) {
    throw createMarketplaceError("Community template must define a real download source, Docker image, or be disabled.", "INVALID_COMMUNITY_TEMPLATE");
  }

  return {
    screenshots: [],
    author: "Community",
    version: "1.0.0",
    defaultPorts: [],
    configurationSchema: [],
    installScript: [],
    formatVersion: COMMUNITY_TEMPLATE_FORMAT_VERSION,
    ...template,
    tags: Array.isArray(template.tags) ? template.tags : [],
  };
}

function importCommunityTemplate(payload = {}) {
  const template = validateCommunityTemplate(payload.template || payload);
  return {
    template,
    installable: !(template.disabled || template.comingSoon),
    warnings: template.runtime === "docker" && !template.docker?.image && !template.downloadSource?.image
      ? ["Docker templates should define docker.image or downloadSource.image."]
      : [],
  };
}

function getImportSupport() {
  return {
    communityTemplates: {
      supported: true,
      formatVersion: COMMUNITY_TEMPLATE_FORMAT_VERSION,
      requiredFields: ["id", "displayName", "category"],
      installableWhen: "Template declares a real download source, SteamCMD installer, Docker image, or is explicitly disabled.",
    },
    modpacks: {
      modrinth: {
        supported: true,
        mode: "metadata-validation",
        notes: "Modrinth .mrpack import can be validated and converted into a community template when server files are available.",
      },
      curseforge: {
        supported: false,
        reason: "CurseForge imports often require API credentials or user-authorized downloads, so automated one-click install is not enabled by default.",
      },
    },
  };
}

function normalizeName(value, fallback) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || `instance-${Date.now()}`;
}

function parsePorts(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((port) => Number.parseInt(port, 10)).filter((port) => Number.isInteger(port) && port > 0 && port <= 65535);
  }

  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 && value <= 65535 ? [value] : [];
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((port) => Number.parseInt(port.trim(), 10))
      .filter((port) => Number.isInteger(port) && port > 0 && port <= 65535);
  }

  return Array.isArray(fallback) ? fallback : [];
}

async function listAgentInstanceIds(agentConfig = null) {
  const list = await agentClient.listInstances(agentConfig);
  return Array.isArray(list?.instances) ? list.instances.map((instance) => instance.id).filter(Boolean) : [];
}

function resolveCreatedInstanceId(createResult, fallbackId) {
  return createResult?.instance?.id ||
    createResult?.id ||
    createResult?.data?.id ||
    createResult?.data?.instance?.id ||
    fallbackId;
}

async function verifyAgentInstanceExists(instanceId, agentConfig = null) {
  const instanceIds = await listAgentInstanceIds(agentConfig);
  if (!instanceIds.includes(instanceId)) {
    throw createMarketplaceError(
      `Created instance could not be verified. Expected ${instanceId}. Available: ${instanceIds.join(", ") || "none"}.`,
      "INSTANCE_VERIFICATION_FAILED"
    );
  }

  return instanceIds;
}

function pushStep(progress, label, status = "complete", detail = "") {
  const step = {
    label,
    status,
    detail,
    timestamp: new Date().toISOString(),
  };
  progress.push(step);
  return step;
}

function createDownloadRecord(template, fileName) {
  const id = `${template.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id,
    templateId: template.id,
    name: fileName || template.displayName || template.id,
    status: "queued",
    progress: 0,
    bytesReceived: 0,
    bytesTotal: null,
    speedBytesPerSecond: 0,
    etaSeconds: null,
    error: null,
    startedAt: null,
    updatedAt: new Date().toISOString(),
    canRetry: false,
    canCancel: false,
  };
  downloads.set(id, record);
  return record;
}

function updateDownload(record, patch) {
  Object.assign(record, patch, { updatedAt: new Date().toISOString() });
  downloads.set(record.id, record);
  return record;
}

function getDownloads() {
  return {
    downloads: [...downloads.values()].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
  };
}

function cancelDownload(downloadId) {
  const record = downloads.get(downloadId);
  if (!record) {
    throw createMarketplaceError("Download was not found.", "DOWNLOAD_NOT_FOUND");
  }

  if (record.controller) {
    record.controller.abort();
  }

  updateDownload(record, {
    status: "cancelled",
    canCancel: false,
    canRetry: true,
  });

  return { download: sanitizeDownload(record) };
}

function retryDownload(downloadId) {
  const record = downloads.get(downloadId);
  if (!record) {
    throw createMarketplaceError("Download was not found.", "DOWNLOAD_NOT_FOUND");
  }

  updateDownload(record, {
    status: "queued",
    progress: 0,
    bytesReceived: 0,
    speedBytesPerSecond: 0,
    etaSeconds: null,
    error: null,
    canRetry: false,
  });

  return { download: sanitizeDownload(record) };
}

function sanitizeDownload(record) {
  const { controller, ...safeRecord } = record;
  return safeRecord;
}

function sanitizeDownloads(payload) {
  return {
    downloads: (payload.downloads || []).map(sanitizeDownload),
  };
}

function normalizeInstanceFilePath(filePath) {
  const normalized = String(filePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^data\/+/i, "");
  return normalized || "server.jar";
}

function fileNameFromDestination(destination) {
  return path.posix.basename(normalizeInstanceFilePath(destination));
}

function resolveUrlTemplate(download, options = {}) {
  const source = download || {};
  let url = source.url || source.urlTemplate || "";
  const replacements = {
    version: options.version || source.version || "latest",
    build: options.build || source.build || PAPER_DEFAULT_BUILD,
  };

  Object.entries(replacements).forEach(([key, value]) => {
    url = url.replaceAll(`{${key}}`, encodeURIComponent(String(value)));
  });

  return url;
}

async function fetchJson(url, label) {
  const response = await fetch(url);
  if (!response.ok) {
    throw createMarketplaceError(`${label} failed with HTTP ${response.status}.`, "DOWNLOAD_RESOLVE_FAILED");
  }

  return response.json();
}

function latestFromList(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  return values[values.length - 1];
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

async function resolvePaperDownload(download, options = {}) {
  const project = download.project || "paper";
  const projectUrl = `https://fill.papermc.io/v3/projects/${encodeURIComponent(project)}`;
  const versionsPayload = await fetchJson(`${projectUrl}/versions`, "Paper version lookup");
  const requestedVersion = options.version || download.version || "latest";
  const versionEntries = Array.isArray(versionsPayload?.versions) ? versionsPayload.versions : [];
  const candidateVersions = String(requestedVersion).toLowerCase() === "latest"
    ? versionEntries.map((entry) => entry?.version?.id).filter(Boolean)
    : [requestedVersion];

  for (const version of candidateVersions) {
    const builds = await fetchJson(`${projectUrl}/versions/${encodeURIComponent(String(version))}/builds`, "Paper build lookup");
    const buildEntries = Array.isArray(builds) ? builds : Array.isArray(builds?.builds) ? builds.builds : [];
    const requestedBuild = options.build || download.build || PAPER_DEFAULT_BUILD;
    const stableBuilds = buildEntries.filter((build) => String(build?.channel || "").toUpperCase() === "STABLE");
    const selectedBuild = String(requestedBuild).toLowerCase() === "latest"
      ? stableBuilds.sort((left, right) => Number(right.id || right.build) - Number(left.id || left.build))[0]
      : buildEntries.find((build) => String(build?.id || build?.build) === String(requestedBuild));
    const serverDownload = selectedBuild?.downloads?.["server:default"] || selectedBuild?.downloads?.server;

    if (selectedBuild && serverDownload?.url) {
      return {
        url: serverDownload.url,
        version,
        build: selectedBuild.id || selectedBuild.build,
        checksum: serverDownload.checksums?.sha256 || null,
        size: serverDownload.size || null,
      };
    }
  }

  throw createMarketplaceError("Unable to resolve latest stable Paper build.", "DOWNLOAD_RESOLVE_FAILED");
}

async function resolvePaperProjectDownload(download, options = {}) {
  const project = download.project || "paper";
  const projectUrl = `https://fill.papermc.io/v3/projects/${encodeURIComponent(project)}`;
  const versionsPayload = await fetchJson(`${projectUrl}/versions`, `${project} version lookup`);
  const requestedVersion = options.version || download.version || "latest";
  const versionEntries = Array.isArray(versionsPayload?.versions) ? versionsPayload.versions : [];
  const candidateVersions = String(requestedVersion).toLowerCase() === "latest"
    ? versionEntries.map((entry) => entry?.version?.id).filter(Boolean)
    : [requestedVersion];

  for (const version of candidateVersions) {
    const builds = await fetchJson(`${projectUrl}/versions/${encodeURIComponent(String(version))}/builds`, `${project} build lookup`);
    const buildEntries = Array.isArray(builds) ? builds : Array.isArray(builds?.builds) ? builds.builds : [];
    const requestedBuild = options.build || download.build || "latest";
    const stableBuilds = buildEntries.filter((build) => String(build?.channel || "").toUpperCase() === "STABLE");
    const selectedBuild = String(requestedBuild).toLowerCase() === "latest"
      ? stableBuilds.sort((left, right) => Number(right.id || right.build) - Number(left.id || left.build))[0]
      : buildEntries.find((build) => String(build?.id || build?.build) === String(requestedBuild));
    const serverDownload = selectedBuild?.downloads?.["server:default"] || selectedBuild?.downloads?.server;

    if (selectedBuild && serverDownload?.url) {
      return {
        url: serverDownload.url,
        version,
        build: selectedBuild.id || selectedBuild.build,
        checksum: serverDownload.checksums?.sha256 || null,
        size: serverDownload.size || null,
      };
    }
  }

  throw createMarketplaceError("Unable to resolve proxy download.", "PROXY_RESOLVE_FAILED");
}

async function resolvePurpurDownload(download, options = {}) {
  const projectUrl = "https://api.purpurmc.org/v2/purpur";
  const projectPayload = await fetchJson(projectUrl, "Purpur version lookup");
  const requestedVersion = options.version || download.version || "latest";
  const version = String(requestedVersion).toLowerCase() === "latest"
    ? latestFromList(projectPayload?.versions)
    : requestedVersion;

  if (!version) {
    throw createMarketplaceError("Unable to resolve latest Purpur version.", "DOWNLOAD_RESOLVE_FAILED");
  }

  const versionPayload = await fetchJson(`${projectUrl}/${encodeURIComponent(String(version))}`, "Purpur build lookup");
  const builds = versionPayload?.builds;
  const allBuilds = Array.isArray(builds?.all) ? builds.all : Array.isArray(builds) ? builds : [];
  const requestedBuild = options.build || download.build || "latest";
  const build = String(requestedBuild).toLowerCase() === "latest"
    ? builds?.latest || latestFromList(allBuilds)
    : requestedBuild;

  if (!build) {
    throw createMarketplaceError("Unable to resolve latest Purpur build.", "DOWNLOAD_RESOLVE_FAILED");
  }

  return {
    url: `${projectUrl}/${encodeURIComponent(String(version))}/${encodeURIComponent(String(build))}/download`,
    version,
    build,
  };
}

async function resolveFabricDownload(download, options = {}) {
  const games = await fetchJson(`${FABRIC_META_URL}/versions/game`, "Fabric game version lookup");
  const loaders = await fetchJson(`${FABRIC_META_URL}/versions/loader`, "Fabric loader lookup");
  const installers = await fetchJson(`${FABRIC_META_URL}/versions/installer`, "Fabric installer lookup");
  const requestedVersion = options.version || download.version || "latest";
  const game = String(requestedVersion).toLowerCase() === "latest"
    ? games.find((entry) => entry.stable)?.version
    : requestedVersion;
  const loader = loaders.find((entry) => entry.stable)?.version || loaders[0]?.version;
  const installer = installers.find((entry) => entry.stable)?.version || installers[0]?.version;

  if (!game || !loader || !installer) {
    throw createMarketplaceError("Unable to resolve Fabric download.", "FABRIC_RESOLVE_FAILED");
  }

  return {
    url: `${FABRIC_META_URL}/versions/loader/${encodeURIComponent(String(game))}/${encodeURIComponent(String(loader))}/${encodeURIComponent(String(installer))}/server/jar`,
    version: game,
    build: loader,
  };
}

async function resolveForgeDownload(download, options = {}) {
  const requestedVersion = options.version || download.version || "latest";
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
    const response = await fetch(FORGE_MAVEN_METADATA_URL);
    if (!response.ok) {
      throw createMarketplaceError("Unable to download Forge installer.", "FORGE_RESOLVE_FAILED");
    }
    const metadata = await response.text();
    forgeVersion = extractXmlTag(metadata, "release") || extractXmlTag(metadata, "latest");
  }

  if (!forgeVersion) {
    throw createMarketplaceError("Unable to download Forge installer.", "FORGE_RESOLVE_FAILED");
  }

  return {
    url: `https://maven.minecraftforge.net/net/minecraftforge/forge/${encodeURIComponent(forgeVersion)}/forge-${encodeURIComponent(forgeVersion)}-installer.jar`,
    version: forgeVersion.split("-")[0],
    build: forgeVersion,
  };
}

async function resolveNeoForgeDownload(download, options = {}) {
  const requestedVersion = options.version || download.version || "latest";
  const response = await fetch(NEOFORGE_MAVEN_METADATA_URL);
  if (!response.ok) {
    throw createMarketplaceError("Unable to download NeoForge installer.", "NEOFORGE_RESOLVE_FAILED");
  }

  const metadata = await response.text();
  const versions = extractXmlTags(metadata, "version");
  let neoForgeVersion = extractXmlTag(metadata, "release") || extractXmlTag(metadata, "latest");
  if (String(requestedVersion).toLowerCase() !== "latest") {
    neoForgeVersion = versions.filter((version) => version.startsWith(`${requestedVersion}.`)).at(-1) || neoForgeVersion;
  }

  if (!neoForgeVersion) {
    throw createMarketplaceError("Unable to download NeoForge installer.", "NEOFORGE_RESOLVE_FAILED");
  }

  return {
    url: `https://maven.neoforged.net/releases/net/neoforged/neoforge/${encodeURIComponent(neoForgeVersion)}/neoforge-${encodeURIComponent(neoForgeVersion)}-installer.jar`,
    version: String(requestedVersion).toLowerCase() === "latest" ? inferNeoForgeMinecraftVersion(neoForgeVersion) || requestedVersion : requestedVersion,
    build: neoForgeVersion,
  };
}

async function resolveBungeeCordDownload() {
  return {
    url: BUNGEECORD_JAR_URL,
    version: "latest",
  };
}

async function resolveGithubReleaseDownload(download) {
  const repo = String(download.repo || "").trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw createMarketplaceError("GitHub release resolver is missing a repo.", "DOWNLOAD_RESOLVE_FAILED");
  }

  const release = await fetchJson(`https://api.github.com/repos/${repo}/releases/latest`, "GitHub release lookup");
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const pattern = download.assetPattern ? new RegExp(download.assetPattern, "i") : null;
  const asset = assets.find((entry) => {
    return entry?.browser_download_url && (!pattern || pattern.test(entry.name || ""));
  });

  if (!asset?.browser_download_url) {
    throw createMarketplaceError("Unable to resolve GitHub release asset.", "DOWNLOAD_RESOLVE_FAILED");
  }

  return {
    url: asset.browser_download_url,
    version: release?.tag_name || "latest",
    size: asset.size || null,
  };
}

async function resolveFiveMDownload() {
  const listingUrl = "https://runtime.fivem.net/artifacts/fivem/build_proot_linux/master/";
  const response = await fetch(listingUrl);
  if (!response.ok) {
    throw createMarketplaceError(`FiveM artifact lookup failed with HTTP ${response.status}.`, "DOWNLOAD_RESOLVE_FAILED");
  }

  const html = await response.text();
  const hrefs = [...html.matchAll(/href="([^"]+fx\.tar\.xz)"/gi)].map((match) => match[1]);
  const href = hrefs[0];
  if (!href) {
    throw createMarketplaceError("Unable to resolve latest FiveM FXServer artifact.", "DOWNLOAD_RESOLVE_FAILED");
  }

  return {
    url: new URL(href, listingUrl).toString(),
    version: "latest",
  };
}

async function resolveVanillaDownload(download, options = {}) {
  const manifest = await fetchJson(download.manifestUrl || MOJANG_VERSION_MANIFEST_URL, "Mojang version lookup");
  const requestedVersion = options.version || download.version || "latest";
  const versionId = String(requestedVersion).toLowerCase() === "latest"
    ? manifest?.latest?.release
    : requestedVersion;
  const versionEntry = Array.isArray(manifest?.versions)
    ? manifest.versions.find((entry) => entry.id === versionId)
    : null;

  if (!versionEntry?.url) {
    throw createMarketplaceError("Unable to resolve latest Vanilla server version.", "DOWNLOAD_RESOLVE_FAILED");
  }

  const versionPayload = await fetchJson(versionEntry.url, "Mojang server download lookup");
  const url = versionPayload?.downloads?.server?.url;
  if (!url) {
    throw createMarketplaceError("Unable to resolve Vanilla server jar URL.", "DOWNLOAD_RESOLVE_FAILED");
  }

  return {
    url,
    version: versionId,
  };
}

async function resolveDownloadUrl(download, options = {}) {
  if (download.resolver === "papermc") {
    return resolvePaperDownload(download, options);
  }

  if (download.resolver === "paper-project") {
    return resolvePaperProjectDownload(download, options);
  }

  if (download.resolver === "purpur") {
    return resolvePurpurDownload(download, options);
  }

  if (download.resolver === "fabric") {
    return resolveFabricDownload(download, options);
  }

  if (download.resolver === "forge") {
    return resolveForgeDownload(download, options);
  }

  if (download.resolver === "neoforge") {
    return resolveNeoForgeDownload(download, options);
  }

  if (download.resolver === "bungeecord") {
    return resolveBungeeCordDownload(download, options);
  }

  if (download.resolver === "github-release") {
    return resolveGithubReleaseDownload(download, options);
  }

  if (download.resolver === "fivem-linux") {
    return resolveFiveMDownload(download, options);
  }

  if (download.resolver === "mojang-vanilla") {
    return resolveVanillaDownload(download, options);
  }

  return { url: resolveUrlTemplate(download, options) };
}

async function writeInstanceText(instanceId, filePath, content, agentConfig = null) {
  return agentClient.writeInstanceFile(instanceId, filePath, content, { config: agentConfig });
}

async function writeInstanceBuffer(instanceId, filePath, buffer, agentConfig = null) {
  return agentClient.writeInstanceFile(instanceId, filePath, Buffer.from(buffer).toString("base64"), { encoding: "base64", config: agentConfig });
}

function buildMinecraftProperties(options, ports) {
  const port = ports[0] || 25565;
  return {
    "server-port": String(port),
    motd: options.motd || `${normalizeName(options.name, "AnxOS Server")} on AnxOS`,
    "max-players": String(options.maxPlayers || 20),
    difficulty: options.difficulty || "normal",
    gamemode: options.gamemode || "survival",
    "view-distance": String(options.viewDistance || 10),
    "simulation-distance": String(options.simulationDistance || 10),
    "online-mode": options.onlineMode === false ? "false" : "true",
    "allow-flight": options.allowFlight ? "true" : "false",
    "spawn-protection": String(options.spawnProtection || 16),
    pvp: options.pvp === false ? "false" : "true",
    "white-list": options.whitelist ? "true" : "false",
    "generate-structures": options.generateStructures === false ? "false" : "true",
    "level-seed": options.seed || "",
  };
}

function firstPort(ports, fallback = 3000) {
  return Array.isArray(ports) && ports[0] ? ports[0] : fallback;
}

function shellQuote(value) {
  return `'${String(value ?? "").replace(/'/g, "'\"'\"'")}'`;
}

function templateValue(key, template, options = {}, ports = []) {
  const values = {
    id: slugify(options.id || options.name || template.id),
    name: normalizeName(options.name, template.displayName || template.id),
    displayName: template.displayName || template.id,
    memory: normalizeName(options.memory, template.defaultRam || ""),
    port: String(firstPort(ports, firstPort(template.defaultPorts, 3000))),
    version: options.version || "latest",
    jar: getPrimaryArtifactName(template, options),
  };

  return values[key] ?? "";
}

function expandTemplateString(value, template, options = {}, ports = []) {
  return String(value ?? "").replace(/\{([a-zA-Z0-9_-]+)\}/g, (_, key) => {
    return String(templateValue(key, template, options, ports));
  });
}

function expandTemplateArray(values = [], template, options = {}, ports = []) {
  return Array.isArray(values)
    ? values.map((value) => expandTemplateString(value, template, options, ports))
    : [];
}

function buildConfigFileContent(configFile, template, options, ports) {
  if (Array.isArray(configFile.lines)) {
    return `${configFile.lines.map((line) => expandTemplateString(line, template, options, ports)).join("\n")}\n`;
  }

  if (configFile.content !== undefined) {
    return expandTemplateString(configFile.content, template, options, ports);
  }

  return "";
}

function buildSteamCmdInstallerScript(installer) {
  const installDir = installer.installDir || "server";
  const login = installer.login === "required"
    ? [
      "echo \"This server requires a Steam account login and cannot be installed automatically yet.\" >&2",
      "exit 42",
    ].join("\n")
    : "login anonymous";
  const validate = installer.validate === false ? "" : " validate";
  const extraCommands = Array.isArray(installer.extraCommands) ? installer.extraCommands : [];
  const commandParts = [
    "+force_install_dir", "\"$INSTALL_DIR\"",
    `+${login}`,
    "+app_update", String(installer.appId), validate.trim(),
    ...extraCommands.map((command) => `+${command}`),
    "+quit",
  ].filter(Boolean);

  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "if ! command -v steamcmd >/dev/null 2>&1; then",
    "  echo \"SteamCMD is required for this template. Install steamcmd on the host, then retry.\" >&2",
    "  exit 127",
    "fi",
    `INSTALL_DIR="${installDir}"`,
    "mkdir -p \"$INSTALL_DIR\"",
    `steamcmd ${commandParts.join(" ")}`,
    "",
  ].join("\n");
}

function buildArchiveInstallerScript(installer) {
  const archivePath = installer.archive || getPrimaryArtifactPath(installer.template || {}, {});
  const extractDir = installer.extractDir || "server";
  const stripComponents = Number.isInteger(installer.stripComponents) ? installer.stripComponents : 0;
  const tarFlags = String(archivePath).endsWith(".tar.xz") ? "-xJf" : String(archivePath).endsWith(".tar.gz") || String(archivePath).endsWith(".tgz") ? "-xzf" : "";

  if (tarFlags) {
    return [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "if ! command -v tar >/dev/null 2>&1; then",
      "  echo \"tar is required to extract this server runtime.\" >&2",
      "  exit 127",
      "fi",
      `mkdir -p ${shellQuote(extractDir)}`,
      `tar ${tarFlags} ${shellQuote(archivePath)} -C ${shellQuote(extractDir)}${stripComponents > 0 ? ` --strip-components=${stripComponents}` : ""}`,
      "",
    ].join("\n");
  }

  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "if ! command -v unzip >/dev/null 2>&1; then",
    "  echo \"unzip is required to extract this server runtime.\" >&2",
    "  exit 127",
    "fi",
    `mkdir -p ${shellQuote(extractDir)}`,
    `unzip -o ${shellQuote(archivePath)} -d ${shellQuote(extractDir)}`,
    "",
  ].join("\n");
}

function buildTemplateInstallerScript(template) {
  const installer = template.installer || null;
  if (!installer) {
    return null;
  }

  if (installer.type === "steamcmd") {
    if (!installer.appId) {
      throw createMarketplaceError("SteamCMD template is missing an app ID.", "INVALID_TEMPLATE_CATALOG");
    }
    return buildSteamCmdInstallerScript(installer);
  }

  if (installer.type === "archive") {
    return buildArchiveInstallerScript({
      ...installer,
      archive: normalizeInstanceFilePath(installer.archive || getPrimaryArtifactPath(template)),
      template,
    });
  }

  if (installer.type === "manual") {
    throw createMarketplaceError(installer.message || "This server requires manual setup.", "MANUAL_SETUP_REQUIRED");
  }

  throw createMarketplaceError("This installer type is not supported.", "INSTALLER_NOT_SUPPORTED");
}

function generatedFileForTemplate(template, options, ports) {
  const port = ports[0] || 3000;
  const appName = normalizeName(options.name, template.displayName || "AnxOS App");

  if (template.instanceType === "node-app") {
    return {
      path: "index.js",
      content: [
        "const http = require(\"http\");",
        `const port = Number(process.env.PORT || ${port});`,
        `const name = ${JSON.stringify(appName)};`,
        "http.createServer((_, response) => {",
        "  response.writeHead(200, { \"content-type\": \"application/json\" });",
        "  response.end(JSON.stringify({ ok: true, service: name }));",
        "}).listen(port, () => console.log(`${name} listening on ${port}`));",
        "",
      ].join("\n"),
    };
  }

  if (template.instanceType === "python-app") {
    return {
      path: template.id === "python-discord-bot" ? "bot.py" : "app.py",
      content: [
        "import os",
        "import time",
        `name = ${JSON.stringify(appName)}`,
        "print(f\"{name} started\", flush=True)",
        "while True:",
        "    time.sleep(30)",
        "",
      ].join("\n"),
    };
  }

  return null;
}

function getTemplateServerSoftware(template = {}) {
  const searchable = [template.id, template.displayName, template.instanceType, ...(Array.isArray(template.tags) ? template.tags : [])].join(" ").toLowerCase();
  if (searchable.includes("neoforge")) return "NeoForge";
  if (searchable.includes("forge")) return "Forge";
  if (searchable.includes("fabric")) return "Fabric";
  if (searchable.includes("purpur")) return "Purpur";
  if (searchable.includes("paper")) return "Paper";
  if (searchable.includes("vanilla")) return "Vanilla";
  return template.serverSoftware || null;
}

function buildInstancePayload(template, options, ports) {
  const name = normalizeName(options.name, template.displayName || "AnxOS Instance");
  const id = slugify(options.id || name);
  const memory = normalizeName(options.memory, template.defaultRam || "");
  const isMinecraft = template.category === "Minecraft";
  const tags = [...new Set([template.category?.toLowerCase(), template.id, isMinecraft ? "minecraft" : null].filter(Boolean))];
  const environment = {};
  const serverSoftware = getTemplateServerSoftware(template);
  const serverVersion = options.version || template.serverVersion || template.gameVersion || (isMinecraft ? "latest" : null);
  const metadata = {
    version: serverVersion,
    serverVersion,
    serverSoftware,
    minecraftVersion: isMinecraft ? serverVersion : null,
    templateVersion: template.version || null,
    templateId: template.id || null,
    primaryPort: ports[0] || null,
  };

  if (ports[0]) {
    environment.PORT = String(ports[0]);
  }

  if (template.instanceType === "node-app") {
    return {
      id,
      displayName: name,
      type: "node-app",
      workingDirectory: "data",
      executable: "node",
      args: [generatedFileForTemplate(template, options, ports)?.path || "index.js"],
      environment,
      autoStart: Boolean(options.autoStart),
      restartPolicy: "on-failure",
      startupTimeoutMs: 30000,
      shutdownTimeoutMs: 10000,
      memoryLimit: memory,
      ports,
      ...metadata,
      tags,
    };
  }

  if (template.instanceType === "python-app") {
    return {
      id,
      displayName: name,
      type: "python-app",
      workingDirectory: "data",
      executable: "python3",
      args: [generatedFileForTemplate(template, options, ports)?.path || "app.py"],
      environment,
      autoStart: Boolean(options.autoStart),
      restartPolicy: "on-failure",
      startupTimeoutMs: 30000,
      shutdownTimeoutMs: 10000,
      memoryLimit: memory,
      ports,
      ...metadata,
      tags,
    };
  }

  if (template.startupType === "java-jar" || template.instanceType === "minecraft-paper" || template.instanceType === "java-app") {
    const jarName = getPrimaryArtifactName(template, options);
    const args = [];
    if (memory) {
      args.push(`-Xmx${memory}`);
    }
    args.push("-jar", jarName, "nogui");

    return {
      id,
      displayName: name,
      type: template.instanceType || "java-app",
      workingDirectory: "data",
      executable: "java",
      args,
      environment,
      autoStart: Boolean(options.autoStart),
      restartPolicy: "on-failure",
      startupTimeoutMs: 60000,
      shutdownTimeoutMs: 15000,
      memoryLimit: memory,
      ports,
      ...metadata,
      tags,
    };
  }

  if (template.executable) {
    return {
      id,
      displayName: name,
      type: template.instanceType || "custom-command",
      workingDirectory: "data",
      executable: template.executable,
      args: Array.isArray(template.args) ? template.args : [],
      environment,
      autoStart: Boolean(options.autoStart),
      restartPolicy: "on-failure",
      startupTimeoutMs: 30000,
      shutdownTimeoutMs: 10000,
      memoryLimit: memory,
      ports,
      ...metadata,
      tags,
    };
  }

  return {
    id,
    displayName: name,
    type: "custom-command",
    workingDirectory: "data",
    executable: "node",
    args: ["index.js"],
    environment,
    autoStart: Boolean(options.autoStart),
    restartPolicy: "never",
    startupTimeoutMs: 30000,
    shutdownTimeoutMs: 10000,
    memoryLimit: memory,
    ports,
    ...metadata,
    tags,
  };
}

function normalizeTemplateDownloads(template) {
  if (Array.isArray(template.downloads) && template.downloads.length > 0) {
    return template.downloads.map((download) => ({
      type: "url",
      required: true,
      overwrite: true,
      ...download,
      destination: normalizeInstanceFilePath(download.destination || download.fileName || "server.jar"),
    }));
  }

  const source = template.downloadSource || {};
  if (!source.type) {
    return [];
  }

  return [{
    ...source,
    destination: normalizeInstanceFilePath(source.destination || source.fileName || "server.jar"),
    required: source.required === true || template.id === "minecraft-paper",
  }];
}

function getPrimaryArtifactPath(template, options = {}) {
  if (options.jar) {
    return normalizeInstanceFilePath(options.jar);
  }

  const downloads = normalizeTemplateDownloads(template);
  const primary = downloads.find((download) => download.primary !== false) || downloads[0];
  if (primary?.destination) {
    return normalizeInstanceFilePath(primary.destination);
  }

  return normalizeInstanceFilePath(template.downloadSource?.fileName || "server.jar");
}

function getPrimaryArtifactName(template, options = {}) {
  return fileNameFromDestination(getPrimaryArtifactPath(template, options));
}

function templateNeedsDownloadedArtifact(template, generated) {
  return !generated && (template.startupType === "java-jar" || template.instanceType === "minecraft-paper" || template.instanceType === "java-app");
}

function resolveTemplateArgs(args = [], template, options = {}) {
  return Array.isArray(args)
    ? args.map((arg) => expandTemplateString(arg, template, options, parsePorts(options.ports || options.port, template.defaultPorts)))
    : [];
}

function buildStartupPatch(template, options, ports) {
  if (template.startup && typeof template.startup === "object") {
    return {
      executable: template.startup.executable || "java",
      args: resolveTemplateArgs(template.startup.args, template, options),
      workingDirectory: template.startup.workingDirectory || "data",
      memoryLimit: normalizeName(options.memory, template.defaultRam || ""),
      ports,
      restartPolicy: template.startup.restartPolicy || "on-failure",
    };
  }

  if (!(template.startupType === "java-jar" || template.instanceType === "minecraft-paper" || template.instanceType === "java-app")) {
    return null;
  }

  const memory = normalizeName(options.memory, template.defaultRam || "");
  const args = [];
  if (memory) {
    args.push(`-Xmx${memory}`);
  }
  args.push("-jar", getPrimaryArtifactName(template, options), "nogui");

  return {
    executable: "java",
    args,
    workingDirectory: "data",
    memoryLimit: memory,
    ports,
  };
}

async function waitForInstanceInstaller(instanceId, timeoutMs, agentConfig = null) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = await agentClient.getInstanceStatus(instanceId, agentConfig);
    const state = last?.instance?.state || last?.state;
    if (state === "Stopped") {
      return last;
    }
    if (state === "Failed") {
      throw createMarketplaceError("Template installer failed.", "MARKETPLACE_INSTALL_FAILED");
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  try {
    await agentClient.forceKillInstance(instanceId, agentConfig);
  } catch {}
  throw createMarketplaceError("The template installer did not finish in time.", "TEMPLATE_INSTALL_TIMEOUT");
}

async function runTemplatePostInstall(template, options, instanceId, progress, agentConfig = null) {
  const postInstall = template.postInstall;
  if (!postInstall || postInstall.type !== "java-installer") {
    return;
  }

  const installerJar = normalizeInstanceFilePath(postInstall.jar || getPrimaryArtifactPath(template, options));
  await agentClient.readInstanceFile(instanceId, installerJar, agentConfig);
  const installerArgs = ["-jar", fileNameFromDestination(installerJar), ...resolveTemplateArgs(postInstall.args || ["--installServer"], template, options)];

  pushStep(progress, "Installing", "running", `Running ${fileNameFromDestination(installerJar)}.`);
  await agentClient.updateInstance(instanceId, {
    executable: "java",
    args: installerArgs,
    workingDirectory: "data",
    restartPolicy: "never",
    startupTimeoutMs: postInstall.timeoutMs || 300000,
  }, agentConfig);
  await agentClient.startInstance(instanceId, agentConfig);
  await waitForInstanceInstaller(instanceId, postInstall.timeoutMs || 300000, agentConfig);

  const requiredFiles = Array.isArray(postInstall.requiredFiles) ? postInstall.requiredFiles : [];
  for (const requiredFile of requiredFiles) {
    await agentClient.readInstanceFile(instanceId, requiredFile, agentConfig);
  }
  pushStep(progress, "Installing", "complete", "Server installer finished.");
}

async function runTemplateInstaller(template, options, instanceId, progress, agentConfig = null) {
  if (!template.installer) {
    return;
  }

  const script = buildTemplateInstallerScript(template);
  if (!script) {
    return;
  }

  const scriptPath = "runtime/marketplace-install.sh";
  await writeInstanceText(instanceId, scriptPath, script, agentConfig);
  pushStep(progress, "Installing", "running", `Running ${template.installer.type} installer.`);
  await agentClient.updateInstance(instanceId, {
    executable: "bash",
    args: [scriptPath],
    workingDirectory: "data",
    restartPolicy: "never",
    startupTimeoutMs: template.installer.timeoutMs || 600000,
  }, agentConfig);
  await agentClient.startInstance(instanceId, agentConfig);
  await waitForInstanceInstaller(instanceId, template.installer.timeoutMs || 600000, agentConfig);

  const requiredFiles = Array.isArray(template.installer.verifyFiles) ? template.installer.verifyFiles : [];
  for (const requiredFile of requiredFiles) {
    await agentClient.readInstanceFile(instanceId, normalizeInstanceFilePath(requiredFile), agentConfig);
  }
  pushStep(progress, "Installing", "complete", "Server installer finished.");
}

async function writeTemplateConfigFiles(template, options, ports, instanceId, agentConfig = null) {
  const files = Array.isArray(template.configFiles) ? template.configFiles : [];
  for (const configFile of files) {
    if (!configFile?.path) {
      continue;
    }
    await writeInstanceText(
      instanceId,
      normalizeInstanceFilePath(configFile.path),
      buildConfigFileContent(configFile, template, options, ports),
      agentConfig
    );
    await agentClient.readInstanceFile(instanceId, normalizeInstanceFilePath(configFile.path), agentConfig);
  }
}

function buildResolvedVersionMetadata(template, resolved = {}) {
  const serverSoftware = getTemplateServerSoftware(template);
  const minecraftVersion = template.category === "Minecraft" ? resolved.version || null : null;
  const version = serverSoftware && minecraftVersion ? `${serverSoftware} ${minecraftVersion}` : resolved.version || null;
  return {
    version,
    serverVersion: resolved.version || null,
    serverSoftware,
    minecraftVersion,
    buildNumber: resolved.build || null,
  };
}

async function downloadOneToInstance(template, download, options, instanceId, progress, agentConfig = null) {
  const destination = normalizeInstanceFilePath(download.destination || download.fileName || "server.jar");
  const fileName = fileNameFromDestination(destination);
  const downloadRequired = download.required === true;

  if (options.skipDownload || !download.type || download.type === "manual" || download.type === "docker" || download.type === "docker-compose") {
    if (downloadRequired) {
      throw createMarketplaceError(`${fileName} is required for this template.`, "DOWNLOAD_REQUIRED");
    }
    pushStep(progress, "Downloading", "skipped", `No direct download is required for ${fileName}.`);
    return { downloaded: false, record: null };
  }

  if (download.type === "inline") {
    const record = createDownloadRecord(template, fileName);
    updateDownload(record, { status: "running", startedAt: new Date().toISOString(), canCancel: false });
    await writeInstanceText(instanceId, destination, download.content || "", agentConfig);
    updateDownload(record, { status: "complete", progress: 100, bytesReceived: String(download.content || "").length, bytesTotal: String(download.content || "").length });
    pushStep(progress, "Downloading", "complete", `Generated ${fileName}.`);
    return { downloaded: true, record };
  }

  if (download.type === "generated") {
    pushStep(progress, "Downloading", "skipped", "Generated starter project locally.");
    return { downloaded: true, record: null };
  }

  if (download.type === "steamcmd") {
    pushStep(progress, "Downloading", "skipped", "SteamCMD will download server files during installation.");
    return { downloaded: false, record: null };
  }

  if (download.type !== "url") {
    pushStep(progress, "Downloading", "skipped", "Template source is handled by a future installer.");
    return { downloaded: false, record: null };
  }

  let resolved;
  try {
    pushStep(progress, "Resolving download", "running", `Resolving ${fileName}.`);
    resolved = await resolveDownloadUrl(download, options);
    pushStep(progress, "Resolving download", "complete", `Resolved ${fileName}${resolved.version ? ` for ${resolved.version}` : ""}${resolved.build ? ` build ${resolved.build}` : ""}.`);
  } catch (error) {
    if (downloadRequired) {
      throw error;
    }
    pushStep(progress, "Downloading", "skipped", mapMarketplaceError(error, "Download skipped."));
    return { downloaded: false, record: null };
  }
  const url = resolved?.url || "";
  if (!url || url.includes("{")) {
    if (downloadRequired) {
      throw createMarketplaceError("Template download URL is incomplete.", "DOWNLOAD_URL_INCOMPLETE");
    }
    pushStep(progress, "Downloading", "skipped", "Download URL requires version/build data.");
    return { downloaded: false, record: null };
  }

  const record = createDownloadRecord(template, fileName);
  const controller = new AbortController();
  updateDownload(record, {
    status: "running",
    startedAt: new Date().toISOString(),
    canCancel: true,
    controller,
  });

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw createMarketplaceError(`Download failed with HTTP ${response.status}.`, "DOWNLOAD_FAILED");
    }

    const total = Number.parseInt(response.headers.get("content-length") || "", 10);
    const chunks = [];
    let received = 0;
    const started = Date.now();

    if (response.body && typeof response.body.getReader === "function") {
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        chunks.push(Buffer.from(value));
        received += value.length;
        const elapsedSeconds = Math.max((Date.now() - started) / 1000, 0.1);
        const speed = received / elapsedSeconds;
        updateDownload(record, {
          bytesReceived: received,
          bytesTotal: Number.isFinite(total) ? total : null,
          progress: Number.isFinite(total) && total > 0 ? Math.round((received / total) * 100) : 0,
          speedBytesPerSecond: Math.round(speed),
          etaSeconds: Number.isFinite(total) && speed > 0 ? Math.max(Math.round((total - received) / speed), 0) : null,
        });
      }
    } else {
      const arrayBuffer = await response.arrayBuffer();
      chunks.push(Buffer.from(arrayBuffer));
      received = arrayBuffer.byteLength;
    }

    const buffer = Buffer.concat(chunks);
    await writeInstanceBuffer(instanceId, destination, buffer, agentConfig);
    await agentClient.readInstanceFile(instanceId, destination, agentConfig);
    updateDownload(record, {
      status: "complete",
      progress: 100,
      bytesReceived: buffer.length,
      bytesTotal: buffer.length,
      canCancel: false,
      canRetry: false,
    });
    pushStep(progress, "Downloading", "complete", `Downloaded ${fileName}.`);
    pushStep(progress, "Verifying files", "complete", `${destination} is available.`);
    return { downloaded: true, record, metadata: buildResolvedVersionMetadata(template, resolved) };
  } catch (error) {
    const cancelled = error?.name === "AbortError";
    updateDownload(record, {
      status: cancelled ? "cancelled" : "failed",
      error: cancelled ? null : error.message,
      canCancel: false,
      canRetry: true,
    });

    if (downloadRequired) {
      throw error;
    }

    pushStep(progress, "Downloading", "skipped", error.message || "Download skipped.");
    return { downloaded: false, record };
  } finally {
    delete record.controller;
  }
}

async function downloadToInstance(template, options, instanceId, progress, agentConfig = null) {
  const templateDownloads = normalizeTemplateDownloads(template);
  if (!templateDownloads.length) {
    pushStep(progress, "Downloading", "skipped", "No direct download is required for this template.");
    return { downloaded: false, records: [] };
  }

  const records = [];
  const metadata = {};
  let downloaded = false;
  for (const download of templateDownloads) {
    const result = await downloadOneToInstance(template, download, options, instanceId, progress, agentConfig);
    downloaded = downloaded || Boolean(result.downloaded);
    if (result.metadata) {
      Object.entries(result.metadata).forEach(([key, value]) => {
        if (value) {
          metadata[key] = value;
        }
      });
    }
    if (result.record) {
      records.push(result.record);
    }
  }

  return { downloaded, records, metadata };
}

async function installTemplate(payload = {}) {
  const template = findTemplate(payload.templateId, payload.template);
  if (template.comingSoon || template.disabled) {
    throw createMarketplaceError(template.comingSoonMessage || "This template is not ready yet.", "TEMPLATE_NOT_READY");
  }

  const options = payload.options || {};
  const agentConfig = payload.nodeId && payload.nodeId !== "default" ? getNodeAgentConfig(payload.nodeId) : null;
  const progress = [];
  const ports = parsePorts(options.ports || options.port, template.defaultPorts);

  if (template.runtime === "docker" || template.startupType === "docker-image") {
    try {
      pushStep(progress, "Creating container", "running", `Creating ${template.displayName}.`);
      const portMappings = ports.map((port) => `${port}:${port}`);
      const result = await agentClient.createDockerContainer({
        name: slugify(options.id || options.name || template.id),
        image: template.docker?.image || template.downloadSource?.image,
        ports: Array.isArray(template.docker?.ports) ? template.docker.ports : portMappings,
        memory: normalizeName(options.memory, template.defaultRam || ""),
        restartPolicy: template.docker?.restartPolicy || "unless-stopped",
        start: options.start !== false,
        command: template.docker?.command || [],
      }, agentConfig);
      pushStep(progress, "Creating container", "complete", "Docker container created.");
      pushStep(progress, "Complete", "complete", "Installation finished.");
      return {
        template,
        instance: result.container,
        container: result.container,
        progress,
        downloads: sanitizeDownloads(getDownloads()).downloads,
      };
    } catch (error) {
      pushStep(progress, "Failed", "failed", mapMarketplaceError(error, "Docker template install failed."));
      const installError = createMarketplaceError(mapMarketplaceError(error, "Docker template install failed."), getAgentErrorCode(error) || "MARKETPLACE_INSTALL_FAILED");
      installError.progress = progress;
      throw installError;
    }
  }

  const instancePayload = buildInstancePayload(template, options, ports);
  const isMinecraft = template.category === "Minecraft";
  let createdInstanceId = null;

  try {
    console.info("[Marketplace] Create requested.", {
      templateId: template.id,
      generatedInstanceId: instancePayload.id,
      displayName: instancePayload.displayName,
      selectedServerType: options.serverType || null,
    });
    pushStep(progress, "Creating instance", "running", `Creating ${instancePayload.id}.`);
    const createResult = await agentClient.createInstance(instancePayload, agentConfig);
    createdInstanceId = resolveCreatedInstanceId(createResult, instancePayload.id);
    const createRecord = createResult?.instance || createResult?.data?.instance || createResult?.data || createResult || {};
    const instance = typeof createRecord === "object" ? { ...createRecord, id: createdInstanceId } : { id: createdInstanceId };
    console.info("[Marketplace] Create result.", {
      templateId: template.id,
      requestedInstanceId: instancePayload.id,
      createResponse: createResult,
      resolvedCreatedId: createdInstanceId,
    });
    const createdIds = await verifyAgentInstanceExists(createdInstanceId, agentConfig);
    console.info("[Marketplace] Instance verification result.", {
      templateId: template.id,
      requestedInstanceId: instancePayload.id,
      resolvedCreatedId: createdInstanceId,
      refreshedInstanceIds: createdIds,
    });
    pushStep(progress, "Creating instance", "complete", `Created ${createdInstanceId}. Agent instances: ${createdIds.join(", ") || "none"}.`);

    pushStep(progress, "Creating folders", "running");
    await agentClient.createInstanceFolder(createdInstanceId, ".", agentConfig);
    await agentClient.createInstanceFolder(createdInstanceId, "runtime", agentConfig);
    pushStep(progress, "Creating folders", "complete", `Prepared folders for ${createdInstanceId}.`);

    const generated = generatedFileForTemplate(template, options, ports);
    if (generated) {
      pushStep(progress, "Installing", "running", `Writing ${generated.path}.`);
      await writeInstanceText(createdInstanceId, generated.path, generated.content, agentConfig);
      pushStep(progress, "Installing", "complete", "Starter project generated.");
    }

    const downloadResult = await downloadToInstance(template, options, createdInstanceId, progress, agentConfig);
    if (downloadResult.metadata && Object.keys(downloadResult.metadata).length > 0) {
      pushStep(progress, "Detecting version", "running", "Saving resolved server version metadata.");
      await agentClient.updateInstance(createdInstanceId, downloadResult.metadata, agentConfig);
      Object.assign(instance, downloadResult.metadata);
      pushStep(progress, "Detecting version", "complete", downloadResult.metadata.version || downloadResult.metadata.serverVersion || "Version metadata saved.");
    }
    await runTemplateInstaller(template, options, createdInstanceId, progress, agentConfig);

    pushStep(progress, "Configuring", "running");
    if (isMinecraft) {
      await writeInstanceText(createdInstanceId, "eula.txt", `eula=${options.acceptEula ? "true" : "false"}\n`, agentConfig);
      await agentClient.saveMinecraftProperties(createdInstanceId, buildMinecraftProperties(options, ports), agentConfig);
      await agentClient.readInstanceFile(createdInstanceId, "eula.txt", agentConfig);
      await agentClient.readInstanceFile(createdInstanceId, "server.properties", agentConfig);
    } else if (Array.isArray(template.configFiles) && template.configFiles.length > 0) {
      await writeTemplateConfigFiles(template, options, ports, createdInstanceId, agentConfig);
    } else if (!generated && !normalizeTemplateDownloads(template).length && !template.startup) {
      await writeInstanceText(
        createdInstanceId,
        "index.js",
        [
          `console.log(${JSON.stringify(`${template.displayName} placeholder instance`)})`,
          "setInterval(() => {}, 30000);",
          "",
        ].join("\n"),
        agentConfig
      );
    }
    pushStep(progress, "Configuring", "complete", "Configuration files generated.");

    await runTemplatePostInstall(template, options, createdInstanceId, progress, agentConfig);

    const startupPatch = buildStartupPatch(template, options, ports);
    if (startupPatch) {
      pushStep(progress, "Finalizing installation", "running", "Configuring startup command.");
      const updated = await agentClient.updateInstance(createdInstanceId, startupPatch, agentConfig);
      const updatedInstance = updated?.instance || updated;
      if (updatedInstance?.executable !== startupPatch.executable || !Array.isArray(updatedInstance?.args) || updatedInstance.args.join("\n") !== startupPatch.args.join("\n")) {
        throw createMarketplaceError("Startup command was not configured.", "STARTUP_CONFIGURATION_FAILED");
      }
      pushStep(progress, "Finalizing installation", "complete", `Startup command configured: ${startupPatch.executable} ${startupPatch.args.join(" ")}.`);
    }

    let startedInstance = instance;
    const needsDownloadedArtifact = templateNeedsDownloadedArtifact(template, generated);
    if (needsDownloadedArtifact && downloadResult.downloaded) {
      const jarPath = getPrimaryArtifactPath(template, options);
      await agentClient.readInstanceFile(createdInstanceId, jarPath, agentConfig);
      pushStep(progress, "Verifying files", "complete", `${jarPath} is available.`);
    }

    if (startupPatch) {
      const refreshedIds = await verifyAgentInstanceExists(createdInstanceId, agentConfig);
      if (!startupPatch.executable || !Array.isArray(startupPatch.args) || startupPatch.args.length === 0) {
        throw createMarketplaceError("Startup command was not configured.", "STARTUP_CONFIGURATION_FAILED");
      }
      pushStep(progress, "Verifying instance", "complete", `Verified ${createdInstanceId}. Agent instances: ${refreshedIds.join(", ") || "none"}.`);
    }

    if (template.manualStartRequired) {
      pushStep(progress, "Starting", "skipped", template.manualStartMessage || "Manual setup is required before this server can start.");
    } else if (options.start !== false && (!needsDownloadedArtifact || downloadResult.downloaded)) {
      pushStep(progress, "Starting", "running");
      const started = await agentClient.startInstance(createdInstanceId, agentConfig);
      startedInstance = started.instance || started;
      pushStep(progress, "Starting", "complete", "Instance start requested.");
    } else {
      pushStep(progress, "Starting", "skipped", needsDownloadedArtifact ? "Start skipped until the server jar is available." : "Start was disabled for this install.");
    }

    pushStep(progress, "Complete", "complete", "Installation finished.");

    return {
      template,
      instance: startedInstance,
      progress,
      downloads: sanitizeDownloads(getDownloads()).downloads,
    };
  } catch (error) {
    if (createdInstanceId && template.rollbackOnFailure !== false) {
      try {
        await agentClient.deleteInstance(createdInstanceId, agentConfig);
        pushStep(progress, "Rollback", "complete", `Removed incomplete instance ${createdInstanceId}.`);
      } catch {
        pushStep(progress, "Rollback", "failed", `Could not remove incomplete instance ${createdInstanceId}.`);
      }
    }
    pushStep(progress, "Failed", "failed", mapMarketplaceError(error));
    const installError = createMarketplaceError(mapMarketplaceError(error), getAgentErrorCode(error) || "MARKETPLACE_INSTALL_FAILED");
    installError.progress = progress;
    throw installError;
  }
}

module.exports = {
  _test: {
    buildTemplateInstallerScript,
    normalizeTemplateDownloads,
    parsePorts,
  },
  cancelDownload,
  getDownloads: () => sanitizeDownloads(getDownloads()),
  getImportSupport,
  importCommunityTemplate,
  installTemplate,
  listTemplates,
  retryDownload,
  validateCommunityTemplate,
};
