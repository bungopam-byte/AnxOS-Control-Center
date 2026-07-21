#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const nodeService = fs.readFileSync(path.join(root, "src", "services", "nodeService.js"), "utf8");
const agentControlService = fs.readFileSync(path.join(root, "src", "services", "agentControlService.js"), "utf8");
const preload = fs.readFileSync(path.join(root, "preload.js"), "utf8");
const ipc = fs.readFileSync(path.join(root, "src", "ipc", "agentControlIpc.js"), "utf8");

function functionBody(name) {
  const marker = app.includes(`async function ${name}`) ? `async function ${name}` : `function ${name}`;
  const start = app.indexOf(marker);
  assert(start >= 0, `Missing renderer function: ${name}`);
  const paramsEnd = app.indexOf(")", start);
  const braceStart = app.indexOf("{", paramsEnd);
  let depth = 0;
  for (let index = braceStart; index < app.length; index += 1) {
    if (app[index] === "{") depth += 1;
    if (app[index] === "}") {
      depth -= 1;
      if (depth === 0) return app.slice(braceStart, index + 1);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

const pairBody = functionBody("pairNodeFromSettings");
assert(app.includes("let nodePairingSubmitInFlight = false"), "Renderer must track in-flight pairing submissions.");
assert(pairBody.includes("nodePairingSubmitInFlight") && pairBody.includes("return;"), "Duplicate click or Enter submissions must be ignored while pairing is in flight.");
assert(pairBody.includes("nodePairingSubmissionSerial"), "Stale asynchronous pairing handlers must be invalidated.");
assert(pairBody.includes("nodePairingLastSubmittedCode"), "Expired or already-submitted pairing codes must be tracked.");
assert(pairBody.includes('nodePairingCodeInput.value = ""') && pairBody.includes("Pairing code expired."), "PAIRING_EXPIRED must clear stale code and show a friendly message.");
assert(pairBody.includes("Generate or paste a new pairing code before trying again."), "Stale codes must not be automatically resubmitted.");
assert(pairBody.includes("confirmUrlChange: options.confirmUrlChange === true"), "URL-change confirmation must use a dedicated confirmation flag.");
assert(pairBody.includes("await pairNodeFromSettings({ confirmUrlChange: true })"), "URL-change confirmation should retry through one explicit path.");
assert(pairBody.match(/await pairNodeFromSettings\(\{ confirmUrlChange: true \}\)/g).length === 1, "URL-change confirmation must retry at most once.");
assert(app.includes("nodePairingCodeInput?.addEventListener(\"input\"") && app.includes("updateNodePairingControls();"), "Pair button state must update only from a single input listener.");
assert(app.includes('pairButton.disabled = nodeFormBusy || nodePairingSubmitInFlight || !String(nodePairingCodeInput?.value || "").trim()'), "Pair must stay disabled until a new code is entered.");
assert.strictEqual((html.match(/data-node-action="pair-code"/g) || []).length, 1, "Pair Agent button should exist once.");
assert.strictEqual((app.match(/addEventListener\("click", pairNodeFromSettings\)/g) || []).length, 1, "Pair Agent click listener should be attached once.");
assert(!app.includes("setInterval(pairNodeFromSettings"), "Pairing must not retry from polling.");

assert(nodeService.indexOf("if (existingById && existingUrl !== agentUrl && payload.confirmUrlChange !== true)") < nodeService.indexOf("const permanentToken = generateAgentToken()"), "URL mismatch must be detected before consuming the pairing session.");
assert(agentControlService.includes("getPairingSessionTarget") && agentControlService.includes("requestedNodeId"), "Pairing generation must resolve an explicit node target.");
assert(agentControlService.includes("Pairing code generation was not redirected to the Windows Local Agent."), "Remote generation failure must not fall back to localhost.");
assert(preload.includes('startPairingSession: (payload = {}) => ipcRenderer.invoke("agentControl:startPairingSession", payload)'), "Preload must preserve pairing target payload.");
assert(ipc.includes('agentControl:startPairingSession", (_, payload = {})'), "IPC must preserve pairing target payload.");
assert(html.includes("Pairing Agent") && html.includes("data-agent-pairing-target-url"), "Pairing UI must show target name and address before generation.");
assert(app.includes("getWrongPairingTargetMessage") && app.includes("This code belongs to the"), "Wrong-target pairing codes must produce an in-app error.");
assert(app.includes("activeAgentPairingExpiresAt") && app.includes("activeAgentPairingExpiryTimer"), "Agent Control must track and schedule pairing-code expiration.");
assert(app.includes("Date.parse(activeAgentPairingExpiresAt) <= Date.now()"), "Expired Agent Control pairing codes must be cleared before display or copy.");
assert(pairBody.includes("renderAgentPairingSetup(null, { clearCode: true })"), "A consumed pairing code must be cleared after successful pairing.");

console.log("Expired pairing single-submit smoke checks passed.");
