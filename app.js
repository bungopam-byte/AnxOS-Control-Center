const timeTarget = document.querySelector("#local-time");
const toast = document.querySelector("#toast");
const copyButtons = document.querySelectorAll("[data-copy]");
const navItems = document.querySelectorAll("[data-page-target]");
const pages = document.querySelectorAll("[data-page]");
const consoleSearchInput = document.querySelector("[data-console-search]");
const consoleAutoscrollInput = document.querySelector("[data-console-autoscroll]");
const consolePauseInput = document.querySelector("[data-console-pause]");
const consoleClearButton = document.querySelector("[data-console-clear]");
const consoleCopyButton = document.querySelector("[data-console-copy]");
const consoleCountTarget = document.querySelector("[data-console-count]");
const consoleViewer = document.querySelector("[data-console-viewer]");
const consoleLogList = document.querySelector("[data-console-log-list]");
const consoleEmptyState = document.querySelector("[data-console-empty]");
const startupScreen = document.querySelector("[data-startup-screen]");
const startupAudioElement = document.querySelector("[data-startup-audio]");
const appShell = document.querySelector("[data-app-shell]");
const appNameTargets = document.querySelectorAll("[data-app-name]");
const sidebarTitleTarget = document.querySelector("[data-sidebar-title]");
const startupMessage = document.querySelector("[data-startup-message]");
const startupDetail = document.querySelector("[data-startup-detail]");
const startupSteps = {
  app: document.querySelector('[data-startup-step="app"]'),
  services: document.querySelector('[data-startup-step="services"]'),
  metrics: document.querySelector('[data-startup-step="metrics"]'),
  control: document.querySelector('[data-startup-step="control"]'),
};
const sshTerminalCard = document.querySelector(".ssh-terminal-card");
const sshTerminalWindow = document.querySelector("[data-ssh-terminal]");
const sshOutputList = document.querySelector("[data-ssh-output]");
const sshCopyButton = document.querySelector("[data-ssh-copy]");
const sshClearButton = document.querySelector("[data-ssh-clear]");
const sshFullscreenButton = document.querySelector("[data-ssh-fullscreen]");
const sshAutoscrollInput = document.querySelector("[data-ssh-autoscroll]");
const settingsForm = document.querySelector("[data-settings-form]");
const settingsInputs = document.querySelectorAll("[data-setting]");
const settingsResetButton = document.querySelector("[data-settings-reset]");
const aboutFields = document.querySelectorAll("[data-about-field]");
const fieldMap = new Map();
let systemRequestInFlight = false;
let ampRequestInFlight = false;
let lastAmpRefreshAt = 0;
let ampRendererReceiveCount = 0;
let latestAmpSnapshot = null;
const AMP_REFRESH_INTERVAL_MS = 5000;
const STARTUP_FALLBACK_MS = 4200;
const STARTUP_MINIMUM_MS = 2000;
const SETTINGS_STORAGE_KEY = "anxos.settings.v1";
const DEFAULT_APP_NAME = "AnxOS Control Center";
const DEFAULT_ACCENT_COLOR = "#b66cff";
const DEFAULT_SETTINGS = {
  "app.displayName": DEFAULT_APP_NAME,
  "appearance.accentColor": DEFAULT_ACCENT_COLOR,
  "startup.enabled": true,
  "startup.minimumDurationMs": STARTUP_MINIMUM_MS,
  "startup.sound": true,
  "startup.soundVolume": 42,
  "general.defaultPage": "dashboard",
  "amp.url": "",
  "amp.username": "",
  "minecraft.defaultAddress": "",
  "playit.address": "",
  "developer.debugMode": false,
};
const startupState = {
  startedAt: Date.now(),
  systemReady: false,
  sequenceReady: false,
  finished: false,
};
const startupAudio = {
  context: null,
  gain: null,
  oscillators: [],
  timer: null,
  elementFadeTimer: null,
  usingElement: false,
};

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

function setStartupStep(name, status) {
  const step = startupSteps[name];

  if (!step) {
    return;
  }

  step.classList.toggle("is-active", status === "active");
  step.classList.toggle("is-complete", status === "complete");
}

