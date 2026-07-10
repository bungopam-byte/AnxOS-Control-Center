const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { getApplicationHostNode, APPLICATION_HOST_NODE_ID } = require("./applicationHostService");
const { getEffectiveAgentSettings, getHealth, normalizeAgentSettings, testConnection } = require("./agentClient");

const NODE_SCHEMA_VERSION = 2;

function getConfigDirectory() {
  if (process.env.ANXHUB_CONFIG_DIR) return process.env.ANXHUB_CONFIG_DIR;
  try { return app ? path.join(app.getPath("userData"), "config") : path.join(process.cwd(), "config"); }
  catch { return path.join(process.cwd(), "config"); }
}

function getNodesPath() { return path.join(getConfigDirectory(), "nodes.json"); }
function ensureConfigDirectory() { fs.mkdirSync(getConfigDirectory(), { recursive: true }); }
function normalizeUrl(value) { try { const url = new URL(String(value || "").trim()); return `${url.protocol}//${url.host}${url.pathname.replace(/\/$/, "")}`; } catch { return String(value || "").trim(); } }
function legacyDeviceId(url) { return `legacy-${crypto.createHash("sha256").update(normalizeUrl(url)).digest("hex").slice(0, 20)}`; }
function nodeIdForDevice(deviceId) { return `agent-${String(deviceId || "unknown").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 56)}`; }

function normalizeAgentNode(node = {}) {
  const agentUrl = normalizeUrl(node.agentUrl || node.url);
  const identity = node.agentIdentity || node.identity || {};
  const deviceId = identity.deviceId || node.deviceId || legacyDeviceId(agentUrl);
  return {
    id: node.id && node.id !== "default" ? node.id : nodeIdForDevice(deviceId),
    kind: "agent",
    displayName: String(node.displayName || node.name || identity.hostname || "Agent Node").trim().slice(0, 80),
    agentUrl,
    agentToken: String(node.agentToken || node.token || ""),
    agentIdentity: { deviceId, hostname: identity.hostname || "", operatingSystem: identity.operatingSystem || "", platform: identity.platform || "", architecture: identity.architecture || "", agentVersion: identity.agentVersion || "" },
    docker: { enabled: node.docker?.enabled !== false, runtime: node.docker?.runtime || "docker" },
    createdAt: node.createdAt || new Date().toISOString(),
    updatedAt: node.updatedAt || new Date().toISOString(),
    executionTarget: { type: "agent", deviceId },
  };
}

function mergeAgentNodes(nodes) {
  const byDevice = new Map();
  for (const raw of nodes.map(normalizeAgentNode)) {
    const key = raw.agentIdentity.deviceId;
    const current = byDevice.get(key);
    if (!current) { byDevice.set(key, raw); continue; }
    byDevice.set(key, {
      ...current,
      displayName: current.displayName || raw.displayName,
      agentUrl: current.agentUrl || raw.agentUrl,
      agentToken: current.agentToken || raw.agentToken,
      agentIdentity: { ...raw.agentIdentity, ...Object.fromEntries(Object.entries(current.agentIdentity).filter(([, value]) => value)) },
      docker: current.docker || raw.docker,
      updatedAt: new Date().toISOString(),
    });
  }
  return [...byDevice.values()];
}

function migrateState(parsed = {}) {
  const effective = getEffectiveAgentSettings();
  const legacyNodes = Array.isArray(parsed.nodes) ? parsed.nodes.filter((node) => node.id !== APPLICATION_HOST_NODE_ID && node.kind !== "application-host") : [];
  if (effective.backendMode === "agent" && effective.agentUrl && !legacyNodes.some((node) => normalizeUrl(node.agentUrl || node.url) === normalizeUrl(effective.agentUrl))) {
    legacyNodes.push({ displayName: "Owner Machine", agentUrl: effective.agentUrl, agentToken: effective.agentToken });
  }
  const nodes = mergeAgentNodes(legacyNodes);
  let selectedNodeId = parsed.selectedNodeId || APPLICATION_HOST_NODE_ID;
  if (selectedNodeId === "default") selectedNodeId = effective.backendMode === "agent" && nodes[0] ? nodes[0].id : APPLICATION_HOST_NODE_ID;
  if (selectedNodeId !== APPLICATION_HOST_NODE_ID && !nodes.some((node) => node.id === selectedNodeId)) selectedNodeId = nodes[0]?.id || APPLICATION_HOST_NODE_ID;
  return { schemaVersion: NODE_SCHEMA_VERSION, selectedNodeId, nodes };
}

function readNodeState() {
  let parsed = {};
  try { parsed = JSON.parse(fs.readFileSync(getNodesPath(), "utf8")); } catch {}
  const state = migrateState(parsed);
  if (parsed.schemaVersion !== NODE_SCHEMA_VERSION || JSON.stringify(parsed) !== JSON.stringify(state)) writeNodeState(state);
  return state;
}

function writeNodeState(state) {
  ensureConfigDirectory();
  fs.writeFileSync(getNodesPath(), `${JSON.stringify({ schemaVersion: NODE_SCHEMA_VERSION, selectedNodeId: state.selectedNodeId, nodes: state.nodes }, null, 2)}\n`, { mode: 0o600 });
}

function publicNode(node) {
  if (node.kind === "application-host") return node;
  return { ...node, hasToken: Boolean(node.agentToken), agentToken: node.agentToken ? "[configured]" : "", local: false, modeLabel: "Agent" };
}

