#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const ipcSource = fs.readFileSync(path.join(root, "src", "ipc", "nodesIpc.js"), "utf8");
const preloadSource = fs.readFileSync(path.join(root, "preload.js"), "utf8");
const tokenSource = fs.readFileSync(path.join(root, "src", "shared", "agentTokenStore.js"), "utf8");
const nodeServiceSource = fs.readFileSync(path.join(root, "src", "services", "nodeService.js"), "utf8");

const { generateAgentToken, isWeakAgentToken } = require("../src/shared/agentTokenStore");

const first = generateAgentToken();
const second = generateAgentToken();

assert.notStrictEqual(first, second, "Generated Agent tokens must be unique.");
assert(/^anxos_[A-Za-z0-9_-]{43,}$/.test(first), "Generated Agent tokens should use the anxos_ base64url format.");
assert(!isWeakAgentToken(first), "Generated Agent tokens must pass Agent validation.");
assert(tokenSource.includes("crypto.randomBytes(32)") && !/Math\.random\(\)/.test(tokenSource), "Agent tokens must use cryptographically secure randomness.");

assert(ipcSource.includes('ipcMain.handle("nodes:generateToken"') && ipcSource.includes("generateAgentToken()"), "Token generation must be exposed through trusted node IPC.");
assert(preloadSource.includes("generateToken: () => ipcRenderer.invoke(\"nodes:generateToken\")"), "Preload must expose node token generation without renderer randomness.");

assert(htmlSource.includes('data-node-action="generate-token"') && htmlSource.includes('data-node-action="copy-token"'), "Add/Edit Node must expose Generate Token and Copy Token controls.");
assert(appSource.includes("Your saved token is stored securely") && htmlSource.includes("Treat this token like a password."), "Node token UI must explain saved credential and security handling.");
assert(htmlSource.includes("Pair with Code") && htmlSource.includes("No manual token setup is required."), "Normal node setup must prefer Pair with Code without manual token setup.");
assert(htmlSource.includes("Advanced manual token setup is intended for development, recovery, or headless administration."), "Manual token setup must stay scoped to advanced/recovery/headless use.");
assert(!htmlSource.includes("Temporary Linux shell example") && !htmlSource.includes("Temporary Windows PowerShell example"), "Normal node token setup must not show terminal command examples.");

assert(appSource.includes("async function generateNodeAgentToken()") && appSource.includes("desktopApiState.api.nodes.generateToken()"), "Renderer must request generated tokens from trusted IPC.");
assert(appSource.includes("async function copyNodeAgentToken()") && appSource.includes("Agent token copied."), "Renderer must copy only the unsaved visible token with in-app feedback.");
assert(appSource.includes('copyButton.disabled = nodeFormBusy || !hasUnsavedToken'), "Copy Token must be disabled when only a saved hidden credential exists.");
assert(appSource.includes('field.dataset.unsavedCredential = "false"'), "Opening an existing node must not mark the saved protected token as visible.");
assert(appSource.includes("After saving this new token, update the Agent configuration"), "Token regeneration warning must explain the Agent-side update requirement.");
assert(appSource.includes("formatNodeAgentContext") && appSource.includes("One machine or server = one Agent."), "Shared UI should show active node/derived Agent context.");

assert(nodeServiceSource.includes("setNodeToken(node.id, node.agentToken)"), "Saving must continue to persist node tokens through protected credential storage.");
assert(!/agentToken"\s*:\s*node\.agentToken/.test(nodeServiceSource), "Node metadata must not persist raw Agent tokens.");

console.log("Node token workflow smoke checks passed.");
