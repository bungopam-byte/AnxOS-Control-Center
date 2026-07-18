const assert = require("assert");
const zlib = require("zlib");

const backup = require("../agent/src/services/backupService")._test;

function archive(entries) {
  const chunks = [];
  for (const entry of entries) {
    const data = Buffer.from(entry.data || "");
    chunks.push(backup.createTarHeader({ name: entry.name, type: entry.type || "file", size: data.length }));
    if (entry.type !== "directory") chunks.push(data, backup.padTarData(data));
  }
  chunks.push(Buffer.alloc(1024));
  return zlib.gzipSync(Buffer.concat(chunks));
}

const valid = archive([{ name: "config.json", data: "{}" }]);
assert.strictEqual(backup.parseTarEntries(valid).entries.length, 1);
assert.throws(
  () => backup.parseTarEntries(valid, { maxArchiveBytes: valid.length - 1 }),
  (error) => error?.code === "BACKUP_ARCHIVE_LIMIT_EXCEEDED",
);
assert.throws(
  () => backup.parseTarEntries(valid, { maxEntryBytes: 1 }),
  (error) => error?.code === "BACKUP_ARCHIVE_LIMIT_EXCEEDED",
);
assert.throws(
  () => backup.parseTarEntries(archive([{ name: "a", type: "directory" }, { name: "b", type: "directory" }]), { maxEntryCount: 1 }),
  (error) => error?.code === "BACKUP_ARCHIVE_LIMIT_EXCEEDED",
);
assert.throws(
  () => backup.parseTarEntries(valid, { maxCompressionRatio: 1, compressionCheckMinBytes: 1 }),
  (error) => error?.code === "BACKUP_ARCHIVE_COMPRESSION_UNSAFE",
);

const corruptedTar = zlib.gunzipSync(valid);
corruptedTar[0] ^= 1;
assert.throws(
  () => backup.parseTarEntries(zlib.gzipSync(corruptedTar)),
  (error) => error?.code === "BACKUP_ARCHIVE_CHECKSUM_INVALID",
);

console.log("Backup archive limit smoke checks passed.");
