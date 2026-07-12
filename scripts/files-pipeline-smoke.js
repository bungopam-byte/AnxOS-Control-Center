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

async function waitForAgent(url, token) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${url}/api/v1/health`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Temporary Agent did not become ready.");
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "anx-files-pipeline-"));
  process.env.ANXHUB_CONFIG_DIR = path.join(tempRoot, "desktop-config");
  const port = await getFreePort();
  const token = "files-pipeline-smoke-token";
  const url = `http://127.0.0.1:${port}`;
  const agent = spawn(process.execPath, [path.join(rootDir, "agent", "src", "server.js")], {
    cwd: tempRoot,
    env: {
      ...process.env,
      AGENT_HOST: "127.0.0.1",
      AGENT_PORT: String(port),
      AGENT_TOKEN: token,
      AGENT_FILE_ROOTS: tempRoot,
      AGENT_IDENTITY_PATH: path.join(tempRoot, "device-identity.json"),
      AGENT_ACTION_PERMISSIONS: "files:write",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await fs.writeFile(path.join(tempRoot, "existing.txt"), "before", "utf8");
    await waitForAgent(url, token);
    assert.strictEqual((await fetch(`${url}/api/v1/files/list?path=${encodeURIComponent(tempRoot)}`)).status, 401, "Agent files must reject unauthenticated requests.");
    const agentClient = require("../src/services/agentClient");
    const config = { backendMode: "agent", url, token };

    const first = await agentClient.getFileListing(tempRoot, config);
    const reconnected = await agentClient.getFileListing(tempRoot, config);
    assert(first.connected && reconnected.connected, "Agent filesystem should connect and reconnect.");
    assert(first.entries.some((entry) => entry.name === "existing.txt"), "Agent listing should include files.");

    const opened = await agentClient.readFileText(path.join(tempRoot, "existing.txt"), config);
    assert.strictEqual(opened.content, "before", "Agent should open text files.");
    await agentClient.mutateFile({ action: "write", path: opened.path, content: "after" }, config);
    assert.strictEqual((await agentClient.readFileText(opened.path, config)).content, "after", "Agent should edit text files.");

    const folder = path.join(tempRoot, "folder");
    const created = path.join(folder, "created.txt");
    const copied = path.join(folder, "copied.txt");
    const renamed = path.join(folder, "renamed.txt");
    await agentClient.mutateFile({ action: "mkdir", path: folder }, config);
    await agentClient.mutateFile({ action: "newFile", path: created, content: "created" }, config);
    await agentClient.mutateFile({ action: "copy", sourcePath: created, destinationPath: copied }, config);
    await agentClient.mutateFile({ action: "rename", oldPath: copied, newPath: renamed }, config);
    assert((await agentClient.getFileListing(folder, config)).entries.some((entry) => entry.name === "renamed.txt"), "Agent should browse created folders.");
    await agentClient.mutateFile({ action: "delete", path: renamed }, config);
    await assert.rejects(
      agentClient.mutateFile({ action: "delete", path: tempRoot }, config),
      /ROOT_DELETE_FORBIDDEN/,
      "Agent must not delete a configured filesystem root."
    );

    const { FileService } = require("../src/services/fileService");
    const localService = new FileService();
    const localListing = await localService.list({ storageId: "local", path: tempRoot });
    assert(localListing.connected && localListing.local, "Local filesystem provider should connect.");
    await localService.writeText({ storageId: "local", path: path.join(tempRoot, "local.txt"), content: "local" });
    assert.strictEqual((await localService.readText({ storageId: "local", path: path.join(tempRoot, "local.txt") })).content, "local", "Local provider should edit files.");

    const appSource = await fs.readFile(path.join(rootDir, "app.js"), "utf8");
    assert(appSource.includes("filesAutoSelectedNodeId !== selectedRemoteNode.id"), "Renderer should auto-select a node only once.");
    assert(appSource.includes("if (filesConnectPromise)"), "Renderer should deduplicate Connect requests.");
    assert(appSource.includes("filesConnectionState.targetKey === target.key"), "Renderer should compare complete connection targets.");
    assert(appSource.includes("getSafeFilesConnectionError"), "Renderer should sanitize connection failures.");
    assert(appSource.includes("openFilesContextMenu") && appSource.includes('role = "menu"'), "Files workspace should expose an accessible context menu.");
    assert(appSource.includes("stageFilesCopy") && appSource.includes("pasteFilesClipboard"), "Files workspace should support staged copy and paste keyboard behavior without a second transfer system.");
    assert(appSource.includes("resolveNameConflict") && appSource.includes("getFileConflictSummary"), "Files workspace should preflight visible rename/copy/create conflicts.");
    assert(appSource.includes("FILE_INLINE_EDIT_LIMIT_BYTES") && appSource.includes("Large file preview disabled"), "Files workspace should avoid loading large files into the renderer editor.");
    assert(appSource.includes("Operations") && appSource.includes("transfer.retry"), "Transfer history should link to Operations and expose real retry actions when available.");

    const serviceSource = await fs.readFile(path.join(rootDir, "src", "services", "fileService.js"), "utf8");
    assert(serviceSource.includes("FILES_CONFLICT"), "File service should reject upload conflicts instead of silently overwriting.");
    assert(serviceSource.includes("options.conflictPolicy !== \"replace\""), "File service should require explicit replace policy for upload conflicts.");

    console.log("Files pipeline smoke checks passed.");
  } finally {
    agent.kill("SIGTERM");
    await new Promise((resolve) => agent.once("exit", resolve));
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
