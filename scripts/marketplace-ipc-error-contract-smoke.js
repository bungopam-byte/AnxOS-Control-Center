const assert = require("assert");
const { EventEmitter } = require("events");
const Module = require("module");

const handlers = new Map();
const secret = "marketplace-provider-api-secret";
const originalError = Object.assign(new Error(`api_key=${secret}`), {
  code: "CURSEFORGE_REQUEST_FAILED",
  status: 502,
  details: { provider: "curseforge", retryable: true, suggestion: "Retry the provider request.", responseBody: secret },
});
const marketplaceService = new Proxy({ marketplaceInstallEvents: new EventEmitter() }, {
  get: (target, property) => property in target ? target[property] : async () => {
    if (property === "listTemplates") throw originalError;
    return {};
  },
});
const installService = new Proxy({ marketplaceInstallEvents: marketplaceService.marketplaceInstallEvents }, {
  get: (target, property) => property in target ? target[property] : async () => ({}),
});

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") {
    return {
      BrowserWindow: { getAllWindows: () => [] },
      dialog: { showOpenDialog: async () => ({ canceled: true }) },
      ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    };
  }
  if (request === "../services/marketplaceService") return marketplaceService;
  if (request === "../services/marketplaceInstallService") return installService;
  if (request === "../services/securityService") return { audit: () => {}, requirePermission: () => ({}) };
  if (request === "../services/externalUrlService") return { openExternalUrl: async () => ({}) };
  return originalLoad.call(this, request, parent, isMain);
};

try {
  require("../src/ipc/marketplaceIpc").registerMarketplaceIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  const handler = handlers.get("marketplace:listTemplates");
  assert(handler, "Marketplace template handler should be registered.");
  const result = await handler({}, {});
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.code, "PROVIDER_MANUAL_DOWNLOAD_REQUIRED");
  assert.strictEqual(result.error.technicalDetails.causeCode, "CURSEFORGE_REQUEST_FAILED");
  assert.strictEqual(result.error.retryable, true);
  assert.strictEqual(result.error.status.code, 502);
  assert.strictEqual(result.error.provider.id, "curseforge");
  assert.strictEqual(result.error.suggestion, "Retry the provider request.");
  assert(!JSON.stringify(result).includes(secret), "Marketplace IPC errors must redact provider credentials and response bodies.");
  console.log("Marketplace IPC error contract smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
