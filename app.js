const timeTarget = document.querySelector("#local-time");
const toast = document.querySelector("#toast");
const copyButtons = document.querySelectorAll("[data-copy]");
const navItems = document.querySelectorAll("[data-page-target]");
const pages = document.querySelectorAll("[data-page]");
const fieldMap = new Map();
let systemRequestInFlight = false;
let ampRequestInFlight = false;

document.querySelectorAll("[data-field]").forEach((field) => {
  const fields = fieldMap.get(field.dataset.field) || [];
  fields.push(field);
  fieldMap.set(field.dataset.field, fields);
});

function setField(name, value) {
  (fieldMap.get(name) || []).forEach((field) => {
    field.textContent = value;
  });
}

function showPage(pageName) {
  navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.pageTarget === pageName);
  });

  pages.forEach((page) => {
    page.classList.toggle("is-active", page.dataset.page === pageName);
  });
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : "Unavailable";
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "Unavailable";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) {
    return "Unavailable";
  }

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function updateLocalTime() {
  const now = new Date();
  timeTarget.textContent = now.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderSnapshot(snapshot) {
  const timestamp = new Date(snapshot.currentTime);

  timeTarget.textContent = timestamp.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  setField("hostname", snapshot.hostname || "Unavailable");
  setField("osVersion", snapshot.osVersion || "Unavailable");
  setField("platform", snapshot.platform || "Unavailable");
  setField("cpuUsage", formatPercent(snapshot.cpu?.usagePercent));
  setField("cpuModel", snapshot.cpu?.model || "Unavailable");
  setField("cpuCores", Number.isFinite(snapshot.cpu?.cores) ? `${snapshot.cpu.cores}` : "Unavailable");
  setField("memoryUsage", `${formatPercent(snapshot.memory?.percent)} (${formatBytes(snapshot.memory?.used)} / ${formatBytes(snapshot.memory?.total)})`);
  setField("memoryAvailable", formatBytes(snapshot.memory?.free));
  setField("memoryTotal", formatBytes(snapshot.memory?.total));

  if (snapshot.disk) {
    setField("diskUsage", `${formatPercent(snapshot.disk.percent)} (${formatBytes(snapshot.disk.used)} / ${formatBytes(snapshot.disk.total)})`);
    setField("diskFree", formatBytes(snapshot.disk.free));
    setField("diskMount", snapshot.disk.mount || "Unavailable");
    setField("diskTotal", formatBytes(snapshot.disk.total));
  } else {
    setField("diskUsage", "Unavailable");
    setField("diskFree", "Unavailable");
    setField("diskMount", "Unavailable");
    setField("diskTotal", "Unavailable");
  }

  if (snapshot.network) {
    setField(
      "networkUsage",
      `Down ${formatBytes(snapshot.network.downloadPerSecond)}/s · Up ${formatBytes(snapshot.network.uploadPerSecond)}/s`,
    );
    setField("networkDownload", `${formatBytes(snapshot.network.downloadPerSecond)}/s`);
    setField("networkUpload", `${formatBytes(snapshot.network.uploadPerSecond)}/s`);
    setField("networkTotalDownload", formatBytes(snapshot.network.totalDownload));
    setField("networkTotalUpload", formatBytes(snapshot.network.totalUpload));
  } else {
    setField("networkUsage", "Unavailable");
    setField("networkDownload", "Unavailable");
    setField("networkUpload", "Unavailable");
    setField("networkTotalDownload", "Unavailable");
    setField("networkTotalUpload", "Unavailable");
  }

  setField("uptime", formatDuration(snapshot.uptimeSeconds));
  setField(
    "temperature",
    Number.isFinite(snapshot.cpu?.temperatureCelsius) ? `${snapshot.cpu.temperatureCelsius.toFixed(1)}°C` : "Unavailable",
  );
}

function formatAmpUsage(summary) {
  const cpu = formatPercent(summary?.cpuUsage);
  const ram = Number.isFinite(summary?.ramUsage) ? `${summary.ramUsage.toFixed(1)} MB RAM` : "RAM unavailable";
  return `AMP CPU ${cpu} · ${ram}`;
}

function formatAmpRuntime(summary) {
  const ports = Array.isArray(summary?.ports) && summary.ports.length > 0 ? summary.ports.join(", ") : "Ports unavailable";
  const uptime = Number.isFinite(summary?.uptime) ? formatDuration(summary.uptime) : "Uptime unavailable";
  return `${ports} · ${uptime}`;
}

function formatAmpDiagnostics(diagnostics) {
  if (!diagnostics) {
    return "";
  }

  const status = diagnostics.httpStatus ? `HTTP ${diagnostics.httpStatus}` : "No HTTP status";
  const code = diagnostics.errorCode ? `Error ${diagnostics.errorCode}` : "No error code";
  const reachability = diagnostics.loginFailed
    ? "Login failed"
    : diagnostics.serverUnreachable
      ? "Server unreachable"
      : "Connected";

  return ` · ${diagnostics.ampUrl || "AMP_URL unavailable"} · ${status} · ${code} · ${reachability}`;
}

function renderAmpSnapshot(snapshot) {
  if (!snapshot?.configured) {
    setField("ampStatus", "Unconfigured");
    setField("ampConnection", "AMP is not configured. Set AMP_URL, AMP_USERNAME, and AMP_PASSWORD in .env.");
    setField("ampInstances", "No AMP data loaded.");
    setField("ampPlayers", "Player count unavailable.");
    setField("ampUsage", "AMP usage unavailable.");
    return;
  }

  const selectedName = snapshot.summary?.selectedInstanceName;
  const minecraftCount = Number.isFinite(snapshot.summary?.minecraftInstanceCount) ? snapshot.summary.minecraftInstanceCount : 0;
  const selectionText = selectedName
    ? selectedName
    : minecraftCount > 1
      ? `${minecraftCount} Minecraft instances; none selected`
      : "No Minecraft auto-selection";

  setField(
    "ampConnection",
    `${snapshot.connected ? "AMP API connected." : snapshot.message || "AMP unavailable."}${formatAmpDiagnostics(snapshot.diagnostics)}`,
  );
  setField("ampStatus", snapshot.connection?.message || snapshot.message || "Unavailable");
  setField(
    "ampInstances",
    `${snapshot.instances.length} instance(s) · ${selectionText} · State: ${snapshot.summary?.state || "Unknown"}`,
  );
  setField("ampUsage", formatAmpUsage(snapshot.summary));

  const players = Number.isFinite(snapshot.summary?.playerCount) ? snapshot.summary.playerCount : "Unavailable";
  const maxPlayers = Number.isFinite(snapshot.summary?.maxPlayers) ? snapshot.summary.maxPlayers : "Unavailable";
  const tps = Number.isFinite(snapshot.summary?.tps) ? snapshot.summary.tps.toFixed(1) : "Unavailable";
  const version = snapshot.summary?.version || "Version unavailable";
  setField("ampPlayers", `Players: ${players}/${maxPlayers} · TPS: ${tps} · ${version} · ${formatAmpRuntime(snapshot.summary)}`);
}

async function refreshAmpDashboard() {
  if (ampRequestInFlight || !window.anxhub?.amp?.getSnapshot) {
    return;
  }

  ampRequestInFlight = true;

  try {
    renderAmpSnapshot(await window.anxhub.amp.getSnapshot());
  } catch {
    setField("ampConnection", "AMP API unavailable.");
  } finally {
    ampRequestInFlight = false;
  }
}

async function refreshDashboard() {
  if (systemRequestInFlight || !window.anxhub?.system?.getSnapshot) {
    setField("osVersion", "Desktop API unavailable");
    return;
  }

  systemRequestInFlight = true;

  try {
    renderSnapshot(await window.anxhub.system.getSnapshot());
  } catch {
    showToast("System metrics are unavailable.");
  } finally {
    systemRequestInFlight = false;
  }
}

function registerRefreshTask(callback, intervalMs) {
  window.setInterval(callback, intervalMs);
  callback();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast("Copied Minecraft address.");
  } catch {
    showToast(value);
  }
}

copyButtons.forEach((button) => {
  button.addEventListener("click", () => copyText(button.dataset.copy));
});

navItems.forEach((item) => {
  item.addEventListener("click", () => showPage(item.dataset.pageTarget));
});

registerRefreshTask(updateLocalTime, 30000);
registerRefreshTask(refreshDashboard, 1000);
registerRefreshTask(refreshAmpDashboard, 5000);
