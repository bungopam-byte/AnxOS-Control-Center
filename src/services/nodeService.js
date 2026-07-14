const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { getApplicationHostNode, APPLICATION_HOST_NODE_ID } = require("./applicationHostService");
const { getEffectiveAgentSettings, getHealth, normalizeAgentSettings, testConnection } = require("./agentClient");

const NODE_SCHEMA_VERSION = 2;
const DEFAULT_LOCAL_AGENT_PORT = 47131;
const LOCAL_AGENT_HOSTS = ["127.0.0.1", "localhost"];
const LOCAL_AGENT_DISPLAY_NAME = "This PC";

function getConfigDirectory() {
  if (process.env.ANXHUB_CONFIG_DIR) return process.env.ANXHUB_CONFIG_DIR;
  try { return app ? path.join(app.getPath("userData"), "config") : path.join(process.cwd(), "config"); }
  catch { return path.join(process.cwd(), "config"); }
}

function getNodesPath() { return path.join(getConfigDirectory(), "nodes.json"); }
function getRuntimeConfigPath() { return path.join(getConfigDirectory(), "agent-runtime.json"); }
function ensureConfigDirectory() { fs.mkdirSync(getConfigDirectory(), { recursive: true }); }
function normalizeUrl(value) { try { const url = new URL(String(value || "").trim()); return `${url.protocol}//${url.host}${url.pathname.replace(/\/$/, "")}`; } catch { return String(value || "").trim(); } }
function getUrlParts(url) {
  try {
    const parsed = new URL(normalizeUrl(url));
    return {
      protocol: parsed.protocol.toLowerCase(),
      hostname: parsed.hostname.toLowerCase(),
      port: parsed.port || (parsed.protocol === "https:" ? "443" : "80"),
    };
  } catch {
    return null;
  }
}
function isLocalAgentUrl(url) {
  const parts = getUrlParts(url);
  return Boolean(parts && parts.protocol === "http:" && LOCAL_AGENT_HOSTS.includes(parts.hostname));
}
function getLocalAgentPortFromUrl(url) {
  const port = Number.parseInt(getUrlParts(url)?.port, 10);
  return Number.isInteger(port) && port > 0 ? port : DEFAULT_LOCAL_AGENT_PORT;
}
function legacyDeviceId(url) {
  if (isLocalAgentUrl(url)) {
    return `local-agent-${getLocalAgentPortFromUrl(url)}`;
  }
  return `legacy-${crypto.createHash("sha256").update(normalizeUrl(url)).digest("hex").slice(0, 20)}`;
}
function nodeIdForDevice(deviceId) { return `agent-${String(deviceId || "unknown").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 56)}`; }
function isGenericNodeDisplayName(value) { return /^(owner machine|default|remote node|agent node|windows desktop|local agent|this pc)$/i.test(String(value || "").trim()); }
function isDefaultLocalAgentDisplayName(value) { return /^(this pc|local agent|owner machine|windows desktop)$/i.test(String(value || "").trim()); }

function getLocalIpAddresses() {
  const interfaces = require("os").networkInterfaces();
  return Object.values(interfaces).flat().filter(Boolean)
    .filter((entry) => !entry.internal)
    .map((entry) => entry.address)
    .filter(Boolean)
    .slice(0, 16);
}

function summarizeDependencyReadiness(result = null) {
  const dependencies = Array.isArray(result?.dependencies) ? result.dependencies : [];
  const ready = dependencies.filter((dependency) => dependency.state === "installed").length;
  const attention = dependencies.filter((dependency) => dependency.state !== "installed");
  return {
    checked: Boolean(result),
    ready,
    total: dependencies.length,
    attention: attention.length,
    state: !result ? "unknown" : attention.length ? "needs-attention" : "ready",
  };
}

