#!/usr/bin/env node
const { spawnSync } = require("child_process");
const packageJson = require("../package.json");

const excluded = new Set(["rc:validate", "artifacts:validate"]);
const commands = Object.keys(packageJson.scripts)
  .filter((name) => name.endsWith(":smoke") && !excluded.has(name));

const results = [];
for (const command of commands) {
  const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", command], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
  });
  results.push({ command, status: result.status === 0 ? "PASS" : "FAIL", exitCode: result.status });
  if (result.status !== 0) break;
}

const failed = results.find((result) => result.status === "FAIL");
console.log(JSON.stringify({
  status: failed ? "FAIL" : "PASS",
  suite: "private-alpha-rc-source-validation",
  completed: results.length,
  total: commands.length,
  failed: failed?.command || null,
}, null, 2));
process.exitCode = failed ? 1 : 0;
