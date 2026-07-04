const timeTarget = document.querySelector("#local-time");
const toast = document.querySelector("#toast");
const copyButtons = document.querySelectorAll("[data-copy]");
const navItems = document.querySelectorAll("[data-page-target]");
const pages = document.querySelectorAll("[data-page]");
const fieldMap = new Map();
let systemRequestInFlight = false;
let ampRequestInFlight = false;
let lastAmpRefreshAt = 0;
let ampRendererReceiveCount = 0;
let latestAmpSnapshot = null;
const AMP_REFRESH_INTERVAL_MS = 5000;

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

  if (
    (pageName === "dashboard" || pageName === "amp" || pageName === "minecraft") &&
    Date.now() - lastAmpRefreshAt > AMP_REFRESH_INTERVAL_MS
  ) {
    refreshAmpDashboard();
  }
}

function getActivePageName() {
  return document.querySelector(".page.is-active")?.dataset.page || "dashboard";
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

function formatAmpVersion(summary) {
  return summary?.version || "Unavailable";
}

function formatAmpStatusLabel(snapshot) {
  const status = snapshot?.status || "unavailable";

  if (status === "connected") {
    return "Connected";
  }

  if (status === "auth_failed") {
    return "Auth failed";
  }

  if (status === "unreachable" || status === "error") {
    return "Unreachable";
  }

  if (status === "unconfigured") {
    return "Unconfigured";
  }

  return "Unavailable";
}

function findAmpValue(source, keys) {
  if (!source || typeof source !== "object") {
    return null;
  }

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }

  return null;
}

function unwrapAmpValue(value) {
  if (value && typeof value === "object" && Object.keys(value).length === 1 && value.result !== undefined) {
    return value.result;
  }

  return value;
}

function asAmpArray(value) {
  const unwrapped = unwrapAmpValue(value);

  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  if (!unwrapped || typeof unwrapped !== "object") {
    return [];
  }

  for (const key of ["AvailableInstances", "Instances", "InstanceStatuses", "Statuses", "Result", "result"]) {
    if (unwrapped[key] !== undefined) {
      return asAmpArray(unwrapped[key]);
    }
  }

  return Object.entries(unwrapped)
    .filter(([, item]) => item && typeof item === "object")
    .map(([mapKey, item]) => ({ mapKey, ...item }));
}

function normalizeAmpInstanceForRenderer(instance) {
  const name = findAmpValue(instance, ["name", "InstanceName", "FriendlyName", "Name", "DisplayName"]) || "AMP Instance";
  const moduleType =
    findAmpValue(instance, ["moduleType", "Module", "ModuleName", "ApplicationModule", "AppModule", "ModuleDisplayName"]) ||
    "Unknown";

  return {
    ...instance,
    id: findAmpValue(instance, ["id", "InstanceID", "InstanceId", "InstanceIdString", "Id", "ID", "Guid", "mapKey"]) || name,
    name,
    friendlyName: findAmpValue(instance, ["friendlyName", "FriendlyName"]),
    moduleType,
    isMinecraft:
      instance?.isMinecraft ??
      [name, moduleType, findAmpValue(instance, ["Target", "Type", "Application", "ApplicationName"])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes("minecraft"),
    state:
      findAmpValue(instance, ["state", "State", "Status", "ApplicationState", "DaemonState", "AppState", "InstanceState"]) ||
      "Unknown",
  };
}

function normalizeAmpSnapshotForRenderer(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return snapshot;
  }

  const instanceSource = Array.isArray(snapshot.instances) ? snapshot.instances : snapshot.AvailableInstances;
  const instances = asAmpArray(instanceSource);
  const normalizedInstances = instances.map(normalizeAmpInstanceForRenderer);
  const selectedInstance = snapshot.selectedInstance
    ? normalizeAmpInstanceForRenderer(snapshot.selectedInstance)
    : normalizedInstances.find((instance) => instance.name === snapshot.summary?.selectedInstanceName) || null;
  const minecraftInstances = Array.isArray(snapshot.minecraftInstances)
    ? snapshot.minecraftInstances.map(normalizeAmpInstanceForRenderer)
    : normalizedInstances.filter((instance) => instance.isMinecraft);

  return {
    ...snapshot,
    instanceCount: Number.isFinite(snapshot.instanceCount) ? snapshot.instanceCount : normalizedInstances.length,
    instances: normalizedInstances,
    selectedInstance,
    minecraftInstances,
  };
}

