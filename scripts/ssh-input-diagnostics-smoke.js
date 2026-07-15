#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const preloadSource = fs.readFileSync(path.join(rootDir, "preload.js"), "utf8");
const ipcSource = fs.readFileSync(path.join(rootDir, "src", "ipc", "sshIpc.js"), "utf8");
const serviceSource = fs.readFileSync(path.join(rootDir, "src", "services", "sshService.js"), "utf8");

assert(appSource.includes("const sshInputDiagnostics = {"), "Renderer must keep sanitized SSH diagnostics.");
assert(appSource.includes("window.__anxGetSshInputDiagnostics"), "Renderer diagnostics must be inspectable from developer tools.");
assert(appSource.includes("lastInputByteLength") && appSource.includes("activeSessionPresent"), "Renderer diagnostics must record byte counts and session presence.");
assert(!appSource.includes("lastInputText") && !appSource.includes("typedCommand"), "Renderer diagnostics must not store typed SSH text.");

assert(preloadSource.includes("recordSshBridgeWrite") && preloadSource.includes("byteLength: getBridgeByteLength(value)"), "Preload must record safe bridge write diagnostics.");
assert(!preloadSource.includes("lastInputText") && !preloadSource.includes("typedCommand"), "Preload diagnostics must not store typed SSH text.");

assert(ipcSource.includes("lastSshWriteDiagnostic") && ipcSource.includes("ipcReceived: true"), "Main IPC must record safe SSH write diagnostics.");
assert(ipcSource.includes("Buffer.byteLength(typeof payload.input === \"string\" ? payload.input : \"\", \"utf8\")"), "Main IPC diagnostics must record only byte length.");

assert(serviceSource.includes("recordWriteDiagnostic") && serviceSource.includes("streamWritable"), "SSH service must record PTY stream diagnostics.");
assert(serviceSource.includes("rejectedCategory: \"SSH_STREAM_NOT_WRITABLE\""), "SSH service diagnostics must report non-writable PTY streams.");
assert(serviceSource.includes("accepted: true") && serviceSource.includes("byteLength"), "SSH service diagnostics must record accepted writes by byte length.");
assert(!serviceSource.includes("lastInputText") && !serviceSource.includes("typedCommand"), "SSH service diagnostics must not store typed SSH text.");

console.log("SSH input diagnostics smoke checks passed.");
