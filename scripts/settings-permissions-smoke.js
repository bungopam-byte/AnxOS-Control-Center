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
const main = read("main.js");

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
  main.includes('requireSettingsCapability("canManageDeveloperSettings", "developer-updates")') &&
    app.includes('canUseSettingsCapability("canManageDeveloperSettings") && state?.eligible') &&
    app.includes('Owner access is required for Developer Update.'),
  "Developer update controls must be Owner-gated in main and renderer.",
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
  index.includes(">Connections</button>") &&
    index.includes("Your AMP credentials are stored securely.") &&
    index.includes('data-settings-capability="canManageProviderCredentials"') &&
    !index.includes("AMP password is not saved in localStorage"),
  "Connections settings must use user-facing copy and gate AMP credential controls.",
);

assert(
  index.includes("Saved securely on this device.") &&
    app.includes("Saved securely on this device.") &&
    !index.includes("Saved securely in config/marketplace.json.") &&
    !app.includes("Saved in ${configPath}"),
  "Normal Settings UI must not expose local configuration file paths.",
);

assert(
  index.includes('data-settings-capability="canManageAdvancedNetworking"') &&
    index.includes("Advanced network policy is Owner-only.") &&
    app.includes('canUseSettingsCapability("canManageInternalUpdates")') &&
    app.includes("Owner access is required to install application updates."),
  "Network advanced controls and update installation must be Owner-gated while public update checks remain visible.",
);

assert(
  index.includes('class="owner-only-badge"') &&
    index.includes("Marketplace provider credentials and administrative integration settings are available only to the Owner.") &&
    index.includes("Internal development, diagnostics, and experimental controls.") &&
    !index.includes('settings-section--general" data-settings-capability'),
  "Owner-only Settings content must have concise badges and explanations without marking public Settings as restricted.",
);

assert(
  app.includes("function readRequestedSettingsCategoryFromLocation") &&
    app.includes('params.get("settingsCategory")') &&
    app.includes('hash.match(/^settings') &&
    app.includes("clearRestrictedSettingsState") &&
    app.includes("previousSettingsOwnerState === true && ownerNow === false") &&
    app.includes("targetSection.dataset.settingsCategory !== activeSettingsCategory"),
  "Settings navigation must reject stale restricted categories and clear restricted state after permission loss.",
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