function formatAmpInstance(instance) {
  const name = instance?.name || "Unnamed";
  const moduleType = instance?.moduleType || "Unknown module";
  const id = instance?.id || "Unknown ID";
  const state = instance?.state || "Unknown";
  return `${name} (${moduleType}, ID ${id}, ${state})`;
}

function formatAmpInstances(snapshot, selectionText) {
  const instances = Array.isArray(snapshot?.instances) ? snapshot.instances : [];
  const instanceCount = Number.isFinite(snapshot?.instanceCount) ? snapshot.instanceCount : instances.length;

  if (instanceCount === 0) {
    return `0 instances · ${selectionText} · State: ${snapshot?.summary?.state || "Unavailable"}`;
  }

  const instanceDetails = instances.length > 0 ? ` · ${instances.map(formatAmpInstance).join(" · ")}` : "";
  return `${instanceCount} instance(s) · ${selectionText}${instanceDetails}`;
}

function formatMinecraftSelection(snapshot) {
  const selectedName = snapshot?.selectedInstance?.name || snapshot?.summary?.selectedInstanceName;
  const minecraftInstances = Array.isArray(snapshot?.minecraftInstances) ? snapshot.minecraftInstances : [];
  const minecraftCount = Number.isFinite(snapshot?.summary?.minecraftInstanceCount)
    ? snapshot.summary.minecraftInstanceCount
    : minecraftInstances.length;

  if (selectedName) {
    return `Selected: ${selectedName}`;
  }

  if (minecraftCount > 1) {
    const names = minecraftInstances.map((instance) => instance.name).filter(Boolean).join(", ");
    return `${minecraftCount} Minecraft instances; none selected${names ? ` (${names})` : ""}`;
  }

  if (minecraftCount === 1) {
    const name = minecraftInstances[0]?.name;
    return `1 Minecraft instance found; none selected${name ? ` (${name})` : ""}`;
  }

  return "No Minecraft auto-selection";
}

function formatAmpDiagnostics(diagnostics) {
  if (!diagnostics) {
    return "";
  }

  const status = diagnostics.httpStatus ? `HTTP ${diagnostics.httpStatus}` : "No HTTP status";
  const code = diagnostics.networkErrorCode || diagnostics.errorCode ? `Error ${diagnostics.networkErrorCode || diagnostics.errorCode}` : "No error code";
  const reachability = diagnostics.loginFailed
    ? "Login failed"
    : diagnostics.serverUnreachable
      ? "Server unreachable"
      : "Connected";
  const ampUrlLoaded = diagnostics.ampUrlLoaded ? "AMP_URL loaded" : "AMP_URL not loaded";
  const envStatus = diagnostics.envFileExists ? "env exists" : "env missing";
  const envError = diagnostics.envLoadErrorCode ? `env error ${diagnostics.envLoadErrorCode}` : "env load ok";
  const envPath = diagnostics.resolvedEnvPath ? `env ${diagnostics.resolvedEnvPath}` : "env path unavailable";
  const cwd = diagnostics.cwd ? `cwd ${diagnostics.cwd}` : "cwd unavailable";

  return ` · ${diagnostics.loadedAmpUrl || diagnostics.ampUrl || "AMP_URL unavailable"} · ${ampUrlLoaded} · ${envStatus} · ${envError} · ${envPath} · ${cwd} · ${status} · ${code} · ${reachability}`;
}

function formatAmpConnection(snapshot) {
  const status = snapshot?.status || snapshot?.connection?.status || "unavailable";

  if (status === "connected" || snapshot?.connected === true) {
    return "Connected: Connected to AMP.";
  }

  const label = snapshot?.connection?.label || "Unavailable";
  const message = snapshot?.connection?.message || snapshot?.message || "AMP unavailable.";
  return `${label}: ${message}${formatAmpDiagnostics(snapshot.diagnostics)}`;
}

