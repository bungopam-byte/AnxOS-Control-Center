const { ipcMain } = require("electron");
const { requirePermission } = require("../services/securityService");
const { createIpcError } = require("../shared/ipcError");

function requireWindowSender(event, expectedWindow, label) {
  if (!expectedWindow || expectedWindow.isDestroyed() || event?.sender !== expectedWindow.webContents) {
    const error = new Error(`The ${label} request did not originate from its authorized window.`);
    error.code = "UNTRUSTED_WINDOW_SENDER";
    throw error;
  }
}

function registerHandler(channel, handler) {
  ipcMain.handle(channel, async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      throw createIpcError(error, {
        code: "STORAGE_WINDOW_REQUEST_FAILED",
        fallbackMessage: "The storage window request failed.",
        suggestion: "Close the storage window, reopen it from Files, and retry.",
      });
    }
  });
}

function registerStorageWindowIpc({ closeWindow, getMainWindow, getStorageWindow, notifySaved, openWindow }) {
  registerHandler("storageWindow:open", (event, payload = {}) => {
    requireWindowSender(event, getMainWindow(), "storage window open");
    requirePermission("settings:write", "storage-connections");
    return openWindow(payload);
  });
  registerHandler("storageWindow:close", (event) => {
    requireWindowSender(event, getStorageWindow(), "storage window close");
    return closeWindow();
  });
  registerHandler("storageWindow:saved", (event, payload = {}) => {
    requireWindowSender(event, getStorageWindow(), "storage window saved");
    notifySaved(payload);
    closeWindow();
    return { ok: true };
  });
}

module.exports = { registerStorageWindowIpc };