function buildLocalNodeProfile({ node = {}, health = null, stats = null, instances = null, dependencies = null, service = null } = {}) {
  const identity = health?.identity || node.agentIdentity || {};
  return {
    localAgent: true,
    stableNodeId: node.id || nodeIdForDevice(identity.deviceId),
    displayName: node.displayName || LOCAL_AGENT_DISPLAY_NAME,
    customDisplayName: node.displayName && node.displayName !== LOCAL_AGENT_DISPLAY_NAME ? node.displayName : null,
    hostname: identity.hostname || stats?.hostname || null,
    operatingSystem: identity.operatingSystem || stats?.osVersion || null,
    windowsVersion: identity.platform === "win32" || stats?.platform === "win32" ? identity.operatingSystem || stats?.osVersion || null : null,
    platform: identity.platform || stats?.platform || null,
    architecture: identity.architecture || null,
    cpu: stats?.cpu ? { model: stats.cpu.model || null, cores: stats.cpu.cores || null, usagePercent: stats.cpu.usagePercent ?? null } : null,
    ram: stats?.memory ? { totalBytes: stats.memory.total ?? null, usedBytes: stats.memory.used ?? null, usagePercent: stats.memory.percent ?? null } : null,
    gpu: null,
    storage: stats?.disk || null,
    localIpAddresses: getLocalIpAddresses(),
    agentVersion: identity.agentVersion || health?.agentVersion || null,
    agentUptimeSeconds: health?.process?.uptimeSeconds ?? stats?.uptimeSeconds ?? null,
    serviceState: service?.state || null,
    dependencyReadiness: summarizeDependencyReadiness(dependencies),
    instanceCount: Array.isArray(instances?.instances) ? instances.instances.length : null,
    updatedAt: new Date().toISOString(),
  };
}

function buildNodeCapabilities(node = {}) {
  if (node.kind === "application-host") {
    return {
      applicationHost: true,
      agentApi: false,
      localAgent: false,
      remoteAgent: false,
      serviceControls: true,
      windowsServiceControls: process.platform === "win32",
      filesystem: true,
      marketplace: false,
      instances: true,
      backups: false,
      docker: false,
      publicAccess: true,
      dependencyManagement: false,
      unsupportedActions: {
        docker: "Docker workspace controls require an Agent node.",
        remoteAgentRegistration: "Remote Agent APIs require an Agent node.",
      },
    };
  }
  const localAgent = node.localAgent === true || isLocalAgentUrl(node.agentUrl);
  return {
    applicationHost: false,
    agentApi: true,
    localAgent,
    remoteAgent: !localAgent,
    serviceControls: localAgent,
    windowsServiceControls: localAgent,
    filesystem: true,
    marketplace: true,
    instances: true,
    backups: true,
    docker: node.docker?.enabled !== false,
    publicAccess: true,
    dependencyManagement: true,
    unsupportedActions: localAgent
      ? {}
      : {
          localServiceInstall: "Local Agent service controls only apply to This PC.",
          localPairingRepair: "Automatic local pairing is only available for This PC.",
        },
  };
}

function readLocalAgentRuntimeConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getRuntimeConfigPath(), "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getLocalAgentPort() {
  const port = Number.parseInt(readLocalAgentRuntimeConfig().port, 10);
  return Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : DEFAULT_LOCAL_AGENT_PORT;
}

function getLocalAgentUrls() {
  const port = getLocalAgentPort();
  return LOCAL_AGENT_HOSTS.map((host) => `http://${host}:${port}`);
}

