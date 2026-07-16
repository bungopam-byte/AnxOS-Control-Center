const { ipcMain } = require("electron");
const workspace = require("../services/ownerWorkspaceService");
const { createIpcError } = require("../shared/ipcError");

async function invokeOwnerWorkspace(operation, operationName = "ownerWorkspace") {
  console.info("[OwnerWorkspace][IPC] Operation started.", { operation: operationName });
  try {
    const result = await operation();
    console.info("[OwnerWorkspace][IPC] Operation completed.", { operation: operationName });
    return result;
  } catch (error) {
    const wrapped = createIpcError(error, {
      code: "OWNER_WORKSPACE_REQUEST_FAILED",
      fallbackMessage: "Owner Workspace request failed.",
      suggestion: "Confirm Owner authorization and review the workspace diagnostics, then retry.",
    });
    console.warn("[OwnerWorkspace][IPC] Operation failed.", {
      operation: operationName,
      code: wrapped.code,
      message: wrapped.friendlyMessage,
    });
    throw wrapped;
  }
}

function registerOwnerWorkspaceIpc() {
  ipcMain.handle("ownerWorkspace:getStatus", async () => invokeOwnerWorkspace(() => workspace.publicStatus(), "ownerWorkspace:getStatus"));
  ipcMain.handle("ownerWorkspace:getWorkspace", async () => invokeOwnerWorkspace(() => workspace.getWorkspace(), "ownerWorkspace:getWorkspace"));
  ipcMain.handle("ownerWorkspace:createPage", async (_, payload = {}) => invokeOwnerWorkspace(() => workspace.createPage(payload), "ownerWorkspace:createPage"));
  ipcMain.handle("ownerWorkspace:updatePage", async (_, payload = {}) => invokeOwnerWorkspace(() => workspace.updatePage(payload), "ownerWorkspace:updatePage"));
  ipcMain.handle("ownerWorkspace:duplicatePage", async (_, payload = {}) => invokeOwnerWorkspace(() => workspace.duplicatePage(payload), "ownerWorkspace:duplicatePage"));
  ipcMain.handle("ownerWorkspace:deletePage", async (_, payload = {}) => invokeOwnerWorkspace(() => workspace.deletePage(payload), "ownerWorkspace:deletePage"));
  ipcMain.handle("ownerWorkspace:reorderPages", async (_, payload = {}) => invokeOwnerWorkspace(() => workspace.reorderPages(payload), "ownerWorkspace:reorderPages"));
  ipcMain.handle("ownerWorkspace:selectPage", async (_, payload = {}) => invokeOwnerWorkspace(() => workspace.selectPage(payload), "ownerWorkspace:selectPage"));
  ipcMain.handle("ownerWorkspace:saveContent", async (_, payload = {}) => invokeOwnerWorkspace(() => workspace.saveContent(payload), "ownerWorkspace:saveContent"));
  ipcMain.handle("ownerWorkspace:getAnalytics", async () => invokeOwnerWorkspace(() => workspace.getAnalytics(), "ownerWorkspace:getAnalytics"));
  ipcMain.handle("ownerWorkspace:getFlags", async () => invokeOwnerWorkspace(() => workspace.getFeatureFlags(), "ownerWorkspace:getFlags"));
  ipcMain.handle("ownerWorkspace:setFlag", async (_, payload = {}) => invokeOwnerWorkspace(() => workspace.setFeatureFlag(payload), "ownerWorkspace:setFlag"));
  ipcMain.handle("ownerWorkspace:runApiRequest", async (_, payload = {}) => invokeOwnerWorkspace(() => workspace.runApiRequest(payload), "ownerWorkspace:runApiRequest"));
  ipcMain.handle("ownerWorkspace:clearApiHistory", async () => invokeOwnerWorkspace(() => workspace.clearApiHistory(), "ownerWorkspace:clearApiHistory"));
  ipcMain.handle("ownerWorkspace:getCommands", async () => invokeOwnerWorkspace(() => workspace.getCommandCatalog(), "ownerWorkspace:getCommands"));
  ipcMain.handle("ownerWorkspace:runCommand", async (event, payload = {}) => invokeOwnerWorkspace(() => workspace.runCommand(payload, event), "ownerWorkspace:runCommand"));
  ipcMain.handle("ownerWorkspace:readLogs", async () => invokeOwnerWorkspace(() => workspace.readLogViewer(), "ownerWorkspace:readLogs"));
}

module.exports = {
  registerOwnerWorkspaceIpc,
};
