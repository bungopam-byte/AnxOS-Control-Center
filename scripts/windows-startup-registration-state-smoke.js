#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const control = require("../src/services/agentControlService");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

const summarize = control._test.getLocalAgentStartupSummary;

assert.strictEqual(
  summarize({ running: true, service: { supported: true, installed: true, valid: true } }).label,
  "Running · Startup Registered",
);
assert.strictEqual(
  summarize({ running: true, service: { supported: true, installed: false } }).label,
  "Running · Startup Not Registered",
);
assert.strictEqual(
  summarize({ running: false, service: { supported: true, installed: true, valid: true } }).label,
  "Stopped · Startup Registered",
);
assert.strictEqual(
  summarize({ running: false, service: { supported: true, installed: false } }).label,
  "Stopped · Startup Not Registered",
);
const invalid = summarize({ running: true, service: { supported: true, installed: true, valid: false } });
assert.strictEqual(invalid.label, "Running · Startup Registration Invalid");
assert.strictEqual(invalid.degradesApplicationHost, false, "Invalid optional startup registration must not degrade the Application Host.");

assert(app.includes("startupSummary?.label"), "Renderer must display explicit startup registration lifecycle labels.");

console.log("Windows startup registration state smoke checks passed.");
