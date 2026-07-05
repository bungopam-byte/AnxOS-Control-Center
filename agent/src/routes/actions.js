const { getAction, listActions } = require("../actions/actionRegistry");
const { notImplementedResponse } = require("../actions/actionResponse");
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
  const action = getAction(getActionIdFromPath(url.pathname));
  const authorization = authorizeAction(action);

  if (!authorization.ok) {
    auditAction(request, {
      actionId: action?.actionId || getActionIdFromPath(url.pathname),
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
