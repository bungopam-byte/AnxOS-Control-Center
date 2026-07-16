const assert = require("assert");
const fs = require("fs/promises");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForAgent(url) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if ((await fetch(`${url}/api/v1/health`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Restricted Agent did not become ready.");
}

async function main() {
  const testRoot = await fs.mkdtemp(path.join(os.tmpdir(), "anx-agent-api-authz-"));
  const port = await getFreePort();
  const token = "agent-api-authorization-token";
  const url = `http://127.0.0.1:${port}`;
  const configDirectory = path.join(testRoot, "config");
  await fs.mkdir(configDirectory, { recursive: true });
  await fs.writeFile(path.join(configDirectory, "agent.json"), JSON.stringify({
    backendMode: "agent",
    agentUrl: url,
    agentToken: token,
  }));
  const agent = spawn(process.execPath, [path.join(rootDir, "agent", "src", "server.js")], {
    cwd: path.join(rootDir, "agent"),
    env: {
      ...process.env,
      AGENT_HOST: "127.0.0.1",
      AGENT_PORT: String(port),
      AGENT_TOKEN: token,
      AGENT_API_PERMISSIONS: "system:read",
      AGENT_FILE_ROOTS: testRoot,
      AGENT_INSTANCE_ROOT: path.join(testRoot, "instances"),
      AGENT_BACKUP_ROOT: path.join(testRoot, "backups"),
      ANXHUB_CONFIG_DIR: configDirectory,
      ANXHUB_AGENT_CONFIG_PATH: path.join(configDirectory, "agent.json"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForAgent(url);
    const headers = { Authorization: `Bearer ${token}` };
    assert.strictEqual((await fetch(`${url}/api/v1/health`)).status, 200, "Health must remain public.");
    assert.strictEqual((await fetch(`${url}/api/v1/stats`)).status, 401, "Non-public APIs must still require authentication.");
    assert.strictEqual((await fetch(`${url}/api/v1/stats`, { headers })).status, 200, "Granted API permissions must allow the request.");

    const filesResponse = await fetch(`${url}/api/v1/files/identity`, { headers });
    assert.strictEqual(filesResponse.status, 403);
    assert.strictEqual((await filesResponse.json()).error.code, "API_PERMISSION_DENIED");

    const actionResponse = await fetch(`${url}/api/v1/actions/docker.start`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ container: "example" }),
    });
    assert.strictEqual(actionResponse.status, 403);
    const actionFailure = await actionResponse.json();
    assert.strictEqual(actionFailure.error.code, "API_PERMISSION_DENIED");
    assert.strictEqual(actionFailure.error.details.permission, "actions:execute");

    console.log("Agent API authorization smoke checks passed.");
  } finally {
    agent.kill("SIGTERM");
    await new Promise((resolve) => agent.once("exit", resolve));
    await fs.rm(testRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
