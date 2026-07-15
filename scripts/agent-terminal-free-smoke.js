#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const ipcSource = fs.readFileSync(path.join(root, "src", "ipc", "agentControlIpc.js"), "utf8");
const preloadSource = fs.readFileSync(path.join(root, "preload.js"), "utf8");
const serviceSource = fs.readFileSync(path.join(root, "src", "services", "agentControlService.js"), "utf8");
const agentClientSource = fs.readFileSync(path.join(root, "src", "services", "agentClient.js"), "utf8");
const agentServerSource = fs.readFileSync(path.join(root, "agent", "src", "server.js"), "utf8");
const agentAuthSource = fs.readFileSync(path.join(root, "agent", "src", "auth.js"), "utf8");

[
  'data-agent-control-action="installLocalAgent"',
  'data-agent-control-action="start"',
  'data-agent-control-action="stop"',
  'data-agent-control-action="restart"',
  'data-agent-control-action="repairAgent"',
  'data-agent-control-action="installService"',
  'data-agent-control-action="enableAutoStart"',
  'data-agent-control-action="runDiagnostics"',
  'data-agent-control-action="startPairingSession"',
  'data-agent-control-action="copyPairingCode"',
].forEach((needle) => assert(htmlSource.includes(needle), `Agent Control must expose graphical ${needle}.`));

assert(htmlSource.includes("Generate Pairing Code") && htmlSource.includes("Copy Pairing Code"), "Agent setup must expose pairing code generation and copy controls.");
assert(htmlSource.indexOf("Pair with Code") < htmlSource.indexOf("Advanced Manual Setup"), "Recommended pairing must appear before advanced manual token setup.");

assert(ipcSource.includes("agentControl:startPairingSession") && preloadSource.includes("startPairingSession"), "Pairing setup must be available through IPC/preload.");
assert(serviceSource.includes("async function startPairingSession") && serviceSource.includes("/api/v1/pairing/start"), "Agent Control service must start temporary pairing sessions without shell commands.");
assert(appSource.includes("renderAgentPairingSetup") && appSource.includes("Pairing code copied."), "Renderer must show and copy temporary pairing codes in-app.");
assert(appSource.includes("Open Agent setup on that machine") && !appSource.includes("Run npm run agent:pair"), "Pairing repair guidance must use in-app setup, not npm.");
assert(!appSource.includes("Run npm run agent:token:status"), "Renderer token errors must not require npm for normal users.");
assert(!agentClientSource.includes("Run npm run agent:token:status"), "Agent client auth errors must not require npm for normal users.");
assert(agentClientSource.includes("[redacted authentication response]"), "Agent client must redact authentication response bodies in request logs.");
assert(!agentServerSource.includes("Run npm run agent:token:status"), "Agent auth errors must not require npm for normal users.");

const normalAuthSources = {
  "renderer auth recovery": appSource.slice(
    appSource.indexOf("function getAgentAuthFriendlyError"),
    appSource.indexOf("async function refreshNodeHealth", appSource.indexOf("function getAgentAuthFriendlyError")),
  ),
  "agent client auth errors": agentClientSource.slice(
    agentClientSource.indexOf("function getAgentHttpErrorMessage"),
    agentClientSource.indexOf("async function requestAgent", agentClientSource.indexOf("function getAgentHttpErrorMessage")),
  ),
  "agent server auth errors": agentServerSource.slice(
    agentServerSource.indexOf("function getAuthErrorMessage"),
    agentServerSource.indexOf("function logRequestError", agentServerSource.indexOf("function getAuthErrorMessage")),
  ),
  "agent auth middleware": agentAuthSource,
};

const forbiddenNormalAuthGuidance = [
  /npm\s+run\s+agent:/i,
  /run\s+node\b/i,
  /\bPowerShell\b.*\$/i,
  /\bsystemctl\b/i,
  /edit\s+\.env/i,
  /environment\s+variable/i,
  /manual\s+token/i,
];

Object.entries(normalAuthSources).forEach(([label, source]) => {
  forbiddenNormalAuthGuidance.forEach((pattern) => {
    assert(!pattern.test(source), `${label} must not include terminal-oriented recovery guidance: ${pattern}`);
  });
});

console.log("Agent terminal-free setup smoke checks passed.");
