const assert = require("assert");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const readme = read("README.md");
const architecture = read("docs/ONE_AGENT_PER_NODE_ARCHITECTURE.md");
const appSource = read("app.js");
const indexSource = read("index.html");
const packageJson = JSON.parse(read("package.json"));

[
  "node:active-selection:smoke",
  "node:switch:smoke",
  "agent-control:smoke",
  "node:agent-identity:smoke",
  "node:startup-selection:smoke",
  "node:token-workflow:smoke",
  "node:agent-pairing:smoke",
  "agent:terminal-free:smoke",
  "dependencies:graphical:smoke",
  "ssh:terminal-emulation:smoke",
].forEach((scriptName) => {
  assert(packageJson.scripts?.[scriptName], `Missing final validation script: ${scriptName}`);
});

[
  "Active Node is the canonical application-wide selection.",
  "Active Agent is derived from the active Node.",
  "Selecting a Node automatically activates its Agent.",
  "Selecting a registered Agent automatically activates its Node.",
  "One machine or server = one independently running AnxOS Agent.",
  "Deleting a Node removes it only from Control Center",
].forEach((phrase) => {
  assert(architecture.includes(phrase), `Architecture documentation missing: ${phrase}`);
});

assert(readme.includes("Normal users should pair Agents from the app"), "README must describe the normal in-app pairing path.");
assert(readme.includes("without npm commands, shell commands, environment-variable editing, or manual token synchronization"), "README must state normal pairing is terminal-free.");
assert(readme.includes("Advanced Playit Service Recovery"), "README must classify retained Playit shell commands as advanced recovery.");
assert(!/pairing code like a temporary secret because it contains the remote agent token/i.test(readme), "README must not describe pairing codes as token containers.");

assert(indexSource.includes("Pair with Code"), "Add Node UI must retain Pair with Code.");
assert(indexSource.includes("Manual Setup") && indexSource.includes("Advanced"), "Manual URL/token setup must remain under Advanced setup.");
assert(indexSource.includes("Generate Pairing Code"), "Agent setup UI must expose pairing code generation.");
assert(indexSource.includes("Generate Token") && indexSource.includes("Copy Token"), "Manual token workflow must expose generate/copy controls.");

assert(appSource.includes("selectNode(nodeId"), "Renderer must keep canonical node selection path.");
assert(appSource.includes("data-remote-agent-select") && appSource.includes("await selectNode(nodeId);"), "Agent Control must select registered Agent nodes through node selection.");
assert(appSource.includes("resetNodeScopedRendererState"), "Node switching must clear node-owned renderer state.");
assert(appSource.includes("createSshTerminalBuffer"), "SSH output must use the terminal buffer.");
assert(appSource.includes("sshXterm.onData((data) => {") && appSource.includes("writeSshInput(data);"), "SSH input must come from xterm onData and pass through to the PTY.");
assert(!appSource.includes("const arrowMap = {"), "SSH input must not manually reconstruct terminal escape sequences.");

console.log("Synchronized final regression smoke checks passed.");
