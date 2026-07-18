function normalizeDiskEvidence(snapshot = {}) {
  const disk = snapshot.disk || snapshot.storage || snapshot.filesystem || snapshot.rootDisk || null;
  if (!disk || typeof disk !== "object") {
    return { status: "not_available", message: "Agent system snapshot did not include disk metrics." };
  }
  const freeBytes = Number(disk.free ?? disk.freeBytes ?? disk.available ?? disk.availableBytes ?? disk.availBytes);
  const totalBytes = Number(disk.total ?? disk.totalBytes ?? disk.size ?? disk.sizeBytes);
  const usedPercent = Number(disk.percent ?? disk.usagePercent ?? disk.usedPercent);
  return {
    status: Number.isFinite(freeBytes) || Number.isFinite(totalBytes) || Number.isFinite(usedPercent) ? "available" : "not_available",
    freeBytes: Number.isFinite(freeBytes) ? freeBytes : null,
    totalBytes: Number.isFinite(totalBytes) ? totalBytes : null,
    usedPercent: Number.isFinite(usedPercent) ? usedPercent : null,
    mount: disk.mount || disk.mountPoint || disk.path || disk.target || null,
  };
}

module.exports = { normalizeDiskEvidence };