function formatPlayerSummary(summary) {
  const players = Number.isFinite(summary?.playerCount) ? summary.playerCount : "Unavailable";
  const maxPlayers = Number.isFinite(summary?.maxPlayers) ? summary.maxPlayers : "Unavailable";
  const tps = Number.isFinite(summary?.tps) ? summary.tps.toFixed(1) : "Unavailable";
  return `Players: ${players}/${maxPlayers} · TPS: ${tps}`;
}

function formatMinecraftInstanceName(snapshot) {
  const selectedInstance = snapshot?.selectedInstance;
  const selectedName = selectedInstance?.friendlyName || selectedInstance?.name || snapshot?.summary?.selectedInstanceName;

  if (!selectedName) {
    return "Unavailable";
  }

  const moduleType = selectedInstance?.moduleType;
  return moduleType ? `${selectedName} · ${moduleType}` : selectedName;
}

function formatMinecraftPlayers(summary) {
  const players = Number.isFinite(summary?.playerCount) ? summary.playerCount : "Unavailable";
  const maxPlayers = Number.isFinite(summary?.maxPlayers) ? summary.maxPlayers : "Unavailable";
  return `${players} / ${maxPlayers}`;
}

function formatMinecraftTps(summary) {
  return Number.isFinite(summary?.tps) ? summary.tps.toFixed(1) : "Unavailable";
}

function formatMinecraftRam(summary) {
  return Number.isFinite(summary?.ramUsage) ? `${summary.ramUsage.toFixed(1)} MB` : "Unavailable";
}

function formatMinecraftCpu(summary) {
  return formatPercent(summary?.cpuUsage);
}

function formatMinecraftPorts(summary) {
  return Array.isArray(summary?.ports) && summary.ports.length > 0 ? summary.ports.join(", ") : "Unavailable";
}

function formatMinecraftUptime(summary) {
  return Number.isFinite(summary?.uptime) ? formatDuration(summary.uptime) : "Unavailable";
}

function setMinecraftPageFields(fields) {
  setField("minecraftPageStatus", fields.status);
  setField("minecraftPageSelectedInstance", fields.selection);
  setField("minecraftPageInstance", fields.instance);
  setField("minecraftPagePlayers", fields.players);
  setField("minecraftPageTps", fields.tps);
  setField("minecraftPageRam", fields.ram);
  setField("minecraftPageCpu", fields.cpu);
  setField("minecraftPageVersion", fields.version);
  setField("minecraftPagePorts", fields.ports);
  setField("minecraftPageUptime", fields.uptime);
}

function setMinecraftPageUnavailable(status, selection) {
  setMinecraftPageFields({
    status,
    selection,
    instance: "Unavailable",
    players: "Unavailable",
    tps: "Unavailable",
    ram: "Unavailable",
    cpu: "Unavailable",
    version: "Unavailable",
    ports: "Unavailable",
    uptime: "Unavailable",
  });
}

function logAmpRendererReceive(snapshot) {
  console.log("[AnxHub][AMP renderer state]", {
    amp: {
      status: snapshot?.status || "missing",
      instanceCount: Number.isFinite(snapshot?.instanceCount)
        ? snapshot.instanceCount
        : Array.isArray(snapshot?.instances)
          ? snapshot.instances.length
          : 0,
      selectedInstance: snapshot?.selectedInstance ? { name: snapshot.selectedInstance.name || null } : null,
      diagnostics: snapshot?.diagnostics ? { errorCode: snapshot.diagnostics.errorCode || null } : null,
    },
  });
}