async function refreshIdentities(state) {
  const refreshed = [];
  for (const node of state.nodes) {
    try {
      const health = await getHealth(getNodeAgentConfigFromNode(node));
      refreshed.push(normalizeAgentNode({ ...node, agentIdentity: health.identity || node.agentIdentity }));
    } catch { refreshed.push(node); }
  }
  const nodes = mergeAgentNodes(refreshed);
  const selectedDevice = state.nodes.find((node) => node.id === state.selectedNodeId)?.agentIdentity?.deviceId;
  const selectedNodeId = selectedDevice ? nodes.find((node) => node.agentIdentity.deviceId === selectedDevice)?.id || state.selectedNodeId : state.selectedNodeId;
  const next = { ...state, selectedNodeId, nodes };
  writeNodeState(next);
  return next;
}

async function listNodes(options = {}) {
  const state = options.refreshIdentity === false ? readNodeState() : await refreshIdentities(readNodeState());
  return { schemaVersion: NODE_SCHEMA_VERSION, applicationHost: getApplicationHostNode().applicationHost, selectedNodeId: state.selectedNodeId, nodes: [publicNode(getApplicationHostNode()), ...state.nodes.map(publicNode)], configPath: getNodesPath() };
}

function getNode(nodeId) {
  const id = nodeId || readNodeState().selectedNodeId;
  if (id === APPLICATION_HOST_NODE_ID || id === "default") return getApplicationHostNode();
  const node = readNodeState().nodes.find((entry) => entry.id === id);
  if (!node) throw Object.assign(new Error("Node not found."), { code: "NODE_NOT_FOUND" });
  return node;
}

function getSelectedNodeId() { return readNodeState().selectedNodeId; }
function getAllNodesSync() { const state = readNodeState(); return [getApplicationHostNode(), ...state.nodes]; }
function getNodeAgentConfigFromNode(node) { return normalizeAgentSettings({ backendMode: "agent", agentUrl: node.agentUrl, agentToken: node.agentToken }); }
function getNodeAgentConfig(nodeId) { const node = getNode(nodeId); if (node.kind !== "agent") throw Object.assign(new Error("Selected node is not an Agent."), { code: "NODE_NOT_AGENT" }); return getNodeAgentConfigFromNode(node); }
function getExecutionTarget(nodeId) { const node = getNode(nodeId); return node.kind === "agent" ? { type: "agent", nodeId: node.id, deviceId: node.agentIdentity.deviceId, config: getNodeAgentConfigFromNode(node) } : { type: "application-host", nodeId: APPLICATION_HOST_NODE_ID, hostId: node.applicationHost.hostId }; }

async function saveNode(payload = {}) {
  const displayName = String(payload.displayName || payload.name || "").trim();
  const agentUrl = normalizeUrl(payload.agentUrl || payload.url);
  const agentToken = String(payload.agentToken || payload.token || "").trim();
  if (!displayName || displayName.length > 80) throw Object.assign(new Error("Enter a node name up to 80 characters."), { code: "INVALID_NODE_NAME" });
  if (!/^https?:\/\/[^ ]+$/i.test(agentUrl)) throw Object.assign(new Error("Enter a valid Agent URL."), { code: "INVALID_NODE_URL" });
  let identity;
  try { identity = (await getHealth(normalizeAgentSettings({ backendMode: "agent", agentUrl, agentToken }))).identity; } catch (error) { throw Object.assign(new Error(`Could not read Agent identity: ${error.message}`), { code: "AGENT_IDENTITY_UNAVAILABLE" }); }
  if (!identity?.deviceId) throw Object.assign(new Error("Agent did not provide a stable device identity."), { code: "AGENT_IDENTITY_MISSING" });
  const state = readNodeState();
  const existing = state.nodes.find((node) => node.agentIdentity.deviceId === identity.deviceId || node.id === payload.id);
  const node = normalizeAgentNode({ ...existing, ...payload, id: existing?.id || nodeIdForDevice(identity.deviceId), displayName, agentUrl, agentToken: agentToken || existing?.agentToken, agentIdentity: identity });
  const nodes = mergeAgentNodes([...state.nodes.filter((entry) => entry.id !== node.id && entry.agentIdentity.deviceId !== identity.deviceId), node]);
  writeNodeState({ ...state, nodes });
  return { node: publicNode(node), ...(await listNodes({ refreshIdentity: false })) };
}

function deleteNode(nodeId) { if (!nodeId || nodeId === APPLICATION_HOST_NODE_ID || nodeId === "default") throw Object.assign(new Error("The application host cannot be deleted."), { code: "APPLICATION_HOST_READ_ONLY" }); const state = readNodeState(); const nodes = state.nodes.filter((entry) => entry.id !== nodeId); writeNodeState({ ...state, selectedNodeId: state.selectedNodeId === nodeId ? APPLICATION_HOST_NODE_ID : state.selectedNodeId, nodes }); return { id: nodeId, deleted: true }; }
async function selectNode(nodeId) { getNode(nodeId); const state = readNodeState(); writeNodeState({ ...state, selectedNodeId: nodeId || APPLICATION_HOST_NODE_ID }); return listNodes({ refreshIdentity: false }); }
async function testNode(nodeId) { const node = getNode(nodeId); if (node.kind === "application-host") return { connected: true, status: "local", message: "Application host is available.", node: publicNode(node) }; return { ...(await testConnection(getNodeAgentConfigFromNode(node))), node: publicNode(node) }; }

module.exports = { APPLICATION_HOST_NODE_ID, NODE_SCHEMA_VERSION, deleteNode, getAllNodesSync, getExecutionTarget, getNode, getNodeAgentConfig, getNodesPath, getSelectedNodeId, listNodes, mergeAgentNodes, migrateState, saveNode, selectNode, testNode };
