const READINESS_STATES = ["ready", "degraded", "blocked", "unavailable", "not-tested"];
const READINESS_RANK = {
  ready: 0,
  "not-tested": 1,
  degraded: 2,
  unavailable: 3,
  blocked: 4,
};

function normalizeReadinessState(value, fallback = "not-tested") {
  const state = String(value || "").toLowerCase();
  return READINESS_STATES.includes(state) ? state : fallback;
}

function createReadinessItem(item = {}) {
  return {
    id: item.id || "unknown",
    label: item.label || "Unknown",
    state: normalizeReadinessState(item.state),
    reason: item.reason || "No readiness evidence has been collected.",
    evidence: Array.isArray(item.evidence) ? item.evidence.filter(Boolean).slice(0, 12) : [],
    recoveryAction: item.recoveryAction || null,
    route: item.route || null,
    updatedAt: item.updatedAt || new Date().toISOString(),
    context: item.context && typeof item.context === "object" ? item.context : {},
  };
}

function getWorstReadinessState(items = []) {
  return items.reduce((current, item) => {
    const candidate = normalizeReadinessState(item?.state);
    return (READINESS_RANK[candidate] || 0) > (READINESS_RANK[current] || 0) ? candidate : current;
  }, "ready");
}

function summarizeNodeReadiness(status = null) {
  if (!status) {
    return createReadinessItem({
      id: "connected-node",
      label: "Connected node",
      state: "not-tested",
      reason: "No node health or Agent runtime data has been collected in this session.",
      recoveryAction: "Open Node Health or Agent Control and test the selected node connection.",
      route: "nodes",
    });
  }
  const running = status.running === true || status.reachable === true || status.connected === true || /^running$/i.test(String(status.state || ""));
  const authFailed = /auth/i.test(String(status.state || status.message || status.mostRecentError?.code || status.mostRecentError?.message || ""));
  const state = authFailed ? "blocked" : running ? "ready" : "degraded";
  return createReadinessItem({
    id: "connected-node",
    label: "Connected node",
    state,
    reason: running ? "The selected node has recent reachable Agent data." : "The selected node is not currently confirmed reachable.",
    recoveryAction: running ? "Continue validation." : "Open Agent Control and reconnect or restart the Agent.",
    route: "agent-control",
    evidence: [
      status.nodeId ? `node=${status.nodeId}` : null,
      status.agentUrl ? `url=${status.agentUrl}` : null,
      status.state ? `state=${status.state}` : null,
      status.mostRecentError?.code ? `error=${status.mostRecentError.code}` : null,
    ],
    context: {
      nodeId: status.nodeId || null,
      errorCode: status.mostRecentError?.code || null,
    },
  });
}

function summarizeDependencyReadiness(result = null, plan = null) {
  if (!result && !plan) {
    return createReadinessItem({
      id: "dependencies",
      label: "Dependencies",
      state: "not-tested",
      reason: "No dependency check or preparation plan has run in this session.",
      recoveryAction: "Run Check Requirements or Prepare This Node before Marketplace validation.",
      route: "agent-control",
    });
  }
  const dependencies = Array.isArray(result?.dependencies) ? result.dependencies : [];
  const missing = dependencies.filter((dependency) => dependency.installed !== true && dependency.state !== "installed");
  const manual = Array.isArray(plan?.manualActions) ? plan.manualActions : [];
  const installable = Array.isArray(plan?.installableActions) ? plan.installableActions : [];
  const unsupported = dependencies.filter((dependency) => String(dependency.state || "").toLowerCase() === "unsupported" || dependency.supported === false);
  const failed = dependencies.filter((dependency) => /failed|error/i.test(String(dependency.state || dependency.errorCode || "")));

  let state = "ready";
  let reason = "Required dependencies are installed or no additional dependencies are required.";
  if (failed.length || unsupported.length || manual.length) {
    state = "blocked";
    reason = "One or more dependencies require manual intervention, are unsupported, or failed verification.";
  } else if (missing.length || installable.length) {
    state = "degraded";
    reason = "One or more dependencies are missing but have a guided preparation path.";
  } else if (result?.ok === false || plan?.ok === false) {
    state = "blocked";
    reason = "Dependency readiness returned a failed result.";
  }

  return createReadinessItem({
    id: "dependencies",
    label: "Dependencies",
    state,
    reason,
    recoveryAction: state === "ready" ? "Continue Marketplace validation." : "Run Prepare This Node and follow any manual steps shown.",
    route: "agent-control",
    evidence: [
      `${dependencies.length} dependency row${dependencies.length === 1 ? "" : "s"}`,
      `${missing.length} missing`,
      `${manual.length} manual`,
      `${installable.length} installable`,
      `${unsupported.length} unsupported`,
    ],
    context: {
      missingDependencyIds: missing.map((dependency) => dependency.id).filter(Boolean),
      manualDependencyIds: manual.map((action) => action.dependencyId || action.id).filter(Boolean),
      installableDependencyIds: installable.map((action) => action.dependencyId || action.id).filter(Boolean),
      errorCodes: [...failed, ...unsupported].map((dependency) => dependency.errorCode).filter(Boolean),
    },
  });
}

