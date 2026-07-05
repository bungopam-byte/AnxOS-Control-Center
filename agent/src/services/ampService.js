process.env.ANXHUB_DISABLE_ENV_BOOTSTRAP = process.env.ANXHUB_DISABLE_ENV_BOOTSTRAP || "1";

const { getAmpSnapshot } = require("../../../src/services/ampService");

async function getAmpStatus() {
  return getAmpSnapshot();
}

async function getAmpInstances() {
  const snapshot = await getAmpSnapshot();

  return {
    connected: snapshot.connected,
    configured: snapshot.configured,
    status: snapshot.status,
    message: snapshot.message,
    diagnostics: snapshot.diagnostics,
    connection: snapshot.connection,
    instanceCount: snapshot.instanceCount,
    instances: snapshot.instances,
    selectedInstance: snapshot.selectedInstance,
    minecraftInstances: snapshot.minecraftInstances,
    minecraftSelectionMode: snapshot.minecraftSelectionMode,
    minecraft: snapshot.minecraft,
    poll: snapshot.poll,
    summary: snapshot.summary,
  };
}

module.exports = {
  getAmpInstances,
  getAmpStatus,
};
