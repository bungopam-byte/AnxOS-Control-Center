const { getExecutionTarget, getNode, getSelectedNodeId } = require("./nodeService");

function firstDefined(values = [], fallback = null) {
  for (const value of values) {
    const text = typeof value === "string" ? value.trim() : value;
    if (text) {
      return text;
    }
  }
  return fallback;
}

function createErrorFactory(createError) {
  if (typeof createError === "function") {
    return createError;
  }
  return (message, code, details) => {
    const error = new Error(message);
    error.code = code;
    error.details = details;
    return error;
  };
}

function buildMarketplaceInstallContext({
  payload = {},
  template = {},
  options = {},
  instancePayload = {},
  sourceFallback = "marketplace",
  preferOptionProvider = false,
  installPathFallback = "data",
} = {}) {
  const sourceCandidates = preferOptionProvider
    ? [options.provider, payload.provider, template.id, payload.templateId]
    : [template.id, payload.templateId, payload.provider, options.provider];

  return {
    nodeId: payload.nodeId || getSelectedNodeId(),
    instanceId: instancePayload.id || options.id || null,
    installPath:
      instancePayload.workingDirectory ||
      template.installPath ||
      template.installer?.installDir ||
      installPathFallback,
    source: firstDefined(sourceCandidates, sourceFallback),
    version:
      options.version ||
      options.minecraftVersion ||
      template.version ||
      template.minecraftVersion ||
      template.gameVersion ||
      "latest",
    loader: options.serverType || options.loader || template.loader || null,
    dependencyState: null,
    options: { ...options },
  };
}

function validateMarketplaceInstallContext(installContext = {}, options = {}) {
  const createError = createErrorFactory(options.createError);
  const missingFields = ["nodeId", "instanceId", "installPath"].filter(
    (field) => !String(installContext[field] || "").trim(),
  );
  if (missingFields.length > 0) {
    throw createError("Required install configuration is missing.", "INVALID_INSTALL_CONTEXT", {
      missingFields,
      installContext: {
        nodeId: installContext.nodeId || null,
        instanceId: installContext.instanceId || null,
        installPath: installContext.installPath || null,
        source: installContext.source || null,
        version: installContext.version || null,
        loader: installContext.loader || null,
      },
    });
  }
  return installContext;
}

function resolveMarketplaceInstallTarget({ nodeId = null, operation = "marketplace-install", createError } = {}) {
  const makeError = createErrorFactory(createError);
  const requestedNodeId = String(nodeId || "").trim();
  if (!requestedNodeId) {
    throw makeError("No installation target is selected.", "INSTALL_TARGET_REQUIRED", {
      operation,
      targetType: "missing",
    });
  }

  const executionTarget = getExecutionTarget(requestedNodeId);
  const node = getNode(executionTarget.nodeId);
  const nodeLabel = node?.displayName || node?.name || executionTarget.nodeId;

  if (executionTarget.type === "agent" && node?.enabled === false) {
    throw makeError("Selected node is disabled.", "NODE_DISABLED", {
      operation,
      nodeId: executionTarget.nodeId,
      nodeLabel,
      targetType: "registered-node",
    });
  }

  if (executionTarget.type !== "agent") {
    return {
      type: "application-host",
      nodeId: executionTarget.nodeId || "application-host",
      nodeLabel: nodeLabel || "Application Host",
      agentUrl: null,
      targetLabel: "application-host",
      credentialSource: "application-host",
      agentConfig: {
        backendMode: "local",
        nodeId: executionTarget.nodeId || "application-host",
      },
      platform: node?.platform || node?.applicationHost?.platform || null,
      capabilities: executionTarget.capabilities || {},
    };
  }

  const targetLabel = `node:${executionTarget.nodeId}`;
  const agentUrl = node?.agentUrl || node?.baseUrl || executionTarget.config?.agentUrl || null;
  return {
    type: "registered-node",
    nodeId: executionTarget.nodeId,
    nodeLabel,
    agentUrl,
    targetLabel,
    credentialSource: "protected-node-credential",
    agentConfig: {
      ...executionTarget.config,
      nodeId: executionTarget.nodeId,
      agentNodeId: executionTarget.nodeId,
      nodeName: nodeLabel,
      agentNodeLabel: nodeLabel,
      nodeUrl: agentUrl,
      targetLabel,
      credentialSource: "protected-node-credential",
    },
    platform: node?.platform || node?.agentIdentity?.platform || executionTarget.config?.platform || null,
    capabilities: executionTarget.capabilities || {},
  };
}

module.exports = {
  buildMarketplaceInstallContext,
  resolveMarketplaceInstallTarget,
  validateMarketplaceInstallContext,
};