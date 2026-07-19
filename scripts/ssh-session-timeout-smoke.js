const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "services", "sshService.js"), "utf8");

assert(source.includes("const SHELL_START_TIMEOUT_MS = 10000;"), "SSH shell startup must have a bounded timeout.");
assert(source.includes("session.shellStartTimer = setTimeout"), "SSH shell startup timeout must be armed after the connection is ready.");
assert(source.includes("SSH_SHELL_START_TIMEOUT"), "SSH shell startup timeout must use a structured error code.");
assert(source.includes("clearTimeout(session.shellStartTimer)"), "SSH shell startup timers must be cleared after callback or teardown.");
assert(source.includes("client.on(\"error\""), "SSH client errors must terminate the session.");
assert(source.includes("client.on(\"close\""), "SSH client close events must terminate the session.");

console.log("SSH session timeout smoke checks passed.");