function summarizeProviderCapabilities(providers = []) {
  return providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    status: provider.status,
    health: provider.health || "unavailable",
    installed: provider.installed === true,
    connected: provider.connected === true,
    authenticated: provider.authenticated === undefined ? null : provider.authenticated,
    exposureScope: provider.exposureScope || "unavailable",
    publicInternet: provider.exposureScope === "public-internet" && provider.connected === true && Boolean(provider.publicAddress),
    capabilities: provider.capabilities || {},
    recoveryAction: provider.recoveryAction || null,
  }));
}

function summarizePublicAccessReadiness(snapshot = null) {
  if (!snapshot) {
    return createReadinessItem({
      id: "public-access",
      label: "Public Access",
      state: "not-tested",
      reason: "No Public Access snapshot has been collected in this session.",
      recoveryAction: "Open Public Access and refresh provider status.",
      route: "playit",
    });
  }
  const providers = Array.isArray(snapshot.providers) ? snapshot.providers : [];
  const services = Array.isArray(snapshot.services) ? snapshot.services : [];
  const publicService = services.find((service) => service.exposureScope === "public-internet" && service.publicAddress);
  const tailnetProvider = providers.find((provider) => provider.id === "tailscale" && provider.connected === true);
  const playit = providers.find((provider) => provider.id === "playit");

  let state = "unavailable";
  let reason = "No provider has confirmed a usable public address.";
  let recoveryAction = "Install and authenticate a supported Public Access provider.";
  if (publicService) {
    state = "ready";
    reason = `${publicService.providerName || "Provider"} reports a public internet address.`;
    recoveryAction = "Validate the address from an external network.";
  } else if (tailnetProvider) {
    state = "degraded";
    reason = "Tailscale is connected, but tailnet-only connectivity is not public internet exposure.";
    recoveryAction = "Use Playit for public validation or manually configure a supported public provider.";
  } else if (playit?.installed || playit?.available) {
    state = playit.connected ? "ready" : "blocked";
    reason = playit.connected ? "Playit reports connected status." : "Playit is available but no live public tunnel is confirmed.";
    recoveryAction = playit.recoveryAction || "Start or authenticate Playit, then refresh Public Access.";
  }

  return createReadinessItem({
    id: "public-access",
    label: "Public Access",
    state,
    reason,
    recoveryAction,
    route: "playit",
    evidence: [
      `${providers.length} provider${providers.length === 1 ? "" : "s"} inspected`,
      publicService?.publicAddress ? `public=${publicService.publicAddress}` : null,
      tailnetProvider?.tailnetAddress ? `tailnet=${tailnetProvider.tailnetAddress}` : null,
    ],
    context: {
      providerCapabilities: summarizeProviderCapabilities(providers),
      exposureScope: snapshot.exposureScope || "unavailable",
      activeTunnels: Number(snapshot.activeTunnels || 0),
    },
  });
}

function buildEnvironmentReadinessSummary(options = {}) {
  const runtimeState = options.runtimeState || {};
  const desktop = createReadinessItem({
    id: "desktop",
    label: "Desktop application",
    state: runtimeState.applicationRunning === true ? "ready" : "unavailable",
    reason: runtimeState.applicationRunning === true ? "The desktop process is running and diagnostics are writable." : "The desktop runtime is not confirmed running.",
    recoveryAction: runtimeState.applicationRunning === true ? "Continue validation." : "Start the desktop app and capture diagnostics again.",
    route: "diagnostics",
    evidence: [
      runtimeState.appVersion ? `app=${runtimeState.appVersion}` : null,
      runtimeState.platform ? `platform=${runtimeState.platform}` : null,
      runtimeState.architecture ? `arch=${runtimeState.architecture}` : null,
      runtimeState.currentWorkspace ? `workspace=${runtimeState.currentWorkspace}` : null,
    ],
  });
  const node = summarizeNodeReadiness(options.nodeStatus || runtimeState.selectedAgent || runtimeState.agentStatus || null);
  const dependencies = summarizeDependencyReadiness(options.dependencyCheck || runtimeState.dependencyCheck || null, options.dependencyPlan || runtimeState.dependencyPlan || null);
  const marketplace = createReadinessItem({
    id: "marketplace",
    label: "Marketplace",
    state: dependencies.state === "ready" ? "ready" : dependencies.state === "not-tested" ? "not-tested" : "degraded",
    reason: dependencies.state === "ready" ? "Marketplace dependency readiness is clear for the current data." : "Marketplace readiness depends on unresolved dependency validation.",
    recoveryAction: dependencies.recoveryAction,
    route: "marketplace",
    evidence: dependencies.evidence,
    context: dependencies.context,
  });
  const publicAccess = summarizePublicAccessReadiness(options.publicAccessSnapshot || runtimeState.publicAccessSnapshot || null);
  const items = [desktop, node, marketplace, dependencies, publicAccess];
  return {
    generatedAt: options.generatedAt || new Date().toISOString(),
    overallState: getWorstReadinessState(items),
    states: READINESS_STATES,
    items,
  };
}

module.exports = {
  READINESS_STATES,
  buildEnvironmentReadinessSummary,
  createReadinessItem,
  getWorstReadinessState,
  normalizeReadinessState,
  summarizeDependencyReadiness,
  summarizeNodeReadiness,
  summarizeProviderCapabilities,
  summarizePublicAccessReadiness,
};
