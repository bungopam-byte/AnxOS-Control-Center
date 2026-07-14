const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const RUNTIME_DIRECTORY_NAME = "local-agent-runtime";
const RUNTIME_MANIFEST_NAME = "local-agent-runtime.json";
const AGENT_ENTRYPOINT = path.join("agent", "src", "server.js");

function getDevelopmentRoot() {
  try {
    return app?.getAppPath ? app.getAppPath() : path.join(__dirname, "..", "..");
  } catch {
    return path.join(__dirname, "..", "..");
  }
}

function getPackagedRuntimeRoot() {
  const resourcesPath = process.resourcesPath || "";
  return resourcesPath ? path.join(resourcesPath, RUNTIME_DIRECTORY_NAME) : null;
}

function pathExists(filePath) {
  try {
    return Boolean(filePath && fs.existsSync(filePath));
  } catch {
    return false;
  }
}

function getBundledLocalAgentRuntime() {
  const packagedRoot = getPackagedRuntimeRoot();
  const developmentRoot = getDevelopmentRoot();
  const runtimeRoot = app?.isPackaged === true && pathExists(path.join(packagedRoot || "", AGENT_ENTRYPOINT))
    ? packagedRoot
    : developmentRoot;
  const agentScript = path.join(runtimeRoot, AGENT_ENTRYPOINT);
  const manifestPath = pathExists(path.join(runtimeRoot, RUNTIME_MANIFEST_NAME))
    ? path.join(runtimeRoot, RUNTIME_MANIFEST_NAME)
    : path.join(developmentRoot, "config", RUNTIME_MANIFEST_NAME);

  return {
    runtimeRoot,
    agentScript,
    manifestPath,
    workingDirectory: runtimeRoot,
    packaged: app?.isPackaged === true,
    appManaged: true,
    usesGlobalNode: false,
    nodeRuntime: "electron-run-as-node",
    exists: pathExists(agentScript),
  };
}

function getPublicLocalAgentRuntimeInfo() {
  const runtime = getBundledLocalAgentRuntime();
  return {
    packaged: runtime.packaged,
    appManaged: runtime.appManaged,
    usesGlobalNode: runtime.usesGlobalNode,
    nodeRuntime: runtime.nodeRuntime,
    exists: runtime.exists,
    manifest: path.basename(runtime.manifestPath || RUNTIME_MANIFEST_NAME),
  };
}

module.exports = {
  AGENT_ENTRYPOINT,
  RUNTIME_DIRECTORY_NAME,
  getBundledLocalAgentRuntime,
  getPublicLocalAgentRuntimeInfo,
};
