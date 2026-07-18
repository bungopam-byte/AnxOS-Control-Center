#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { getAzureSigningConfig } = require("./electron-builder-config");

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

const script = "$input | Get-AuthenticodeSignature | Select-Object Path,Status,StatusMessage,SignerCertificate | ConvertTo-Json -Compress";
const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
  input: files.join("\n"), encoding: "utf8", windowsHide: true,
});
if (result.status !== 0) {
  console.error(result.stderr || "Authenticode verification failed.");
  process.exit(result.status || 1);
}
const records = JSON.parse(result.stdout || "[]");
const normalized = Array.isArray(records) ? records : [records];
const signingExpected = Boolean(getAzureSigningConfig());
const invalid = normalized.filter((record) => signingExpected ? record.Status !== "Valid" : false);
for (const record of normalized) console.log(`${record.Status}: ${record.Path}${record.StatusMessage ? ` — ${record.StatusMessage}` : ""}`);
if (invalid.length > 0) {
  console.error("Azure Trusted Signing was configured, but one or more executables are not validly signed.");
  process.exit(1);
}
