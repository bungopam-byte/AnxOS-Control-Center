const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-node-status-"));
process.env.ANXHUB_CONFIG_DIR = tempDir;

const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const { checkNodeHealth, getNodesPath } = require("../src/services/nodeService");
const { setNodeToken } = require("../src/services/nodeCredentialStore");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve())).catch(() => {});
}

function createHealthAgent({ token, payload }) {
  return http.createServer((request, response) => {
    if (request.url !== "/api/v1/health") {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { code: "NOT_FOUND" } }));
      return;
    }
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Agent token rejected." } }));
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(payload));
  });
}

(async () => {
  const healthyServer = createHealthAgent({
    token: "fresh-token",
    payload: {
      ok: true,
      service: "anxos-agent",
      apiVersion: "v1",
      protocolVersion: 1,
      identity: { deviceId: "agent-anxlab", hostname: "Anxlab", agentVersion: "0.1.0" },
    },
  });
  const authServer = createHealthAgent({
    token: "canonical-token",
    payload: {
      ok: true,
      service: "anxos-agent",
      apiVersion: "v1",
      protocolVersion: 1,
      identity: { deviceId: "agent-auth", hostname: "Auth Node", agentVersion: "0.1.0" },
    },
  });

  const healthyPort = await listen(healthyServer);
  const authPort = await listen(authServer);

  const nodes = [
    {
      id: "anxlab",
      kind: "agent",
      displayName: "Anxlab",
      agentUrl: `http://127.0.0.1:${healthyPort}`,
      baseUrl: `http://127.0.0.1:${healthyPort}`,
      agentIdentity: { deviceId: "agent-anxlab", hostname: "Anxlab" },
      lastConnectionState: "offline",
      connection: {
        connected: false,
        status: "offline",
        displayStatus: "Offline",
        message: "Agent connection state is unavailable.",
        lastSeen: "2026-01-01T00:00:00.000Z",
        authenticated: null,
        versionCompatibility: "unknown",
      },
    },
    {
      id: "auth-node",
      kind: "agent",
      displayName: "Auth Node",
      agentUrl: `http://127.0.0.1:${authPort}`,
      baseUrl: `http://127.0.0.1:${authPort}`,
      agentIdentity: { deviceId: "agent-auth", hostname: "Auth Node" },
    },
    {
      id: "offline-node",
      kind: "agent",
      displayName: "Offline Node",
      agentUrl: "http://127.0.0.1:9",
      baseUrl: "http://127.0.0.1:9",
      agentIdentity: { deviceId: "agent-offline", hostname: "Offline Node" },
    },
  ];

  fs.mkdirSync(path.dirname(getNodesPath()), { recursive: true });
  fs.writeFileSync(getNodesPath(), `${JSON.stringify({ schemaVersion: 2, selectedNodeId: "anxlab", nodes }, null, 2)}\n`);
  setNodeToken("anxlab", "fresh-token");
  setNodeToken("auth-node", "stale-token");
  setNodeToken("offline-node", "offline-token");

  const healthy = await checkNodeHealth("anxlab", { timeoutMs: 1000 });
  assert.strictEqual(healthy.state, "online", "reachable compatible health must be online");
  assert.notStrictEqual(healthy.node.connection.status, "offline", "health success must clear stale offline state");
  assert.strictEqual(healthy.node.connection.versionCompatibility, "compatible", "API v1/protocol 1 must be compatible");
  assert.notStrictEqual(healthy.node.connection.lastSeen, "2026-01-01T00:00:00.000Z", "Last Seen must update after health response");

  const auth = await checkNodeHealth("auth-node", { timeoutMs: 1000 });
  assert.strictEqual(auth.state, "authentication_failed", "401 must be authentication_failed");
  assert.strictEqual(auth.node.connection.displayStatus, "Authentication Required", "401 must render as Authentication Required");
  assert.strictEqual(auth.node.connection.reachable, true, "401 means reachable, not unavailable");

  const offline = await checkNodeHealth("offline-node", { timeoutMs: 250 });
  assert.strictEqual(offline.state, "offline", "connection refusal must remain offline/unavailable");
  assert.notStrictEqual(offline.node.connection.reachable, true, "connection refusal is not reachable");

  assert(app.includes('label: "Authentication Required"'), "Nodes UI must label credential rejection as Authentication Required.");
  assert(app.includes("Reachable, but the saved credential was rejected."), "Nodes UI must not call credential rejection unavailable.");
  assert(app.includes('options.forceHealthRefresh'), "Refresh must force a live health refresh instead of repainting restore-only state.");
  assert(app.includes("nodeHealthSnapshotCache.clear()"), "Node health cache must clear when node snapshots reload.");
  assert(app.includes('root = /unauthorized|authentication|credential|token/.test(evidence)') && app.includes('"saved-credential-rejected"'), "Duplicate credential failures must group into one issue root.");
  assert(app.includes("rawTarget?.nodeId === node.id ? rawTarget : null"), "Remote node health must ignore Agent Control/global targets without the same nodeId.");

  await Promise.all([close(healthyServer), close(authServer)]);
  console.log("Node status classification smoke checks passed.");
})().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
