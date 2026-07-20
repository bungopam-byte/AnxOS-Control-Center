const assert = require("assert");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

async function main() {
  const testRoot = await fs.mkdtemp(path.join(os.tmpdir(), "anx-instance-files-"));
  const instanceRoot = path.join(testRoot, "instances");
  const outsideRoot = path.join(testRoot, "outside");
  const previousRoot = process.env.AGENT_INSTANCE_ROOT;
  process.env.AGENT_INSTANCE_ROOT = instanceRoot;
  const servicePath = require.resolve("../agent/src/services/instances/instanceService");
  delete require.cache[servicePath];
  const instanceService = require(servicePath);

  try {
    await fs.mkdir(outsideRoot, { recursive: true });
    await instanceService.createInstance({
      id: "file-security-smoke",
      displayName: "File Security Smoke",
      type: "custom-command",
      executable: "node",
      args: ["-e", "setInterval(() => {}, 1000)"],
    });
    const dataRoot = path.join(instanceRoot, "file-security-smoke", "data");
    const escapeLink = path.join(dataRoot, "escape");
    let symlinkCreated = false;
    try {
      await fs.symlink(outsideRoot, escapeLink);
      symlinkCreated = true;
    } catch (error) {
      if (process.platform === "win32" && ["EPERM", "EACCES"].includes(error?.code)) {
        console.warn(`Skipping instance symlink-escape fixture: Windows symlink capability unavailable (${error.code}).`);
      } else {
        throw error;
      }
    }

    if (symlinkCreated) {
      await assert.rejects(
        instanceService.writeInstanceFile("file-security-smoke", "escape/created/file.txt", "blocked"),
        (error) => error?.code === "PATH_NOT_ALLOWED",
        "Writes through an instance-data symlink must be rejected.",
      );
      await assert.rejects(fs.stat(path.join(outsideRoot, "created")), { code: "ENOENT" });

      const listing = await instanceService.listInstanceFiles("file-security-smoke", ".");
      const linkEntry = listing.entries.find((entry) => entry.name === "escape");
      assert.strictEqual(linkEntry?.type, "symlink", "Instance listings must not follow symlinks for metadata.");
      assert.strictEqual(linkEntry?.size, null, "Instance listings must not expose target size through symlinks.");
    }

    await instanceService.writeInstanceFile("file-security-smoke", "atomic.txt", "first");
    await instanceService.writeInstanceFile("file-security-smoke", "atomic.txt", "second");
    assert.strictEqual(await fs.readFile(path.join(dataRoot, "atomic.txt"), "utf8"), "second");
    assert.deepStrictEqual(
      (await fs.readdir(dataRoot)).filter((name) => name.includes("atomic.txt") && name.endsWith(".tmp")),
      [],
      "Atomic instance writes must not leave temporary files behind.",
    );

    console.log("Instance file security smoke checks passed.");
  } finally {
    instanceService.disposeInstanceService();
    if (previousRoot === undefined) delete process.env.AGENT_INSTANCE_ROOT;
    else process.env.AGENT_INSTANCE_ROOT = previousRoot;
    delete require.cache[servicePath];
    await fs.rm(testRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
