const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const runtimeService = fs.readFileSync(path.join(root, "src", "services", "localAgentRuntimeService.js"), "utf8");
const agentControl = fs.readFileSync(path.join(root, "src", "services", "agentControlService.js"), "utf8");
const diagnosticsService = fs.readFileSync(path.join(root, "src", "services", "diagnosticsService.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "config", "local-agent-runtime.json"), "utf8"));

assert.strictEqual(manifest.runtimeId, "anxos-local-agent");
assert.strictEqual(manifest.entrypoint, "agent/src/server.js");
assert.strictEqual(manifest.nodeRuntime, "electron-run-as-node");
assert(manifest.includedPaths.includes("agent/src"), "runtime manifest should include Agent source.");
assert(manifest.includedPaths.includes("src/shared"), "runtime manifest should include shared Agent dependencies.");
assert(manifest.excludedPatterns.includes(".env"), "runtime manifest should exclude environment files.");
assert(manifest.excludedPatterns.includes("*.log"), "runtime manifest should exclude logs.");
assert(manifest.excludedPatterns.includes("*.map"), "runtime manifest should exclude source maps.");

const resources = packageJson.build.extraResources || [];
const runtimeAgent = resources.find((entry) => entry.to === "local-agent-runtime/agent");
const runtimeShared = resources.find((entry) => entry.to === "local-agent-runtime/src/shared");
const runtimeManifest = resources.find((entry) => entry.to === "local-agent-runtime/local-agent-runtime.json");

assert(runtimeAgent, "electron-builder should package Agent files as local-agent-runtime/agent.");
assert(runtimeAgent.filter.includes("src/**/*"), "runtime Agent resource should include source files.");
assert(runtimeAgent.filter.includes("!**/.env"), "runtime Agent resource should exclude .env files.");
assert(runtimeAgent.filter.includes("!**/*.map"), "runtime Agent resource should exclude source maps.");
assert(runtimeAgent.filter.includes("!node_modules/**/*"), "runtime Agent resource should exclude development dependency trees.");
assert(runtimeShared, "electron-builder should package shared runtime files.");
assert(runtimeShared.filter.includes("**/*.js"), "shared runtime resource should include JavaScript files.");
assert(runtimeManifest, "electron-builder should package the runtime manifest.");

[
  "const RUNTIME_DIRECTORY_NAME = \"local-agent-runtime\"",
  "const AGENT_ENTRYPOINT = path.join(\"agent\", \"src\", \"server.js\")",
  "process.resourcesPath",
  "getBundledLocalAgentRuntime",
  "getBundledLocalAgentVersion",
  "getPublicLocalAgentRuntimeInfo",
  "usesGlobalNode: false",
  "nodeRuntime: \"electron-run-as-node\"",
  "path.basename(runtime.manifestPath",
].forEach((needle) => {
  assert(runtimeService.includes(needle), `runtime resolver should include ${needle}.`);
});

[
  "getBundledLocalAgentRuntime",
  "getPublicLocalAgentRuntimeInfo",
  "LOCAL_AGENT_RUNTIME_MISSING",
  "ANXOS_LOCAL_AGENT_RUNTIME_ROOT",
  "ANXOS_LOCAL_AGENT_RUNTIME_MANIFEST",
  "NODE_ENV: \"production\"",
  "runtimeBundle: getPublicLocalAgentRuntimeInfo()",
].forEach((needle) => {
  assert(agentControl.includes(needle), `Agent Control should use bundled runtime behavior: ${needle}.`);
});

assert(!agentControl.includes('require("../../agent/package.json")'), "Agent Control must not hard-load agent/package.json from app.asar.");
assert(!diagnosticsService.includes('require("../../agent/package.json")'), "Diagnostics must not hard-load agent/package.json from app.asar.");
assert(diagnosticsService.includes("getBundledLocalAgentVersion"), "Diagnostics should resolve the bundled Agent version through the runtime service.");
assert(!/runtimeBundle: getBundledLocalAgentRuntime\(\)/.test(agentControl), "Agent Control status must not expose full runtime paths.");

console.log("Local Agent runtime packaging smoke checks passed.");
