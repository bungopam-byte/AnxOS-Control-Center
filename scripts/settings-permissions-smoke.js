const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const app = read("app.js");
const index = read("index.html");
const preload = read("preload.js");
const settingsIpc = read("src/ipc/settingsIpc.js");
const permissions = read("src/services/settingsPermissionService.js");

assert(
  preload.includes("getPermissions: () => ipcRenderer.invoke(\"settings:getPermissions\")"),
  "Preload must expose centralized Settings permissions.",
);

assert(
  settingsIpc.includes("settings:getPermissions") &&
    settingsIpc.includes("getSettingsPermissions()"),
  "Settings IPC must expose permission state from the main process.",
);

assert(
  settingsIpc.includes("assertCanReadSettingsSecret(\"canManageMarketplaceSettings\"") &&
    settingsIpc.includes("assertCanReadSettingsSecret(\"canManageAgentConfiguration\""),
  "Sensitive Settings config reads must require Owner capabilities.",
);

assert(
  settingsIpc.includes("assertCanWriteSettingsPayload") &&
    settingsIpc.includes("assertCanResetSettingsCategory"),
  "Settings preference writes and resets must pass centralized permission checks.",
);

assert(
  permissions.includes("canManageMarketplaceSettings") &&
    permissions.includes("canManageDeveloperSettings") &&
    permissions.includes("canManageAgentConfiguration") &&
    permissions.includes("requireOwner(target)") &&
    permissions.includes('error.code = "FORBIDDEN"'),
  "Settings permission service must map Owner-only capabilities through Owner authorization.",
);

assert(
  index.includes('data-settings-capability="canManageMarketplaceSettings"') &&
    index.includes('data-settings-capability="canManageDeveloperSettings"') &&
    index.includes('data-settings-capability="canViewDiagnostics"') &&
    index.includes('data-settings-category-target="marketplace-admin"') &&
    index.includes('data-settings-category="marketplace-admin"'),
  "Sensitive Settings cards must declare required capabilities in markup.",
);

assert(
  index.includes('data-page="marketplace"') &&
    index.includes('data-settings-category-target="marketplace-admin"'),
  "Marketplace administration must be separate from the main Marketplace workspace.",
);

assert(
  app.includes("let settingsPermissionState") &&
    app.includes("refreshSettingsPermissions") &&
    app.includes("isSettingsSectionAuthorized") &&
    app.includes("normalizeSettingsCategory") &&
    app.includes("filter(isSettingsSectionAuthorized)"),
  "Renderer must centralize Settings permission state for navigation and search.",
);

assert(
  app.includes("await refreshSettingsPermissions();") &&
    app.includes("settingsPermissionState?.settings?.ownerOnly") &&
    app.includes("isSettingKeyAuthorized(key)"),
  "Renderer must refresh permissions and filter Owner-only setting writes.",
);

console.log("Settings permission smoke checks passed.");
