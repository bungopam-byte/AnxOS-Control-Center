const DEFAULT_ACTION_PERMISSIONS = ["docker:write"];
const DEFAULT_API_PERMISSIONS = ["*"];

function normalizePermissionToken(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized === "docker" || normalized === "docker.write") {
    return "docker:write";
  }

  return normalized;
}

function expandPermissionToken(value) {
  const normalized = normalizePermissionToken(value);

  if (!normalized) {
    return [];
  }

  if (normalized === "*" || normalized === "*:*") {
    return ["*"];
  }

  if (normalized === "docker:*") {
    return ["docker:*", "docker:write"];
  }

  return [normalized];
}

function getRawConfiguredPermissions() {
  return process.env.AGENT_ACTION_PERMISSIONS
    || process.env.AGENT_ALLOWED_PERMISSIONS
    || process.env.ANX_AGENT_ACTION_PERMISSIONS
    || "";
}

function getConfiguredPermissions() {
  const rawPermissions = String(getRawConfiguredPermissions());
  const sourcePermissions = rawPermissions.trim()
    ? rawPermissions.split(/[\s,]+/)
    : DEFAULT_ACTION_PERMISSIONS;

  return new Set(sourcePermissions.flatMap(expandPermissionToken).filter(Boolean));
}

function getConfiguredApiPermissions() {
  const rawPermissions = String(process.env.AGENT_API_PERMISSIONS || "");
  const sourcePermissions = rawPermissions.trim()
    ? rawPermissions.split(/[\s,]+/)
    : DEFAULT_API_PERMISSIONS;
  return new Set(sourcePermissions.flatMap(expandPermissionToken).filter(Boolean));
}

function authorizeApiPermission(permission) {
  const normalized = normalizePermissionToken(permission);
  if (!normalized) return { ok: true, code: "API_PERMISSION_NOT_REQUIRED", permission: null };
  const configuredPermissions = getConfiguredApiPermissions();
  const category = normalized.includes(":") ? `${normalized.split(":", 1)[0]}:*` : null;
  if (!configuredPermissions.has("*") && !configuredPermissions.has(normalized) && !(category && configuredPermissions.has(category))) {
    return { ok: false, statusCode: 403, code: "API_PERMISSION_DENIED", permission: normalized };
  }
  return { ok: true, statusCode: 200, code: "API_PERMISSION_AUTHORIZED", permission: normalized };
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

  if (!configuredPermissions.has("*") && !configuredPermissions.has(action.permission)) {
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
  authorizeApiPermission,
  authorizeAction,
  getConfiguredApiPermissions,
};
