const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const servicePath = path.join(root, "src", "services", "publicAccessProviderService.js");
const appPath = path.join(root, "app.js");
const indexPath = path.join(root, "index.html");
const preloadPath = path.join(root, "preload.js");
const ipcPath = path.join(root, "src", "ipc", "publicAccessIpc.js");

const publicAccess = require("../src/services/publicAccessProviderService");
const serviceSource = fs.readFileSync(servicePath, "utf8");
const appSource = fs.readFileSync(appPath, "utf8");
const indexSource = fs.readFileSync(indexPath, "utf8");
const preloadSource = fs.readFileSync(preloadPath, "utf8");
const ipcSource = fs.readFileSync(ipcPath, "utf8");

const providers = publicAccess.PUBLIC_ACCESS_PROVIDERS;
const byId = new Map(providers.map((provider) => [provider.id, provider]));

assert(byId.has("playit") && byId.has("tailscale") && byId.has("cloudflare-tunnel") && byId.has("anxos-relay"), "Public Access must declare all evaluated providers.");
assert.strictEqual(byId.get("playit").status, "supported", "Playit must remain the supported provider.");
assert.strictEqual(byId.get("tailscale").exposureScope, "tailnet-only", "Tailscale must not be described as public internet exposure.");
assert.strictEqual(byId.get("cloudflare-tunnel").capabilities.createTunnel, false, "Cloudflare Tunnel creation must remain disabled until fully implemented.");
assert.strictEqual(byId.get("anxos-relay").status, "disabled", "AnxOS Relay must stay disabled without a real backend.");

const playitService = publicAccess._test.buildServiceFromPlayitSnapshot({
  connected: true,
  tunnelAddress: "example.playit.gg",
  localPort: "25565",
});
assert.strictEqual(playitService.status, "Public");
assert.strictEqual(playitService.exposureScope, "public-internet");

const playitProvider = publicAccess._test.buildPlayitProviderState({
  installed: true,
  running: true,
  connected: true,
  tunnelAddress: "example.playit.gg",
});
assert.strictEqual(playitProvider.health, "healthy");
assert.strictEqual(playitProvider.publicAddress, "example.playit.gg");

const readiness = publicAccess._test.summarizePublicAccessReadiness({
  providers: [
    publicAccess._test.createProviderState(publicAccess.TailscaleProvider, {
      available: true,
      installed: true,
      connected: true,
      health: "healthy",
      tailnetAddress: "100.64.0.1",
    }),
  ],
  services: [],
  activeTunnels: 0,
  exposureScope: "tailnet-only",
});
assert.strictEqual(readiness.state, "degraded", "Tailnet-only connectivity should be degraded for public access validation.");
assert.strictEqual(readiness.context.providerCapabilities[0].publicInternet, false, "Tailscale tailnet-only capability must not be reported as public internet.");

assert(serviceSource.includes('execFile(command, args') && !serviceSource.includes("exec("), "Provider detection must use execFile with argument arrays.");
assert(serviceSource.includes('runCommand("tailscale", ["status", "--json"])'), "Tailscale foundation must inspect real CLI status.");
assert(serviceSource.includes('runCommand("cloudflared", ["--version"])'), "Cloudflare foundation must inspect real cloudflared availability.");
assert(serviceSource.includes("redactOutput"), "Provider diagnostics must redact token-like output.");
assert(serviceSource.includes("summarizePublicAccessReadiness"), "Public Access snapshots must include readiness summaries.");
assert(appSource.includes("function renderPublicAccessProviders") && appSource.includes("Tailnet-only"), "Renderer must show provider capability and exposure scope honestly.");
assert(indexSource.includes("data-public-access-providers"), "Public Access workspace must expose a provider list surface.");
assert(preloadSource.includes("publicAccess:getSnapshot") && ipcSource.includes("getPublicAccessSnapshot"), "Public Access IPC bridge must remain wired.");

console.log("Public Access smoke checks passed.");
