const assert = require("assert");
const { CLASSIFICATIONS, LABELS, classifyServerCompatibility } = require("../src/shared/marketplaceServerCompatibility");
const curseforgeProvider = require("../src/services/providers/curseforgeProvider");

const NOW = new Date("2026-07-17T12:00:00.000Z");
const registry = (records = []) => ({ schemaVersion: 1, maxAgeDays: 180, records });
const classify = (input, records = []) => classifyServerCompatibility({ provider: "curseforge", ...input }, { registry: registry(records), now: NOW });

const official = classify({ projectId: 1, fileId: 10, serverPackFileId: 11 });
assert.strictEqual(official.classification, CLASSIFICATIONS.OFFICIAL_SERVER_PACK, "Official server-pack metadata must win.");
assert.strictEqual(official.recommendedFileId, 11, "The official server pack must be recommended instead of the selected client file.");

const declared = classify({ projectId: 2, serverCompatible: true });
assert.strictEqual(declared.classification, CLASSIFICATIONS.SERVER_COMPATIBLE, "Provider-declared compatibility must be preserved.");

const clientOnly = classify({ projectId: 396246, slug: "fabulously-optimized" }, [{ provider: "curseforge", projectId: "396246", classification: "CLIENT_ONLY", status: "certified", lastValidatedAt: "2026-07-01", evidence: "Manually validated as client-only." }]);
assert.strictEqual(clientOnly.classification, CLASSIFICATIONS.CLIENT_ONLY, "Known client-only optimization packs must be registry-driven.");
assert.strictEqual(clientOnly.installable, false, "Client-only projects must not be installable.");

const manual = classify({ projectId: 3, serverCompatible: false }, [{ provider: "curseforge", projectId: 3, classification: "VERIFIED", status: "certified", lastValidatedAt: "2026-07-01", evidence: "A dedicated server pack was installed and validated." }]);
assert.strictEqual(manual.classification, CLASSIFICATIONS.VERIFIED, "Current manual certification must override conflicting provider evidence.");
assert.strictEqual(manual.certification.lastValidatedAt, "2026-07-01");

const stale = classify({ projectId: 4 }, [{ provider: "curseforge", projectId: 4, classification: "VERIFIED", status: "certified", lastValidatedAt: "2020-01-01", evidence: "Old validation." }]);
assert.notStrictEqual(stale.classification, CLASSIFICATIONS.VERIFIED, "Stale certification must not claim verified status.");
assert.strictEqual(stale.certification.status, "stale");

const conflict = classify({ projectId: 5, serverPackFileId: 51 }, [{ provider: "curseforge", projectId: 5, classification: "CLIENT_ONLY", status: "certified", lastValidatedAt: "2026-07-01", evidence: "Manual validation found client-only behavior." }]);
assert.strictEqual(conflict.classification, CLASSIFICATIONS.CLIENT_ONLY, "Fresh certification must win over conflicting provider metadata.");

const missing = classify({ projectId: 6 });
assert.strictEqual(missing.classification, CLASSIFICATIONS.UNKNOWN, "Missing metadata must remain unknown.");

const misleadingFilename = classify({ projectId: 7, fileId: 70, fileName: "Definitely Official Server Pack.zip" });
assert.strictEqual(misleadingFilename.classification, CLASSIFICATIONS.UNKNOWN, "A filename alone must never establish server compatibility.");
assert.strictEqual(misleadingFilename.recommendedFileId, null, "A client archive must not become a server pack because of its filename.");

const unsupported = classify({ projectId: 8, loaders: ["liteloader"] });
assert.strictEqual(unsupported.classification, CLASSIFICATIONS.UNSUPPORTED, "Unsupported loader/runtime must block installation.");
assert.strictEqual(unsupported.installable, false);

const rawProject = { id: 9, name: "Consistent Pack", latestFilesIndexes: [{ gameVersion: "1.20.1", modLoader: 4 }], serverCapable: true };
const listing = curseforgeProvider._test.normalizeMod(rawProject).serverCompatibility;
const preflight = classify({ projectId: 9, loaders: ["fabric"], serverCapable: true });
assert.strictEqual(listing.classification, preflight.classification, "Listing and install-preflight classification must be consistent.");

assert.deepStrictEqual(Object.values(LABELS), ["Verified Server Pack", "Official Server Pack", "Server Compatible", "Likely Server Compatible", "Compatibility Unknown", "Client Only", "Unsupported"]);
console.log("Marketplace server compatibility smoke checks passed.");
