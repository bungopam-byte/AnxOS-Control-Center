const assert = require("assert");
const fs = require("fs");

const client = fs.readFileSync("src/services/agentClient.js", "utf8");
const config = fs.readFileSync("agent/src/config.js", "utf8");
const server = fs.readFileSync("agent/src/server.js", "utf8");

assert(client.includes("FILE_WRITE_REQUEST_TIMEOUT_MS = 300000"), "Desktop file writes need a bounded long-operation timeout.");
assert(client.includes("timeoutMs: FILE_WRITE_REQUEST_TIMEOUT_MS"), "File writes must use the targeted timeout, not the normal request timeout.");
assert(config.includes("fileWriteTimeoutMs"), "Agent must expose a dedicated file-write timeout.");
assert(server.includes("isFileWrite") && server.includes("config.fileWriteTimeoutMs"), "Agent must apply the dedicated timeout only to PUT file operations.");
assert(server.includes("config.requestTimeoutMs"), "Normal Agent requests must retain the normal timeout.");
console.log("CurseForge large file-write timeout smoke: PASS");
