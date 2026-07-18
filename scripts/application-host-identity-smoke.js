const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-application-host-"));
process.env.ANXHUB_CONFIG_DIR = path.join(root, "config");

const service = require("../src/services/applicationHostService");
const identityPath = path.join(process.env.ANXHUB_CONFIG_DIR, "application-host.json");

const firstId = service.getApplicationHost().hostId;
assert.match(firstId, /^host-[a-z0-9-]+$/i, "First run should create a stable application host ID.");
assert.strictEqual(service.getApplicationHost().hostId, firstId, "Repeated reads must preserve the application host ID.");
const validRaw = fs.readFileSync(identityPath, "utf8");
assert.strictEqual(JSON.parse(validRaw).schemaVersion, service.APPLICATION_HOST_SCHEMA_VERSION, "Application host identity must include the current schema.");

fs.writeFileSync(identityPath, `${JSON.stringify({ schemaVersion: service.APPLICATION_HOST_SCHEMA_VERSION + 1, hostId: firstId })}\n`, { mode: 0o600 });
const futureRaw = fs.readFileSync(identityPath, "utf8");
assert.throws(
  () => service.getApplicationHost(),
  (error) => error?.code === "APPLICATION_HOST_SCHEMA_UNSUPPORTED",
  "Future application host schemas must fail without rotating identity.",
);
assert.strictEqual(fs.readFileSync(identityPath, "utf8"), futureRaw, "Future application host state must remain unchanged.");

fs.writeFileSync(identityPath, "{not-json\n", { mode: 0o600 });
assert.throws(
  () => service.getApplicationHost(),
  (error) => error?.code === "APPLICATION_HOST_IDENTITY_CORRUPT",
  "Corrupt application host identity must fail without generating a replacement.",
);
assert(fs.readdirSync(process.env.ANXHUB_CONFIG_DIR).some((name) => name.startsWith("application-host.json.corrupt-")), "Corrupt application host identity should be preserved.");

fs.writeFileSync(identityPath, `${JSON.stringify({ hostId: firstId })}\n`, { mode: 0o600 });
assert.strictEqual(service.getApplicationHost().hostId, firstId, "Legacy application host identity should migrate without changing the ID.");
assert(fs.existsSync(`${identityPath}.schema-v0.backup`), "Legacy application host identity should be backed up before migration.");

console.log("Application host identity smoke checks passed.");
