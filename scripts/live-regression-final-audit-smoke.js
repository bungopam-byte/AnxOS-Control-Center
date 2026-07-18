#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const dependenciesIpc = read("src/ipc/dependenciesIpc.js");
const publicAccessIpc = read("src/ipc/publicAccessIpc.js");
const nodeContextGuard = read("src/ipc/nodeContext.js");
const serviceRouter = read("src/services/serviceRouter.js");
const agentClient = read("src/services/agentClient.js");
const appSource = read("app.js");
const agentServer = read("agent/src/server.js");
const pairingSmoke = read("scripts/agent-pairing-workflow-smoke.js");
const sshSmoke = read("scripts/ssh-interactive-input-smoke.js");
const terminalFreeSmoke = read("scripts/agent-terminal-free-smoke.js");
const liveRoutingSmoke = read("scripts/live-routing-regression-smoke.js");
const packageJson = JSON.parse(read("package.json"));

assert(dependenciesIpc.includes("requireDependencyNodeContext(payload, \"dependency installation\")"), "Dependency install IPC must require explicit active-node context.");
assert(liveRoutingSmoke.includes("legacy.requests.length, 0"), "Live routing smoke must prove active-node dependency operations do not hit legacy localhost.");
assert(serviceRouter.includes("shouldPreserveAgentError") && serviceRouter.includes("UNAUTHORIZED"), "Service router must preserve authentication categories.");
assert(nodeContextGuard.includes("implicit-node-fallback-blocked"), "Feature services must reject missing node context instead of silently using global Agent config.");
assert(appSource.includes("Authentication failed.") && appSource.includes("Re-pair Agent") && appSource.includes("Repair Connection"), "Renderer must expose authentication recovery actions.");
assert(agentClient.includes("[redacted authentication response]"), "Agent client must redact authentication response bodies.");
assert(agentClient.includes("isCompatibilityFallbackAllowed") && agentClient.includes("return false"), "Agent client must gate compatibility fallback and reject auth fallback.");
assert(agentServer.includes("Open Agent setup") && !agentServer.includes("Run npm run agent:token:status"), "Normal Agent auth errors must use in-app recovery guidance.");
assert(terminalFreeSmoke.includes("forbiddenNormalAuthGuidance"), "Terminal-free smoke must guard normal auth recovery text.");
assert(pairingSmoke.includes("Re-pairing must update the existing node instead of creating a duplicate."), "Pairing smoke must cover in-place existing-node recovery.");
assert(publicAccessIpc.includes("invokePublicAccessRead") && publicAccessIpc.includes("expectedPublicAccessLogState"), "Public Access IPC must suppress repeated expected Agent failures.");
assert(appSource.includes("snapshot?.ok === false && snapshot.error"), "Renderer must handle structured Public Access IPC failures.");
assert(sshSmoke.includes("function bindSshXtermInput") && sshSmoke.includes("terminal.onData((data) => {") && sshSmoke.includes("writeSshInput(data);"), "SSH interactive smoke must cover xterm onData pass-through.");
assert(appSource.includes("function bindSshXtermInput") && appSource.includes("terminal.onData((data) => {") && appSource.includes("writeSshInput(data);"), "SSH renderer must pass terminal input directly to the PTY.");
assert(appSource.includes("window.__anxGetSshInputDiagnostics") && appSource.includes("lastInputByteLength"), "SSH input diagnostics must be available without typed text.");
assert(!appSource.includes("const arrowMap = {"), "SSH renderer must not rebuild terminal escape sequences manually.");
[
  "node:local-removal:smoke",
  "node:local-application-separation:smoke",
  "node:global-agent-isolation:smoke",
  "features:runtime-paths:smoke",
  "agent:polling-backoff:smoke",
  "ssh:input-diagnostics:smoke",
  "ssh:renderer-input-lifecycle:smoke",
  "account:project-context:smoke",
].forEach((scriptName) => {
  assert(packageJson.scripts?.[scriptName], `Missing live stabilization validation script: ${scriptName}`);
});

console.log("Live regression final audit smoke checks passed.");
