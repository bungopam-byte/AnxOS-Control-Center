#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const normalRuntimeSources = {
  "renderer": fs.readFileSync(path.join(root, "app.js"), "utf8"),
  "html": fs.readFileSync(path.join(root, "index.html"), "utf8"),
  "agent client": fs.readFileSync(path.join(root, "src", "services", "agentClient.js"), "utf8"),
  "agent server": fs.readFileSync(path.join(root, "agent", "src", "server.js"), "utf8"),
};

const forbidden = [
  /npm\s+run\s+agent:/i,
  /agent:token:status/i,
  /PowerShell\s+example/i,
  /Command Prompt/i,
  /manual token synchronization/i,
  /Run npm/i,
];

Object.entries(normalRuntimeSources).forEach(([label, source]) => {
  forbidden.forEach((pattern) => {
    assert(!pattern.test(source), `${label} normal runtime source contains terminal-oriented guidance: ${pattern}`);
  });
});

console.log("Normal runtime terminal-guidance smoke checks passed.");
