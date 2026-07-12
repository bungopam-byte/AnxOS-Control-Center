const dockerService = require("../src/services/dockerService");
const assert = require("assert");
const fs = require("fs");
const path = require("path");

function runNormalizationChecks() {
  const container = dockerService.normalizeContainer({
    ID: "abc123",
    Names: "lavalink",
    Image: "fredboat/lavalink",
    Status: "Up 2 hours",
    State: "running",
    Ports: "0.0.0.0:2333->2333/tcp, :::2333->2333/tcp",
  });
  const stats = dockerService.normalizeStats({
    ID: "abc123",
    Name: "lavalink",
    CPUPerc: "1.80%",
    MemUsage: "410MiB / 1GiB",
    MemPerc: "40.04%",
    NetIO: "12kB / 3kB",
  });
  const [attached] = dockerService.attachStats([container], [stats]);

  assert.deepStrictEqual(container.ports, ["2333/tcp"], "Port mappings should be normalized and deduplicated.");
  assert.strictEqual(attached.stats.cpuPercent, "1.80%", "CPU percent should survive service normalization.");
  assert.strictEqual(attached.stats.memoryUsage, "410MiB", "Memory usage should survive service normalization.");
  assert.strictEqual(attached.stats.memoryLimit, "1GiB", "Memory limit should survive service normalization.");
  assert.strictEqual(attached.stats.memoryPercent, "40.04%", "Memory percent should survive service normalization.");
}

async function main() {
  runNormalizationChecks();
  const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const styleSource = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
  [
    "function getDockerWorkspaceState",
    "function getDockerFastFailure",
    "DOCKER_REQUEST_TIMEOUT",
    "dockerRequestSerial",
    "withTimeout(",
    "data-docker-recovery-action",
    "updateDockerInspectorTabs(false)",
    "document.hidden || !dockerWorkspaceState?.ready",
  ].forEach((needle) => assert(appSource.includes(needle), `Docker workspace regression guard missing: ${needle}`));
  assert(styleSource.includes(".docker-empty-actions"), "Docker empty state actions must have stable layout.");

  const snapshot = await dockerService.getDockerSnapshot();

  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("Docker snapshot did not return an object.");
  }

  if (typeof snapshot.installed !== "boolean" || typeof snapshot.daemonRunning !== "boolean") {
    throw new Error("Docker snapshot is missing availability flags.");
  }

  if (!Array.isArray(snapshot.containers)) {
    throw new Error("Docker snapshot is missing a containers array.");
  }

  if (!snapshot.installed || !snapshot.daemonRunning) {
    if (!snapshot.message || !/docker/i.test(snapshot.message)) {
      throw new Error("Docker unavailable fallback did not include a friendly message.");
    }
    console.log(`Docker fallback OK: ${snapshot.message}`);
    return;
  }

  const [containers, images, networks, volumes] = await Promise.all([
    dockerService.getDockerContainers(),
    dockerService.listImages(),
    dockerService.listNetworks(),
    dockerService.listVolumes(),
  ]);

  if (!Array.isArray(containers.containers)) {
    throw new Error("Docker container list did not return an array.");
  }
  if (!Array.isArray(images.images)) {
    throw new Error("Docker image list did not return an array.");
  }
  if (!Array.isArray(networks.networks)) {
    throw new Error("Docker network list did not return an array.");
  }
  if (!Array.isArray(volumes.volumes)) {
    throw new Error("Docker volume list did not return an array.");
  }

  console.log(`Docker API OK: ${containers.containers.length} containers, ${images.images.length} images.`);
}

main().catch((error) => {
  const code = error?.code || "";
  if (/DOCKER_NOT_INSTALLED|DOCKER_PERMISSION_DENIED|DOCKER_DAEMON_UNAVAILABLE/.test(code)) {
    console.log(`Docker fallback OK: ${error.message}`);
    return;
  }
  console.error(error);
  process.exitCode = 1;
});
