const { execFile } = require("child_process");
const path = require("path");
const { getPlayitSnapshot } = require("./playitService");
const { summarizePublicAccessReadiness } = require("../../../src/services/readinessService");
const {
  buildPublicAccessSnapshot,
} = require("../../../src/shared/publicAccessProviderDetection");
const {
  createAccessService,
  deleteAccessService,
  listAccessServices,
  reconcileAccessServices,
} = require("../../../src/shared/publicAccessServiceRegistry");

const COMMAND_TIMEOUT_MS = 2200;

function getConfigDirectory() {
  return process.env.ANXHUB_CONFIG_DIR || path.join(process.cwd(), "config");
}

function registryOptions() {
  return { configDir: getConfigDirectory() };
}

function runCommand(command, args = []) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: COMMAND_TIMEOUT_MS, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        errorCode: error?.code || error?.name || null,
        stdout: String(stdout || "").trim(),
        stderr: String(stderr || "").trim(),
      });
    });
  });
}

async function getPublicAccessSnapshot() {
  const platform = process.platform;
  const snapshot = await buildPublicAccessSnapshot({
    runCommand,
    getPlayitSnapshot,
    nodeId: null,
    platform,
  });
  const persistedServices = reconcileAccessServices(listAccessServices(registryOptions()), snapshot);
  const merged = {
    ...snapshot,
    services: [
      ...(Array.isArray(snapshot.services) ? snapshot.services : []),
      ...persistedServices.filter((service) => !(snapshot.services || []).some((entry) => entry.id === service.id)),
    ],
    persistedServices,
  };
  return {
    ...merged,
    readiness: summarizePublicAccessReadiness(merged),
  };
}

async function createPublicAccessService(payload = {}) {
  const service = createAccessService(payload, registryOptions());
  return {
    success: true,
    service,
    services: listAccessServices(registryOptions()),
  };
}

async function listPublicAccessServices() {
  return {
    services: listAccessServices(registryOptions()),
  };
}

async function deletePublicAccessService(serviceId) {
  return deleteAccessService(serviceId, registryOptions());
}

module.exports = {
  createPublicAccessService,
  deletePublicAccessService,
  getPublicAccessSnapshot,
  listPublicAccessServices,
  _test: {
    registryOptions,
    runCommand,
  },
};
