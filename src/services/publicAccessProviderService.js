const { execFile } = require("child_process");
const agentClient = require("./agentClient");
const { getPlayitSnapshot } = require("./serviceRouter");
const { summarizePublicAccessReadiness } = require("./readinessService");
const { getExecutionTarget, getNode, getSelectedNodeId } = require("./nodeService");
const {
  PUBLIC_ACCESS_PROVIDERS,
  buildPlayitProviderState,
  buildPublicAccessSnapshot,
  buildServiceFromPlayitSnapshot,
  createProviderState,
  detectCloudflareProvider,
  detectTailscaleProvider,
  redactOutput,
} = require("../shared/publicAccessProviderDetection");

const COMMAND_TIMEOUT_MS = 2200;

function runCommand(command, args = []) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: COMMAND_TIMEOUT_MS, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        errorCode: error?.code || error?.name || null,
        stdout: String(stdout || "").trim(),
        stderr: String(stderr || "").trim(),
      });
    });
  });
}

function getPlatformForNode(nodeId) {
  try {
    const node = getNode(nodeId);
    return node.kind === "agent"
      ? node.agentIdentity?.platform || node.agentIdentity?.operatingSystem || null
      : process.platform;
  } catch {
    return process.platform;
  }
}

function normalizeProviderContext(provider, context = {}) {
  return {
    ...provider,
    nodeId: context.nodeId || provider.nodeId || null,
    providerId: provider.providerId || provider.id || null,
    platform: context.platform || provider.platform || null,
    checkedAt: provider.checkedAt || context.checkedAt || new Date().toISOString(),
  };
}

function normalizeSnapshotContext(snapshot = {}, context = {}) {
  const checkedAt = snapshot.checkedAt || context.checkedAt || new Date().toISOString();
  const normalized = {
    ...snapshot,
    nodeId: context.nodeId || snapshot.nodeId || null,
    platform: context.platform || snapshot.platform || null,
    checkedAt,
    providers: Array.isArray(snapshot.providers)
      ? snapshot.providers.map((provider) => normalizeProviderContext(provider, { ...context, checkedAt }))
      : [],
    services: Array.isArray(snapshot.services)
      ? snapshot.services.map((service) => ({
          ...service,
          nodeId: context.nodeId || service.nodeId || null,
          lastCheckedAt: service.lastCheckedAt || checkedAt,
        }))
      : [],
  };
  return {
    ...normalized,
    readiness: summarizePublicAccessReadiness(normalized),
  };
}

async function getLocalPublicAccessSnapshot(options = {}) {
  const nodeId = options.nodeId || getSelectedNodeId();
  const platform = getPlatformForNode(nodeId) || process.platform;
  const snapshot = await buildPublicAccessSnapshot({
    runCommand,
    getPlayitSnapshot: () => getPlayitSnapshot(options),
    nodeId,
    platform,
  });
  return normalizeSnapshotContext(snapshot, { nodeId, platform });
}

async function getRemotePublicAccessSnapshot(options = {}) {
  const nodeId = options.nodeId || getSelectedNodeId();
  const target = getExecutionTarget(nodeId);
  const platform = getPlatformForNode(nodeId);
  const snapshot = await agentClient.getPublicAccessSnapshot(target.config);
  return normalizeSnapshotContext(snapshot, { nodeId, platform });
}

async function getPublicAccessSnapshot(options = {}) {
  const nodeId = options.nodeId || getSelectedNodeId();
  const target = getExecutionTarget(nodeId);
  return target.type === "application-host"
    ? getLocalPublicAccessSnapshot({ ...options, nodeId })
    : getRemotePublicAccessSnapshot({ ...options, nodeId });
}

module.exports = {
  PUBLIC_ACCESS_PROVIDERS,
  PlayitProvider: PUBLIC_ACCESS_PROVIDERS[0],
  CloudflareTunnelProvider: PUBLIC_ACCESS_PROVIDERS[1],
  TailscaleProvider: PUBLIC_ACCESS_PROVIDERS[2],
  AnxOSRelayProvider: PUBLIC_ACCESS_PROVIDERS[3],
  getPublicAccessSnapshot,
  _test: {
    buildPlayitProviderState,
    buildServiceFromPlayitSnapshot,
    createProviderState,
    detectCloudflareProvider,
    detectTailscaleProvider,
    normalizeSnapshotContext,
    redactOutput,
    runCommand,
    summarizePublicAccessReadiness,
  },
};
