const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const {
  getDefaultAgentSettings,
  getEffectiveAgentSettings,
  normalizeAgentSettings,
  testConnection,
} = require("./agentClient");

function getConfigDirectory() {
  if (process.env.ANXHUB_CONFIG_DIR) {
    return process.env.ANXHUB_CONFIG_DIR;
  }
  try {
    return app ? path.join(app.getPath("userData"), "config") : path.join(process.cwd(), "config");
  } catch {
    return path.join(process.cwd(), "config");
  }
}

function getNodesPath() {
  return path.join(getConfigDirectory(), "nodes.json");
}

function ensureConfigDirectory() {
  fs.mkdirSync(getConfigDirectory(), { recursive: true });
}

function readNodeState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getNodesPath(), "utf8"));
    return {
      selectedNodeId: parsed.selectedNodeId || "default",
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
    };
  } catch {
    return {
      selectedNodeId: "default",
      nodes: [],
    };
  }
}

function writeNodeState(state) {
  ensureConfigDirectory();
  fs.writeFileSync(getNodesPath(), `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

function normalizeNodePayload(payload = {}) {
  const displayName = String(payload.displayName || payload.name || "").trim();
  const agentUrl = String(payload.agentUrl || payload.url || "").trim();
  const agentToken = String(payload.agentToken || payload.token || "").trim();

  if (!displayName || displayName.length > 80) {
    throw Object.assign(new Error("Enter a node name up to 80 characters."), { code: "INVALID_NODE_NAME" });
  }
  if (!/^https?:\/\/[^ ]+$/i.test(agentUrl)) {
    throw Object.assign(new Error("Enter a valid Agent URL."), { code: "INVALID_NODE_URL" });
  }

  return {
    id: String(payload.id || `node-${crypto.randomBytes(6).toString("hex")}`).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64),
    displayName,
    agentUrl,
    agentToken,
    backendMode: "agent",
    docker: {
      enabled: payload.docker?.enabled !== false,
      runtime: payload.docker?.runtime || "docker",
    },
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getDefaultNode() {
  const effective = getEffectiveAgentSettings();
  return {
    id: "default",
    displayName: "Default Agent",
    backendMode: effective.backendMode || getDefaultAgentSettings().backendMode,
    agentUrl: effective.agentUrl || getDefaultAgentSettings().agentUrl,
    agentToken: effective.agentToken || "",
    default: true,
    docker: {
      enabled: true,
      runtime: "docker",
    },
  };
}

function publicNode(node) {
  return {
    ...node,
    hasToken: Boolean(node.agentToken),
    agentToken: node.agentToken ? "[configured]" : "",
  };
}

function listNodes() {
  const state = readNodeState();
  const nodes = [getDefaultNode(), ...state.nodes];
  return {
    selectedNodeId: state.selectedNodeId || "default",
    nodes: nodes.map(publicNode),
    configPath: getNodesPath(),
  };
}

function getNode(nodeId = "default") {
  const id = nodeId || readNodeState().selectedNodeId || "default";
  if (id === "default") {
    return getDefaultNode();
  }
  const node = readNodeState().nodes.find((entry) => entry.id === id);
  if (!node) {
    throw Object.assign(new Error("Node not found."), { code: "NODE_NOT_FOUND" });
  }
  return node;
}

function getNodeAgentConfig(nodeId = "default") {
  const node = getNode(nodeId);
  return normalizeAgentSettings({
    backendMode: "agent",
    agentUrl: node.agentUrl,
    agentToken: node.agentToken,
  });
}

function saveNode(payload = {}) {
  const state = readNodeState();
  const node = normalizeNodePayload(payload);
  const nodes = state.nodes.filter((entry) => entry.id !== node.id);
  nodes.push(node);
  writeNodeState({ ...state, nodes });
  return { node: publicNode(node), nodes: listNodes().nodes };
}

function deleteNode(nodeId) {
  if (!nodeId || nodeId === "default") {
    throw Object.assign(new Error("The default node cannot be deleted."), { code: "DEFAULT_NODE_READ_ONLY" });
  }
  const state = readNodeState();
  const nodes = state.nodes.filter((entry) => entry.id !== nodeId);
  writeNodeState({
    selectedNodeId: state.selectedNodeId === nodeId ? "default" : state.selectedNodeId,
    nodes,
  });
  return { id: nodeId, deleted: true };
}

function selectNode(nodeId) {
  getNode(nodeId);
  const state = readNodeState();
  writeNodeState({ ...state, selectedNodeId: nodeId || "default" });
  return listNodes();
}

async function testNode(nodeId) {
  const node = getNode(nodeId);
  return testConnection({
    backendMode: "agent",
    agentUrl: node.agentUrl,
    agentToken: node.agentToken,
  });
}

module.exports = {
  deleteNode,
  getNodeAgentConfig,
  listNodes,
  saveNode,
  selectNode,
  testNode,
};
