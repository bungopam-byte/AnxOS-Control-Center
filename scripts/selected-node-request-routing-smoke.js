#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-selected-node-routing-"));
process.env.ANXHUB_CONFIG_DIR = tempDir;

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
}

const selectedNodeId = "remote-node";
const selectedAgentUrl = "http://192.168.1.134:47131";
const globalAgentUrl = "http://127.0.0.1:47131";

writeJson(path.join(tempDir, "nodes.json"), {
  schemaVersion: 2,
  selectedNodeId,
  nodes: [
    {
      id: selectedNodeId,
      kind: "agent",
      name: "Remote Node",
      displayName: "Remote Node",
      baseUrl: selectedAgentUrl,
      agentUrl: selectedAgentUrl,
      enabled: true,
      localAgent: false,
      agentIdentity: { deviceId: "remote-device" },
    },
  ],
});
writeJson(path.join(tempDir, "node-agent-credentials.json"), {
  schemaVersion: 1,
  nodes: {
    [selectedNodeId]: { agentToken: "selected-node-token" },
  },
});
writeJson(path.join(tempDir, "agent.json"), {
  backendMode: "agent",
  agentUrl: globalAgentUrl,
  agentToken: "stale-global-token",
});

const agentClient = require("../src/services/agentClient");
const nodeService = require("../src/services/nodeService");
const serviceRouter = require("../src/services/serviceRouter");
const systemService = require("../src/services/systemService");
const agentControlService = require("../src/services/agentControlService");
const marketplaceService = require("../src/services/marketplaceService");

const captured = [];
function capture(feature, config) {
  captured.push({ feature, config });
  return config;
}

function assertSelectedConfig(feature, config) {
  assert(config, `${feature} should pass an Agent config.`);
  assert.strictEqual(config.agentUrl || config.url, selectedAgentUrl, `${feature} should target the selected remote Agent URL.`);
  assert.strictEqual(config.nodeId || config.agentNodeId, selectedNodeId, `${feature} should carry selected node identity.`);
  assert.strictEqual(config.agentToken || config.token, "selected-node-token", `${feature} should use the selected node credential.`);
  assert.notStrictEqual(config.agentUrl || config.url, globalAgentUrl, `${feature} must not target the global configured Agent.`);
}

const originals = {
  forNode: agentClient.forNode,
  getHealth: agentClient.getHealth,
  getSystemStats: agentClient.getSystemStats,
  getDockerSnapshot: agentClient.getDockerSnapshot,
  getDockerCapabilities: agentClient.getDockerCapabilities,
  getDockerContainers: agentClient.getDockerContainers,
  getDependencyCatalog: agentClient.getDependencyCatalog,
  checkDependencies: agentClient.checkDependencies,
  isHealthy: agentClient.isHealthy,
  getFileListing: agentClient.getFileListing,
  listBackups: agentClient.listBackups,
};

(async () => {
  agentClient.forNode = (nodeId) => {
    const config = nodeService.getNodeAgentConfig(nodeId);
    return {
      get: async (pathname) => {
        capture(pathname === "/stats" ? "dashboard" : `for-node:${pathname}`, config);
        return { disk: { free: 10, total: 100, percent: 90 }, memory: { total: 100, used: 50 }, cpu: { usagePercent: 12 } };
      },
      listInstances: async () => {
        capture("console-instances", config);
        return { instances: [] };
      },
    };
  };
  agentClient.getHealth = async (config) => {
    capture(config?.targetLabel === `node:${selectedNodeId}` ? "agent-control-health" : `agent-control-health:${config?.targetLabel || config?.agentUrl || "unknown"}`, config);
    return { ok: true, identity: { agentVersion: "smoke", deviceId: "remote-device" } };
  };
  agentClient.getSystemStats = async (config) => {
    capture(config?.targetLabel === `node:${selectedNodeId}` ? "agent-control-stats" : `agent-control-stats:${config?.targetLabel || config?.agentUrl || "unknown"}`, config);
    return { disk: { free: 10, total: 100, percent: 90 } };
  };
  agentClient.getDockerSnapshot = async (config) => {
    capture("docker-snapshot", config);
    return { containers: [], images: 0, volumes: 0 };
  };
  agentClient.getDockerCapabilities = async (config) => {
    capture("docker-capabilities", config);
    return { available: true };
  };
  agentClient.getDockerContainers = async (config) => {
    capture("docker-containers", config);
    return { containers: [] };
  };
  agentClient.getDependencyCatalog = async (config) => {
    capture("dependencies-catalog", config);
    return { dependencies: [], groups: [] };
  };
  agentClient.checkDependencies = async (payload, config) => {
    capture("marketplace-dependencies", config);
    return { ok: true, dependencies: [], missingDependencyIds: [] };
  };
  agentClient.isHealthy = async (config) => {
    capture("files-health", config);
    return true;
  };
  agentClient.getFileListing = async (directoryPath, config) => {
    capture("files-listing", config);
    return { currentPath: directoryPath, entries: [] };
  };
  agentClient.listBackups = async (payload, config) => {
    capture("backups", config);
    return { backups: [] };
  };

  await systemService.getSystemSnapshot();
  await agentControlService.listAgents({ selectedNodeId });
  await serviceRouter.getDockerSnapshot();
  await serviceRouter.listDockerContainers();
  await serviceRouter.getDependencyCatalog();
  await serviceRouter.checkDependencies({ dependencyIds: ["java"] });
  await serviceRouter.getFileListing();
  await serviceRouter.listInstances();
  await serviceRouter.listBackups();
  capture("nodes-page-config", nodeService.getNodeAgentConfig(selectedNodeId));
  capture("marketplace-install-config", marketplaceService._test.resolveMarketplaceAgentConfig(selectedNodeId));

  const features = new Map(captured.map((entry) => [entry.feature, entry.config]));
  [
    "dashboard",
    "agent-control-health",
    "agent-control-stats",
    "nodes-page-config",
    "docker-snapshot",
    "docker-containers",
    "dependencies-catalog",
    "marketplace-dependencies",
    "files-listing",
    "console-instances",
    "backups",
    "marketplace-install-config",
  ].forEach((feature) => assert(features.has(feature), `${feature} should be exercised by the routing smoke.`));

  captured.forEach(({ feature, config }) => assertSelectedConfig(feature, config));
  assert(captured.every(({ config }) => (config.agentUrl || config.url) !== globalAgentUrl), "No authenticated feature request should use the global configured Agent URL.");

  console.log("Selected-node request routing smoke checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  Object.assign(agentClient, originals);
});