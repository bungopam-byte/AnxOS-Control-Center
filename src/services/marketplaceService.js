const fs = require("fs");
const path = require("path");
const agentClient = require("./agentClient");

const TEMPLATE_PATH = path.join(__dirname, "..", "..", "config", "marketplace-templates.json");
const CATEGORIES = ["Minecraft", "Applications", "Databases", "Media", "Bots", "Development", "Networking", "Utilities"];
const PAPER_DEFAULT_BUILD = "latest";

const downloads = new Map();

function createMarketplaceError(message, code = "MARKETPLACE_ERROR") {
  const error = new Error(message);
  error.code = code;
  return error;
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
    PATH_NOT_FOUND: "A required install file or folder was not found.",
    DOWNLOAD_FAILED: "The template download failed.",
    DOWNLOAD_REQUIRED: "This template requires a downloadable server file.",
    DOWNLOAD_URL_INCOMPLETE: "The template download URL is incomplete.",
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

async function listAgentInstanceIds() {
  const list = await agentClient.listInstances();
  return Array.isArray(list?.instances) ? list.instances.map((instance) => instance.id).filter(Boolean) : [];
}

async function verifyAgentInstanceExists(instanceId) {
  const instanceIds = await listAgentInstanceIds();
  if (!instanceIds.includes(instanceId)) {
    throw createMarketplaceError(`Created instance ${instanceId} was not returned by the agent.`, "INSTANCE_NOT_FOUND");
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

function resolveUrlTemplate(template, options = {}) {
  const source = template.downloadSource || {};
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

async function resolveDownloadUrl(template, options = {}) {
  const source = template.downloadSource || {};

  if (
    template.id === "minecraft-paper" &&
    source.type === "url" &&
    source.urlTemplate &&
    (!options.build || String(options.build).toLowerCase() === "latest")
  ) {
    const version = options.version || source.version || "latest";
    const buildsUrl = `https://api.papermc.io/v2/projects/paper/versions/${encodeURIComponent(String(version))}/builds`;
    const response = await fetch(buildsUrl);
    if (!response.ok) {
      throw createMarketplaceError(`Paper build lookup failed with HTTP ${response.status}.`, "DOWNLOAD_FAILED");
    }

    const payload = await response.json();
    const builds = Array.isArray(payload?.builds) ? payload.builds : [];
    const latestBuild = builds
      .map((build) => Number.parseInt(build.build, 10))
      .filter(Number.isFinite)
      .sort((left, right) => right - left)[0];

    if (!Number.isFinite(latestBuild)) {
      throw createMarketplaceError("No Paper builds were available for the selected version.", "DOWNLOAD_FAILED");
    }

    return resolveUrlTemplate(template, { ...options, build: latestBuild });
  }

  return resolveUrlTemplate(template, options);
}

async function writeInstanceText(instanceId, filePath, content) {
  return agentClient.writeInstanceFile(instanceId, filePath, content);
}

async function writeInstanceBuffer(instanceId, filePath, buffer) {
  return agentClient.writeInstanceFile(instanceId, filePath, Buffer.from(buffer).toString("base64"), { encoding: "base64" });
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

function buildInstancePayload(template, options, ports) {
  const name = normalizeName(options.name, template.displayName || "AnxOS Instance");
  const id = slugify(options.id || name);
  const memory = normalizeName(options.memory, template.defaultRam || "");
  const isMinecraft = template.category === "Minecraft";
  const tags = [...new Set([template.category?.toLowerCase(), template.id, isMinecraft ? "minecraft" : null].filter(Boolean))];
  const environment = {};

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
      tags,
    };
  }

  if (template.startupType === "java-jar" || template.instanceType === "minecraft-paper" || template.instanceType === "java-app") {
    const jarName = template.downloadSource?.fileName || options.jar || "server.jar";
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
    tags,
  };
}

async function downloadToInstance(template, options, instanceId, progress) {
  const source = template.downloadSource || {};
  const fileName = source.fileName || "server.jar";
  const downloadRequired = source.required === true || template.id === "minecraft-paper";

  if (options.skipDownload || !source.type || source.type === "manual" || source.type === "docker" || source.type === "docker-compose") {
    if (downloadRequired) {
      throw createMarketplaceError(`${fileName} is required for this template.`, "DOWNLOAD_REQUIRED");
    }
    pushStep(progress, "Downloading", "skipped", "No direct download is required for this template.");
    return { downloaded: false, record: null };
  }

  if (source.type === "inline") {
    const record = createDownloadRecord(template, fileName);
    updateDownload(record, { status: "running", startedAt: new Date().toISOString(), canCancel: false });
    await writeInstanceText(instanceId, fileName, source.content || "");
    updateDownload(record, { status: "complete", progress: 100, bytesReceived: String(source.content || "").length, bytesTotal: String(source.content || "").length });
    pushStep(progress, "Downloading", "complete", `Generated ${fileName}.`);
    return { downloaded: true, record };
  }

  if (source.type === "generated") {
    pushStep(progress, "Downloading", "skipped", "Generated starter project locally.");
    return { downloaded: true, record: null };
  }

  if (source.type !== "url") {
    pushStep(progress, "Downloading", "skipped", "Template source is handled by a future installer.");
    return { downloaded: false, record: null };
  }

  let url;
  try {
    url = await resolveDownloadUrl(template, options);
  } catch (error) {
    if (downloadRequired) {
      throw error;
    }
    pushStep(progress, "Downloading", "skipped", mapMarketplaceError(error, "Download skipped."));
    return { downloaded: false, record: null };
  }
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
    await writeInstanceBuffer(instanceId, fileName, buffer);
    updateDownload(record, {
      status: "complete",
      progress: 100,
      bytesReceived: buffer.length,
      bytesTotal: buffer.length,
      canCancel: false,
      canRetry: false,
    });
    pushStep(progress, "Downloading", "complete", `Downloaded ${fileName}.`);
    return { downloaded: true, record };
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

async function installTemplate(payload = {}) {
  const template = findTemplate(payload.templateId, payload.template);
  const options = payload.options || {};
  const progress = [];
  const ports = parsePorts(options.ports || options.port, template.defaultPorts);
  const instancePayload = buildInstancePayload(template, options, ports);
  const isMinecraft = template.category === "Minecraft";

  try {
    pushStep(progress, "Creating instance", "running", `Creating ${instancePayload.id}.`);
    const createResult = await agentClient.createInstance(instancePayload);
    const instance = createResult.instance || createResult;
    const createdIds = await verifyAgentInstanceExists(instancePayload.id);
    pushStep(progress, "Creating instance", "complete", `Created ${instancePayload.id}. Agent instances: ${createdIds.join(", ") || "none"}.`);

    pushStep(progress, "Creating folders", "running");
    await agentClient.createInstanceFolder(instancePayload.id, ".");
    await agentClient.createInstanceFolder(instancePayload.id, "runtime");
    pushStep(progress, "Creating folders", "complete", `Prepared folders for ${instancePayload.id}.`);

    const generated = generatedFileForTemplate(template, options, ports);
    if (generated) {
      pushStep(progress, "Installing", "running", `Writing ${generated.path}.`);
      await writeInstanceText(instancePayload.id, generated.path, generated.content);
      pushStep(progress, "Installing", "complete", "Starter project generated.");
    }

    const downloadResult = await downloadToInstance(template, options, instancePayload.id, progress);

    pushStep(progress, "Configuring", "running");
    if (isMinecraft) {
      await writeInstanceText(instancePayload.id, "eula.txt", `eula=${options.acceptEula ? "true" : "false"}\n`);
      await agentClient.saveMinecraftProperties(instancePayload.id, buildMinecraftProperties(options, ports));
    } else if (!generated) {
      await writeInstanceText(
        instancePayload.id,
        "index.js",
        [
          `console.log(${JSON.stringify(`${template.displayName} placeholder instance`)})`,
          "setInterval(() => {}, 30000);",
          "",
        ].join("\n")
      );
    }
    pushStep(progress, "Configuring", "complete", "Configuration files generated.");

    let startedInstance = instance;
    const needsDownloadedArtifact = (template.startupType === "java-jar" || template.instanceType === "minecraft-paper" || template.instanceType === "java-app") && !generated;
    if (needsDownloadedArtifact && downloadResult.downloaded) {
      const jarName = template.downloadSource?.fileName || options.jar || "server.jar";
      await agentClient.readInstanceFile(instancePayload.id, jarName);
      pushStep(progress, "Verifying files", "complete", `${jarName} is available.`);
    }

    if (options.start !== false && (!needsDownloadedArtifact || downloadResult.downloaded)) {
      pushStep(progress, "Starting", "running");
      const started = await agentClient.startInstance(instancePayload.id);
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
    pushStep(progress, "Failed", "failed", mapMarketplaceError(error));
    const installError = createMarketplaceError(mapMarketplaceError(error), getAgentErrorCode(error) || "MARKETPLACE_INSTALL_FAILED");
    installError.progress = progress;
    throw installError;
  }
}

module.exports = {
  cancelDownload,
  getDownloads: () => sanitizeDownloads(getDownloads()),
  installTemplate,
  listTemplates,
  retryDownload,
};
