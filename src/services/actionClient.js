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

function getDeniedReasonCode(error) {
  return error?.payload?.error?.code || error?.code || null;
}

function logActionRequest(actionId, endpoint, status, ok, errorCode = null) {
  console.info(
    `[AnxHub][Action] ${actionId} -> ${endpoint} (status=${status ?? "n/a"}, ok=${ok ? "true" : "false"}, errorCode=${errorCode || "none"})`,
  );
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
  const endpoint = buildActionPath(actionId);

  try {
    const response = await requestJson(endpoint, {
      method: "POST",
      body: payload,
    });
    logActionRequest(actionId, endpoint, 200, true, response?.error?.code || null);
    return response;
  } catch (error) {
    const normalized = normalizeActionError(actionId, error);
    logActionRequest(actionId, endpoint, normalized.status, false, getDeniedReasonCode(normalized));
    throw normalized;
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
