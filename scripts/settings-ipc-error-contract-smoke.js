const assert = require("assert");
const Module = require("module");

const handlers = new Map();
let failRead = false;

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") return { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } };
  if (request === "../services/settingsPreferenceService") {
    return {
      readPreferences: () => {
        if (failRead) throw Object.assign(new Error("api_key=settings-secret"), { code: "SETTINGS_STORE_CORRUPT", statusCode: 500 });
        return { "general.language": "en" };
      },
      resetPreferences: () => ({}),
      updatePreferences: () => ({}),
    };
  }
  if (request === "../services/securityService") return { audit: () => {}, requirePermission: () => {} };
  if (request === "../services/settingsPermissionService") {
    return {
      assertCanReadSettingsSecret: () => {},
      assertCanResetSettingsCategory: () => {},
      assertCanWriteSettingsPayload: () => {},
      getSettingsPermissions: () => ({ authenticated: true }),
    };
  }
  if (request === "../services/agentClient") return {};
  if (request === "../services/nodeService") return {};
  if (request === "../services/providerConfigService") return {};
  if (request === "../services/providers/curseforgeProvider") return { _test: {} };
  return originalLoad.call(this, request, parent, isMain);
};

try {
  require("../src/ipc/settingsIpc").registerSettingsIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  const handler = handlers.get("settings:getPreferences");
  assert.deepStrictEqual(await handler({}, {}), { "general.language": "en" });
  failRead = true;
  await assert.rejects(handler({}, {}), (error) => {
    assert.strictEqual(error.code, "SETTINGS_STORE_CORRUPT");
    assert.strictEqual(error.statusCode, 500);
    assert(!JSON.stringify(error).includes("settings-secret"));
    return true;
  });
  console.log("Settings IPC error contract smoke checks passed.");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
