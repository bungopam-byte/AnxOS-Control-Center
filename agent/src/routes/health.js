const { getDeviceIdentity } = require("../services/deviceIdentityService");

async function handleHealth(config = {}) {
  return {
    statusCode: 200,
    body: {
      ok: true,
      service: "anxos-agent",
      identity: getDeviceIdentity(),
      mode: "read-only",
      tokenConfigured: Boolean(config.token),
      tokenFingerprint: config.tokenStatus?.fingerprint || null,
      configPath: config.tokenStatus?.configPath || null,
      apiVersion: "v1",
      protocolVersion: 1,
      process: {
        pid: process.pid,
        uptimeSeconds: Math.round(process.uptime()),
        memoryBytes: process.memoryUsage().rss,
        cpuSeconds: (process.cpuUsage().user + process.cpuUsage().system) / 1_000_000,
        connectedClients: Number(config.connectedClients || 0),
      },
      time: new Date().toISOString(),
    },
  };
}

module.exports = {
  handleHealth,
};
