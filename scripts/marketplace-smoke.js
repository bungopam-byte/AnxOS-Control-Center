const assert = require("assert");
const fs = require("fs");
const path = require("path");

const marketplaceService = require("../src/services/marketplaceService");

const catalogPath = path.join(__dirname, "..", "config", "marketplace-templates.json");
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
  assertMinecraftTemplatesStillPass();
  console.log("Marketplace smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
