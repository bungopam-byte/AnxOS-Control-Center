const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-node-status-"));
process.env.ANXHUB_CONFIG_DIR = tempDir;

const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const agentClientSource = fs.readFileSync(path.join(root, "src/services/agentClient.js"), "utf8");
const nodeCredentialStoreSource = fs.readFileSync(path.join(root, "src/services/nodeCredentialStore.js"), "utf8");
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

function createHealthAgent({ token, payload, statsStatus = 200, statsDelayMs = 0 }) {
  return http.createServer((request, response) => {
    if (request.url === "/api/v1/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(payload));
      return;
    }
    if (request.url !== "/api/v1/stats" && request.url !== "/api/v1/system/summary") {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { code: "NOT_FOUND" } }));
      return;
    }
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Agent token rejected." } }));
      return;
    }
    const writeStats = () => {
      if (statsStatus !== 200) {
        response.writeHead(statsStatus, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: { code: "STATS_PARTIAL_FAILURE", message: "Stats endpoint failed." } }));
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ hostname: payload.identity.hostname, uptimeSeconds: 12, cpu: { usagePercent: 10 }, memory: { used: 1, total: 2, percent: 50 } }));
    };
    if (statsDelayMs > 0) setTimeout(writeStats, statsDelayMs);
    else writeStats();
  });
}

