#!/usr/bin/env node
const { spawnSync } = require("child_process");
const packageJson = require("../package.json");

const excluded = new Set(["rc:validate", "artifacts:validate"]);
const commands = Object.keys(packageJson.scripts)
  .filter((name) => name.endsWith(":smoke") && !excluded.has(name));

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function classifySubprocessResult(result = {}) {
  const exitCode = Number.isInteger(result.status) ? result.status : null;
  return {
    status: exitCode === 0 ? "PASS" : "FAIL",
    exitCode,
    spawnError: result.error?.message || null,
    stderr: String(result.stderr || ""),
  };
}

function runValidation() {
const results = [];
for (const command of commands) {
  const result = spawnSync(npmCommand(), ["run", command], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["inherit", "inherit", "pipe"],
  });
  if (result.stderr) process.stderr.write(result.stderr);
  results.push({ command, ...classifySubprocessResult(result) });
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
return { results, failed };
}

if (require.main === module) runValidation();
module.exports = { classifySubprocessResult, npmCommand, runValidation };
