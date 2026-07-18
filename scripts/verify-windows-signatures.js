#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { getAzureSigningConfig } = require("./azure-signing-config");

if (process.platform !== "win32") process.exit(0);

const dist = path.resolve(process.cwd(), "dist");
const files = [];
function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath);
    else if (entry.isFile() && filePath.toLowerCase().endsWith(".exe")) files.push(filePath);
  }
}
walk(dist);
if (files.length === 0) {
  console.error("No Windows executables were generated for signature verification.");
  process.exit(1);
}

function resolveSignTool() {
  if (process.env.SIGNTOOL_PATH && fs.existsSync(process.env.SIGNTOOL_PATH)) return process.env.SIGNTOOL_PATH;
  const result = spawnSync("where.exe", ["signtool.exe"], { encoding: "utf8", windowsHide: true });
  const candidate = String(result.stdout || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return candidate || null;
}

const signTool = resolveSignTool();
console.log(`Windows signature verifier: ${signTool || "signtool.exe not found"}`);
if (!signTool) {
  console.error("Windows SDK signtool.exe is required for Authenticode verification.");
  process.exit(1);
}

const signingExpected = Boolean(getAzureSigningConfig());
const publisher = process.env.AZURE_TRUSTED_SIGNING_PUBLISHER_NAME || "Anjo ROSIMO";
const failures = [];
for (const filePath of files) {
  const result = spawnSync(signTool, ["verify", "/pa", "/v", filePath], { encoding: "utf8", windowsHide: true });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  const valid = result.status === 0 && /Successfully verified/i.test(output);
  const publisherValid = !signingExpected || new RegExp(`Subject:.*${publisher.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`, "i").test(output);
  console.log(`${valid && publisherValid ? "Valid" : "Invalid"}: ${filePath}`);
  if (output) console.log(output);
  if (!valid || !publisherValid) failures.push(filePath);
}

if (failures.length > 0) {
  console.error(`Authenticode verification failed for ${failures.length} executable(s).`);
  process.exit(1);
}
