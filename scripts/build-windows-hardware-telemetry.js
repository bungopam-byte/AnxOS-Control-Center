#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const project = path.join(root, "tools", "windows-hardware-telemetry", "AnxOS.HardwareTelemetry.csproj");
const output = path.join(root, "resources", "hardware-telemetry", "win-x64");
fs.mkdirSync(output, { recursive: true });

const result = spawnSync("dotnet", [
  "publish", project,
  "--configuration", "Release",
  "--runtime", "win-x64",
  "--self-contained", "true",
  "--output", output,
  "-p:PublishSingleFile=true",
  "-p:DebugType=None",
  "-p:DebugSymbols=false",
], { cwd: root, stdio: "inherit", shell: false });

if (result.error || result.status !== 0) {
  console.error(result.error?.message || "Windows hardware telemetry helper build failed.");
  process.exit(result.status || 1);
}

for (const notice of ["README.md", "THIRD-PARTY-NOTICES.txt", "LICENSE.MPL-2.0.txt"]) {
  fs.copyFileSync(path.join(path.dirname(project), notice), path.join(output, notice));
}
