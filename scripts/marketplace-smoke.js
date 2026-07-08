const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const marketplaceService = require("../src/services/marketplaceService");
const marketplaceInstallService = require("../src/services/marketplaceInstallService");
const modrinthProvider = require("../src/services/providers/modrinthProvider");
const curseforgeProvider = require("../src/services/providers/curseforgeProvider");

const catalogPath = path.join(__dirname, "..", "config", "marketplace-templates.json");
const appPath = path.join(__dirname, "..", "app.js");
const indexPath = path.join(__dirname, "..", "index.html");
const preloadPath = path.join(__dirname, "..", "preload.js");
const marketplaceIpcPath = path.join(__dirname, "..", "src", "ipc", "marketplaceIpc.js");
const templates = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

function pickVersionTrace(value = {}) {
  return {
    gameVersion: value.gameVersion || value.versionInfo?.gameVersion || null,
    minecraftVersion: value.minecraftVersion || value.versionInfo?.minecraftVersion || null,
    version: value.version || value.versionName || value.displayVersion || null,
    versionInfo: value.versionInfo || null,
    detectedVersion: value.detectedVersion || value.detectedVersionAt || null,
    providerVersion: value.providerVersion || value.serverSoftware || value.versionInfo?.software || null,
  };
}

function findTemplate(id) {
  const template = templates.find((entry) => entry.id === id);
  assert(template, `Missing template: ${id}`);
  return template;
}

function assertCatalogLoads() {
  const catalog = marketplaceService.listTemplates();
  assert(Array.isArray(catalog.categories), "Catalog categories must be an array.");
  assert(catalog.categories.includes("Game Servers"), "Catalog must include Game Servers.");
  assert(Array.isArray(catalog.templates), "Catalog templates must be an array.");
  assert(catalog.templates.length >= templates.length, "Service catalog should expose templates.");
}

async function assertDisabledTemplatesAreBlocked() {
  const hytale = findTemplate("hytale");
  assert.strictEqual(hytale.disabled, true, "Hytale must be disabled.");
  assert.strictEqual(hytale.comingSoon, true, "Hytale must be marked coming soon.");
  assert.match(hytale.comingSoonMessage || "", /official hytale dedicated server binaries are not publicly available/i);
  assert.deepStrictEqual(hytale.installScript, [], "Hytale must not define installer steps without official binaries.");

  await assert.rejects(
    () => marketplaceService.installTemplate({ templateId: "hytale", options: { name: "Hytale Smoke" } }),
    (error) => error?.code === "TEMPLATE_NOT_READY"
  );
}

function assertSteamCmdTemplates() {
  const expected = new Map([
    ["valheim", 896660],
    ["rust", 258550],
    ["cs2", 730],
    ["palworld", 2394010],
  ]);

  for (const [id, appId] of expected) {
    const template = findTemplate(id);
    assert.strictEqual(template.category, "Game Servers", `${id} must be a game server.`);
    assert.strictEqual(template.installer?.type, "steamcmd", `${id} must use SteamCMD.`);
    assert.strictEqual(template.installer?.appId, appId, `${id} must use app ${appId}.`);
    assert(Array.isArray(template.installer.verifyFiles) && template.installer.verifyFiles.length > 0, `${id} must verify installed files.`);

    const script = marketplaceService._test.buildTemplateInstallerScript(template);
    assert(script.includes("command -v steamcmd"), `${id} script must check SteamCMD.`);
    assert(script.includes("+login anonymous"), `${id} script must use anonymous login.`);
    assert(script.includes(`+app_update ${appId} validate`), `${id} script must update app ${appId}.`);
    assert(script.includes("+force_install_dir"), `${id} script must set install directory.`);
  }
}

function assertDockerTemplates() {
  const dockerTemplates = templates.filter((template) => template.runtime === "docker");
  assert(dockerTemplates.length >= 2, "Expected Docker-backed templates.");
  for (const template of dockerTemplates) {
    assert.strictEqual(template.startupType, "docker-image", `${template.id} must use Docker image startup.`);
    assert(template.docker?.image || template.downloadSource?.image, `${template.id} must define a Docker image.`);
    assert(Array.isArray(template.compatibility?.requires) && template.compatibility.requires.includes("docker"), `${template.id} must declare Docker compatibility.`);
    assert(template.updateCheck?.type, `${template.id} must declare update check metadata.`);
    assert(template.installScript.includes("create-container"), `${template.id} must use container install steps.`);
  }
}

function assertMarketplaceMetadata() {
  for (const template of templates) {
    assert(template.id && template.displayName && template.category, "Template core metadata is required.");
    assert(Array.isArray(template.tags || []), `${template.id} tags must be an array when present.`);
    if (!template.disabled && template.category === "Game Servers") {
      assert(template.installMetadata || template.runtime === "docker", `${template.id} should describe install metadata.`);
    }
  }
}

function assertMinecraftVersionPickerSupport() {
  assert.strictEqual(typeof marketplaceService.getMinecraftVersionCatalog, "function", "Marketplace service must expose Minecraft version catalogs.");
  assert.strictEqual(typeof marketplaceService._test.categorizeMinecraftVersion, "function", "Version catalog categorizer should be testable.");
  assert.strictEqual(marketplaceService._test.categorizeMinecraftVersion("24w14a", "snapshot"), "snapshots", "Snapshots should be categorized.");
  assert.strictEqual(marketplaceService._test.categorizeMinecraftVersion("1.20.1", "release"), "releases", "Releases should be categorized.");
  assert.strictEqual(marketplaceService._test.categorizeMinecraftVersion("b1.7.3", "old_beta"), "legacy", "Legacy versions should be categorized.");

  const indexSource = fs.readFileSync(indexPath, "utf8");
  const appSource = fs.readFileSync(appPath, "utf8");
  const preloadSource = fs.readFileSync(preloadPath, "utf8");
  const ipcSource = fs.readFileSync(marketplaceIpcPath, "utf8");
  assert(indexSource.includes("data-marketplace-version-panel"), "Version picker panel hook should exist.");
  assert(indexSource.includes("data-marketplace-version-search"), "Version picker search hook should exist.");
  assert(indexSource.includes("data-marketplace-version-tabs"), "Version picker tabs hook should exist.");
  assert(appSource.includes("marketplaceVersionRenderLimit"), "Renderer should lazy-render large version lists.");
  assert(appSource.includes("Latest Stable"), "Renderer should label the latest shortcut with resolved version text.");
  assert(appSource.includes("getMinecraftVersions"), "Renderer should request provider version catalogs.");
  assert(preloadSource.includes("marketplace:getMinecraftVersions"), "Preload should expose Minecraft version catalog IPC.");
  assert(ipcSource.includes("marketplace:getMinecraftVersions"), "Marketplace IPC should register Minecraft version catalog handler.");
}

function assertRendererTemplateIdWiring() {
  const source = fs.readFileSync(appPath, "utf8");
  assert(source.includes("openMarketplaceWizard(template.id)"), "Renderer cards must open wizard with template.id.");
  assert(source.includes("templateId: template.id"), "Renderer installs must submit template.id.");
}

