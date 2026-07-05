const { getAgentConfig } = require("./agentClient");

const REQUEST_TIMEOUT_MS = 5000;

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

function buildActionUrl(actionId) {
  const config = getAgentConfig();
  const baseUrl = config.url.endsWith("/") ? config.url : `${config.url}/`;
  return new URL(`/api/v1/actions/${encodeURIComponent(actionId)}`, baseUrl).toString();
}

async function executeAction(actionId, payload = {}) {
  const config = getAgentConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }

    const response = await fetch(buildActionUrl(actionId), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Action request failed with HTTP ${response.status}.`;

    if (!response.ok) {
      throw new ActionClientError(message, {
        actionId,
        code: payload?.error?.code || "ACTION_REQUEST_FAILED",
        status: response.status,
        payload,
      });
    }

    return payload;
  } catch (error) {
    if (error instanceof ActionClientError) {
      throw error;
    }

    throw new ActionClientError("Agent action request failed.", {
      actionId,
      code: error?.name === "AbortError" ? "ACTION_TIMEOUT" : "ACTION_UNAVAILABLE",
    });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  ActionClientError,
  executeAction,
};