function createLocalAgentConnectionStatus(patch = {}) {
  const baseStatus = patch.status || "offline";
  return {
    connected: patch.connected === true,
    status: baseStatus,
    displayStatus: patch.displayStatus || (baseStatus === "online" ? "Online" : baseStatus === "authentication-required" ? "Authentication Required" : "Offline"),
    localAgent: true,
    desktopApplication: "running",
    installed: patch.installed ?? null,
    serviceRunning: patch.serviceRunning ?? null,
    authenticated: patch.authenticated ?? null,
    remoteAvailability: "not-remote",
    versionCompatibility: patch.versionCompatibility || "unknown",
    message: patch.message || "",
    lastSeen: patch.lastSeen || null,
    latencyMs: Number.isFinite(Number(patch.latencyMs)) ? Number(patch.latencyMs) : null,
    agentVersion: patch.agentVersion || null,
    platform: patch.platform || null,
    operatingSystem: patch.operatingSystem || null,
    architecture: patch.architecture || null,
    hostname: patch.hostname || null,
  };
}

function normalizeAgentNode(node = {}) {
  const agentUrl = normalizeUrl(node.agentUrl || node.url);
  const identity = node.agentIdentity || node.identity || {};
  const deviceId = identity.deviceId || node.deviceId || legacyDeviceId(agentUrl);
  const requestedDisplayName = String(node.displayName || node.name || "").trim();
  const identityHostname = String(identity.hostname || "").trim();
  const localAgent = node.localAgent === true || isLocalAgentUrl(agentUrl);
  const displayName = localAgent
    ? requestedDisplayName && !isDefaultLocalAgentDisplayName(requestedDisplayName) ? requestedDisplayName : LOCAL_AGENT_DISPLAY_NAME
    : isGenericNodeDisplayName(requestedDisplayName) && identityHostname
    ? identityHostname
    : requestedDisplayName || identityHostname || "Agent Node";
  return {
    id: node.id && node.id !== "default" ? node.id : nodeIdForDevice(deviceId),
    kind: "agent",
    displayName: displayName.slice(0, 80),
    agentUrl,
    agentToken: String(node.agentToken || node.token || ""),
    agentIdentity: { deviceId, hostname: identity.hostname || "", operatingSystem: identity.operatingSystem || "", platform: identity.platform || "", architecture: identity.architecture || "", agentVersion: identity.agentVersion || "" },
    docker: { enabled: node.docker?.enabled !== false, runtime: node.docker?.runtime || "docker" },
    ownerMachine: Boolean(node.ownerMachine),
    localAgent,
    local: localAgent,
    modeLabel: localAgent ? "Local Agent" : "Agent",
    profile: localAgent ? node.profile || buildLocalNodeProfile({ node: { ...node, displayName }, health: { identity } }) : node.profile || null,
    capabilities: buildNodeCapabilities({ ...node, kind: "agent", agentUrl, localAgent }),
    connection: node.connection && typeof node.connection === "object" ? {
      connected: node.connection.connected === true,
      status: node.connection.status || (node.connection.connected ? "online" : "offline"),
      displayStatus: node.connection.displayStatus || (node.connection.connected ? "Online" : "Offline"),
      message: node.connection.message || "",
      lastSeen: node.connection.lastSeen || null,
      latencyMs: Number.isFinite(Number(node.connection.latencyMs)) ? Number(node.connection.latencyMs) : null,
      localAgent: node.connection.localAgent === true || localAgent,
      desktopApplication: node.connection.desktopApplication || (localAgent ? "running" : null),
      installed: node.connection.installed ?? null,
      serviceRunning: node.connection.serviceRunning ?? null,
      authenticated: node.connection.authenticated ?? null,
      remoteAvailability: node.connection.remoteAvailability || (localAgent ? "not-remote" : null),
      versionCompatibility: node.connection.versionCompatibility || "unknown",
      agentVersion: node.connection.agentVersion || identity.agentVersion || null,
      platform: node.connection.platform || identity.platform || null,
      operatingSystem: node.connection.operatingSystem || identity.operatingSystem || null,
      architecture: node.connection.architecture || identity.architecture || null,
      hostname: node.connection.hostname || identity.hostname || null,
    } : null,
    createdAt: node.createdAt || new Date().toISOString(),
    updatedAt: node.updatedAt || new Date().toISOString(),
    executionTarget: { type: "agent", deviceId, localAgent },
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
      displayName: isGenericNodeDisplayName(current.displayName) && !isGenericNodeDisplayName(raw.displayName) ? raw.displayName : current.displayName || raw.displayName,
      agentUrl: current.localAgent ? current.agentUrl : current.agentUrl || raw.agentUrl,
      agentToken: current.agentToken || raw.agentToken,
      agentIdentity: { ...raw.agentIdentity, ...Object.fromEntries(Object.entries(current.agentIdentity).filter(([, value]) => value)) },
      docker: current.docker || raw.docker,
      ownerMachine: current.ownerMachine || raw.ownerMachine,
      localAgent: current.localAgent || raw.localAgent,
      local: current.local || raw.local,
      modeLabel: current.localAgent || raw.localAgent ? "Local Agent" : current.modeLabel || raw.modeLabel,
      connection: current.connection || raw.connection,
      updatedAt: new Date().toISOString(),
    });
  }
  return [...byDevice.values()];
}

