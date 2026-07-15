const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const NODE_CREDENTIAL_SCHEMA_VERSION = 1;

function getConfigDirectory() {
  if (process.env.ANXHUB_CONFIG_DIR) return process.env.ANXHUB_CONFIG_DIR;
  try { return app ? path.join(app.getPath("userData"), "config") : path.join(process.cwd(), "config"); }
  catch { return path.join(process.cwd(), "config"); }
}

function getNodeCredentialsPath() {
  return path.join(getConfigDirectory(), "node-agent-credentials.json");
}

function trimValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNodeId(nodeId) {
  return trimValue(nodeId).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 96);
}

function readStore() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getNodeCredentialsPath(), "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        schemaVersion: NODE_CREDENTIAL_SCHEMA_VERSION,
        nodes: parsed.nodes && typeof parsed.nodes === "object" && !Array.isArray(parsed.nodes) ? parsed.nodes : {},
      };
    }
  } catch {}
  return { schemaVersion: NODE_CREDENTIAL_SCHEMA_VERSION, nodes: {} };
}

function writeStore(store) {
  const filePath = getNodeCredentialsPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify({
    schemaVersion: NODE_CREDENTIAL_SCHEMA_VERSION,
    nodes: store.nodes || {},
  }, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tempPath, filePath);
}

function getNodeToken(nodeId) {
  const id = normalizeNodeId(nodeId);
  if (!id) return "";
  return trimValue(readStore().nodes?.[id]?.agentToken);
}

function setNodeToken(nodeId, token) {
  const id = normalizeNodeId(nodeId);
  const agentToken = trimValue(token);
  if (!id || !agentToken) return false;
  const store = readStore();
  store.nodes[id] = {
    agentToken,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  return true;
}

function deleteNodeToken(nodeId) {
  const id = normalizeNodeId(nodeId);
  if (!id) return false;
  const store = readStore();
  const existed = Object.prototype.hasOwnProperty.call(store.nodes, id);
  if (existed) {
    delete store.nodes[id];
    writeStore(store);
  }
  return existed;
}

function hasNodeToken(nodeId) {
  return Boolean(getNodeToken(nodeId));
}

module.exports = {
  NODE_CREDENTIAL_SCHEMA_VERSION,
  deleteNodeToken,
  getNodeCredentialsPath,
  getNodeToken,
  hasNodeToken,
  setNodeToken,
};
