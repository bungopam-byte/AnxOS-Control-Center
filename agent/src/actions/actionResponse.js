function actionResponse(action, status, code, message, details = {}) {
  return {
    actionId: action?.actionId || null,
    status,
    ok: status === "completed",
    error: status === "completed"
      ? null
      : {
          code,
          message,
        },
    result: null,
    ...details,
  };
}

function notImplementedResponse(action) {
  return actionResponse(action, "not_implemented", "NOT_IMPLEMENTED", "Action is not implemented.", {
    implemented: false,
  });
}

function completedResponse(action, result = null) {
  return actionResponse(action, "completed", null, null, {
    result,
    implemented: true,
  });
}

function failedResponse(action, code, message, details = {}) {
  return actionResponse(action, "failed", code, message, details);
}

module.exports = {
  actionResponse,
  completedResponse,
  failedResponse,
  notImplementedResponse,
};