function renderAmpSnapshot(snapshot) {
  if (!snapshot?.configured) {
    setField("ampStatus", "Unconfigured");
    setField("ampConnection", "AMP is not configured. Set AMP_URL, AMP_USERNAME, and AMP_PASSWORD in .env.");
    setField("ampInstances", "No AMP data loaded.");
    setField("ampPlayers", "Player count unavailable.");
    setField("ampUsage", "AMP usage unavailable.");
    setField("ampRuntime", "Unavailable");
    setField("ampVersion", "Unavailable");
    setField("ampDashboardConnection", "AMP is not configured.");
    setField("ampDashboardStatus", "Unconfigured");
    setField("ampDashboardInstances", "Unavailable");
    setField("ampDashboardUsage", "Unavailable");
    setField("minecraftDashboardSelection", "Unavailable");
    setField("minecraftDashboardPlayers", "Unavailable");
    setField("minecraftDashboardRuntime", "Unavailable");
    setField("minecraftDashboardVersion", "Unavailable");
    setMinecraftPageUnavailable("Unconfigured", "AMP is not configured. Set AMP_URL, AMP_USERNAME, and AMP_PASSWORD in .env.");
    return;
  }

  const selectionText = formatMinecraftSelection(snapshot);
  const connectionText = formatAmpConnection(snapshot);
  const instancesText = formatAmpInstances(snapshot, selectionText);
  const usageText = formatAmpUsage(snapshot.summary);
  const runtimeText = formatAmpRuntime(snapshot.summary);
  const versionText = formatAmpVersion(snapshot.summary);
  const playersText = formatPlayerSummary(snapshot.summary);
  const statusText = formatAmpStatusLabel(snapshot);

  setField(
    "ampConnection",
    connectionText,
  );
  setField("ampStatus", statusText);
  setField(
    "ampInstances",
    instancesText,
  );
  setField("ampUsage", usageText);
  setField("ampRuntime", runtimeText);
  setField("ampVersion", versionText);
  setField("ampDashboardConnection", connectionText);
  setField("ampDashboardStatus", statusText);
  setField("ampDashboardInstances", instancesText);
  setField("ampDashboardUsage", usageText);
  setField("minecraftDashboardSelection", selectionText);
  setField("minecraftDashboardPlayers", playersText);
  setField("minecraftDashboardRuntime", runtimeText);
  setField("minecraftDashboardVersion", versionText);
  setMinecraftPageFields({
    status: snapshot.summary?.state || statusText,
    selection: selectionText,
    instance: formatMinecraftInstanceName(snapshot),
    players: formatMinecraftPlayers(snapshot.summary),
    tps: formatMinecraftTps(snapshot.summary),
    ram: formatMinecraftRam(snapshot.summary),
    cpu: formatMinecraftCpu(snapshot.summary),
    version: versionText,
    ports: formatMinecraftPorts(snapshot.summary),
    uptime: formatMinecraftUptime(snapshot.summary),
  });

  setField("ampPlayers", `${playersText} · ${versionText} · ${runtimeText}`);
}

async function refreshAmpDashboard() {
  if (ampRequestInFlight || !window.anxhub?.amp?.getSnapshot) {
    return;
  }

  const activePage = getActivePageName();
  if (lastAmpRefreshAt > 0 && activePage !== "dashboard" && activePage !== "amp" && activePage !== "minecraft") {
    return;
  }

  ampRequestInFlight = true;

  try {
    const snapshot = normalizeAmpSnapshotForRenderer(await window.anxhub.amp.getSnapshot());
    latestAmpSnapshot = snapshot;
    ampRendererReceiveCount += 1;
    logAmpRendererReceive(latestAmpSnapshot);
    renderAmpSnapshot(latestAmpSnapshot);
    lastAmpRefreshAt = Date.now();
  } catch {
    latestAmpSnapshot = null;
    setField("ampConnection", "AMP API unavailable.");
    setField("ampStatus", "Unavailable");
    setField("ampInstances", "Unavailable");
    setField("ampPlayers", "Unavailable");
    setField("ampUsage", "Unavailable");
    setField("ampRuntime", "Unavailable");
    setField("ampVersion", "Unavailable");
    setField("ampDashboardConnection", "AMP API unavailable.");
    setField("ampDashboardStatus", "Unavailable");
    setField("ampDashboardInstances", "Unavailable");
    setField("ampDashboardUsage", "Unavailable");
    setField("minecraftDashboardSelection", "Unavailable");
    setField("minecraftDashboardPlayers", "Unavailable");
    setField("minecraftDashboardRuntime", "Unavailable");
    setField("minecraftDashboardVersion", "Unavailable");
    setMinecraftPageUnavailable("Unavailable", "AMP API unavailable.");
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
registerRefreshTask(refreshAmpDashboard, AMP_REFRESH_INTERVAL_MS);
