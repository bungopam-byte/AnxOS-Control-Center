const { AgentClientError, requestJson } = require("./agentClient");

class ActionClientError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ActionClientError";
    this.code = details.code || null;
    this.status = details.status || null;
    this.payload = details.payload || null;
    this.actionId = details.actionId || null;
  }
}

function buildActionPath(actionId, suffix = "") {
  return `/api/v1/actions/${encodeURIComponent(actionId)}${suffix}`;
}

function normalizeActionError(actionId, error) {
  if (error instanceof ActionClientError) {
    return error;
  }

  if (error instanceof AgentClientError) {
    return new ActionClientError(error.message, {
      actionId,
      code: error.code || "ACTION_REQUEST_FAILED",
      status: error.status || null,
      payload: error.payload || null,
    });
  }

  return new ActionClientError("Agent action request failed.", {
    actionId,
    code: error?.name === "AbortError" ? "ACTION_TIMEOUT" : "ACTION_UNAVAILABLE",
    status: error?.status || null,
  });
}

async function executeAction(actionId, payload = {}) {
  try {
    return await requestJson(buildActionPath(actionId), {
      method: "POST",
      body: payload,
    });
  } catch (error) {
    throw normalizeActionError(actionId, error);
  }
}

async function pollAction(actionId) {
  try {
    return await requestJson(buildActionPath(actionId), {
      method: "GET",
    });
  } catch (error) {
    throw normalizeActionError(actionId, error);
  }
}

async function cancelAction(actionId, payload = {}) {
  try {
    return await requestJson(buildActionPath(actionId, "/cancel"), {
      method: "POST",
      body: payload,
    });
  } catch (error) {
    throw normalizeActionError(actionId, error);
  }
}

module.exports = {
  ActionClientError,
  cancelAction,
  executeAction,
  pollAction,
};