function assertGameTemplateInstallPlans() {
  const expected = [
    "minecraft-vanilla",
    "minecraft-paper",
    "minecraft-purpur",
    "minecraft-fabric",
    "minecraft-forge",
    "minecraft-neoforge",
    "terraria-tshock",
    "valheim",
    "rust",
    "cs2",
    "fivem",
    "palworld",
    "hytale",
  ];

  const requiredSteps = [
    "Validate template",
    "Create instance",
    "Create folders",
    "Resolve download",
    "Download files",
    "Extract files",
    "Configure startup",
    "Write config",
    "Verify installation",
    "Optional start",
  ];

  for (const id of expected) {
    const template = findTemplate(id);
    const plan = marketplaceService._test.getTemplateInstallPlan(id);
    assert.strictEqual(plan.templateId, id, `${id} plan should use the exact template id.`);
    for (const step of requiredSteps) {
      assert(plan.steps.includes(step), `${id} plan should include ${step}.`);
    }

    if (id === "hytale") {
      assert.strictEqual(plan.installable, false, "Hytale must not be installable.");
      assert.strictEqual(plan.disabled, true, "Hytale must stay disabled.");
      assert.match(plan.reason || template.comingSoonMessage || "", /official hytale dedicated server binaries/i);
    } else {
      assert.strictEqual(plan.installable, true, `${id} must route to an automatic workflow.`);
      assert(["download", "steamcmd", "archive", "docker"].includes(plan.workflow), `${id} should declare an actionable workflow.`);
    }
  }
}

function assertGameTemplateCreatePayloadsAreAgentSafe() {
  const ids = [
    "minecraft-vanilla",
    "minecraft-paper",
    "minecraft-purpur",
    "minecraft-fabric",
    "minecraft-forge",
    "minecraft-neoforge",
    "terraria-tshock",
    "valheim",
    "rust",
    "cs2",
    "fivem",
    "palworld",
  ];

  for (const id of ids) {
    const template = findTemplate(id);
    const payload = marketplaceService._test.buildInstancePayload(template, { name: `${id} smoke`, version: "latest" }, template.defaultPorts || []);
    assert(Array.isArray(payload.tags), `${id} create payload should include tags.`);
    for (const tag of payload.tags) {
      assert(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,63}$/.test(tag), `${id} tag must be accepted by the agent: ${tag}`);
      assert(!/\s/.test(tag), `${id} tag must not contain whitespace: ${tag}`);
    }
    if (template.category !== "Minecraft") {
      assert.strictEqual(payload.minecraftVersion, null, `${id} should not inherit Minecraft version metadata.`);
    }
  }
}

function assertTemplateFilePathsAreDataRelative() {
  for (const template of templates.filter((entry) => !entry.disabled && !entry.comingSoon)) {
    const downloads = marketplaceService._test.normalizeTemplateDownloads(template);
    for (const download of downloads) {
      assert(!path.isAbsolute(download.destination), `${template.id} destination must be relative.`);
      assert(!download.destination.startsWith("data/"), `${template.id} destination should be relative to the agent data root.`);
      assert(!download.destination.split(/[\\/]/).includes(".."), `${template.id} destination must not escape the data root.`);
    }
  }

  const source = fs.readFileSync(path.join(__dirname, "..", "src", "services", "marketplaceService.js"), "utf8");
  assert(!source.includes('createInstanceFolder(createdInstanceId, ".",'), "Marketplace must not mkdir the agent data root through the file API.");
}

function assertNonMinecraftServerTypeIsCleared() {
  const source = fs.readFileSync(appPath, "utf8");
  assert(source.includes("delete options.serverType;"), "Renderer must not send hidden Minecraft serverType for non-Minecraft templates.");
  assert(source.includes("serverType: isMinecraft ?"), "Renderer option collection should gate serverType by template category.");
}

function assertMarketplaceVersionMetadata() {
  const paper = marketplaceService._test.buildResolvedVersionMetadata(findTemplate("minecraft-paper"), {
    version: "1.21.8",
    build: 42,
  });
  assert.strictEqual(paper.game, "minecraft", "Paper metadata should save the game family.");
  assert.strictEqual(paper.serverSoftware, "Paper", "Paper metadata should save server software.");
  assert.strictEqual(paper.minecraftVersion, "1.21.8", "Paper metadata should save Minecraft version.");
  assert.strictEqual(paper.gameVersion, "1.21.8", "Paper metadata should save gameVersion.");
  assert.strictEqual(paper.buildNumber, 42, "Paper metadata should save build number.");
  assert.strictEqual(paper.paperBuild, 42, "Paper metadata should save paperBuild.");
  assert.strictEqual(paper.displayVersion, "Paper 1.21.8 build 42", "Paper displayVersion should include software, game version, and build.");
  assert.strictEqual(paper.displayVersionDetail, "Paper Build 42", "Paper display detail should include the build.");
  assert.strictEqual(paper.versionInfo?.displayVersion, "Paper 1.21.8 build 42", "Paper versionInfo should persist displayVersion.");

  const vanilla = marketplaceService._test.buildResolvedVersionMetadata(findTemplate("minecraft-vanilla"), {
    version: "1.21.8",
  });
  assert.strictEqual(vanilla.displayVersion, "Vanilla 1.21.8", "Vanilla displayVersion should include the software and Mojang version.");

  const source = fs.readFileSync(appPath, "utf8");
  assert(source.includes("getInstanceVersionMetadata"), "Renderer should normalize version metadata before display.");
  assert(source.includes("resolvedInfo.displayVersion"), "Renderer should prefer normalized versionInfo display values.");
  assert(source.includes("displayVersion || gameVersion"), "Renderer should display normalized software/game version values.");
}

function assertFiveMStartupSafety() {
  const fivem = findTemplate("fivem");
  const configLines = fivem.configFiles?.flatMap((file) => file.lines || []) || [];
  assert(configLines.includes('sv_licenseKey "CHANGE_ME_FIVEM_LICENSE_KEY"'), "FiveM server.cfg should use the explicit license placeholder.");
  assert.strictEqual(fivem.startup?.restartPolicy, "never", "FiveM must not auto-restart on license failures.");
  assert.strictEqual(fivem.manualStartRequired, true, "FiveM should require manual start after license setup.");

  const agentSource = fs.readFileSync(path.join(__dirname, "..", "agent", "src", "services", "instances", "instanceService.js"), "utf8");
  assert(agentSource.includes("FIVEM_LICENSE_REQUIRED"), "Agent should expose a FiveM license-required failure reason.");
  assert(agentSource.includes("Invalid key format specified|Could not authenticate server license key|HTTP 429"), "Agent should detect FiveM license/auth log failures.");
  assert(agentSource.includes("suppressRestart"), "Agent should suppress restart loops for known FiveM license failures.");
  assert(agentSource.includes("detectFromMinecraftStatus"), "Agent should keep a Minecraft status-query fallback for version detection.");
}

