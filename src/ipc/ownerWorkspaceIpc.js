const { ipcMain } = require("electron");
const workspace = require("../services/ownerWorkspaceService");

function getOwnerWorkspaceError(error) {
  return error?.message || error?.code || "Owner Workspace request failed.";
}

async function invokeOwnerWorkspace(operation, operationName = "ownerWorkspace") {
  console.info("[OwnerWorkspace][IPC] Operation started.", { operation: operationName });
  try {
    const result = await operation();
    console.info("[OwnerWorkspace][IPC] Operation completed.", { operation: operationName });
    return result;
  } catch (error) {
    console.warn("[OwnerWorkspace][IPC] Operation failed.", {
      operation: operationName,
      code: error?.code || null,
      message: getOwnerWorkspaceError(error),
    });
    throw new Error(getOwnerWorkspaceError(error));
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
