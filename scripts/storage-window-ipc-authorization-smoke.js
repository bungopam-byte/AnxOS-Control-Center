const assert = require("assert");
const Module = require("module");

const handlers = new Map();
let authorized = true;
let opened = 0;
let closed = 0;
let notified = 0;
const mainContents = {};
const childContents = {};
const mainWindow = { isDestroyed: () => false, webContents: mainContents };
const childWindow = { isDestroyed: () => false, webContents: childContents };

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") return { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } };
  if (request === "../services/securityService") return { requirePermission: () => {
    if (authorized) return { role: "Owner" };
    throw Object.assign(new Error("Permission denied"), { code: "PERMISSION_DENIED" });
  } };
  return originalLoad.call(this, request, parent, isMain);
};

let registerStorageWindowIpc;
try {
  ({ registerStorageWindowIpc } = require("../src/ipc/storageWindowIpc"));
} finally {
  Module._load = originalLoad;
}

registerStorageWindowIpc({
  closeWindow: () => { closed += 1; return { closed: true }; },
  getMainWindow: () => mainWindow,
  getStorageWindow: () => childWindow,
  notifySaved: () => { notified += 1; },
  openWindow: () => { opened += 1; return { opened: true }; },
});

async function rejects(channel, sender, code) {
  await assert.rejects(() => handlers.get(channel)({ sender }, {}), (error) => error.code === code);
}

async function main() {
  await rejects("storageWindow:open", childContents, "UNTRUSTED_WINDOW_SENDER");
  await rejects("storageWindow:close", mainContents, "UNTRUSTED_WINDOW_SENDER");
  await rejects("storageWindow:saved", mainContents, "UNTRUSTED_WINDOW_SENDER");
  assert.deepStrictEqual({ opened, closed, notified }, { opened: 0, closed: 0, notified: 0 }, "Spoofed window messages must have no side effects.");

  authorized = false;
  await rejects("storageWindow:open", mainContents, "PERMISSION_DENIED");
  assert.strictEqual(opened, 0, "Opening the storage window must authorize before creating it.");

  authorized = true;
  await handlers.get("storageWindow:open")({ sender: mainContents }, {});
  await handlers.get("storageWindow:saved")({ sender: childContents }, { connectionId: "storage-1" });
  assert.deepStrictEqual({ opened, closed, notified }, { opened: 1, closed: 1, notified: 1 }, "Authorized window messages should retain existing behavior.");
  console.log("Storage window IPC authorization smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
