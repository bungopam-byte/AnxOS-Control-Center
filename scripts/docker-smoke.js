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

  const liveBot = dockerService.normalizeContainer({
    ID: "bot123",
    Names: "/discord-bot",
    Image: "discord-bot-clean-discord-bot",
    Status: "Up 4 days (healthy)",
    State: "running",
    Ports: "",
    RunningFor: "4 days ago",
  });
  const [botWithStats] = dockerService.attachStats([liveBot], [dockerService.normalizeStats({
    ID: "bot123",
    Name: "discord-bot",
    CPUPerc: "0.02%",
    MemUsage: "90.95MiB / 15.37GiB",
  })]);
  assert.strictEqual(botWithStats.name, "discord-bot", "Live Discord bot container names should be normalized.");
  assert.strictEqual(botWithStats.state, "running", "Live Discord bot running state should be preserved.");
  assert.strictEqual(botWithStats.stats.cpuPercent, "0.02%", "Live Discord bot CPU stats should attach by name or ID.");

  const masked = dockerService.maskEnv(["MYSQL_PASSWORD=secret", "VISIBLE=value"]);
  assert.deepStrictEqual(masked, ["MYSQL_PASSWORD=[REDACTED]", "VISIBLE=value"], "Sensitive Docker environment values should be masked.");
}

async function main() {
  runNormalizationChecks();
  const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const indexSource = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const styleSource = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
  const dockerIpcSource = fs.readFileSync(path.join(__dirname, "..", "src", "ipc", "dockerIpc.js"), "utf8");
  const serviceRouterSource = fs.readFileSync(path.join(__dirname, "..", "src", "services", "serviceRouter.js"), "utf8");
  const dockerServiceSource = fs.readFileSync(path.join(__dirname, "..", "src", "services", "dockerService.js"), "utf8");
  [
    "function getDockerWorkspaceState",
    "function getDockerFastFailure",
    "DOCKER_REQUEST_TIMEOUT",
    "dockerRequestSerial",
    "withTimeout(",
    "data-docker-recovery-action",
    "updateDockerInspectorTabs(false)",
    "document.hidden || !dockerWorkspaceState?.ready",
    "logDockerDiagnostic(\"snapshot-success\"",
    "createSecurityConfirmation({ title: \"Remove Docker image?\"",
    "createSecurityConfirmation({ title: \"Remove Docker volume?\"",
    "function runDockerComposeUiAction",
    "function runDockerCleanupAction",
  ].forEach((needle) => assert(appSource.includes(needle), `Docker workspace regression guard missing: ${needle}`));
  [
    "data-docker-compose-action=\"config\"",
    "data-docker-cleanup=\"volumes\"",
    "data-docker-create=\"privileged\"",
    "data-docker-logs-timestamps",
  ].forEach((needle) => assert(indexSource.includes(needle), `Docker workspace markup guard missing: ${needle}`));
  const fastFailureBody = appSource.match(/function getDockerFastFailure\(\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert(!fastFailureBody.includes("getCurrentAgentHealthTarget") && !fastFailureBody.includes("getNodeVisualState"), "Docker refresh must not be blocked by stale Agent Control or node visual state.");
  assert(dockerIpcSource.includes("DOCKER_REQUEST_FAILED") && dockerIpcSource.includes("docker:getSnapshot") && dockerIpcSource.includes("invokeDockerOperation(() => getDockerSnapshot(payload))"), "Docker IPC must preserve coded snapshot errors.");
  [
    "docker:pause",
    "docker:kill",
    "docker:pullImage",
    "docker:compose",
    "docker:cleanup",
    "docker:removeVolume",
  ].forEach((needle) => assert(dockerIpcSource.includes(needle), `Docker IPC route missing: ${needle}`));
  assert(serviceRouterSource.includes("agent-snapshot-failed") && !serviceRouterSource.includes("throw new AgentUnavailableError();\n  }\n}\n\nfunction createDockerUnavailableSnapshot"), "Remote Docker failures must not be flattened into generic Agent unavailable.");
  assert(serviceRouterSource.includes("routeDockerOperation") && serviceRouterSource.includes("dockerComposeAction"), "Docker router must route extended Docker operations through the selected node.");
  assert(dockerServiceSource.includes("DOCKER_SOCKET_PERMISSION_DENIED") && dockerServiceSource.includes("DOCKER_SOCKET_UNAVAILABLE") && dockerServiceSource.includes("DOCKER_SERVICE_UNREACHABLE"), "Docker service must classify socket and service failures explicitly.");
  [
    "listComposeProjects",
    "validateComposeConfig",
    "DOCKER_VOLUME_IN_USE",
    "DOCKER_DEFAULT_NETWORK_PROTECTED",
    "redactDockerText",
    "getCleanupPreview",
    "execContainer",
  ].forEach((needle) => assert(dockerServiceSource.includes(needle), `Docker service guard missing: ${needle}`));
  assert(styleSource.includes(".docker-empty-actions"), "Docker empty state actions must have stable layout.");
  assert(styleSource.includes(".docker-resource-grid") && styleSource.includes(".docker-warning"), "Docker resource panels must have stable styling.");

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
