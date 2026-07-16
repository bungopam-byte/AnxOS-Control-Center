const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "anx-ssh-profiles-"));
process.env.ANXHUB_CONFIG_DIR = root;
const { SSH_PROFILES_SCHEMA_VERSION, SshService } = require("../src/services/sshService");
const service = new SshService();
const filePath = path.join(root, "ssh-profiles.json");
const legacy = { servers: [{ id: "host-a", displayName: "Host A", host: "10.0.0.2" }], profiles: [{ id: "profile-a", serverId: "host-a", displayName: "Host A", host: "10.0.0.2", port: 22, username: "admin", authType: "password" }], defaultProfileId: "profile-a" };

fs.writeFileSync(filePath, `${JSON.stringify(legacy)}\n`, { mode: 0o600 });
assert.strictEqual(service.listProfiles().profiles[0].host, "10.0.0.2");
assert.strictEqual(JSON.parse(fs.readFileSync(filePath, "utf8")).schemaVersion, SSH_PROFILES_SCHEMA_VERSION);
assert(fs.existsSync(`${filePath}.schema-v0.backup`), "Legacy SSH profiles should be preserved before migration.");

const future = { ...legacy, schemaVersion: SSH_PROFILES_SCHEMA_VERSION + 1 };
fs.writeFileSync(filePath, JSON.stringify(future), { mode: 0o600 });
const futureRaw = fs.readFileSync(filePath, "utf8");
assert.throws(() => service.listProfiles(), (error) => error?.code === "SSH_PROFILES_SCHEMA_UNSUPPORTED");
assert.throws(() => service.saveProfile({ displayName: "New", host: "10.0.0.3", username: "root" }), (error) => error?.code === "SSH_PROFILES_SCHEMA_UNSUPPORTED");
assert.strictEqual(fs.readFileSync(filePath, "utf8"), futureRaw, "Future SSH profile state must not be overwritten.");

fs.writeFileSync(filePath, "{broken", { mode: 0o600 });
const corruptRaw = fs.readFileSync(filePath, "utf8");
assert.throws(() => service.listProfiles(), (error) => error?.code === "SSH_PROFILES_CORRUPT");
assert.throws(() => service.saveProfile({ displayName: "New", host: "10.0.0.3", username: "root" }), (error) => error?.code === "SSH_PROFILES_CORRUPT");
assert.strictEqual(fs.readFileSync(filePath, "utf8"), corruptRaw, "Corrupt SSH profiles must not be overwritten.");
assert(fs.readdirSync(root).some((name) => name.startsWith("ssh-profiles.json.corrupt-") && name.endsWith(".backup")), "Corrupt SSH profiles should be preserved.");
assert.strictEqual(fs.readdirSync(root).some((name) => name.endsWith(".tmp")), false, "Atomic SSH profile writes should clean temporary files.");

service.dispose();
fs.rmSync(root, { recursive: true, force: true });
console.log("SSH profile store smoke checks passed.");
