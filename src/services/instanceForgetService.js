const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const FORGOTTEN_SCHEMA_VERSION = 1;
const DEFAULT_NODE_ID = "application-host";

function getConfigDirectory() {
  if (process.env.ANXHUB_CONFIG_DIR) return process.env.ANXHUB_CONFIG_DIR;
  try {
    return app ? path.join(app.getPath("userData"), "config") : path.join(process.cwd(), "config");
  } catch {
    return path.join(process.cwd(), "config");
  }
}

function getForgottenInstancesPath() {
  return path.join(getConfigDirectory(), "forgotten-instances.json");
}

function ensureConfigDirectory() {
  fs.mkdirSync(getConfigDirectory(), { recursive: true });
}

function normalizeId(value) {
  return String(value || "").trim();
}

function entryKey(nodeId, instanceId) {
  return `${normalizeId(nodeId) || DEFAULT_NODE_ID}:${normalizeId(instanceId)}`;
}

function readStore() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getForgottenInstancesPath(), "utf8"));
    return {
      schemaVersion: FORGOTTEN_SCHEMA_VERSION,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return { schemaVersion: FORGOTTEN_SCHEMA_VERSION, entries: [] };
  }
}

function writeStore(store) {
  ensureConfigDirectory();
  fs.writeFileSync(getForgottenInstancesPath(), `${JSON.stringify({
    schemaVersion: FORGOTTEN_SCHEMA_VERSION,
    entries: store.entries || [],
  }, null, 2)}\n`, { mode: 0o600 });
}

function rememberForgottenInstance(nodeId, instanceId, details = {}) {
  const normalizedNodeId = normalizeId(nodeId) || DEFAULT_NODE_ID;
  const normalizedInstanceId = normalizeId(instanceId);
  if (!normalizedInstanceId) {
    return null;
  }
  const store = readStore();
  const key = entryKey(normalizedNodeId, normalizedInstanceId);
  const now = new Date().toISOString();
  const entry = {
    nodeId: normalizedNodeId,
    instanceId: normalizedInstanceId,
    reason: normalizeId(details.reason) || "manual-forget",
    createdAt: store.entries.find((candidate) => entryKey(candidate.nodeId, candidate.instanceId) === key)?.createdAt || now,
    updatedAt: now,
  };
  writeStore({
    ...store,
    entries: [
      ...store.entries.filter((candidate) => entryKey(candidate.nodeId, candidate.instanceId) !== key),
      entry,
    ],
  });
  return entry;
}

function clearForgottenInstance(nodeId, instanceId) {
  const normalizedNodeId = normalizeId(nodeId) || DEFAULT_NODE_ID;
  const normalizedInstanceId = normalizeId(instanceId);
  const store = readStore();
  const key = entryKey(normalizedNodeId, normalizedInstanceId);
  const nextEntries = store.entries.filter((candidate) => entryKey(candidate.nodeId, candidate.instanceId) !== key);
  if (nextEntries.length !== store.entries.length) {
    writeStore({ ...store, entries: nextEntries });
  }
}

function isInstanceForgotten(nodeId, instanceId) {
  const key = entryKey(normalizeId(nodeId) || DEFAULT_NODE_ID, instanceId);
  return readStore().entries.some((entry) => entryKey(entry.nodeId, entry.instanceId) === key);
}

function filterForgottenInstances(snapshot = {}, nodeId = DEFAULT_NODE_ID) {
  const entries = Array.isArray(snapshot.instances) ? snapshot.instances : [];
  const filtered = entries.filter((instance) => !isInstanceForgotten(nodeId, instance?.id));
  return filtered.length === entries.length ? snapshot : { ...snapshot, instances: filtered };
}

module.exports = {
  clearForgottenInstance,
  filterForgottenInstances,
  getForgottenInstancesPath,
  isInstanceForgotten,
  rememberForgottenInstance,
};
