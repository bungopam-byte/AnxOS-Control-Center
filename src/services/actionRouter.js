const { executeAction: executeAgentAction } = require("./actionClient");
const { getBackendMode, isHealthy } = require("./agentClient");

class ActionRouterError extends Error {
  constructor(message, code = null) {
    super(message);
    this.name = "ActionRouterError";
    this.code = code;
  }
}

async function ensureAgentAvailable() {
  if (!(await isHealthy())) {
    throw new ActionRouterError("Agent unavailable. Docker actions require a healthy Agent connection.", "AGENT_UNAVAILABLE");
  }
}

function assertActionId(actionId) {
  if (typeof actionId !== "string" || actionId.trim() === "") {
    throw new ActionRouterError("Action id is required.", "ACTION_ID_REQUIRED");
  }

  return actionId.trim();
}

async function executeAction(actionId, params = {}) {
  const normalizedActionId = assertActionId(actionId);
  const backendMode = getBackendMode();

  if (backendMode === "local") {
    throw new ActionRouterError("Local Docker actions are not available yet. Switch to Agent or Auto mode.", "LOCAL_ACTIONS_UNAVAILABLE");
  }

  await ensureAgentAvailable();
  return executeAgentAction(normalizedActionId, params);
}

module.exports = {
  ActionRouterError,
  executeAction,
};
