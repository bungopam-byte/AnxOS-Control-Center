const crypto = require("crypto");

function readBearerToken(headerValue) {
  if (!headerValue || typeof headerValue !== "string") {
    return "";
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isPublicRoute(pathname) {
  return pathname === "/api/v1/health";
}

function isAuthorized(request, config, pathname) {
  if (isPublicRoute(pathname)) {
    return {
      ok: true,
      statusCode: 200,
      code: "PUBLIC_ROUTE",
    };
  }

  if (!config.token) {
    return {
      ok: false,
      statusCode: 503,
      code: "AGENT_TOKEN_MISSING",
    };
  }

  const token = request.headers["x-agent-token"] || readBearerToken(request.headers.authorization);

  if (typeof token !== "string" || !safeEqual(token, config.token)) {
    return {
      ok: false,
      statusCode: 401,
      code: "UNAUTHORIZED",
    };
  }

  return {
    ok: true,
    statusCode: 200,
    code: "AUTHORIZED",
  };
}

module.exports = {
  isAuthorized,
};
