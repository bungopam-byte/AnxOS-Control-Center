const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "anx-cf-server-pack-"));
process.env.ANXHUB_CONFIG_DIR = root;

const nodeService = require("../src/services/nodeService");
const credentials = require("../src/services/nodeCredentialStore");
const providerConfig = require("../src/services/providerConfigService");
const curseforgeProvider = require("../src/services/providers/curseforgeProvider");
const marketplace = require("../src/services/marketplaceInstallService");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function file(id, fileName, extra = {}) {
  return {
    id,
    projectId: 100,
    name: fileName,
    fileName,
    minecraftVersions: extra.minecraftVersions || ["1.20.1"],
    loaders: extra.loaders || ["fabric"],
    releaseType: extra.releaseType || 1,
    serverPackFileId: extra.serverPackFileId || null,
  };
}

async function main() {
  const original = {
    resolveFile: curseforgeProvider.resolveFile,
    getFile: curseforgeProvider.getFile,
    getFiles: curseforgeProvider.getFiles,
    downloadFile: curseforgeProvider.downloadFile,
    fetch: global.fetch,
  };
  const agentRequests = [];
  const filesById = new Map();
  let selectedFile = null;
  let listedFiles = [];
  let failFileIds = new Set();

  function resetScenario({ selected, files, failIds = [] }) {
    selectedFile = selected;
    listedFiles = files;
    failFileIds = new Set(failIds.map(String));
    filesById.clear();
    [selected, ...files].forEach((entry) => filesById.set(String(entry.id), entry));
  }

  try {
    writeJson(nodeService.getNodesPath(), {
      schemaVersion: 2,
      selectedNodeId: "anxlab",
      nodes: [{
        id: "anxlab",
        kind: "agent",
        displayName: "Anxlab",
        agentUrl: "http://192.168.1.134:47131",
        baseUrl: "http://192.168.1.134:47131",
        enabled: true,
        agentIdentity: { deviceId: "device-anxlab", hostname: "Anxlab" },
      }],
      removedLocalAgents: [],
    });
    credentials.setNodeToken("anxlab", "node-token");
    providerConfig.saveMarketplaceConfig({ curseForgeApiKey: "desktop-cf-key" });
    curseforgeProvider._test.setRuntimeApiKey("desktop-cf-key");

    curseforgeProvider.resolveFile = async () => selectedFile;
    curseforgeProvider.getFiles = async () => listedFiles;
    curseforgeProvider.getFile = async (projectId, fileId) => {
      if (failFileIds.has(String(fileId))) {
        const error = new Error("CurseForge file not found.");
        error.code = "CURSEFORGE_FILE_NOT_FOUND";
        error.status = 404;
        throw error;
      }
      return filesById.get(String(fileId)) || null;
    };
    curseforgeProvider.downloadFile = async () => {
      throw new Error("Server-pack resolution smoke should not download files.");
    };
    global.fetch = async (url, options = {}) => {
      agentRequests.push({ url: String(url), auth: options.headers?.Authorization || "" });
      throw new Error(`Unexpected Agent request before server-pack validation: ${url}`);
    };

    resetScenario({
      selected: file(10, "Client Pack.zip", { serverPackFileId: 11 }),
      files: [file(11, "Client Pack Server Pack.zip")],
    });
    const explicit = await marketplace._test.resolveCurseForgeServerPackSelection({ projectId: 100, minecraftVersion: "1.20.1", loader: "fabric" });
    assert.strictEqual(explicit.selectedFile.id, 10, "Selected client file should be preserved for review.");
    assert.strictEqual(explicit.serverFile.id, 11, "Explicit serverPackFileId should win.");
    assert.strictEqual(explicit.source, "selected-file-serverPackFileId");

    resetScenario({
      selected: file(20, "Client Pack 1.20.1.zip"),
      files: [
        file(21, "Client Pack 1.20.1.zip", { serverPackFileId: 22 }),
        file(22, "Client Pack Server Pack 1.20.1.zip"),
        file(23, "Client Pack Server Pack 1.19.4.zip", { minecraftVersions: ["1.19.4"] }),
      ],
    });
    const linked = await marketplace._test.resolveCurseForgeServerPackSelection({ projectId: 100, minecraftVersion: "1.20.1", loader: "fabric" });
    assert.strictEqual(linked.serverFile.id, 22, "Compatible project-level serverPackFileId should be selected.");
    assert.strictEqual(linked.source, "project-serverPackFileId");

    resetScenario({
      selected: file(30, "Client Pack.zip", { serverPackFileId: 31 }),
      files: [
        file(31, "Missing Server Pack.zip"),
        file(32, "Client Pack Dedicated Server Files.zip"),
      ],
      failIds: [31],
    });
    const fallback = await marketplace._test.resolveCurseForgeServerPackSelection({ projectId: 100, minecraftVersion: "1.20.1", loader: "fabric" });
    assert.strictEqual(fallback.serverFile.id, 32, "Unavailable linked server-pack ID should fall back to an official server-named file.");
    assert.strictEqual(fallback.source, "server-pack-file-name");

    resetScenario({
      selected: file(40, "Client Only Optimizer.zip"),
      files: [file(41, "Client Only Optimizer.zip"), file(42, "Client Only Optimizer Server Pack 1.19.4.zip", { minecraftVersions: ["1.19.4"] })],
    });
    await assert.rejects(
      () => marketplace._test.resolveCurseForgeServerPackSelection({ projectId: 100, minecraftVersion: "1.20.1", loader: "fabric" }),
      (error) => error?.code === "CURSEFORGE_SERVER_PACK_REQUIRED" && /does not provide a compatible dedicated-server pack/.test(error.message),
      "Wrong-version server packs should not satisfy the selected version.",
    );

    resetScenario({
      selected: file(50, "Fabulously.Optimized-12.2.2.zip"),
      files: [file(50, "Fabulously.Optimized-12.2.2.zip")],
    });
    await assert.rejects(
      () => marketplace.installPack({ provider: "curseforge", providerProjectId: "100", nodeId: "anxlab", id: "client-only", name: "Client Only", minecraftVersion: "1.20.1", loader: "fabric" }),
      (error) => error?.code === "CURSEFORGE_SERVER_PACK_REQUIRED" && /does not provide a compatible dedicated-server pack/.test(error.message),
      "Client-only CurseForge packs should fail before Agent installation.",
    );
    assert.strictEqual(agentRequests.length, 0, "Unsupported client-only CurseForge packs must not make pre-validation Agent requests.");

    console.log("CurseForge server-pack resolution smoke checks passed.");
  } finally {
    curseforgeProvider.resolveFile = original.resolveFile;
    curseforgeProvider.getFile = original.getFile;
    curseforgeProvider.getFiles = original.getFiles;
    curseforgeProvider.downloadFile = original.downloadFile;
    global.fetch = original.fetch;
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
