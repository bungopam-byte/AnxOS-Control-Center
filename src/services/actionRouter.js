const { cancelAction: cancelAgentAction, executeAction: executeAgentAction, pollAction: pollAgentAction } = require("./actionClient");
const { getExecutionTarget } = require("./nodeService");

class ActionRouterError extends Error {
  constructor(message, code = null) { super(message); this.name = "ActionRouterError"; this.code = code; }
}

function getAgentTarget(nodeId) {
  const target = getExecutionTarget(nodeId);
  if (target.type !== "agent") throw new ActionRouterError("This action requires an Agent node.", "AGENT_NODE_REQUIRED");
  return target;
}

function assertActionId(actionId) {
  if (typeof actionId !== "string" || !actionId.trim()) throw new ActionRouterError("Action id is required.", "ACTION_ID_REQUIRED");
  return actionId.trim();
}

async function executeAction(actionId, params = {}, options = {}) { const target = getAgentTarget(options.nodeId); return executeAgentAction(assertActionId(actionId), params, target.config); }
async function pollAction(actionId, options = {}) { const target = getAgentTarget(options.nodeId); return pollAgentAction(assertActionId(actionId), target.config); }
async function cancelAction(actionId, params = {}, options = {}) { const target = getAgentTarget(options.nodeId); return cancelAgentAction(assertActionId(actionId), params, target.config); }

module.exports = { ActionRouterError, cancelAction, executeAction, pollAction };
