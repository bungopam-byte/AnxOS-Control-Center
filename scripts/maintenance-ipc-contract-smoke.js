const assert = require("assert");
const Module = require("module");

const handlers = new Map();
let authorized = false;
let serviceCalls = 0;
let failClear = false;
const maintenance = {
  scan: async () => { serviceCalls += 1; return { categories: [] }; },
  clear: async () => {
    serviceCalls += 1;
    if (failClear) {
      throw Object.assign(new Error("password=maintenance-secret"), { code: "MAINTENANCE_LOCKED", statusCode: 409 });
    }
    return { reclaimedBytes: 12, partial: false };
  },
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") return { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } };
  if (request === "../services/maintenanceService") return maintenance;
  if (request === "../services/securityService") {
    return {
      audit: () => {},
      requirePermission: () => {
        if (!authorized) throw Object.assign(new Error("Permission denied."), { code: "PERMISSION_DENIED" });
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

try {
  require("../src/ipc/maintenanceIpc").registerMaintenanceIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  for (const channel of ["maintenance:scan", "maintenance:clear"]) {
    serviceCalls = 0;
    await assert.rejects(handlers.get(channel)({}, { categoryIds: ["logs"] }), (error) => error?.code === "PERMISSION_DENIED");
    assert.strictEqual(serviceCalls, 0, `${channel} must authorize before service access.`);
  }
  authorized = true;
  assert.deepStrictEqual(await handlers.get("maintenance:scan")({}, {}), { categories: [] });
  failClear = true;
  await assert.rejects(handlers.get("maintenance:clear")({}, { categoryIds: ["logs"] }), (error) => {
    assert.strictEqual(error.code, "MAINTENANCE_LOCKED");
    assert.strictEqual(error.statusCode, 409);
    assert(!JSON.stringify(error).includes("maintenance-secret"));
    return true;
  });
  console.log("Maintenance IPC contract smoke checks passed.");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