function updateStartupMessage(message, detail) {
  if (startupMessage) {
    startupMessage.textContent = message;
  }

  if (startupDetail) {
    startupDetail.textContent = detail;
  }
}

function readStoredSettings() {
  try {
    const storedSettings = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}");
    const migratedSettings = {
      ...DEFAULT_SETTINGS,
      ...storedSettings,
    };

    if (storedSettings["general.startupSound"] !== undefined && storedSettings["startup.sound"] === undefined) {
      migratedSettings["startup.sound"] = storedSettings["general.startupSound"];
    }

    if (storedSettings["server.ampUrl"] && !storedSettings["amp.url"]) {
      migratedSettings["amp.url"] = storedSettings["server.ampUrl"];
    }

    if (storedSettings["server.playitAddress"] && !storedSettings["playit.address"]) {
      migratedSettings["playit.address"] = storedSettings["server.playitAddress"];
    }

    if (storedSettings["server.minecraftName"] && !storedSettings["minecraft.defaultAddress"]) {
      migratedSettings["minecraft.defaultAddress"] = storedSettings["server.minecraftName"];
    }

    return migratedSettings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function isStartupSoundEnabled() {
  return readStoredSettings()["startup.sound"] !== false;
}

function isStartupSplashEnabled() {
  return readStoredSettings()["startup.enabled"] !== false;
}

function normalizeNumber(value, fallback, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(Math.max(number, min), max);
}

function getStartupMinimumMs() {
  return normalizeNumber(readStoredSettings()["startup.minimumDurationMs"], STARTUP_MINIMUM_MS, 0, 15000);
}

function getStartupSoundVolume() {
  return normalizeNumber(readStoredSettings()["startup.soundVolume"], 42, 0, 100) / 100;
}

function hexToRgba(hex, alpha) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : DEFAULT_ACCENT_COLOR;
  const red = parseInt(normalized.slice(1, 3), 16);
  const green = parseInt(normalized.slice(3, 5), 16);
  const blue = parseInt(normalized.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getSafePageName(pageName) {
  return Array.from(pages).some((page) => page.dataset.page === pageName) ? pageName : DEFAULT_SETTINGS["general.defaultPage"];
}

function getSidebarTitle(displayName) {
  return displayName;
}

function applySettings(settings, options = {}) {
  const displayName = String(settings["app.displayName"] || DEFAULT_APP_NAME).trim() || DEFAULT_APP_NAME;
  const accentColor = /^#[0-9a-f]{6}$/i.test(settings["appearance.accentColor"])
    ? settings["appearance.accentColor"]
    : DEFAULT_ACCENT_COLOR;

  document.title = displayName;
  document.documentElement.style.setProperty("--accent", accentColor);
  document.documentElement.style.setProperty("--accent-soft", hexToRgba(accentColor, 0.16));
  appNameTargets.forEach((target) => {
    target.textContent = displayName;
  });

  if (sidebarTitleTarget) {
    sidebarTitleTarget.textContent = getSidebarTitle(displayName);
  }

  if (startupAudioElement) {
    startupAudioElement.volume = startupAudio.usingElement ? getStartupSoundVolume() : startupAudioElement.volume;
  }

  if (options.openDefaultPage) {
    showPage(getSafePageName(settings["general.defaultPage"]));
  }
}

function fadeStartupAudioElement(targetVolume, durationMs, onComplete) {
  if (!startupAudioElement) {
    return;
  }

  if (startupAudio.elementFadeTimer) {
    window.clearInterval(startupAudio.elementFadeTimer);
    startupAudio.elementFadeTimer = null;
  }

  const startVolume = startupAudioElement.volume;
  const startedAt = Date.now();

  startupAudio.elementFadeTimer = window.setInterval(() => {
    const progress = Math.min((Date.now() - startedAt) / durationMs, 1);
    startupAudioElement.volume = startVolume + (targetVolume - startVolume) * progress;

    if (progress >= 1) {
      window.clearInterval(startupAudio.elementFadeTimer);
      startupAudio.elementFadeTimer = null;
      onComplete?.();
    }
  }, 24);
}

function startGeneratedStartupTone() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const volume = getStartupSoundVolume();

  if (!AudioContext || startupAudio.context || volume <= 0) {
    return;
  }

  try {
    const context = new AudioContext();
    const gain = context.createGain();
    const notes = [146.83, 174.61, 220.0];

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.11 * volume, context.currentTime + 0.8);
    gain.connect(context.destination);

    startupAudio.context = context;
    startupAudio.gain = gain;
    startupAudio.oscillators = notes.map((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 1 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.connect(gain);
      oscillator.start();
      return oscillator;
    });

    startupAudio.timer = window.setInterval(() => {
      startupAudio.oscillators.forEach((oscillator, index) => {
        const offset = index % 2 === 0 ? 1.015 : 0.985;
        oscillator.frequency.setTargetAtTime(notes[index] * offset, context.currentTime, 0.25);
      });
    }, 700);

    context.resume?.().catch(() => {});
  } catch {
    startupAudio.context = null;
    startupAudio.gain = null;
    startupAudio.oscillators = [];
  }
}

