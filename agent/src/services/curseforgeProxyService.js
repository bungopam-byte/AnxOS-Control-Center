const crypto = require("crypto");
const fs = require("fs");

const CURSEFORGE_API = "https://api.curseforge.com/v1";
const USER_AGENT = "AnxOS-Agent/0.1 (+https://anxos.local)";
const API_KEY_ENV = ["CURSEFORGE_API_KEY", "CF_API_KEY", "ANXHUB_CURSEFORGE_API_KEY"];
const API_KEY_FILE_ENV = ["CURSEFORGE_API_KEY_FILE", "CF_API_KEY_FILE", "ANXHUB_CURSEFORGE_API_KEY_FILE"];
const ALLOWED_API_PATHS = [
  /^\/mods\/search$/,
  /^\/mods\/\d+$/,
  /^\/mods\/\d+\/files$/,
  /^\/mods\/\d+\/files\/\d+$/,
  /^\/mods\/\d+\/files\/\d+\/download-url$/,
  /^\/minecraft\/version$/,
  /^\/minecraft\/modloader$/,
];
const ALLOWED_DOWNLOAD_HOSTS = new Set([
  "edge.forgecdn.net",
  "mediafilez.forgecdn.net",
  "media.forgecdn.net",
]);

class CurseForgeProxyError extends Error {
  constructor(message, code = "CURSEFORGE_PROXY_ERROR", details = {}, statusCode = 500) {
    super(message);
    this.name = "CurseForgeProxyError";
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }
}

function cleanSecretValue(value) {
  const text = String(value || "").trim();
  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"'))) {
    return text.slice(1, -1).trim();
  }
  return text;
}

function readSecretFile(filePath) {
  const cleanPath = cleanSecretValue(filePath);
  if (!cleanPath) return "";
  return cleanSecretValue(fs.readFileSync(cleanPath, "utf8"));
}

function resolveApiKey() {
  for (const envName of API_KEY_ENV) {
    const value = cleanSecretValue(process.env[envName]);
    if (value) return { key: value, source: `agent-env:${envName}` };
  }
  for (const envName of API_KEY_FILE_ENV) {
    const value = cleanSecretValue(process.env[envName]);
    if (value) return { key: readSecretFile(value), source: `agent-env:${envName}` };
  }
  return { key: "", source: null };
}

function fingerprint(value) {
  return value ? crypto.createHash("sha256").update(value).digest("hex").slice(0, 12) : null;
}

function getCurseForgeProxyStatus() {
  try {
    const resolved = resolveApiKey();
    return {
      configured: Boolean(resolved.key),
      source: resolved.source,
      fingerprint: fingerprint(resolved.key),
    };
  } catch (error) {
    return {
      configured: false,
      source: null,
      fingerprint: null,
      errorCode: error?.code || error?.name || "CURSEFORGE_KEY_UNREADABLE",
    };
  }
}

function requireApiKey() {
  const resolved = resolveApiKey();
  if (!resolved.key) {
    throw new CurseForgeProxyError("CurseForge integration is not configured on this Agent.", "CURSEFORGE_CONFIGURATION_MISSING", {
      provider: "curseforge",
      source: null,
    }, 503);
  }
  return resolved;
}

function assertAllowedApiPath(pathname) {
  const cleanPath = String(pathname || "").trim();
  if (!ALLOWED_API_PATHS.some((pattern) => pattern.test(cleanPath))) {
    throw new CurseForgeProxyError("CurseForge API path is not allowed.", "CURSEFORGE_PROXY_PATH_DENIED", { path: cleanPath }, 400);
  }
  return cleanPath;
}

function buildApiUrl(url) {
  const pathname = assertAllowedApiPath(url.searchParams.get("path") || "");
  const target = new URL(`${CURSEFORGE_API}${pathname}`);
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== "path" && value !== "") {
      target.searchParams.set(key, value);
    }
  }
  return target;
}

function validateDownloadUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value || ""));
  } catch {
    throw new CurseForgeProxyError("CurseForge download URL is invalid.", "CURSEFORGE_INVALID_DOWNLOAD_URL", {}, 400);
  }
  const hostname = parsed.hostname.toLowerCase();
  if (!["https:", "http:"].includes(parsed.protocol) || (!ALLOWED_DOWNLOAD_HOSTS.has(hostname) && !hostname.endsWith(".curseforge.com"))) {
    throw new CurseForgeProxyError("CurseForge download URL is not allowed.", "CURSEFORGE_UNSAFE_URL", { hostname }, 400);
  }
  return parsed;
}

async function fetchCurseForgeApi(url) {
  const resolved = requireApiKey();
  const target = buildApiUrl(url);
  const response = await fetch(target, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      "x-api-key": resolved.key,
    },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new CurseForgeProxyError("CurseForge API request failed.", "CURSEFORGE_REQUEST_FAILED", {
      status: response.status,
      body: body.slice(0, 1000),
      path: target.pathname,
    }, response.status);
  }
  return {
    statusCode: 200,
    body: JSON.parse(body),
  };
}

async function fetchCurseForgeDownload(url) {
  const resolved = requireApiKey();
  const target = validateDownloadUrl(url.searchParams.get("url") || "");
  const response = await fetch(target, {
    headers: {
      "User-Agent": USER_AGENT,
      "x-api-key": resolved.key,
    },
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    throw new CurseForgeProxyError("CurseForge download request failed.", "CURSEFORGE_DOWNLOAD_FAILED", {
      status: response.status,
      hostname: target.hostname,
      projectId: url.searchParams.get("projectId") || null,
      fileId: url.searchParams.get("fileId") || null,
    }, response.status);
  }
  return {
    statusCode: 200,
    rawBody: buffer,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/octet-stream",
      "X-AnxOS-CurseForge-Authenticated": "true",
    },
  };
}

async function handleCurseForgeProxy(request, url) {
  try {
    if (request.method === "GET" && url.pathname === "/api/v1/marketplace/curseforge/status") {
      return { statusCode: 200, body: getCurseForgeProxyStatus() };
    }
    if (request.method === "GET" && url.pathname === "/api/v1/marketplace/curseforge/api") {
      return await fetchCurseForgeApi(url);
    }
    if (request.method === "GET" && url.pathname === "/api/v1/marketplace/curseforge/download") {
      return await fetchCurseForgeDownload(url);
    }
    return { statusCode: 404, body: { error: { code: "NOT_FOUND", message: "Request failed." } } };
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      body: {
        error: {
          code: error.code || "CURSEFORGE_PROXY_FAILED",
          message: error.message || "CurseForge proxy request failed.",
          details: error.details || null,
        },
      },
    };
  }
}

module.exports = {
  getCurseForgeProxyStatus,
  handleCurseForgeProxy,
};
