#!/usr/bin/env node
const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { UpdateManager, pickUpdateAsset, verifyUpdateArtifact } = require("../src/services/updateManager");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anx-update-download-"));
  const payload = Buffer.from("verified update artifact\n".repeat(4096));
  const sha256 = crypto.createHash("sha256").update(payload).digest("hex");
  let slowInterval = null;
  const server = http.createServer((request, response) => {
    if (request.url === "/slow") {
      response.writeHead(200, { "Content-Length": payload.length * 100 });
      slowInterval = setInterval(() => response.write(payload.subarray(0, 128)), 10);
      response.on("close", () => {
        clearInterval(slowInterval);
        slowInterval = null;
      });
      return;
    }
    response.writeHead(200, { "Content-Length": payload.length });
    response.end(payload);
  });
  const port = await listen(server);
  const manager = new UpdateManager();

  manager.log("redaction fixture", { url: "https://user:password@example.invalid/update?token=secret-value", stack: "secret stack" });
  const serializedLogs = JSON.stringify(manager.getState().logs);
  assert(!serializedLogs.includes("password") && !serializedLogs.includes("secret-value"), "renderer-visible update logs must redact credentials.");
  assert(!serializedLogs.includes("secret stack"), "renderer-visible update logs must omit stack traces.");

  try {
    const committedPath = path.join(root, "update.bin");
    await manager.downloadFile(`http://127.0.0.1:${port}/artifact`, committedPath, {
      size: payload.length,
      sha256,
    });
    assert.deepStrictEqual(fs.readFileSync(committedPath), payload, "verified downloads must be committed intact.");
    assert.deepStrictEqual(fs.readdirSync(root), ["update.bin"], "successful downloads must not leave temporary files.");
    await verifyUpdateArtifact(committedPath, { size: payload.length, sha256 });
    fs.appendFileSync(committedPath, "tampered");
    await assert.rejects(
      verifyUpdateArtifact(committedPath, { size: payload.length, sha256 }),
      (error) => error?.code === "UPDATE_ARTIFACT_SIZE_MISMATCH",
      "install handoff must reject an artifact changed after download.",
    );
    fs.writeFileSync(committedPath, payload);

    const mismatchPath = path.join(root, "mismatch.bin");
    await assert.rejects(
      manager.downloadFile(`http://127.0.0.1:${port}/artifact`, mismatchPath, {
        size: payload.length,
        sha256: "0".repeat(64),
      }),
      (error) => error?.code === "UPDATE_CHECKSUM_MISMATCH",
      "checksum mismatches must reject the artifact.",
    );
    assert(!fs.existsSync(mismatchPath), "checksum failures must not expose a final artifact.");

    const existingPath = path.join(root, "existing.bin");
    fs.writeFileSync(existingPath, "existing user file\n");
    await assert.rejects(
      manager.downloadFile(`http://127.0.0.1:${port}/artifact`, existingPath, {
        size: payload.length,
        sha256,
      }),
      (error) => error?.code === "UPDATE_DOWNLOAD_COMMIT_FAILED",
      "an existing destination must reject atomic commit.",
    );
    assert.strictEqual(fs.readFileSync(existingPath, "utf8"), "existing user file\n", "update downloads must never overwrite an existing file.");

    const cancelledPath = path.join(root, "cancelled.bin");
    const cancellation = manager.downloadFile(`http://127.0.0.1:${port}/slow`, cancelledPath, {
      size: payload.length * 100,
      sha256,
    });
    await new Promise((resolve) => setTimeout(resolve, 40));
    manager.stop();
    await assert.rejects(cancellation, (error) => error?.code === "UPDATE_CANCELLED", "shutdown must cancel the underlying download.");
    assert(!fs.existsSync(cancelledPath), "cancelled downloads must not expose a final artifact.");
    assert(!fs.readdirSync(root).some((name) => name.endsWith(".part")), "cancelled downloads must clean temporary files.");

    const compatibleName = process.platform === "win32" ? "update.exe" : process.platform === "linux" ? "update.AppImage" : "update.dmg";
    const incompatibleName = process.platform === "win32" ? "update.AppImage" : "update.exe";
    const asset = (name, architecture = process.arch) => ({ name, size: 10 * 1024 * 1024, architecture, browser_download_url: `https://example.invalid/${name}` });
    assert.strictEqual(pickUpdateAsset({ assets: [asset(incompatibleName)] }), null, "asset selection must reject another operating system.");
    assert.strictEqual(pickUpdateAsset({ assets: [asset(compatibleName, process.arch === "x64" ? "arm64" : "x64")] }), null, "asset selection must reject another architecture.");
    assert.strictEqual(pickUpdateAsset({ assets: [asset(compatibleName)] })?.name, compatibleName, "asset selection must accept the current platform and architecture.");
  } finally {
    if (slowInterval) clearInterval(slowInterval);
    await close(server);
    fs.rmSync(root, { recursive: true, force: true });
  }

  console.log("Update download safety smoke passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
