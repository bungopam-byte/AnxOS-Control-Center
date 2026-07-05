function getConfiguredPermissions() {
  return new Set(
    String(process.env.AGENT_ACTION_PERMISSIONS || "")
      .split(",")
      .map((permission) => permission.trim())
      .filter(Boolean),
  );
}

function authorizeAction(action) {
  if (!action) {
    return {
      ok: false,
      statusCode: 404,
      code: "ACTION_NOT_FOUND",
    };
  }

  const configuredPermissions = getConfiguredPermissions();

  if (!configuredPermissions.has(action.permission)) {
    return {
      ok: false,
      statusCode: 403,
      code: "ACTION_PERMISSION_DENIED",
      permission: action.permission,
    };
  }

  return {
    ok: true,
    statusCode: 200,
    code: "ACTION_AUTHORIZED",
    permission: action.permission,
  };
}

module.exports = {
  authorizeAction,
};
