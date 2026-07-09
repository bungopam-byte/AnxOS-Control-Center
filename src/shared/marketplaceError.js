(function attachMarketplaceErrorHelper(root, factory) {
  const helper = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = helper;
  }
  if (root) {
    root.marketplaceErrorHelper = helper;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createMarketplaceErrorHelper() {
  const IPC_PREFIX_PATTERN = /^\s*Error invoking remote method '[^']+':\s*/i;
  const ERROR_PREFIX_PATTERN = /^\s*Error:\s*/i;

  function stripIpcErrorWrapper(value) {
    let text = String(value || "").trim();
    let previous = "";

    while (text && text !== previous) {
      previous = text;
      text = text
        .replace(IPC_PREFIX_PATTERN, "")
        .replace(ERROR_PREFIX_PATTERN, "")
        .trim();
    }

    return text;
  }

  function getRawMessage(error) {
    return error?.payload?.error?.message || error?.message || String(error || "");
  }

  function normalizeMarketplaceError(error = {}, context = {}) {
    const payloadError = error?.payload?.error || {};
    const details = error?.details || payloadError.details || {};
    const code = details.code || payloadError.code || error?.code || "";
    const rawMessage = getRawMessage(error);
    const cleanMessage = stripIpcErrorWrapper(rawMessage);
    const friendlyMessage = details.friendlyMessage || payloadError.friendlyMessage || error?.friendlyMessage || "";
    const file = details.file || details.fileName || details.name || null;
    const provider = details.provider || payloadError.provider || error?.provider || "";
    const providerName = details.providerName || (provider ? String(provider).replace(/^./, (letter) => letter.toUpperCase()) : "Provider");
    const projectId = details.projectId || details.projectID || null;
    const fileId = details.fileId || details.fileID || null;
    const suggestion = details.suggestion || "Download/import the missing file manually, or choose another pack/server version.";
    const manualRequired = [
      "PROVIDER_REQUIRED_FILE_RESTRICTED",
      "PROVIDER_MANUAL_DOWNLOAD_REQUIRED",
      "CURSEFORGE_REQUIRED_FILE_RESTRICTED",
      "MODRINTH_REQUIRED_FILE_RESTRICTED",
    ].includes(code) ||
      details.recoveryState === "waiting-manual-download" ||
      /CurseForge blocked one required server file/i.test(cleanMessage) ||
      /required modpack file needs manual download/i.test(cleanMessage) ||
      /required server file is restricted/i.test(cleanMessage);

    if (manualRequired) {
      return {
        code: "PROVIDER_MANUAL_DOWNLOAD_REQUIRED",
        originalCode: code || details.originalCode || null,
        title: "A required modpack file needs manual download.",
        body: friendlyMessage || "This provider does not allow AnxHub to download one required file automatically.",
        action: suggestion,
        provider,
        providerName,
        file,
        projectId,
        fileId,
        sessionId: details.sessionId || null,
        manualDownload: details.manualDownload || null,
        rawMessage,
        cleanMessage,
        debug: details.debugMessage || details.originalMessage || rawMessage || cleanMessage,
      };
    }

    const title = friendlyMessage || cleanMessage || context.fallback || "Marketplace install failed.";
    return {
      code: code || "MARKETPLACE_INSTALL_FAILED",
      title,
      body: title,
      action: suggestion,
      provider,
      providerName,
      file,
      projectId,
      fileId,
      rawMessage,
      cleanMessage,
      debug: details.debugMessage || details.originalMessage || rawMessage || cleanMessage,
    };
  }

  return {
    normalizeMarketplaceError,
    stripIpcErrorWrapper,
  };
});
