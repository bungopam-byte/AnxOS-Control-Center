const assert = require("assert");
const Module = require("module");

const handlers = new Map();
let serviceInvoked = false;
const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") return { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } };
  if (request === "../services/settingsPreferenceService") return {
    readPreferences: () => { serviceInvoked = true; return {}; },
    resetPreferences: () => { serviceInvoked = true; return {}; },
    updatePreferences: () => { serviceInvoked = true; return {}; },
  };
  if (request === "../services/securityService") return {
    audit: () => {},
    requirePermission: () => { throw Object.assign(new Error("Permission denied."), { code: "PERMISSION_DENIED" }); },
  };
  if (request === "../services/settingsPermissionService") return {
    assertCanReadSettingsSecret: () => {},
    assertCanResetSettingsCategory: () => {},
    assertCanWriteSettingsPayload: () => {},
    getSettingsPermissions: () => ({ authenticated: false }),
  };
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
  for (const channel of ["settings:getPreferences", "settings:savePreferences", "settings:resetPreferences"]) {
    serviceInvoked = false;
    const handler = handlers.get(channel);
    assert(handler, `${channel} should be registered.`);
    await assert.rejects(() => handler({}, { settings: { "general.language": "en" } }), (error) => error?.code === "PERMISSION_DENIED");
    assert.strictEqual(serviceInvoked, false, `${channel} must authorize before accessing preference persistence.`);
  }
  assert.deepStrictEqual(await handlers.get("settings:getPermissions")({}, {}), { authenticated: false }, "Permission discovery should remain available while signed out.");
  console.log("Settings IPC authorization smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
