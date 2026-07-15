#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const helper = fs.readFileSync(path.join(root, "src", "ipc", "expectedAgentError.js"), "utf8");
const preload = fs.readFileSync(path.join(root, "preload.js"), "utf8");
const docker = fs.readFileSync(path.join(root, "src", "ipc", "dockerIpc.js"), "utf8");
const instances = fs.readFileSync(path.join(root, "src", "ipc", "instancesIpc.js"), "utf8");
const backups = fs.readFileSync(path.join(root, "src", "ipc", "backupsIpc.js"), "utf8");
const system = fs.readFileSync(path.join(root, "src", "ipc", "systemIpc.js"), "utf8");
const amp = fs.readFileSync(path.join(root, "src", "ipc", "ampIpc.js"), "utf8");

[
  "AUTHENTICATION_FAILED",
  "ECONNREFUSED",
  "NODE_DISABLED",
  "NODE_NOT_FOUND",
  "PAIRING_EXPIRED",
  "suppressedCount",
  "wrapExpectedAgentRead",
].forEach((needle) => assert(helper.includes(needle), `Expected Agent IPC helper missing ${needle}.`));

assert(preload.includes("async function invokeAgentFeature") && preload.includes("result.ok === false") && preload.includes("error.details"), "Preload must convert structured Agent IPC failures into renderer exceptions.");
[
  [docker, "docker:getSnapshot"],
  [docker, "docker:listContainers"],
  [instances, "instances:list"],
  [backups, "backups:list"],
  [system, "system:getSnapshot"],
  [amp, "amp:getSnapshot"],
].forEach(([source, channel]) => {
  assert(source.includes("wrapExpectedAgentRead") && source.includes(channel), `${channel} must use structured expected Agent error handling.`);
});

console.log("Expected Agent IPC smoke checks passed.");
