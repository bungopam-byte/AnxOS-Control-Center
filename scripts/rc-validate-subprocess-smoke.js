const assert = require("assert");
const { classifySubprocessResult, npmInvocation } = require("./rc-validate");

const nodeInvocation = npmInvocation("website:download-functions:smoke", { npm_execpath: "/tmp/npm-cli.js" }, "win32");
assert.strictEqual(nodeInvocation.command, process.execPath, "Configured npm_execpath must be launched through Node.");
assert.deepStrictEqual(nodeInvocation.args, ["/tmp/npm-cli.js", "run", "website:download-functions:smoke"]);
const fallbackInvocation = npmInvocation("website:download-functions:smoke", { ComSpec: "C:\\Windows\\System32\\cmd.exe" }, "win32");
assert.strictEqual(fallbackInvocation.command, "C:\\Windows\\System32\\cmd.exe", "Windows fallback must use ComSpec.");
assert(fallbackInvocation.args.join(" ").includes("npm.cmd"), "Windows fallback must invoke npm.cmd through ComSpec.");

const warningResult = classifySubprocessResult({ status: 0, stderr: "npm notice run with --loglevel verbose\n" });
assert.strictEqual(warningResult.status, "PASS", "Exit code 0 must pass even when stderr contains npm notices.");
assert.strictEqual(warningResult.exitCode, 0);
assert(warningResult.stderr.includes("npm notice"), "Non-fatal stderr must remain available for diagnostics.");

const failureResult = classifySubprocessResult({ status: 1, stderr: "real failure\n" });
assert.strictEqual(failureResult.status, "FAIL", "Non-zero exit codes must fail validation.");
assert.strictEqual(failureResult.exitCode, 1);
console.log("RC subprocess classification smoke: PASS");
