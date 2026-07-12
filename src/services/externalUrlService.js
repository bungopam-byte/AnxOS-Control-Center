const { shell } = require("electron");
const diagnostics = require("./diagnosticsService");

const SAFE_EXTERNAL_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);

function parseExternalUrl(rawUrl) {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

function isSafeExternalUrl(rawUrl, options = {}) {
  const parsed = parseExternalUrl(rawUrl);
  if (!parsed || !SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
    return false;
  }
  if (Array.isArray(options.allowedHosts) && options.allowedHosts.length > 0) {
    return options.allowedHosts.includes(parsed.hostname);
  }
  return true;
}

async function openExternalUrl(rawUrl, options = {}) {
  const source = options.source || "external-url";
  const parsed = parseExternalUrl(rawUrl);
  if (!parsed || !isSafeExternalUrl(rawUrl, options)) {
    const error = new Error("Blocked unsafe external URL.");
    error.code = "EXTERNAL_URL_BLOCKED";
    diagnostics.log("warn", "desktop", "external-url-blocked", "Blocked unsafe external URL navigation", {
      source,
      protocol: parsed?.protocol || "invalid",
      hostname: parsed?.hostname || null,
    }, { file: "desktop", errorCode: error.code });
    throw error;
  }
  await shell.openExternal(parsed.toString());
  return { opened: true, url: parsed.toString() };
}

module.exports = {
  isSafeExternalUrl,
  openExternalUrl,
};
