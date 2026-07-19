const assert = require("assert");
const { classifySubprocessResult } = require("./rc-validate");

const warningResult = classifySubprocessResult({ status: 0, stderr: "npm notice run with --loglevel verbose\n" });
assert.strictEqual(warningResult.status, "PASS", "Exit code 0 must pass even when stderr contains npm notices.");
assert.strictEqual(warningResult.exitCode, 0);
assert(warningResult.stderr.includes("npm notice"), "Non-fatal stderr must remain available for diagnostics.");

const failureResult = classifySubprocessResult({ status: 1, stderr: "real failure\n" });
assert.strictEqual(failureResult.status, "FAIL", "Non-zero exit codes must fail validation.");
assert.strictEqual(failureResult.exitCode, 1);
console.log("RC subprocess classification smoke: PASS");
