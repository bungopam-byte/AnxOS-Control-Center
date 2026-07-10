async function handleHealth(config = {}) {
  return {
    statusCode: 200,
    body: {
      ok: true,
      service: "anxos-agent",
      mode: "read-only",
      tokenConfigured: Boolean(config.token),
      tokenFingerprint: config.tokenStatus?.fingerprint || null,
      configPath: config.tokenStatus?.configPath || null,
      time: new Date().toISOString(),
    },
  };
}

module.exports = {
  handleHealth,
};
