const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.join(__dirname, "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-owner-bootstrap-"));
const configDir = path.join(tempRoot, "app-config");

const result = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts", "bootstrap-owner-account.js"),
  "--email",
  "owner@example.com",
  "--id",
  "11111111-1111-4111-8111-111111111111",
  "--config-dir",
  configDir,
], {
  cwd: repoRoot,
  encoding: "utf8",
});

assert.strictEqual(result.status, 0, result.stderr || result.stdout);
assert(result.stdout.includes(path.join(configDir, "owner-accounts.json")), "Bootstrap output should show the targeted app config path.");

const allowlistPath = path.join(configDir, "owner-accounts.json");
const allowlist = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
assert.deepStrictEqual(allowlist.emails, ["owner@example.com"]);
assert.deepStrictEqual(allowlist.userIds, ["11111111-1111-4111-8111-111111111111"]);

console.log("Owner account bootstrap smoke checks passed.");