async function discoverLocalAgentNode(state) {
  const effective = getEffectiveAgentSettings();
  const existingLocal = state.nodes.find((node) => node.localAgent === true || isLocalAgentUrl(node.agentUrl));
  let lastError = null;

  for (const agentUrl of getLocalAgentUrls()) {
    const startedAt = Date.now();
    try {
      const health = await getHealth({
        backendMode: "agent",
        agentUrl,
        agentToken: "",
        targetLabel: "local-agent-discovery",
        suppressConnectionRefusedLog: true,
        logThrottleMs: 60000,
      });
      const identity = health.identity || {};
      if (!identity.deviceId) {
        continue;
      }
      const healthConfig = {
        backendMode: "agent",
        agentUrl,
        agentToken: effective.agentToken || existingLocal?.agentToken || "",
      };
      const [stats, instances, dependencies] = await Promise.all([
        agentClient.getSystemStats(healthConfig).catch(() => null),
        agentClient.listInstances(healthConfig).catch(() => null),
        agentClient.checkDependencies({ dependencyIds: ["java", "docker", "git", "steamcmd", "dotnet-runtime", "dotnet-desktop-runtime", "powershell", "ffmpeg", "tailscale", "cloudflared", "playit", "vcredist-runtime"] }, healthConfig).catch(() => null),
      ]);
      return normalizeAgentNode({
        ...existingLocal,
        id: existingLocal?.id && existingLocal.id !== nodeIdForDevice(existingLocal?.agentIdentity?.deviceId) ? existingLocal.id : nodeIdForDevice(identity.deviceId),
        displayName: existingLocal?.displayName || LOCAL_AGENT_DISPLAY_NAME,
        agentUrl,
        agentToken: effective.agentToken || existingLocal?.agentToken || "",
        agentIdentity: identity,
        ownerMachine: true,
        localAgent: true,
        connection: createLocalAgentConnectionStatus({
          connected: true,
          status: "online",
          displayStatus: "Online",
          installed: true,
          serviceRunning: true,
          authenticated: health.tokenConfigured === true ? Boolean(effective.agentToken) : true,
          versionCompatibility: "unknown",
          message: "Local Agent is responding on this PC.",
          lastSeen: new Date().toISOString(),
          latencyMs: Date.now() - startedAt,
          agentVersion: identity.agentVersion || health.agentVersion || null,
          platform: identity.platform || null,
          operatingSystem: identity.operatingSystem || null,
          architecture: identity.architecture || null,
          hostname: identity.hostname || null,
        }),
        profile: buildLocalNodeProfile({
          node: { ...existingLocal, id: existingLocal?.id || nodeIdForDevice(identity.deviceId), displayName: existingLocal?.displayName || LOCAL_AGENT_DISPLAY_NAME, agentIdentity: identity },
          health,
          stats,
          instances,
          dependencies,
          service: { state: "running" },
        }),
      });
    } catch (error) {
      lastError = error;
    }
  }

  if (!existingLocal) {
    return null;
  }

  return normalizeAgentNode({
    ...existingLocal,
    displayName: existingLocal?.displayName || LOCAL_AGENT_DISPLAY_NAME,
    localAgent: true,
    ownerMachine: true,
    connection: createLocalAgentConnectionStatus({
      connected: false,
      status: lastError?.status === 401 || lastError?.code === "UNAUTHORIZED" ? "authentication-required" : "offline",
      displayStatus: lastError?.status === 401 || lastError?.code === "UNAUTHORIZED" ? "Authentication Required" : "Offline",
      installed: null,
      serviceRunning: false,
      authenticated: lastError?.status === 401 || lastError?.code === "UNAUTHORIZED" ? false : null,
      message: lastError?.message || "Local Agent is not responding on this PC.",
      lastSeen: existingLocal.connection?.lastSeen || null,
    }),
  });
}