function startStartupMusic() {
  if (!isStartupSoundEnabled() || getStartupSoundVolume() <= 0) {
    return;
  }

  if (startupAudioElement) {
    startupAudioElement.loop = true;
    startupAudioElement.currentTime = 0;
    startupAudioElement.volume = 0;

    const playPromise = startupAudioElement.play();

    if (playPromise?.then) {
      playPromise
        .then(() => {
          if (startupState.finished) {
            startupAudioElement.pause();
            startupAudioElement.currentTime = 0;
            return;
          }

          startupAudio.usingElement = true;
          fadeStartupAudioElement(getStartupSoundVolume(), 520);
        })
        .catch(() => {
          startupAudio.usingElement = false;
          startGeneratedStartupTone();
        });
      return;
    }

    startupAudio.usingElement = true;
    fadeStartupAudioElement(getStartupSoundVolume(), 520);
    return;
  }

  startGeneratedStartupTone();
}

function stopStartupMusic() {
  let fadeStarted = false;

  if (startupAudio.usingElement && startupAudioElement) {
    fadeStarted = true;
    fadeStartupAudioElement(0, 320, () => {
      startupAudioElement.pause();
      startupAudioElement.currentTime = 0;
      startupAudio.usingElement = false;
    });
  }

  if (startupAudio.timer) {
    window.clearInterval(startupAudio.timer);
    startupAudio.timer = null;
  }

  const context = startupAudio.context;
  const gain = startupAudio.gain;

  if (!context || !gain) {
    return fadeStarted ? 340 : 0;
  }

  try {
    fadeStarted = true;
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.08);

    window.setTimeout(() => {
      startupAudio.oscillators.forEach((oscillator) => {
        try {
          oscillator.stop();
        } catch {}
      });

      context.close?.();
      startupAudio.context = null;
      startupAudio.gain = null;
      startupAudio.oscillators = [];
    }, 260);
  } catch {
    startupAudio.context = null;
    startupAudio.gain = null;
    startupAudio.oscillators = [];
  }

  return fadeStarted ? 340 : 0;
}

function revealAppShell() {
  if (startupState.finished) {
    return;
  }

  startupState.finished = true;
  setStartupStep("services", "complete");
  setStartupStep("metrics", "complete");
  setStartupStep("control", "complete");
  updateStartupMessage("AnxOS Control Center ready.", "Opening dashboard...");
  const musicFadeMs = stopStartupMusic();

  window.setTimeout(() => {
    if (startupScreen) {
      startupScreen.classList.add("is-exiting");
    }

    window.setTimeout(() => {
      if (startupScreen) {
        startupScreen.hidden = true;
      }

      if (appShell) {
        appShell.hidden = false;
        appShell.classList.add("is-loading");
        window.requestAnimationFrame(() => {
          appShell.classList.remove("is-loading");
        });
      }
    }, 240);
  }, musicFadeMs);
}

function tryCompleteStartup(force = false) {
  if (startupState.finished) {
    return;
  }

  const ready = startupState.systemReady && startupState.sequenceReady;
  const elapsed = Date.now() - startupState.startedAt;
  const minimumMs = getStartupMinimumMs();

  if (force || (ready && elapsed >= minimumMs)) {
    revealAppShell();
    return;
  }

  if (ready) {
    window.setTimeout(() => tryCompleteStartup(), minimumMs - elapsed);
  }
}