function createTimeoutAgent({ payload }) {
  return http.createServer((request, response) => {
    if (request.url === "/api/v1/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(payload));
      return;
    }
    // Leave authenticated requests open so the client timeout path is exercised.
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
  const degradedServer = createHealthAgent({
    token: "degraded-token",
    statsStatus: 500,
    payload: {
      ok: true,
      service: "anxos-agent",
      apiVersion: "v1",
      protocolVersion: 1,
      identity: { deviceId: "agent-degraded", hostname: "Degraded Node", agentVersion: "0.1.0" },
    },
  });
  const timeoutServer = createTimeoutAgent({
    payload: {
      ok: true,
      service: "anxos-agent",
      apiVersion: "v1",
      protocolVersion: 1,
      identity: { deviceId: "agent-timeout", hostname: "Timeout Node", agentVersion: "0.1.0" },
    },
  });

  const healthyPort = await listen(healthyServer);
  const authPort = await listen(authServer);
  const degradedPort = await listen(degradedServer);
  const timeoutPort = await listen(timeoutServer);

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
    {
      id: "timeout-node",
      kind: "agent",
      displayName: "Timeout Node",
      agentUrl: `http://127.0.0.1:${timeoutPort}`,
      baseUrl: `http://127.0.0.1:${timeoutPort}`,
      agentIdentity: { deviceId: "agent-timeout", hostname: "Timeout Node" },
    },
    {
      id: "degraded-node",
      kind: "agent",
      displayName: "Degraded Node",
      agentUrl: `http://127.0.0.1:${degradedPort}`,
      baseUrl: `http://127.0.0.1:${degradedPort}`,
      agentIdentity: { deviceId: "agent-degraded", hostname: "Degraded Node" },
    },
  ];

  fs.mkdirSync(path.dirname(getNodesPath()), { recursive: true });
  fs.writeFileSync(getNodesPath(), `${JSON.stringify({ schemaVersion: 2, selectedNodeId: "anxlab", nodes }, null, 2)}\n`);
  setNodeToken("anxlab", "fresh-token");
  setNodeToken("auth-node", "stale-token");
  setNodeToken("offline-node", "offline-token");
  setNodeToken("timeout-node", "timeout-token");
  setNodeToken("degraded-node", "degraded-token");

  const healthy = await checkNodeHealth("anxlab", { timeoutMs: 1000 });
  assert.strictEqual(healthy.state, "online", "reachable compatible health must be online");
  assert.strictEqual(healthy.node.agentStatus.state, "Connected", "connected status requires authenticated endpoint success");
  assert(Object.isFrozen(healthy.node.agentStatus), "AgentStatus snapshots must be immutable");
  assert.notStrictEqual(healthy.node.connection.status, "offline", "health success must clear stale offline state");
  assert.strictEqual(healthy.node.connection.versionCompatibility, "compatible", "API v1/protocol 1 must be compatible");
  assert.notStrictEqual(healthy.node.connection.lastSeen, "2026-01-01T00:00:00.000Z", "Last Seen must update after health response");

  const auth = await checkNodeHealth("auth-node", { timeoutMs: 1000 });
  assert.strictEqual(auth.state, "authentication_failed", "401 must be authentication_failed");
  assert.strictEqual(auth.node.agentStatus.state, "Authentication Required", "public health success plus protected 401 must be Authentication Required");
  assert.strictEqual(auth.node.connection.displayStatus, "Authentication Required", "401 must render as Authentication Required");
  assert.strictEqual(auth.node.connection.reachable, true, "401 means reachable, not unavailable");

  const offline = await checkNodeHealth("offline-node", { timeoutMs: 250 });
  assert.strictEqual(offline.state, "offline", "connection refusal must remain offline/unavailable");
  assert.strictEqual(offline.node.agentStatus.state, "Offline", "connection refusal must produce Offline AgentStatus");
  assert.notStrictEqual(offline.node.connection.reachable, true, "connection refusal is not reachable");

  const timeout = await checkNodeHealth("timeout-node", { timeoutMs: 100 });
  assert.strictEqual(timeout.state, "offline", "authenticated endpoint timeout must produce offline");
  assert.strictEqual(timeout.node.agentStatus.state, "Offline", "timeout must produce Offline AgentStatus");

  const degraded = await checkNodeHealth("degraded-node", { timeoutMs: 1000 });
  assert.strictEqual(degraded.state, "degraded", "authenticated partial failure must produce degraded");
  assert.strictEqual(degraded.node.agentStatus.state, "Degraded", "partial authenticated failure must produce Degraded AgentStatus");

  assert(app.includes("const AGENT_STATUS_STATES = Object.freeze"), "Renderer must declare AgentStatus state before initial render helpers can access it.");
  assert(app.includes("getActiveAgentStatusSnapshot") && app.includes("getTitlebarConnectionState"), "Top-bar connection indicator must consume AgentStatus.");
  assert(app.includes("connectionState.state === \"Authentication Required\""), "Renderer must consume AgentStatus Authentication Required without raw health reinterpretation.");
  assert(!app.includes("connectionState.key"), "Renderer must not consume legacy connectionState.key classifications.");
  assert(app.includes("isNodeRequestCurrent(context)") && app.includes("selectedNodeContextVersion"), "Renderer must retain stale-response guards for rapid node switching.");
  assert(agentClientSource.includes('app.getPath("userData")') && agentClientSource.includes('path.join(app.getPath("userData"), "config")'), "Agent client config must resolve through Electron userData config, not repository-local config, in Electron.");
  assert(nodeCredentialStoreSource.includes('app.getPath("userData")') && nodeCredentialStoreSource.includes('node-agent-credentials.json'), "Node credential store must resolve through Electron userData config for packaged Windows Electron.");
  assert(agentClientSource.indexOf('app.getPath("userData")') < agentClientSource.lastIndexOf('path.join(process.cwd(), "config")'), "Repository-local config must remain only a non-Electron fallback after userData.");
  assert(app.includes('options.forceHealthRefresh'), "Refresh must force a live health refresh instead of repainting restore-only state.");
  assert(app.includes("nodeHealthSnapshotCache.clear()"), "Node health cache must clear when node snapshots reload.");
  assert(app.includes('root = /unauthorized|authentication|credential|token/.test(evidence)') && app.includes('"saved-credential-rejected"'), "Duplicate credential failures must group into one issue root.");
  assert(app.includes("rawTarget?.nodeId === node.id ? rawTarget : null"), "Remote node health must ignore Agent Control/global targets without the same nodeId.");

  await Promise.all([close(healthyServer), close(authServer), close(degradedServer), close(timeoutServer)]);
  console.log("Node status classification smoke checks passed.");
})().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
