const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const marketplaceService = require("../src/services/marketplaceService");

const catalogPath = path.join(__dirname, "..", "config", "marketplace-templates.json");
const appPath = path.join(__dirname, "..", "app.js");
const templates = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

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
  assert.strictEqual(paper.serverSoftware, "Paper", "Paper metadata should save server software.");
  assert.strictEqual(paper.minecraftVersion, "1.21.8", "Paper metadata should save Minecraft version.");
  assert.strictEqual(paper.buildNumber, 42, "Paper metadata should save build number.");
  assert.strictEqual(paper.paperBuild, 42, "Paper metadata should save paperBuild.");
  assert.match(paper.versionName, /Paper 1\.21\.8 build 42/, "Paper metadata should save versionName.");
  assert.match(paper.version, /Paper 1\.21\.8 build 42/, "Paper display version should include build number.");

  const vanilla = marketplaceService._test.buildResolvedVersionMetadata(findTemplate("minecraft-vanilla"), {
    version: "1.21.8",
  });
  assert.strictEqual(vanilla.version, "Vanilla 1.21.8", "Vanilla display version should use the Mojang version.");

  const source = fs.readFileSync(appPath, "utf8");
  assert(source.includes("cleanInstanceVersionValue"), "Renderer should clean version candidates before display.");
  assert(source.includes("getInstanceTemplateVersionLabel"), "Renderer should have a template metadata fallback.");
  assert(source.includes("getInstanceVersionMetadata"), "Renderer should normalize version metadata before display.");
  assert(source.includes("main: minecraftVersion || \"Unknown version\""), "Minecraft table version should use the game version as the main value.");
  assert(source.includes("secondary = `${software || \"Minecraft\"} Build ${buildNumber}`"), "Minecraft build/software info should be secondary metadata.");
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
    assert.strictEqual(status.version, "Paper 1.21.8 build 42", "Paper backfill should normalize display version.");
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

async function main() {
  assertCatalogLoads();
  await assertDisabledTemplatesAreBlocked();
  assertSteamCmdTemplates();
  assertDockerTemplates();
  assertMarketplaceMetadata();
  assertRendererTemplateIdWiring();
  assertGameTemplateInstallPlans();
  assertGameTemplateCreatePayloadsAreAgentSafe();
  assertTemplateFilePathsAreDataRelative();
  assertNonMinecraftServerTypeIsCleared();
  assertMarketplaceVersionMetadata();
  assertFiveMStartupSafety();
  await assertFiveMPlaceholderStartIsBlocked();
  await assertPaperMetadataBackfill();
  await assertMinecraftPropertiesVersionBackfill();
  assertImportEcosystemSupport();
  assertMinecraftTemplatesStillPass();
  console.log("Marketplace smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