function markStartupReady(name) {
  if (name === "system") {
    startupState.systemReady = true;
    setStartupStep("metrics", "complete");
  }

  if (name === "amp") {
    return;
  }

  tryCompleteStartup();
}

function advanceStartupStep(stepName, message, detail) {
  Object.entries(startupSteps).forEach(([name]) => {
    if (name !== stepName) {
      setStartupStep(name, startupSteps[name]?.classList.contains("is-complete") ? "complete" : "");
    }
  });

  setStartupStep(stepName, "active");
  updateStartupMessage(message, detail);
}

function runStartupSequence() {
  setStartupStep("app", "active");
  updateStartupMessage("Starting AnxOS...", "Loading local infrastructure...");

  window.setTimeout(() => {
    setStartupStep("app", "complete");
    advanceStartupStep("services", "Loading local services...", "Preparing local service checks...");
  }, 450);

  window.setTimeout(() => {
    setStartupStep("services", "complete");
    advanceStartupStep("metrics", "Checking system metrics...", "Reading local system status...");
  }, 950);

  window.setTimeout(() => {
    setStartupStep("metrics", startupState.systemReady ? "complete" : "active");
    advanceStartupStep("control", "Preparing control center...", "Finalizing dashboard layout...");
  }, 1450);

  window.setTimeout(() => {
    startupState.sequenceReady = true;
    setStartupStep("control", "complete");
    tryCompleteStartup();
  }, getStartupMinimumMs());
}

