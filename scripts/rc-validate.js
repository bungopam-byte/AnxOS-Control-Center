#!/usr/bin/env node
const { spawn, spawnSync } = require("child_process");
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

function terminateProcessTree(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
  } else {
    try { process.kill(-child.pid, "SIGTERM"); } catch {}
    try { child.kill("SIGTERM"); } catch {}
  }
}

function runSuite(command, timeoutMs = Number(process.env.RC_SUITE_TIMEOUT_MS || 120000)) {
  const invocation = npmInvocation(command);
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const child = spawn(invocation.command, invocation.args, {
      cwd: process.cwd(),
      env: process.env,
      detached: process.platform !== "win32",
      shell: invocation.shell,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const append = (target, chunk) => target.length > 2_000_000 ? target : target + chunk.toString();
    child.stdout?.on("data", (chunk) => { stdout = append(stdout, chunk); process.stdout.write(chunk); });
    child.stderr?.on("data", (chunk) => { stderr = append(stderr, chunk); process.stderr.write(chunk); });
    const timer = setTimeout(() => {
      const elapsedMs = Date.now() - startedAt;
      terminateProcessTree(child);
      resolve({ command, status: "FAIL", exitCode: null, signalCode: "TIMEOUT", elapsedMs, pid: child.pid, stdout, stderr, timeoutMs });
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      resolve({ command, status: "FAIL", exitCode: null, signalCode: null, elapsedMs: Date.now() - startedAt, pid: child.pid || null, stdout, stderr, spawnError: error.message });
    });
    child.once("close", (exitCode, signalCode) => {
      clearTimeout(timer);
      resolve({ command, status: exitCode === 0 ? "PASS" : "FAIL", exitCode, signalCode, elapsedMs: Date.now() - startedAt, pid: child.pid, stdout, stderr });
    });
  });
}

async function runValidation() {
const results = [];
for (let index = 0; index < commands.length; index += 1) {
  const command = commands[index];
  console.error(`[RC] suite ${index + 1}/${commands.length} start ${command} ${new Date().toISOString()}`);
  const result = await runSuite(command);
  console.error(`[RC] suite ${index + 1}/${commands.length} ${result.status} ${command} pid=${result.pid || "-"} elapsedMs=${result.elapsedMs} exitCode=${result.exitCode} signalCode=${result.signalCode || "-"}`);
  if (result.status === "FAIL" && result.stderr) console.error(`[RC] ${command} stderr:\n${result.stderr}`);
  results.push(result);
  if (result.status !== "PASS") break;
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

if (require.main === module) runValidation().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { classifySubprocessResult, npmCommand, npmInvocation, runValidation, runSuite, terminateProcessTree };