async function withDiscoveredLocalAgent(state) {
  const localNode = await discoverLocalAgentNode(state);
  if (!localNode) {
    return state;
  }
  const nodes = mergeAgentNodes([
    ...state.nodes.filter((node) => !(node.localAgent === true || isLocalAgentUrl(node.agentUrl) || node.agentIdentity?.deviceId === localNode.agentIdentity.deviceId)),
    localNode,
  ]);
  const currentSelection = state.selectedNodeId || APPLICATION_HOST_NODE_ID;
  const selectedRemoteNode = nodes.find((node) => node.id === currentSelection && node.localAgent !== true);
  const shouldDefaultToLocal = !selectedRemoteNode && localNode.connection?.connected === true;
  return { ...state, selectedNodeId: shouldDefaultToLocal ? localNode.id : currentSelection, nodes };
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
  if (selectedNodeId === APPLICATION_HOST_NODE_ID) {
    const localNode = nodes.find((node) => node.localAgent === true || isLocalAgentUrl(node.agentUrl));
    if (localNode && effective.backendMode === "agent" && isLocalAgentUrl(effective.agentUrl)) selectedNodeId = localNode.id;
  }
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
  const nodes = state.nodes.map((node) => {
    const { connection, ...persistentNode } = node;
    return persistentNode;
  });
  fs.writeFileSync(getNodesPath(), `${JSON.stringify({ schemaVersion: NODE_SCHEMA_VERSION, selectedNodeId: state.selectedNodeId, nodes }, null, 2)}\n`, { mode: 0o600 });
}

function publicNode(node) {
  if (node.kind === "application-host") {
    return {
      ...node,
      capabilities: buildNodeCapabilities(node),
      connection: {
        connected: true,
        status: "online",
        message: "Application host is available.",
        lastSeen: new Date().toISOString(),
        latencyMs: 0,
      },
    };
  }
  return { ...node, capabilities: buildNodeCapabilities(node), hasToken: Boolean(node.agentToken), agentToken: node.agentToken ? "[configured]" : "", local: node.localAgent === true, modeLabel: node.localAgent ? "Local Agent" : "Agent", localProfile: node.localAgent === true ? node.profile || null : null };
}

