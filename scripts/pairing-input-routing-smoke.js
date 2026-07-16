#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const preloadSource = fs.readFileSync(path.join(root, "preload.js"), "utf8");
const ipcSource = fs.readFileSync(path.join(root, "src", "ipc", "agentControlIpc.js"), "utf8");
const { createPairingSessionPayload, normalizePairingCode, parsePairingCode } = require("../src/shared/agentPairing");

function functionBody(name) {
  const start = appSource.indexOf(`async function ${name}`);
  assert(start >= 0, `${name} should exist.`);
  const nextStart = appSource.indexOf("\nfunction ", start + 1);
  const nextAsyncStart = appSource.indexOf("\nasync function ", start + 1);
  const candidates = [nextStart, nextAsyncStart].filter((index) => index > start);
  const end = Math.min(...candidates);
  return appSource.slice(start, end);
}

const session = createPairingSessionPayload({ agentUrl: "http://192.168.1.134:47131" });
const [friendly, encoded] = session.pairingCode.split(".", 2);
const wrapped = `\n ${friendly.slice(0, 4)} ${friendly.slice(4)}.\n${encoded.slice(0, 24)}\n${encoded.slice(24)} \n`;
assert.strictEqual(normalizePairingCode(wrapped), session.pairingCode, "Visual wrapping whitespace should be removed without changing the encoded payload.");
assert.strictEqual(parsePairingCode(wrapped).agentUrl, "http://192.168.1.134:47131", "Wrapped pairing code should parse to the original target Agent URL.");

const nodePairBody = functionBody("pairNodeFromSettings");
const settingsPairBody = functionBody("pairAgentFromSettings");
assert(nodePairBody.includes("desktopApiState.api.nodes.pair"), "Selected-node pairing must call nodes:pair.");
assert(!nodePairBody.includes("desktopApiState.api.settings.pairAgent"), "Selected-node pairing must not call settings:pairAgent.");
assert(settingsPairBody.includes("desktopApiState.api.settings.pairAgent"), "Local/global Agent pairing must call settings:pairAgent.");
assert(!settingsPairBody.includes("desktopApiState.api.nodes.pair"), "Local/global Agent pairing must not call nodes:pair.");
assert(nodePairBody.includes('getAgentErrorCode(error) === "PAIRING_CODE_INVALID"'), "Invalid node pairing codes should be handled once in the node workflow.");
assert(nodePairBody.includes("nodePairingCodeInput.value = \"\""), "Invalid or expired selected-node codes should be cleared after failure.");
assert(settingsPairBody.includes("agentPairingCodeInput.value = \"\""), "Invalid or expired local/global codes should be cleared after failure.");
assert.strictEqual((appSource.match(/addEventListener\("click", pairNodeFromSettings\)/g) || []).length, 1, "Selected-node pair click listener must be attached once.");
assert.strictEqual((appSource.match(/addEventListener\("click", pairAgentFromSettings\)/g) || []).length, 1, "Local/global pair click listener must be attached once.");
assert(preloadSource.includes('status: (payload = {}) => ipcRenderer.invoke("agentControl:status", payload)'), "Preload must pass Agent Control status context to IPC.");
assert(preloadSource.includes('list: (payload = {}) => ipcRenderer.invoke("agentControl:list", payload)'), "Preload must pass Agent Control list context to IPC.");
assert(ipcSource.includes('control.listAgents(requireNodeContext(payload, "Agent Control listing"))'), "Agent Control list IPC must validate and preserve renderer node context.");
assert(ipcSource.includes('control.getStatus(payload)'), "Agent Control status IPC must preserve renderer context.");

console.log("Pairing input routing smoke checks passed.");