function startStartupFallback() {
  if (!isStartupSplashEnabled()) {
    startupState.finished = true;

    if (startupScreen) {
      startupScreen.hidden = true;
    }

    if (appShell) {
      appShell.hidden = false;
    }

    return;
  }

  startStartupMusic();
  runStartupSequence();

  window.setTimeout(() => {
    if (!startupState.systemReady) {
      startupState.systemReady = true;
    }

    if (!startupState.sequenceReady) {
      startupState.sequenceReady = true;
    }

    tryCompleteStartup(true);
  }, Math.max(STARTUP_FALLBACK_MS, getStartupMinimumMs() + 2200));
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
    markStartupReady("amp");
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
    markStartupReady("system");
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

function getConsoleRows() {
  return consoleLogList ? [...consoleLogList.querySelectorAll("li")] : [];
}

function updateConsoleEmptyState() {
  const rows = getConsoleRows();
  const visibleRows = rows.filter((row) => !row.hidden);
  const hasRows = rows.length > 0;

  if (consoleEmptyState) {
    consoleEmptyState.hidden = hasRows;
  }

  if (consoleCountTarget) {
    consoleCountTarget.textContent = `${visibleRows.length} ${visibleRows.length === 1 ? "line" : "lines"}`;
  }

  if (consoleClearButton) {
    consoleClearButton.disabled = !hasRows;
  }

  if (consoleCopyButton) {
    consoleCopyButton.disabled = visibleRows.length === 0;
  }
}

function filterConsoleRows() {
  const query = (consoleSearchInput?.value || "").trim().toLowerCase();

  getConsoleRows().forEach((row) => {
    row.hidden = query.length > 0 && !row.textContent.toLowerCase().includes(query);
  });

  updateConsoleEmptyState();
}

function clearConsoleRows() {
  if (!consoleLogList) {
    return;
  }

  consoleLogList.replaceChildren();
  updateConsoleEmptyState();
}

async function copyConsoleRows() {
  const output = getConsoleRows()
    .filter((row) => !row.hidden)
    .map((row) => row.textContent)
    .join("\n");

  if (!output) {
    return;
  }

  try {
    await navigator.clipboard.writeText(output);
    showToast("Copied console output.");
  } catch {
    showToast("Console output could not be copied.");
  }
}

function syncConsoleScrollMode() {
  if (!consoleViewer || !consoleAutoscrollInput || !consolePauseInput) {
    return;
  }

  if (consolePauseInput.checked) {
    consoleAutoscrollInput.checked = false;
    return;
  }

  if (consoleAutoscrollInput.checked) {
    consoleViewer.scrollTop = consoleViewer.scrollHeight;
  }
}

function getSshRows() {
  return sshOutputList ? [...sshOutputList.querySelectorAll("li")] : [];
}

function updateSshActions() {
  const hasOutput = getSshRows().length > 0;

  if (sshCopyButton) {
    sshCopyButton.disabled = !hasOutput;
  }

  if (sshClearButton) {
    sshClearButton.disabled = !hasOutput;
  }
}

async function copySshOutput() {
  const output = getSshRows()
    .map((row) => row.textContent)
    .join("\n");

  if (!output) {
    return;
  }

  try {
    await navigator.clipboard.writeText(output);
    showToast("Copied SSH terminal output.");
  } catch {
    showToast("SSH terminal output could not be copied.");
  }
}

function clearSshOutput() {
  if (!sshOutputList) {
    return;
  }

  sshOutputList.replaceChildren();
  updateSshActions();
}

function toggleSshFullscreen() {
  if (!sshTerminalCard) {
    return;
  }

  sshTerminalCard.classList.toggle("is-fullscreen");
}

function syncSshScrollMode() {
  if (sshAutoscrollInput?.checked && sshTerminalWindow) {
    sshTerminalWindow.scrollTop = sshTerminalWindow.scrollHeight;
  }
}

function writeStoredSettings(settings) {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function getSettingInputValue(input) {
  if (input.type === "checkbox") {
    return input.checked;
  }

  return input.value;
}

function setSettingInputValue(input, value) {
  if (input.type === "checkbox") {
    input.checked = value === true;
    return;
  }

  if (value !== undefined && value !== null) {
    input.value = value;
  }
}

function loadSettings() {
  const settings = readStoredSettings();

  settingsInputs.forEach((input) => {
    setSettingInputValue(input, settings[input.dataset.setting]);
  });

  applySettings(settings);
}

function saveSettings() {
  const settings = {
    ...DEFAULT_SETTINGS,
  };

  settingsInputs.forEach((input) => {
    settings[input.dataset.setting] = getSettingInputValue(input);
  });

  writeStoredSettings(settings);
  applySettings(settings);
}

function resetSettings() {
  window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
  const settings = { ...DEFAULT_SETTINGS };

  settingsInputs.forEach((input) => {
    setSettingInputValue(input, settings[input.dataset.setting]);
  });

  applySettings(settings);
  showToast("Settings reset.");
}

function setAboutFields(info) {
  aboutFields.forEach((field) => {
    const value = info?.[field.dataset.aboutField];
    field.textContent = value || "Unavailable";
  });
}

async function loadRuntimeInfo() {
  if (!window.anxhub?.app?.getRuntimeInfo) {
    setAboutFields(null);
    return;
  }

  try {
    setAboutFields(await window.anxhub.app.getRuntimeInfo());
  } catch {
    setAboutFields(null);
  }
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

consoleSearchInput?.addEventListener("input", filterConsoleRows);
consoleClearButton?.addEventListener("click", clearConsoleRows);
consoleCopyButton?.addEventListener("click", copyConsoleRows);
consoleAutoscrollInput?.addEventListener("change", syncConsoleScrollMode);
consolePauseInput?.addEventListener("change", syncConsoleScrollMode);
updateConsoleEmptyState();
sshCopyButton?.addEventListener("click", copySshOutput);
sshClearButton?.addEventListener("click", clearSshOutput);
sshFullscreenButton?.addEventListener("click", toggleSshFullscreen);
sshAutoscrollInput?.addEventListener("change", syncSshScrollMode);
updateSshActions();
settingsForm?.addEventListener("input", saveSettings);
settingsForm?.addEventListener("change", saveSettings);
settingsResetButton?.addEventListener("click", resetSettings);
loadSettings();
applySettings(readStoredSettings(), { openDefaultPage: true });
loadRuntimeInfo();
startStartupFallback();

registerRefreshTask(updateLocalTime, 30000);
registerRefreshTask(refreshDashboard, 1000);
registerRefreshTask(refreshAmpDashboard, AMP_REFRESH_INTERVAL_MS);
