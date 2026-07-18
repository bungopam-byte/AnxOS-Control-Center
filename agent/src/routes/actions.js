const { getAction, listActions } = require("../actions/actionRegistry");
const { completedResponse, failedResponse, notImplementedResponse } = require("../actions/actionResponse");
const { isDockerAction, runDockerAction } = require("../actions/dockerActions");
const { auditAction } = require("../audit/auditLogger");
const { authorizeAction } = require("../permissions");

function handleActionsList() {
  return {
    statusCode: 200,
    body: {
      actions: listActions(),
    },
  };
}

function getActionIdFromPath(pathname) {
  const prefix = "/api/v1/actions/";

  if (!pathname.startsWith(prefix)) {
    return null;
  }

  return decodeURIComponent(pathname.slice(prefix.length));
}

async function handleActionInvoke(request, url) {
  const requestedActionId = getActionIdFromPath(url.pathname);
  const action = getAction(requestedActionId);
  const authorization = authorizeAction(action);

  if (!authorization.ok) {
    auditAction(request, {
      actionId: action?.actionId || requestedActionId,
      permission: authorization.permission || action?.permission || null,
      outcome: "denied",
      reason: authorization.code,
    });

    return {
      statusCode: authorization.statusCode,
      body: {
        actionId: action?.actionId || null,
        status: "denied",
        ok: false,
        error: {
          code: authorization.code,
          message: "Action denied.",
        },
        result: null,
      },
    };
  }

  auditAction(request, {
    actionId: action.actionId,
    permission: action.permission,
    outcome: "attempted",
    reason: null,
  });

  if (isDockerAction(action.actionId)) {
    try {
      const result = await runDockerAction(action, request);

      auditAction(request, {
        actionId: action.actionId,
        permission: action.permission,
        outcome: "completed",
        reason: null,
      });

      return {
        statusCode: 200,
        body: completedResponse(action, result),
      };
    } catch (error) {
      auditAction(request, {
        actionId: action.actionId,
        permission: action.permission,
        outcome: "failed",
        reason: error.code || "ACTION_FAILED",
      });

      return {
        statusCode: error.statusCode || 500,
        body: failedResponse(action, error.code || "ACTION_FAILED", "Action failed."),
      };
    }
  }

  auditAction(request, {
    actionId: action.actionId,
    permission: action.permission,
    outcome: "not_implemented",
    reason: "NOT_IMPLEMENTED",
  });

  return {
    statusCode: 501,
    body: notImplementedResponse(action),
  };
}

module.exports = {
  handleActionInvoke,
  handleActionsList,
};
