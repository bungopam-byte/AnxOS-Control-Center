const assert = require("assert");
const Module = require("module");

const handlers = new Map();
let authorized = false;
let serviceInvoked = false;

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") return { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } };
  if (request === "../services/securityService") {
    return { requirePermission: () => {
      if (authorized) return { role: "Owner" };
      throw Object.assign(new Error("Permission denied for token=update-secret"), { code: "PERMISSION_DENIED" });
    } };
  }
  if (request === "../services/settingsPermissionService") {
    return { requireSettingsCapability: () => {
      if (authorized) return { role: "Owner" };
      throw Object.assign(new Error("Developer access denied for password=dev-secret"), { code: "PERMISSION_DENIED" });
    } };
  }
  return originalLoad.call(this, request, parent, isMain);
};

let registerDeveloperUpdatesIpc;
let registerUpdatesIpc;
try {
  ({ registerDeveloperUpdatesIpc, registerUpdatesIpc } = require("../src/ipc/updatesIpc"));
} finally {
  Module._load = originalLoad;
}

function manager(methods) {
  return Object.fromEntries(methods.map((method) => [method, () => {
    serviceInvoked = true;
    return { ok: true };
  }]));
}

async function main() {
  const updates = manager(["initialize", "getState", "check", "download", "install", "openDownload", "openRelease", "skip"]);
  registerUpdatesIpc(updates);
  assert.strictEqual(serviceInvoked, true, "Update manager initialization should run during trusted main-process registration.");
  serviceInvoked = false;
  const developer = manager(["getState", "check", "update", "restart", "openChanges"]);
  registerDeveloperUpdatesIpc(developer);

  for (const [channel, handler] of handlers) {
    serviceInvoked = false;
    await assert.rejects(
      () => handler({}, {}),
      (error) => error.code === "PERMISSION_DENIED"
        && error.details?.technicalDetails
        && !JSON.stringify(error).includes("update-secret")
        && !JSON.stringify(error).includes("dev-secret"),
      `${channel} should return a redacted permission error.`,
    );
    assert.strictEqual(serviceInvoked, false, `${channel} must authorize before calling its updater service.`);
  }

  authorized = true;
  const result = await handlers.get("updates:getState")({}, {});
  assert.deepStrictEqual(result, { ok: true }, "Authorized updater responses must preserve their existing shape.");
  assert.strictEqual(serviceInvoked, true, "Authorized updater requests should reach the service.");
  console.log("Updates IPC authorization smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
