#!/usr/bin/env node
const { spawnSync } = require("child_process");
const packageJson = require("../package.json");

const excluded = new Set(["rc:validate", "artifacts:validate"]);
const commands = Object.keys(packageJson.scripts)
  .filter((name) => name.endsWith(":smoke") && !excluded.has(name));

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function npmInvocation(scriptName, env = process.env, platform = process.platform) {
  const npmExecPath = env.npm_execpath;
  if (npmExecPath) {
    return { command: process.execPath, args: [npmExecPath, "run", scriptName], shell: false };
  }
  if (platform === "win32") {
    const shell = env.ComSpec || "cmd.exe";
    return { command: shell, args: ["/d", "/s", "/c", `npm.cmd run "${scriptName}"`], shell: false };
  }
  return { command: npmCommand(), args: ["run", scriptName], shell: false };
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
  const invocation = npmInvocation(command);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  });
  if (result.stdout) process.stdout.write(result.stdout);
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
module.exports = { classifySubprocessResult, npmCommand, npmInvocation, runValidation };
