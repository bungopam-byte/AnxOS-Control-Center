const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { decryptPayload, encryptPayload } = require("./secureSessionStore");

const NODE_CREDENTIAL_SCHEMA_VERSION = 2;

class NodeCredentialStoreError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "NodeCredentialStoreError";
    this.code = code;
    this.details = details;
  }
}

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
  const filePath = getNodeCredentialsPath();
  if (!fs.existsSync(filePath)) {
    return { schemaVersion: NODE_CREDENTIAL_SCHEMA_VERSION, nodes: {} };
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    const backupPath = `${filePath}.corrupt-${Date.now()}`;
    try {
      fs.copyFileSync(filePath, backupPath, fs.constants.COPYFILE_EXCL);
    } catch {}
    throw new NodeCredentialStoreError(
      "Saved node credentials are unreadable. The original file was preserved for recovery.",
      "NODE_CREDENTIAL_STORE_CORRUPT",
      { causeCode: error?.code || "INVALID_JSON" },
    );
  }
  const schemaVersion = Number.isInteger(parsed?.schemaVersion) ? parsed.schemaVersion : 0;
  if (schemaVersion > NODE_CREDENTIAL_SCHEMA_VERSION) {
    throw new NodeCredentialStoreError(
      "Saved node credentials were created by a newer application version.",
      "NODE_CREDENTIAL_SCHEMA_UNSUPPORTED",
      { schemaVersion, supportedSchemaVersion: NODE_CREDENTIAL_SCHEMA_VERSION },
    );
  }
  if (schemaVersion === NODE_CREDENTIAL_SCHEMA_VERSION) {
    try {
      const decrypted = decryptPayload(parsed.encrypted, filePath);
      if (!decrypted || typeof decrypted !== "object" || Array.isArray(decrypted)) {
        throw new Error("Encrypted credential payload is invalid.");
      }
      return {
        schemaVersion: NODE_CREDENTIAL_SCHEMA_VERSION,
        nodes: decrypted.nodes && typeof decrypted.nodes === "object" && !Array.isArray(decrypted.nodes) ? decrypted.nodes : {},
      };
    } catch (error) {
      throw new NodeCredentialStoreError(
        "Saved node credentials could not be decrypted on this device.",
        "NODE_CREDENTIAL_DECRYPT_FAILED",
        { causeCode: error?.code || "DECRYPT_FAILED" },
      );
    }
  }
  const legacyNodes = parsed?.nodes && typeof parsed.nodes === "object" && !Array.isArray(parsed.nodes) ? parsed.nodes : {};
  const backupPath = `${filePath}.schema-v${schemaVersion}.backup`;
  if (!fs.existsSync(backupPath)) {
    writeEncryptedStore(backupPath, legacyNodes);
  }
  const migrated = { schemaVersion: NODE_CREDENTIAL_SCHEMA_VERSION, nodes: legacyNodes };
  writeStore(migrated);
  return migrated;
}

function writeEncryptedStore(filePath, nodes) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify({
    schemaVersion: NODE_CREDENTIAL_SCHEMA_VERSION,
    encrypted: encryptPayload({ nodes: nodes || {} }, filePath),
  }, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tempPath, filePath);
}

function writeStore(store) {
  writeEncryptedStore(getNodeCredentialsPath(), store.nodes);
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
  NodeCredentialStoreError,
  deleteNodeToken,
  getNodeCredentialsPath,
  getNodeToken,
  hasNodeToken,
  setNodeToken,
};