async function assertFiveMPlaceholderStartIsBlocked() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxhub-fivem-smoke-"));
  const previousRoot = process.env.AGENT_INSTANCE_ROOT;
  process.env.AGENT_INSTANCE_ROOT = path.join(root, "instances");

  const servicePath = require.resolve("../agent/src/services/instances/instanceService");
  delete require.cache[servicePath];
  const instanceService = require(servicePath);

  try {
    await instanceService.createInstance({
      id: "fivem-license-smoke",
      displayName: "FiveM License Smoke",
      type: "custom-command",
      workingDirectory: "data/server",
      executable: "bash",
      args: ["-lc", "exit 1"],
      restartPolicy: "always",
      tags: ["fivem"],
      templateId: "fivem",
    });
    await instanceService.writeInstanceFile(
      "fivem-license-smoke",
      "server/server.cfg",
      'sv_licenseKey "CHANGE_ME_FIVEM_LICENSE_KEY"\n'
    );
    await assert.rejects(
      () => instanceService.startInstance("fivem-license-smoke"),
      (error) => error?.code === "FIVEM_LICENSE_REQUIRED" && /valid license key/i.test(error.message || "")
    );
    const status = await instanceService.getStatus("fivem-license-smoke");
    assert.strictEqual(status.failureReason, "FIVEM_LICENSE_REQUIRED", "FiveM placeholder start should set a license failure reason.");
  } finally {
    if (previousRoot === undefined) {
      delete process.env.AGENT_INSTANCE_ROOT;
    } else {
      process.env.AGENT_INSTANCE_ROOT = previousRoot;
    }
    delete require.cache[servicePath];
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function assertScriptMarketplaceStartupIsNotJarWrapped() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxhub-script-startup-smoke-"));
  const previousRoot = process.env.AGENT_INSTANCE_ROOT;
  process.env.AGENT_INSTANCE_ROOT = path.join(root, "instances");

  const servicePath = require.resolve("../agent/src/services/instances/instanceService");
  delete require.cache[servicePath];
  const instanceService = require(servicePath);

  try {
    await instanceService.createInstance({
      id: "script-startup-smoke",
      displayName: "Script Startup Smoke",
      type: "java-app",
      workingDirectory: "data",
      executable: "bash",
      args: ["run.sh"],
      startupArguments: ["run.sh"],
      startupScript: "run.sh",
      restartPolicy: "on-failure",
      tags: ["minecraft", "forge"],
    });
    await instanceService.writeInstanceFile("script-startup-smoke", "run.sh", "#!/usr/bin/env bash\nexit 0\n");
    const started = await instanceService.startInstance("script-startup-smoke");
    assert.deepStrictEqual(started.args, ["run.sh"], "Script startup must not inject -jar.");
    assert.strictEqual(started.executable, "bash", "Script startup should preserve bash executable.");
    await new Promise((resolve) => setTimeout(resolve, 250));
    const status = await instanceService.getStatus("script-startup-smoke");
    assert.notStrictEqual(status.failureReason, "SERVER_JAR_MISSING", "Script startup should not require a server jar.");

    await instanceService.createInstance({
      id: "invalid-script-startup-smoke",
      displayName: "Invalid Script Startup Smoke",
      type: "java-app",
      workingDirectory: "data",
      executable: "bash",
      args: ["-j"],
      startupArguments: ["-j"],
      restartPolicy: "on-failure",
      tags: ["minecraft", "forge"],
    });
    await instanceService.startInstance("invalid-script-startup-smoke");
    await new Promise((resolve) => setTimeout(resolve, 500));
    const invalidStatus = await instanceService.getStatus("invalid-script-startup-smoke");
    assert.strictEqual(invalidStatus.exitCode, 2, "Invalid bash option should exit with code 2.");
    assert.strictEqual(invalidStatus.state, "Failed", "Invalid command should remain failed.");
    assert.strictEqual(invalidStatus.failureReason, "INVALID_COMMAND", "Invalid command should be marked explicitly.");
  } finally {
    if (previousRoot === undefined) {
      delete process.env.AGENT_INSTANCE_ROOT;
    } else {
      process.env.AGENT_INSTANCE_ROOT = previousRoot;
    }
    delete require.cache[servicePath];
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function assertPaperMetadataBackfill() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxhub-paper-version-smoke-"));
  const previousRoot = process.env.AGENT_INSTANCE_ROOT;
  process.env.AGENT_INSTANCE_ROOT = path.join(root, "instances");

  const servicePath = require.resolve("../agent/src/services/instances/instanceService");
  delete require.cache[servicePath];
  const instanceService = require(servicePath);

  try {
    await instanceService.createInstance({
      id: "paper-version-smoke",
      displayName: "Paper Version Smoke",
      type: "minecraft-paper",
      workingDirectory: "data",
      jar: "paper.jar",
      restartPolicy: "never",
      tags: ["minecraft", "paper"],
      templateId: "minecraft-paper",
    });
    await instanceService.writeInstanceFile(
      "paper-version-smoke",
      "metadata.json",
      JSON.stringify({
        serverSoftware: "Paper",
        minecraftVersion: "1.21.8",
        paperBuild: "42",
        buildNumber: "42",
      })
    );
    const status = await instanceService.getStatus("paper-version-smoke");
    assert.strictEqual(status.serverSoftware, "Paper", "Paper backfill should persist serverSoftware.");
    assert.strictEqual(status.minecraftVersion, "1.21.8", "Paper backfill should persist minecraftVersion.");
    assert.strictEqual(status.paperBuild, "42", "Paper backfill should persist paperBuild.");
    assert.strictEqual(status.versionInfo?.displayVersion, "Paper 1.21.8 build 42", "Paper backfill should normalize displayVersion.");
    assert.strictEqual(status.versionInfo?.displayVersionDetail, "Paper Build 42", "Paper backfill should normalize display detail.");
  } finally {
    if (previousRoot === undefined) {
      delete process.env.AGENT_INSTANCE_ROOT;
    } else {
      process.env.AGENT_INSTANCE_ROOT = previousRoot;
    }
    delete require.cache[servicePath];
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function assertMinecraftPropertiesVersionBackfill() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxhub-minecraft-properties-version-smoke-"));
  const previousRoot = process.env.AGENT_INSTANCE_ROOT;
  process.env.AGENT_INSTANCE_ROOT = path.join(root, "instances");

  const servicePath = require.resolve("../agent/src/services/instances/instanceService");
  delete require.cache[servicePath];
  const instanceService = require(servicePath);

  try {
    await instanceService.createInstance({
      id: "minecraft-properties-version-smoke",
      displayName: "Minecraft Properties Version Smoke",
      type: "minecraft-paper",
      workingDirectory: "data",
      jar: "paper.jar",
      restartPolicy: "never",
      tags: ["minecraft", "paper"],
      templateId: "minecraft-paper",
    });
    await instanceService.writeInstanceFile(
      "minecraft-properties-version-smoke",
      "server.properties",
      "motd=Smoke\nminecraft-version=1.21.8\n"
    );
    const status = await instanceService.getStatus("minecraft-properties-version-smoke");
    assert.strictEqual(status.minecraftVersion, "1.21.8", "Minecraft server.properties backfill should persist minecraftVersion.");
    assert.strictEqual(status.serverSoftware, "Paper", "Minecraft server.properties backfill should preserve inferred server software.");
    assert.strictEqual(status.versionInfo?.displayVersion, "Paper 1.21.8", "Minecraft server.properties backfill should set displayVersion.");
  } finally {
    if (previousRoot === undefined) {
      delete process.env.AGENT_INSTANCE_ROOT;
    } else {
      process.env.AGENT_INSTANCE_ROOT = previousRoot;
    }
    delete require.cache[servicePath];
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function assertOldVanillaInstallerMetadataBackfill() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxhub-old-vanilla-version-smoke-"));
  const previousRoot = process.env.AGENT_INSTANCE_ROOT;
  process.env.AGENT_INSTANCE_ROOT = path.join(root, "instances");

  const servicePath = require.resolve("../agent/src/services/instances/instanceService");
  delete require.cache[servicePath];
  const instanceService = require(servicePath);

  try {
    await instanceService.createInstance({
      id: "old-vanilla-version-smoke",
      displayName: "Minecraft Vanilla",
      type: "java-app",
      workingDirectory: "data",
      executable: "java",
      args: ["-Xmx2G", "-jar", "server.jar", "nogui"],
      restartPolicy: "never",
      tags: ["minecraft", "minecraft-vanilla"],
      templateId: "minecraft-vanilla",
    });
    await instanceService.writeInstanceFile(
      "old-vanilla-version-smoke",
      "metadata.json",
      JSON.stringify({
        provider: "Vanilla",
        displayVersion: "Vanilla",
        marketplace: {
          templateId: "minecraft-vanilla",
          selectedVersion: "26.2",
        },
        installer: {
          type: "mojang",
          version: "26.2",
        },
      })
    );
    const status = await instanceService.getStatus("old-vanilla-version-smoke");
    assert.strictEqual(status.serverSoftware, "Vanilla", "Old Vanilla metadata should infer serverSoftware.");
    assert.strictEqual(status.minecraftVersion, "26.2", "Old Vanilla installer metadata should backfill minecraftVersion.");
    assert.strictEqual(status.gameVersion, "26.2", "Old Vanilla installer metadata should backfill gameVersion.");
    assert.strictEqual(status.versionInfo?.gameVersion, "26.2", "Old Vanilla installer metadata should normalize versionInfo.");
    assert.notStrictEqual(status.versionInfo?.displayVersion, "Vanilla", "Provider label alone must not be stored as the display version.");
  } finally {
    if (previousRoot === undefined) {
      delete process.env.AGENT_INSTANCE_ROOT;
    } else {
      process.env.AGENT_INSTANCE_ROOT = previousRoot;
    }
    delete require.cache[servicePath];
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function assertVanillaInstallVersionPipeline() {
  const agentClient = require("../src/services/agentClient");
  const originalFetch = global.fetch;
  const originalAgent = {};
  const patchedAgentMethods = [
    "createInstance",
    "listInstances",
    "createInstanceFolder",
    "writeInstanceFile",
    "readInstanceFile",
    "saveMinecraftProperties",
    "updateInstance",
    "getInstanceStatus",
    "startInstance",
    "deleteInstance",
  ];
  patchedAgentMethods.forEach((name) => {
    originalAgent[name] = agentClient[name];
  });

  const selectedVersion = "26.2";
  const trace = [];
  const instances = new Map();
  const files = new Map();

  function record(stage, value) {
    trace.push({ stage, ...pickVersionTrace(value) });
  }

  function currentInstance(instanceId) {
    const instance = instances.get(instanceId);
    if (!instance) {
      throw new Error(`Missing mocked instance ${instanceId}`);
    }
    return instance;
  }

  function makeJsonResponse(body) {
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify(body),
      arrayBuffer: async () => Buffer.from(JSON.stringify(body)).buffer,
    };
  }

  try {
    global.fetch = async (url) => {
      const href = String(url);
      if (href.includes("version_manifest_v2.json")) {
        return makeJsonResponse({
          latest: { release: selectedVersion },
          versions: [{ id: selectedVersion, type: "release", url: "https://mock.local/mojang/26.2.json" }],
        });
      }
      if (href === "https://mock.local/mojang/26.2.json") {
        return makeJsonResponse({
          id: selectedVersion,
          downloads: { server: { url: "https://mock.local/server.jar" } },
        });
      }
      if (href === "https://mock.local/server.jar") {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "8" },
          arrayBuffer: async () => Buffer.from("jar-data"),
        };
      }
      throw new Error(`Unexpected mocked fetch URL: ${href}`);
    };

    agentClient.createInstance = async (payload) => {
      instances.set(payload.id, { ...payload, state: "Stopped", pid: null });
      record("agent:createInstance", payload);
      return { instance: currentInstance(payload.id) };
    };
    agentClient.listInstances = async () => {
      const response = { root: "/mock/instances", instances: [...instances.values()] };
      record("agent:listInstances", response.instances[0] || {});
      return response;
    };
    agentClient.createInstanceFolder = async () => ({ ok: true });
    agentClient.writeInstanceFile = async (instanceId, filePath, content) => {
      files.set(`${instanceId}:${filePath}`, content);
      if (filePath === "metadata.json") {
        record("agent:writeMetadataFile", JSON.parse(content));
      }
      return { path: filePath, size: String(content || "").length };
    };
    agentClient.readInstanceFile = async (instanceId, filePath) => {
      if (filePath === "server.jar") {
        return { path: filePath, content: files.get(`${instanceId}:${filePath}`) || "" };
      }
      if (filePath === "eula.txt" || filePath === "server.properties") {
        return { path: filePath, content: files.get(`${instanceId}:${filePath}`) || "" };
      }
      return { path: filePath, content: files.get(`${instanceId}:${filePath}`) || "" };
    };
    agentClient.saveMinecraftProperties = async (instanceId, properties) => {
      files.set(`${instanceId}:server.properties`, Object.entries(properties || {}).map(([key, value]) => `${key}=${value}`).join("\n"));
      return { ok: true };
    };
    agentClient.updateInstance = async (instanceId, patch) => {
      const next = { ...currentInstance(instanceId), ...patch };
      instances.set(instanceId, next);
      record(patch.versionInfo || patch.minecraftVersion || patch.gameVersion ? "agent:updateMetadata" : "agent:updateStartup", next);
      return { instance: next };
    };
    agentClient.getInstanceStatus = async (instanceId) => {
      const instance = currentInstance(instanceId);
      record("agent:getStatus", instance);
      return { instance };
    };
    agentClient.startInstance = async (instanceId) => {
      const next = { ...currentInstance(instanceId), state: "Running", pid: 1234 };
      instances.set(instanceId, next);
      record("agent:startInstance", next);
      return { instance: next };
    };
    agentClient.deleteInstance = async (instanceId) => {
      instances.delete(instanceId);
      return { id: instanceId, deleted: true };
    };

    const result = await marketplaceService.installTemplate({
      templateId: "minecraft-vanilla",
      options: {
        id: "vanilla-version-pipeline-smoke",
        name: "Vanilla Version Pipeline Smoke",
        version: selectedVersion,
        memory: "2G",
        port: 25565,
        ports: [25565],
        acceptEula: true,
        start: false,
      },
    });
    record("marketplace:installResult", result.instance || {});

    const apiPayload = await agentClient.listInstances();
    const apiInstance = apiPayload.instances.find((instance) => instance.id === "vanilla-version-pipeline-smoke");
    record("api:/instances", apiInstance || {});
    const ipcPayload = apiPayload;
    const rendererInput = ipcPayload.instances[0];
    record("ipc:instances:list", rendererInput || {});

    const appSource = fs.readFileSync(appPath, "utf8");
    assert(appSource.includes("instance?.minecraftVersion"), "Renderer versionInfo branch must read top-level minecraftVersion when versionInfo is old.");
    assert(appSource.includes("metadata.minecraftVersion"), "Renderer versionInfo branch must read metadata minecraftVersion when versionInfo is old.");
    assert.strictEqual(apiInstance.minecraftVersion, selectedVersion, `Agent /instances lost minecraftVersion.\n${JSON.stringify(trace, null, 2)}`);
    assert.strictEqual(apiInstance.gameVersion, selectedVersion, `Agent /instances lost gameVersion.\n${JSON.stringify(trace, null, 2)}`);
    assert.strictEqual(apiInstance.versionInfo?.gameVersion, selectedVersion, `Agent /instances lost versionInfo.gameVersion.\n${JSON.stringify(trace, null, 2)}`);
    assert.strictEqual(pickVersionTrace(rendererInput).gameVersion, selectedVersion, `IPC/renderer input lost gameVersion.\n${JSON.stringify(trace, null, 2)}`);
  } finally {
    global.fetch = originalFetch;
    patchedAgentMethods.forEach((name) => {
      agentClient[name] = originalAgent[name];
    });
  }
}

async function assertMarketplaceInstallerSmokeMatrix() {
  const agentClient = require("../src/services/agentClient");
  const originalFetch = global.fetch;
  const originalAgent = {};
  const originalModrinth = {};
  const originalCurseForge = {};
  const patchedAgentMethods = [
    "createInstance",
    "createInstanceFolder",
    "writeInstanceFile",
    "instanceFileExists",
    "saveMinecraftProperties",
    "updateInstance",
    "startInstance",
    "getInstanceStatus",
    "forceKillInstance",
    "deleteInstance",
  ];
  const patchedModrinthMethods = ["resolveVersion", "resolveDependencies"];
  const patchedCurseForgeMethods = ["ensureConfigured", "resolveFile", "downloadFile", "resolveDependencies"];
  patchedAgentMethods.forEach((name) => {
    originalAgent[name] = agentClient[name];
  });
  patchedModrinthMethods.forEach((name) => {
    originalModrinth[name] = modrinthProvider[name];
  });
  patchedCurseForgeMethods.forEach((name) => {
    originalCurseForge[name] = curseforgeProvider[name];
  });

  const instances = new Map();
  const files = new Map();
  const fetchUrls = [];
  const installerStarts = new Set();

  function jsonResponse(body) {
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      text: async () => JSON.stringify(body),
      arrayBuffer: async () => Buffer.from(JSON.stringify(body)).buffer,
    };
  }

  function textResponse(body) {
    return {
      ok: true,
      status: 200,
      headers: { get: () => "text/plain" },
      text: async () => body,
      arrayBuffer: async () => Buffer.from(body).buffer,
    };
  }

  function binaryResponse(body = "jar") {
    const buffer = Buffer.from(body);
    return {
      ok: true,
      status: 200,
      headers: { get: () => String(buffer.length) },
      text: async () => body,
      arrayBuffer: async () => buffer,
    };
  }

  try {
    global.fetch = async (url) => {
      const href = String(url);
      fetchUrls.push(href);
      if (href.includes("version_manifest_v2.json")) {
        return jsonResponse({ latest: { release: "1.21.1" }, versions: [{ id: "1.21.1", url: "https://mock.local/mojang/1.21.1.json" }] });
      }
      if (href === "https://mock.local/mojang/1.21.1.json") {
        return jsonResponse({ downloads: { server: { url: "https://mock.local/mojang/server.jar" } } });
      }
      if (href === "https://fill.papermc.io/v3/projects/paper") {
        return jsonResponse({ project_id: "paper", versions: { "1.21": ["1.21.1"] } });
      }
      if (href === "https://fill.papermc.io/v3/projects/paper/versions/1.21.1/builds") {
        return jsonResponse([{ id: 42, downloads: { "server:default": { name: "paper-1.21.1-42.jar", url: "https://mock.local/paper.jar" } } }]);
      }
      if (href === "https://api.purpurmc.org/v2/purpur") {
        return jsonResponse({ versions: ["1.21.1"] });
      }
      if (href === "https://api.purpurmc.org/v2/purpur/1.21.1") {
        return jsonResponse({ builds: { latest: "2280" } });
      }
      if (href.includes("meta.fabricmc.net/v2/versions/loader")) {
        return jsonResponse([{ version: "0.16.10", stable: true }]);
      }
      if (href.includes("meta.fabricmc.net/v2/versions/installer")) {
        return jsonResponse([{ version: "1.0.1", stable: true }]);
      }
      if (href === "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json") {
        return jsonResponse({ promos: { "1.21.1-latest": "52.1.0" } });
      }
      if (href === "https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml") {
        return textResponse("<metadata><versioning><latest>21.1.200</latest><release>21.1.200</release><versions><version>21.1.200</version></versions></versioning></metadata>");
      }
      if (/mock\.local|maven\.minecraftforge\.net|maven\.neoforged\.net|api\.purpurmc\.org\/v2\/purpur\/1\.21\.1\/2280\/download|meta\.fabricmc\.net\/v2\/versions\/loader\/1\.21\.1/.test(href)) {
        return binaryResponse(`jar:${href}`);
      }
      throw new Error(`Unexpected smoke fetch URL: ${href}`);
    };

    agentClient.createInstance = async (payload) => {
      instances.set(payload.id, { ...payload, state: "Stopped" });
      return { instance: instances.get(payload.id) };
    };
    agentClient.createInstanceFolder = async () => ({ ok: true });
    agentClient.instanceFileExists = async (instanceId, filePath) => ({ exists: files.has(`${instanceId}:${filePath}`), path: filePath });
    agentClient.writeInstanceFile = async (instanceId, filePath, content) => {
      files.set(`${instanceId}:${filePath}`, content);
      return { saved: true, path: filePath };
    };
    agentClient.saveMinecraftProperties = async (instanceId, properties) => {
      files.set(`${instanceId}:server.properties`, JSON.stringify(properties));
      return { ok: true };
    };
    agentClient.updateInstance = async (instanceId, patch) => {
      instances.set(instanceId, { ...(instances.get(instanceId) || {}), ...patch });
      return { instance: instances.get(instanceId) };
    };
    agentClient.startInstance = async (instanceId) => {
      installerStarts.add(instanceId);
      instances.set(instanceId, { ...(instances.get(instanceId) || {}), state: "Running" });
      return { instance: instances.get(instanceId) };
    };
    agentClient.getInstanceStatus = async (instanceId) => ({ instance: { ...(instances.get(instanceId) || {}), state: "Stopped" } });
    agentClient.forceKillInstance = async () => ({ ok: true });
    agentClient.deleteInstance = async (instanceId) => {
      instances.delete(instanceId);
      return { deleted: true };
    };

    modrinthProvider.resolveVersion = async () => ({
      id: "mr-version",
      name: "Modrinth Smoke",
      primaryFile: { filename: "modrinth-smoke.jar", url: "https://mock.local/modrinth-smoke.jar", hashes: { sha1: "mr" } },
      files: [{ filename: "modrinth-smoke.jar", url: "https://mock.local/modrinth-smoke.jar", hashes: { sha1: "mr" } }],
      dependencies: [],
    });
    modrinthProvider.resolveDependencies = async () => [];
    curseforgeProvider.ensureConfigured = () => true;
    curseforgeProvider.resolveFile = async () => ({ id: 200, projectId: 100, fileName: "curseforge-smoke.jar", downloadUrl: "https://mock.local/curseforge-smoke.jar", dependencies: [] });
    curseforgeProvider.downloadFile = async (file) => ({ ...file, buffer: Buffer.from("cf-mod") });
    curseforgeProvider.resolveDependencies = async () => [];

    const cases = [
      ["vanilla", { provider: "anxhub", loader: "vanilla" }, "server.jar"],
      ["paper", { provider: "anxhub", loader: "paper" }, "server.jar"],
      ["purpur", { provider: "anxhub", loader: "purpur" }, "server.jar"],
      ["fabric", { provider: "anxhub", loader: "fabric" }, "fabric-server.jar"],
      ["forge", { provider: "anxhub", loader: "forge" }, "forge-installer.jar"],
      ["neoforge", { provider: "anxhub", loader: "neoforge" }, "neoforge-installer.jar"],
      ["curseforge", { provider: "curseforge", loader: "vanilla", providerProjectId: "100" }, "mods/curseforge-smoke.jar"],
      ["modrinth", { provider: "modrinth", loader: "vanilla", providerProjectId: "mr-pack" }, "mods/modrinth-smoke.jar"],
    ];

    for (const [name, payload, expectedFile] of cases) {
      const id = `marketplace-${name}-smoke`;
      await marketplaceInstallService.installPack({
        ...payload,
        id,
        name: `Marketplace ${name} Smoke`,
        minecraftVersion: "1.21.1",
        memory: "2G",
        port: 25565,
        acceptEula: true,
        start: false,
      });
      assert(files.has(`${id}:${expectedFile}`), `${name} install should write ${expectedFile}.`);
      assert(files.has(`${id}:metadata.json`), `${name} install should write metadata.json.`);
      const instance = instances.get(id);
      const configuredJar = instance?.serverJar || instance?.serverJarPath || instance?.startJar;
      assert(configuredJar, `${name} install should configure server jar metadata.`);
      assert(files.has(`${id}:${configuredJar}`), `${name} configured jar should exist: ${configuredJar}.`);
      const metadata = JSON.parse(files.get(`${id}:metadata.json`));
      assert.strictEqual(metadata.serverJar, configuredJar, `${name} metadata should preserve the configured server jar.`);
      assert.strictEqual(metadata.serverJarPath, configuredJar, `${name} metadata should preserve serverJarPath.`);
      assert.strictEqual(metadata.startJar, configuredJar, `${name} metadata should preserve startJar.`);
    }

    assert(fetchUrls.includes("https://fill.papermc.io/v3/projects/paper"), "Paper installer must use the Paper Downloads v3 project API.");
    assert(fetchUrls.includes("https://fill.papermc.io/v3/projects/paper/versions/1.21.1/builds"), "Paper installer must use the Paper Downloads v3 builds API.");
    assert(!fetchUrls.some((href) => href.includes("https://api.papermc.io/v2")), "Paper installer must not use deprecated PaperMC v2 endpoints.");
    assert(installerStarts.has("marketplace-forge-smoke"), "Forge smoke should run the loader installer.");
    assert(installerStarts.has("marketplace-neoforge-smoke"), "NeoForge smoke should run the loader installer.");
  } finally {
    global.fetch = originalFetch;
    patchedAgentMethods.forEach((name) => {
      agentClient[name] = originalAgent[name];
    });
    patchedModrinthMethods.forEach((name) => {
      modrinthProvider[name] = originalModrinth[name];
    });
    patchedCurseForgeMethods.forEach((name) => {
      curseforgeProvider[name] = originalCurseForge[name];
    });
  }
}

async function assertCalendarMinecraftVersionMetadata() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxhub-calendar-minecraft-version-smoke-"));
  const previousRoot = process.env.AGENT_INSTANCE_ROOT;
  process.env.AGENT_INSTANCE_ROOT = path.join(root, "instances");

  const servicePath = require.resolve("../agent/src/services/instances/instanceService");
  delete require.cache[servicePath];
  const instanceService = require(servicePath);

  try {
    await instanceService.createInstance({
      id: "calendar-minecraft-version-smoke",
      displayName: "Calendar Minecraft Version Smoke",
      type: "java-app",
      workingDirectory: "data",
      jar: "server.jar",
      restartPolicy: "never",
      tags: ["minecraft", "vanilla"],
      templateId: "minecraft-vanilla",
      game: "minecraft",
      serverSoftware: "Vanilla",
      minecraftVersion: "26.2",
      gameVersion: "26.2",
      version: "26.2",
      displayVersion: "26.2",
      versionInfo: {
        game: "minecraft",
        software: "Vanilla",
        gameVersion: "26.2",
        displayVersion: "26.2",
        isMinecraft: true,
      },
    });
    const status = await instanceService.getStatus("calendar-minecraft-version-smoke");
    assert.strictEqual(status.minecraftVersion, "26.2", "Calendar-style Minecraft versions should persist as minecraftVersion.");
    assert.strictEqual(status.gameVersion, "26.2", "Calendar-style Minecraft versions should persist as gameVersion.");
    assert.strictEqual(status.versionInfo?.gameVersion, "26.2", "Calendar-style Minecraft versions should survive versionInfo normalization.");
    assert.strictEqual(status.versionInfo?.displayVersion, "26.2", "Calendar-style Minecraft versions should display from metadata before runtime detection.");
  } finally {
    if (previousRoot === undefined) {
      delete process.env.AGENT_INSTANCE_ROOT;
    } else {
      process.env.AGENT_INSTANCE_ROOT = previousRoot;
    }
    delete require.cache[servicePath];
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function assertImportEcosystemSupport() {
  const support = marketplaceService.getImportSupport();
  assert.strictEqual(support.communityTemplates.supported, true, "Community template import support should be advertised.");
  assert.strictEqual(support.modpacks.modrinth.supported, true, "Modrinth metadata import support should be advertised.");
  assert.strictEqual(support.modpacks.curseforge.supported, false, "CurseForge should not claim automatic install without credentials.");

  const imported = marketplaceService.importCommunityTemplate({
    id: "community-docker-smoke",
    displayName: "Community Docker Smoke",
    category: "Applications",
    runtime: "docker",
    startupType: "docker-image",
    docker: {
      image: "nginx:stable-alpine",
      ports: ["8080:80"],
    },
  });
  assert.strictEqual(imported.installable, true, "Valid community Docker template should be installable.");
  assert.strictEqual(imported.template.formatVersion, 1, "Community template format version should be set.");

  assert.throws(
    () => marketplaceService.importCommunityTemplate({
      id: "broken-community-docker",
      displayName: "Broken Community Docker",
      category: "Applications",
      runtime: "docker",
    }),
    /real download source, Docker image, or be disabled/
  );
}

function assertMinecraftTemplatesStillPass() {
  const minecraftTemplates = templates.filter((template) => template.category === "Minecraft");
  assert(minecraftTemplates.length >= 6, "Expected existing Minecraft templates.");

  for (const template of minecraftTemplates) {
    assert(!template.disabled && !template.comingSoon, `${template.id} should remain installable.`);
    assert(Array.isArray(template.defaultPorts) && template.defaultPorts.includes(25565), `${template.id} should keep Minecraft port defaults.`);
    assert(template.startupType === "java-jar", `${template.id} should keep Java jar startup.`);
    assert(Array.isArray(template.downloads) && template.downloads.length > 0, `${template.id} should keep downloads.`);
    assert(template.installScript.includes("generate-eula"), `${template.id} should keep EULA generation.`);
    assert(template.configurationSchema.includes("acceptEula"), `${template.id} should require EULA acceptance.`);
  }
}

async function assertProviderInstallSupport() {
  const preloadSource = fs.readFileSync(preloadPath, "utf8");
  const ipcSource = fs.readFileSync(marketplaceIpcPath, "utf8");
  const indexSource = fs.readFileSync(indexPath, "utf8");
  const appSource = fs.readFileSync(appPath, "utf8");
  const agentRouteSource = fs.readFileSync(path.join(__dirname, "..", "agent", "src", "routes", "instances.js"), "utf8");
  const agentClientSource = fs.readFileSync(path.join(__dirname, "..", "src", "services", "agentClient.js"), "utf8");
  assert(preloadSource.includes("marketplace:installPack"), "Preload should expose provider pack install IPC.");
  assert(preloadSource.includes("marketplace:searchProviderPacks"), "Preload should expose provider pack search IPC.");
  assert(preloadSource.includes("marketplace:getProviderPackVersions"), "Preload should expose provider version IPC.");
  assert(preloadSource.includes("marketplace:getProviderPackDetails"), "Preload should expose provider detail IPC.");
  assert(preloadSource.includes("marketplace:install-progress"), "Preload should expose install progress events.");
  assert(ipcSource.includes("marketplace:installPack"), "Marketplace IPC should register provider install.");
  assert(ipcSource.includes("marketplace:getProviderPackDetails"), "Marketplace IPC should register provider details.");
  assert(ipcSource.includes("marketplace:install-progress"), "Marketplace IPC should forward install progress.");
  assert(indexSource.includes("data-marketplace-provider-browser"), "Marketplace should include the dynamic provider browser.");
  assert(indexSource.includes("data-marketplace-provider=\"curseforge\""), "Marketplace should expose CurseForge provider browsing.");
  assert(indexSource.includes("data-marketplace-provider=\"modrinth\""), "Marketplace should expose Modrinth provider browsing.");
  assert(indexSource.includes("data-marketplace-load-more"), "Marketplace should expose provider pagination controls.");
  assert(appSource.includes("marketplaceActiveCategory === \"Modpacks\""), "Renderer should treat Modpacks as a dynamic category.");
  assert(appSource.includes("loadMarketplaceProviderPacks"), "Renderer should search dynamic provider packs.");
  assert(appSource.includes("startMarketplaceInstallProgressListener"), "Renderer should register progress listener for provider installs.");
  assert(appSource.includes("stopMarketplaceInstallProgressListener"), "Renderer should clean up progress listener after installs.");
  assert(!appSource.includes("marketplaceTemplates.length"), "Provider diagnostics must not reference an undefined marketplaceTemplates variable.");
  assert(appSource.includes("getStaticMarketplaceTemplates().length"), "Built-in template render diagnostics should count the static catalog.");
  assert(appSource.includes("function isMarketplaceProviderSectionVisible"), "Renderer should distinguish provider section visibility from provider grid mode.");
  assert(appSource.includes("[Marketplace][Renderer] Provider refresh requested."), "Renderer should log provider refresh diagnostics.");
  assert(appSource.includes("[Marketplace][Renderer] Provider IPC request."), "Renderer should log provider IPC payloads.");
  assert(appSource.includes("fetchedCount"), "Renderer should log provider fetched/filtered/rendered counts.");
  assert(agentRouteSource.includes('getInstanceIdFromPath(url.pathname, "/exists")'), "Agent should expose an explicit instance file exists endpoint.");
  assert(agentClientSource.includes("async function instanceFileExists"), "Desktop agent client should expose instanceFileExists.");

  assert.deepStrictEqual(
    modrinthProvider._test.buildSearchFacets("1.21.1", "fabric"),
    [["project_type:modpack"], ["versions:1.21.1"], ["categories:fabric"], ["server_side:required", "server_side:optional"]],
    "Modrinth facets should target server-capable modpacks."
  );
  assert.strictEqual(
    modrinthProvider._test.shouldInstallProjectFile({ server_side: "unsupported" }, { allowClientFiles: false }),
    false,
    "Client-only Modrinth dependencies should be skipped by default."
  );
  assert.strictEqual(
    modrinthProvider._test.shouldInstallProjectFile({ server_side: "optional" }, { allowClientFiles: false }),
    true,
    "Optional server-side Modrinth dependencies should be installable."
  );
  assert.match(
    modrinthProvider._test.friendlyHttpMessage("Modrinth", "project", 404, '{"error":"not found"}'),
    /404 Project not found/,
    "Modrinth 404 errors should be user friendly."
  );
  assert.strictEqual(typeof modrinthProvider._test.normalizeProject({
    project_id: "mr-smoke",
    project_type: "modpack",
    title: "MR Smoke",
    versions: ["1.21.1"],
    categories: ["fabric"],
    server_side: "required",
  }).providerProjectId, "string", "Modrinth current search schema should normalize project_id.");

  const cfEnvNames = [
    "CURSEFORGE_API_KEY",
    "CF_API_KEY",
    "ANXHUB_CURSEFORGE_API_KEY",
    "CURSEFORGE_API_KEY_FILE",
    "CF_API_KEY_FILE",
    "ANXHUB_CURSEFORGE_API_KEY_FILE",
  ];
  curseforgeProvider._test.getApiKeyStatus();
  const previousCfEnv = Object.fromEntries(cfEnvNames.map((name) => [name, process.env[name]]));
  try {
    for (const name of cfEnvNames) {
      delete process.env[name];
    }
    assert.throws(
      () => curseforgeProvider._test.requireApiKey({ apiKey: "" }),
      /CurseForge API key is required to install CurseForge packs/,
      "CurseForge provider should fail gracefully without an API key."
    );
  } finally {
    for (const [name, value] of Object.entries(previousCfEnv)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
  assert.strictEqual(
    curseforgeProvider._test.cleanSecretValue("'$11$22$33aaaaaaaaaaaaaaaaaaaaaaaaaa'"),
    "$11$22$33aaaaaaaaaaaaaaaaaaaaaaaaaa",
    "CurseForge keys from .env should allow single-quoted dollar values."
  );
  assert.strictEqual(
    curseforgeProvider._test.getCurseForgeApiKey({ cfApiKey: "'cf-direct-token'" }),
    "cf-direct-token",
    "CurseForge provider should accept CF-style config aliases."
  );
  assert.deepStrictEqual(
    curseforgeProvider._test.buildApiHeaders({ cfApiKey: "cf-direct-token" }),
    {
      "Accept": "application/json",
      "User-Agent": "AnxOS-Control-Center/1.0 (+https://anxos.local)",
      "x-api-key": "cf-direct-token",
    },
    "CurseForge API requests must include API key and User-Agent headers."
  );
  assert.match(
    curseforgeProvider._test.friendlyHttpMessage("search", 401, '{"message":"invalid"}'),
    /401 Invalid API key.*invalid/,
    "CurseForge 401 errors should mention invalid API key."
  );
  assert.match(
    curseforgeProvider._test.friendlyHttpMessage("search", 429, '{"message":"rate limit exceeded"}'),
    /429 Rate limited.*rate limit exceeded/,
    "CurseForge 429 errors should include provider response details."
  );
  assert.strictEqual(
    curseforgeProvider._test.normalizeMod({
      id: 925200,
      name: "CF Smoke",
      latestFilesIndexes: [{ gameVersion: "1.21.1", modLoader: 6 }],
      authors: [{ name: "Smoke" }],
    }).providerProjectId,
    925200,
    "CurseForge current search schema should normalize id/latestFilesIndexes."
  );
  assert(
    curseforgeProvider._test.getEnvCandidates().some((candidate) => candidate.endsWith(".env")),
    "CurseForge provider should search deterministic .env candidates."
  );
  const cfSecretRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anxhub-cf-key-"));
  try {
    const cfSecretPath = path.join(cfSecretRoot, "cf_api_key.secret");
    fs.writeFileSync(cfSecretPath, "'cf-file-token'\n", "utf8");
    const directEnvNames = ["CURSEFORGE_API_KEY", "CF_API_KEY", "ANXHUB_CURSEFORGE_API_KEY"];
    const previousDirectEnv = Object.fromEntries(directEnvNames.map((name) => [name, process.env[name]]));
    try {
      for (const name of directEnvNames) {
        delete process.env[name];
      }
      assert.strictEqual(
        curseforgeProvider._test.getCurseForgeApiKey({ cfApiKeyFile: cfSecretPath }),
        "cf-file-token",
        "CurseForge provider should read CF_API_KEY_FILE-style secrets."
      );
    } finally {
      for (const [name, value] of Object.entries(previousDirectEnv)) {
        if (value === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = value;
        }
      }
    }
  } finally {
    fs.rmSync(cfSecretRoot, { recursive: true, force: true });
  }

  assert.strictEqual(marketplaceInstallService._test.safeArchivePath("config/example.toml"), "config/example.toml");
  assert.match(
    marketplaceInstallService._test.friendlyHttpMessage("Server runtime", 429, "slow down"),
    /429 Rate limited/,
    "Runtime resolver 429 errors should mention rate limiting."
  );
  assert.throws(
    () => marketplaceInstallService._test.safeArchivePath("../outside.txt"),
    /unsafe path/,
    "Archive extraction must reject zip slip paths."
  );

  const dedupe = marketplaceInstallService._test.createDeduper();
  assert.strictEqual(dedupe.add("project:file"), true, "First dependency should be accepted.");
  assert.strictEqual(dedupe.add("project:file"), false, "Duplicate dependency should be skipped.");
  assert.strictEqual(
    marketplaceInstallService._test.isRecoverableProviderFileError({ code: "CURSEFORGE_REQUEST_FAILED", details: { status: 403 } }),
    true,
    "CurseForge dependency file download-url 403 should be recoverable for optional/skippable files."
  );
  assert.strictEqual(
    marketplaceInstallService._test.isCurseForgeAccessDeniedFileError({ code: "CURSEFORGE_REQUEST_FAILED", details: { status: 403 } }),
    true,
    "CurseForge download-url 403 should be classified as access denied."
  );
  assert.deepStrictEqual(
    marketplaceInstallService._test.getCurseForgeFileContext(
      { projectID: 10, fileID: 20, fileName: "client-shader.zip", required: false },
      {}
    ),
    { fileName: "client-shader.zip", projectId: 10, fileId: 20, dependencyType: "optional" },
    "Optional CurseForge manifest files should keep project/file context."
  );
  assert.match(
    marketplaceInstallService._test.createRestrictedCurseForgeFileError(
      {
        code: "CURSEFORGE_REQUEST_FAILED",
        message: "CurseForge download URL: 403 Forbidden.",
        details: {
          status: 403,
          url: "https://api.curseforge.com/v1/mods/10/files/20/download-url",
          body: '{"message":"access denied"}',
        },
      },
      { fileName: "required-server-mod.jar", projectId: 10, fileId: 20, dependencyType: "required" }
    ).message,
    /required-server-mod\.jar.*project 10, file 20.*manually/i,
    "Restricted required CurseForge server files should produce an actionable error."
  );

  const metadata = marketplaceInstallService._test.buildInstallMetadata(
    {
      name: "Provider Smoke",
      provider: "modrinth",
      providerProjectId: "provider-smoke",
      providerVersionId: "version-smoke",
      minecraftVersion: "1.21.1",
      loader: "fabric",
    },
    {
      minecraftVersion: "1.21.1",
      loaderVersion: "0.16.0",
      serverJar: "fabric-server.jar",
    },
    { mods: [{ file: "mods/example.jar" }], downloads: [{ file: "mods/example.jar" }], source: { provider: "smoke" } }
  );
  assert.strictEqual(metadata.provider, "modrinth", "Metadata should preserve provider.");
  assert.strictEqual(metadata.providerProjectId, "provider-smoke", "Metadata should preserve provider project id.");
  assert.strictEqual(metadata.mods.length, 1, "Metadata should list installed mods.");

  let progressEvents = 0;
  const listener = () => {
    progressEvents += 1;
  };
  marketplaceInstallService.marketplaceInstallEvents.on("progress", listener);
  marketplaceInstallService.marketplaceInstallEvents.emit("progress", { stage: "resolving" });
  marketplaceInstallService.marketplaceInstallEvents.removeListener("progress", listener);
  marketplaceInstallService.marketplaceInstallEvents.emit("progress", { stage: "resolving" });
  assert.strictEqual(progressEvents, 1, "Progress listeners should be removable without duplicate events.");
}

async function main() {
  assertCatalogLoads();
  await assertDisabledTemplatesAreBlocked();
  assertSteamCmdTemplates();
  assertDockerTemplates();
  assertMarketplaceMetadata();
  assertMinecraftVersionPickerSupport();
  assertRendererTemplateIdWiring();
  assertGameTemplateInstallPlans();
  assertGameTemplateCreatePayloadsAreAgentSafe();
  assertTemplateFilePathsAreDataRelative();
  assertNonMinecraftServerTypeIsCleared();
  assertMarketplaceVersionMetadata();
  assertFiveMStartupSafety();
  await assertFiveMPlaceholderStartIsBlocked();
  await assertScriptMarketplaceStartupIsNotJarWrapped();
  await assertPaperMetadataBackfill();
  await assertMinecraftPropertiesVersionBackfill();
  await assertOldVanillaInstallerMetadataBackfill();
  await assertVanillaInstallVersionPipeline();
  await assertMarketplaceInstallerSmokeMatrix();
  await assertCalendarMinecraftVersionMetadata();
  assertImportEcosystemSupport();
  assertMinecraftTemplatesStillPass();
  await assertProviderInstallSupport();
  console.log("Marketplace smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