async function refreshIdentities(state) {
  const refreshed = [];
  for (const node of state.nodes) {
    const startedAt = Date.now();
    try {
      const health = await getHealth(getNodeAgentConfigFromNode(node));
      const localAgent = node.localAgent === true || isLocalAgentUrl(node.agentUrl);
      const healthConfig = getNodeAgentConfigFromNode(node);
      const [stats, instances, dependencies] = localAgent ? await Promise.all([
        agentClient.getSystemStats(healthConfig).catch(() => null),
        agentClient.listInstances(healthConfig).catch(() => null),
        agentClient.checkDependencies({ dependencyIds: ["java", "docker", "git", "steamcmd", "dotnet-runtime", "dotnet-desktop-runtime", "powershell", "ffmpeg", "tailscale", "cloudflared", "playit", "vcredist-runtime"] }, healthConfig).catch(() => null),
      ]) : [null, null, null];
      refreshed.push(normalizeAgentNode({
        ...node,
        agentIdentity: health.identity || node.agentIdentity,
        connection: localAgent ? createLocalAgentConnectionStatus({
          connected: true,
          status: "online",
          displayStatus: "Online",
          installed: true,
          serviceRunning: true,
          authenticated: health.tokenConfigured === true ? Boolean(node.agentToken) : true,
          versionCompatibility: "unknown",
          message: "Agent is responding.",
          lastSeen: new Date().toISOString(),
          latencyMs: Date.now() - startedAt,
          agentVersion: health.identity?.agentVersion || health.agentVersion || null,
          platform: health.identity?.platform || null,
          operatingSystem: health.identity?.operatingSystem || null,
          architecture: health.identity?.architecture || null,
          hostname: health.identity?.hostname || null,
        }) : {
          connected: true,
          status: "online",
          displayStatus: "Online",
          message: "Agent is responding.",
          lastSeen: new Date().toISOString(),
          latencyMs: Date.now() - startedAt,
        },
        profile: localAgent ? buildLocalNodeProfile({ node, health, stats, instances, dependencies, service: { state: "running" } }) : node.profile,
      }));
    } catch (error) {
      const localAgent = node.localAgent === true || isLocalAgentUrl(node.agentUrl);
      refreshed.push(normalizeAgentNode({
        ...node,
        connection: localAgent ? createLocalAgentConnectionStatus({
          connected: false,
          status: error.status === 401 || error.code === "UNAUTHORIZED" ? "warning" : "offline",
          displayStatus: error.status === 401 || error.code === "UNAUTHORIZED" ? "Authentication Required" : "Offline",
          installed: null,
          serviceRunning: false,
          authenticated: error.status === 401 || error.code === "UNAUTHORIZED" ? false : null,
          message: error.status === 401 || error.code === "UNAUTHORIZED" ? "Authentication failed." : error.message || "Agent is unreachable.",
          lastSeen: node.connection?.lastSeen || null,
          latencyMs: null,
        }) : {
          connected: false,
          status: error.status === 401 || error.code === "UNAUTHORIZED" ? "warning" : "offline",
          displayStatus: error.status === 401 || error.code === "UNAUTHORIZED" ? "Authentication Required" : "Offline",
          message: error.status === 401 || error.code === "UNAUTHORIZED" ? "Authentication failed." : error.message || "Agent is unreachable.",
          lastSeen: node.connection?.lastSeen || null,
          latencyMs: null,
        },
      }));
    }
  }
  const nodes = mergeAgentNodes(refreshed);
  const selectedDevice = state.nodes.find((node) => node.id === state.selectedNodeId)?.agentIdentity?.deviceId;
  const selectedNodeId = selectedDevice ? nodes.find((node) => node.agentIdentity.deviceId === selectedDevice)?.id || state.selectedNodeId : state.selectedNodeId;
  const next = { ...state, selectedNodeId, nodes };
  writeNodeState(next);
  return next;
}

async function listNodes(options = {}) {
  const discoveredState = options.discoverLocalAgent === false ? readNodeState() : await withDiscoveredLocalAgent(readNodeState());
  const state = options.refreshIdentity === false ? discoveredState : await refreshIdentities(discoveredState);
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
function getExecutionTarget(nodeId) { const node = getNode(nodeId); return node.kind === "agent" ? { type: "agent", nodeId: node.id, deviceId: node.agentIdentity.deviceId, localAgent: node.localAgent === true, capabilities: buildNodeCapabilities(node), config: getNodeAgentConfigFromNode(node) } : { type: "application-host", nodeId: APPLICATION_HOST_NODE_ID, hostId: node.applicationHost.hostId, capabilities: buildNodeCapabilities(node) }; }

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
