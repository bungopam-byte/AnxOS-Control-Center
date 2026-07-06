const timeTarget = document.querySelector("#local-time");
const toast = document.querySelector("#toast");
const copyButtons = document.querySelectorAll("[data-copy]");
const navItems = document.querySelectorAll("[data-page-target]");
const pages = document.querySelectorAll("[data-page]");
const titlebar = document.querySelector("[data-titlebar]");
const titlebarDragSurface = document.querySelector("[data-titlebar-drag]");
const titlebarPageTarget = document.querySelector("[data-titlebar-page]");
const titlebarConnection = document.querySelector("[data-titlebar-connection]");
const titlebarConnectionLabel = document.querySelector("[data-titlebar-connection-label]");
const titlebarWindowButtons = document.querySelectorAll("[data-window-action]");
const titlebarMaximizeButton = document.querySelector('[data-window-action="maximize"]');
const consoleSearchInput = document.querySelector("[data-console-search]");
const consoleAutoscrollInput = document.querySelector("[data-console-autoscroll]");
const consolePauseInput = document.querySelector("[data-console-pause]");
const consoleClearButton = document.querySelector("[data-console-clear]");
const consoleCopyButton = document.querySelector("[data-console-copy]");
const consoleCountTarget = document.querySelector("[data-console-count]");
const consoleViewer = document.querySelector("[data-console-viewer]");
const consoleLogList = document.querySelector("[data-console-log-list]");
const consoleEmptyState = document.querySelector("[data-console-empty]");
const dockerList = document.querySelector("[data-docker-list]");
const dockerLoading = document.querySelector("[data-docker-loading]");
const dockerEmpty = document.querySelector("[data-docker-empty]");
const dockerDetailFields = document.querySelectorAll("[data-docker-detail]");
const dockerSearchInput = document.querySelector("[data-docker-search]");
const dockerFilterSelect = document.querySelector("[data-docker-filter]");
const dockerActionButtons = document.querySelectorAll("[data-docker-action]");
const dockerRefreshButton = document.querySelector('[data-docker-action="refresh"]');
const dockerStartButton = document.querySelector('[data-docker-action="start"]');
const dockerStopButton = document.querySelector('[data-docker-action="stop"]');
const dockerRestartButton = document.querySelector('[data-docker-action="restart"]');
const filesPage = document.querySelector('[data-page="files"]');
const fileManagerShell = filesPage?.querySelector(".file-manager-shell");
const fileWorkspace = filesPage?.querySelector(".file-workspace");
const fileBrowser = filesPage?.querySelector(".file-browser");
const filesList = document.querySelector("[data-file-list]");
const filesLoading = document.querySelector("[data-file-loading]");
const filesEmpty = document.querySelector("[data-file-empty]");
const filesSearchInput = document.querySelector("[data-file-search]");
const filesServerSelect = document.querySelector("[data-files-server]");
const filesProfileSelect = document.querySelector("[data-files-profile]");
const filesConnectButton = document.querySelector("[data-files-connect]");
const filesDisconnectButton = document.querySelector("[data-files-disconnect]");
const filesPathInput = document.querySelector("[data-files-path]");
const filesPasswordPrompt = document.querySelector("[data-files-password-prompt]");
const filesPasswordInput = document.querySelector("[data-files-password]");
const filesPasswordSubmitButton = document.querySelector("[data-files-password-submit]");
const filesPasswordCancelButton = document.querySelector("[data-files-password-cancel]");
const filesPasswordMessage = document.querySelector("[data-files-password-message]");
const filesModeButtons = document.querySelectorAll("[data-files-mode]");
const filesRefreshButton = document.querySelector('[data-file-action="refresh"]');
const filesGoButton = document.querySelector('[data-file-action="go"]');
const filesHomeButton = document.querySelector('[data-file-action="home"]');
const fileActionButtons = document.querySelectorAll("[data-file-action]");
const fileDetailFields = document.querySelectorAll("[data-file-detail]");
const filesBreadcrumbBar = filesPage?.querySelector(".breadcrumb-bar");
const filesFolderPanel = filesPage?.querySelector(".folder-tree-panel");
const filesFolderEmpty = filesPage?.querySelector(".folder-tree-empty");
const filesFolderStatus = filesFolderPanel?.querySelector(".panel-heading .status-pill");
const filesDetailsPanel = filesPage?.querySelector(".file-details-panel");
const filesDetailsStatus = filesDetailsPanel?.querySelector(".panel-heading .status-pill");
const fileEditorPanel = filesPage?.querySelector(".file-editor-panel");
const fileEditor = document.querySelector("[data-file-editor]");
const fileEditorCodeLayer = document.querySelector("[data-file-editor-code-layer]");
const fileEditorStatus = document.querySelector("[data-file-editor-status]");
const fileEditorDirtyIndicator = document.querySelector("[data-file-editor-dirty]");
const fileEditorMessage = document.querySelector("[data-file-editor-message]");
const fileEditorName = document.querySelector("[data-file-editor-name]");
const fileEditorPath = document.querySelector("[data-file-editor-path]");
const fileEditorLines = document.querySelector("[data-file-editor-lines]");
const fileEditorSurface = document.querySelector("[data-file-editor-surface]");
const fileEditorHeightInput = document.querySelector("[data-file-editor-height]");
const fileEditorActionButtons = document.querySelectorAll("[data-file-editor-action]");
const fileEditorOpenButton = document.querySelector('[data-file-editor-action="open"]');
const fileEditorSaveButton = document.querySelector('[data-file-editor-action="save"]');
const fileEditorRevertButton = document.querySelector('[data-file-editor-action="revert"]');
const fileEditorCopyPathButton = document.querySelector('[data-file-editor-action="copy-path"]');
const fileEditorWrapButton = document.querySelector('[data-file-editor-action="wrap"]');
const fileEditorMinimapButton = document.querySelector('[data-file-editor-action="minimap"]');
const fileEditorFullscreenButton = document.querySelector('[data-file-editor-action="fullscreen"]');
const filesConnectBar = filesPage?.querySelector(".files-connect-bar");
const fileToolbar = filesPage?.querySelector(".file-toolbar");
const filesDivider = filesPage?.querySelector("[data-files-divider]");
const startupScreen = document.querySelector("[data-startup-screen]");
const startupAudioElement = document.querySelector("[data-startup-audio]");
const appShell = document.querySelector("[data-app-shell]");
const appNameTargets = document.querySelectorAll("[data-app-name]");
const sidebarTitleTarget = document.querySelector("[data-sidebar-title]");
const startupMessage = document.querySelector("[data-startup-message]");
const startupDetail = document.querySelector("[data-startup-detail]");
const playitStatusCard = document.querySelector("[data-playit-status-card]");
const playitStatusPill = document.querySelector("[data-playit-status-pill]");
const startupSteps = {
  app: document.querySelector('[data-startup-step="app"]'),
  services: document.querySelector('[data-startup-step="services"]'),
  metrics: document.querySelector('[data-startup-step="metrics"]'),
  control: document.querySelector('[data-startup-step="control"]'),
};
const sshTerminalCard = document.querySelector(".ssh-terminal-card");
const sshTerminalWindow = document.querySelector("[data-ssh-terminal]");
const sshOutputList = document.querySelector("[data-ssh-output]");
const sshLoading = document.querySelector("[data-ssh-loading]");
const sshEmpty = document.querySelector("[data-ssh-empty]");
const sshSessionTabs = document.querySelector(".ssh-session-tabs");
const sshServerSelect = document.querySelector("[data-ssh-server]");
const sshProfileSelect = document.querySelector("[data-ssh-profile]");
const sshConnectButton = document.querySelector("[data-ssh-connect]");
const sshDisconnectButton = document.querySelector("[data-ssh-disconnect]");
const sshProfileToggleButton = document.querySelector("[data-ssh-profile-toggle]");
const sshProfileForm = document.querySelector("[data-ssh-profile-form]");
const sshProfileNameInput = document.querySelector("[data-ssh-profile-name]");
const sshProfileHostInput = document.querySelector("[data-ssh-profile-host]");
const sshProfilePortInput = document.querySelector("[data-ssh-profile-port]");
const sshProfileUsernameInput = document.querySelector("[data-ssh-profile-username]");
const sshProfileAuthSelect = document.querySelector("[data-ssh-profile-auth]");
const sshPrivateKeyField = document.querySelector("[data-ssh-private-key-field]");
const sshProfilePrivateKeyInput = document.querySelector("[data-ssh-profile-private-key]");
const sshProfileSaveButton = document.querySelector("[data-ssh-profile-save]");
const sshProfileCancelButton = document.querySelector("[data-ssh-profile-cancel]");
const sshPasswordPrompt = document.querySelector("[data-ssh-password-prompt]");
const sshPasswordInput = document.querySelector("[data-ssh-password]");
const sshPasswordSubmitButton = document.querySelector("[data-ssh-password-submit]");
const sshPasswordCancelButton = document.querySelector("[data-ssh-password-cancel]");
const sshPasswordMessage = document.querySelector("[data-ssh-password-message]");
const sshCommandForm = document.querySelector("[data-ssh-command-form]");
const sshCommandInput = document.querySelector("[data-ssh-command]");
const sshCommandSendButton = sshCommandForm?.querySelector('button[type="submit"]');
const sshStatusLabel = document.querySelector(".ssh-status strong");
const sshStatusDot = document.querySelector(".ssh-status-dot");
const sshCopyButton = document.querySelector("[data-ssh-copy]");
const sshClearButton = document.querySelector("[data-ssh-clear]");
const sshFullscreenButton = document.querySelector("[data-ssh-fullscreen]");
const sshAutoscrollInput = document.querySelector("[data-ssh-autoscroll]");
const settingsForm = document.querySelector("[data-settings-form]");
const settingsInputs = document.querySelectorAll("[data-setting]");
const settingsResetButton = document.querySelector("[data-settings-reset]");
const agentSettingsInputs = document.querySelectorAll("[data-agent-setting]");
const agentSettingsSaveButton = document.querySelector('[data-agent-action="save"]');
const agentSettingsTestButton = document.querySelector('[data-agent-action="test"]');
const agentConnectionPill = document.querySelector("[data-agent-connection-pill]");
const agentConnectionMessage = document.querySelector("[data-agent-connection-message]");
const agentConfigSource = document.querySelector("[data-agent-config-source]");
const aboutFields = document.querySelectorAll("[data-about-field]");
const fieldMap = new Map();
let systemRequestInFlight = false;
let ampRequestInFlight = false;
let playitRequestInFlight = false;
let dockerRequestInFlight = false;
let dockerActionRequestInFlight = false;
let filesRequestInFlight = false;
let filesActionRequestInFlight = false;
let agentSettingsRequestInFlight = false;
let agentConnectionTestInFlight = false;
let sshConnectRequestInFlight = false;
let lastAmpRefreshAt = 0;
let ampRendererReceiveCount = 0;
let latestAmpSnapshot = null;
let latestPlayitSnapshot = null;
let latestDockerSnapshot = null;
let latestFilesListing = null;
let latestFileDocument = null;
let selectedDockerContainerId = null;
let selectedFileEntryPath = null;
let activeSshSessionId = null;
let sshDataUnsubscribe = null;
let sshStatusUnsubscribe = null;
let sshSelectedServerId = null;
let sshSelectedProfileId = null;
let sshPasswordPromptVisible = false;
let sshPendingPasswordProfileId = null;
let sshTransientStatusMessage = "";
let sshProfileFormVisible = false;
let sshKeyboardMode = false;
let sshKeyboardInputBuffer = "";
let filesSelectedServerId = null;
let filesSelectedProfileId = null;
let filesPasswordPromptVisible = false;
let filesPendingPasswordProfileId = null;
let filesViewMode = "browse";
let fileEditorHeight = 560;
let filesExplorerWidth = 320;
let agentConnectionState = "disconnected";
let titlebarWindowIsMaximized = false;
let windowMaximizedUnsubscribe = null;
let monacoLoadPromise = null;
let monacoApi = null;
let monacoEditorInstance = null;
let monacoEditorModel = null;
let monacoEditorContainer = null;
let monacoEditorSubscription = null;
let monacoEditorStateSyncPaused = false;
let filesDividerDragState = null;
let fileEditorWordWrapEnabled = true;
let fileEditorMinimapEnabled = false;
const sshProfilesState = {
  servers: [],
  profiles: [],
  defaultServerId: null,
  defaultProfileId: null,
};
const filesConnectionState = {
  connected: false,
  profileId: null,
  currentPath: null,
  homePath: null,
  status: "disconnected",
  message: "No remote filesystem connected.",
};
const sshSessions = new Map();
const AMP_REFRESH_INTERVAL_MS = 2000;
const STARTUP_FALLBACK_MS = 4200;
const STARTUP_MINIMUM_MS = 2000;
const SSH_OUTPUT_LINE_LIMIT = 1500;
const SETTINGS_STORAGE_KEY = "anxos.settings.v1";
const FILES_EXPLORER_WIDTH_STORAGE_KEY = "anxos.files.explorerWidth.v1";
const FILES_EDITOR_PREFS_STORAGE_KEY = "anxos.files.editorPrefs.v1";
const DEFAULT_APP_NAME = "AnxOS Control Center";
const DEFAULT_ACCENT_COLOR = "#b66cff";
const DEFAULT_AGENT_URL = "http://127.0.0.1:47131";
const DEFAULT_FILES_EXPLORER_WIDTH = 320;
const MIN_FILES_EXPLORER_WIDTH = 220;
const MAX_FILES_EXPLORER_WIDTH = 520;
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
const DEFAULT_AGENT_SETTINGS = {
  backendMode: "local",
  agentUrl: DEFAULT_AGENT_URL,
  agentToken: "",
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

function getDesktopApi() {
  return window.anxos || window.anxhub || null;
}

function getDesktopWindowApi() {
  return window.anxWindow || getDesktopApi()?.window || null;
}

function getDesktopApiState() {
  const api = getDesktopApi();
  const windowApi = getDesktopWindowApi();

  return {
    api,
    hasBridge: Boolean(api),
    hasWindow:
      typeof windowApi?.minimize === "function" &&
      typeof windowApi?.maximize === "function" &&
      typeof windowApi?.restore === "function" &&
      typeof windowApi?.close === "function" &&
      typeof windowApi?.isMaximized === "function" &&
      typeof windowApi?.onMaximizedChanged === "function",
    hasSystem: typeof api?.system?.getSnapshot === "function",
    hasAmp: typeof api?.amp?.getSnapshot === "function",
    hasPlayit: typeof api?.playit?.getSnapshot === "function",
    hasDocker: typeof api?.docker?.getSnapshot === "function",
    hasActions: typeof api?.actions?.executeAction === "function",
    hasFiles:
      typeof api?.files?.list === "function" &&
      typeof api?.files?.disconnect === "function" &&
      typeof api?.files?.readText === "function" &&
      typeof api?.files?.writeText === "function" &&
      typeof api?.files?.mkdir === "function" &&
      typeof api?.files?.rename === "function" &&
      typeof api?.files?.delete === "function" &&
      typeof api?.files?.upload === "function" &&
      typeof api?.files?.download === "function",
    hasSsh:
      typeof api?.ssh?.listProfiles === "function" &&
      typeof api?.ssh?.saveProfile === "function" &&
      typeof api?.ssh?.connect === "function" &&
      typeof api?.ssh?.disconnect === "function" &&
      typeof api?.ssh?.write === "function" &&
      typeof api?.ssh?.resize === "function" &&
      typeof api?.ssh?.onData === "function" &&
      typeof api?.ssh?.onStatus === "function",
    hasSettings:
      typeof api?.settings?.getAgentConfig === "function" &&
      typeof api?.settings?.saveAgentConfig === "function" &&
      typeof api?.settings?.testAgentConnection === "function",
    hasApp: typeof api?.app?.getRuntimeInfo === "function",
  };
}

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

function getPageDisplayName(pageName) {
  return Array.from(navItems).find((item) => item.dataset.pageTarget === pageName)?.textContent?.trim() || "Dashboard";
}

function getSidebarTitle(displayName) {
  return displayName;
}

function getFileNameFromPath(value) {
  const normalizedPath = String(value || "").replace(/\\/g, "/").replace(/\/+$/, "");

  if (!normalizedPath) {
    return "No file opened";
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  return segments[segments.length - 1] || normalizedPath;
}

function readFilesExplorerWidth() {
  try {
    const storedValue = Number(window.localStorage.getItem(FILES_EXPLORER_WIDTH_STORAGE_KEY));

    if (!Number.isFinite(storedValue)) {
      return DEFAULT_FILES_EXPLORER_WIDTH;
    }

    return Math.min(Math.max(storedValue, MIN_FILES_EXPLORER_WIDTH), MAX_FILES_EXPLORER_WIDTH);
  } catch {
    return DEFAULT_FILES_EXPLORER_WIDTH;
  }
}

function readFileEditorPreferences() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(FILES_EDITOR_PREFS_STORAGE_KEY) || "{}");
    return {
      wordWrap: stored.wordWrap !== false,
      minimap: stored.minimap === true,
    };
  } catch {
    return {
      wordWrap: true,
      minimap: false,
    };
  }
}

function persistFileEditorPreferences() {
  try {
    window.localStorage.setItem(
      FILES_EDITOR_PREFS_STORAGE_KEY,
      JSON.stringify({
        wordWrap: fileEditorWordWrapEnabled,
        minimap: fileEditorMinimapEnabled,
      }),
    );
  } catch {}
}

function setFileEditorName(value) {
  if (fileEditorName) {
    fileEditorName.textContent = value || "No file opened";
  }
}

function updateFileEditorToggleButtons() {
  if (fileEditorWrapButton) {
    fileEditorWrapButton.textContent = fileEditorWordWrapEnabled ? "Wrap On" : "Wrap Off";
    fileEditorWrapButton.setAttribute("aria-pressed", fileEditorWordWrapEnabled ? "true" : "false");
  }

  if (fileEditorMinimapButton) {
    fileEditorMinimapButton.textContent = fileEditorMinimapEnabled ? "Minimap On" : "Minimap Off";
    fileEditorMinimapButton.setAttribute("aria-pressed", fileEditorMinimapEnabled ? "true" : "false");
  }
}

function updateFilesStickyOffsets() {
  if (!fileManagerShell) {
    return;
  }

  const connectHeight = filesConnectBar?.offsetHeight || 0;
  const passwordHeight = filesPasswordPrompt && !filesPasswordPrompt.hidden ? (filesPasswordPrompt.offsetHeight || 0) + 14 : 0;
  fileManagerShell.style.setProperty("--files-sticky-offset", `${connectHeight + passwordHeight}px`);
}

function setFilesExplorerWidth(value, options = {}) {
  const nextWidth = Math.min(Math.max(Number(value) || DEFAULT_FILES_EXPLORER_WIDTH, MIN_FILES_EXPLORER_WIDTH), MAX_FILES_EXPLORER_WIDTH);
  filesExplorerWidth = nextWidth;

  if (fileManagerShell) {
    fileManagerShell.style.setProperty("--files-explorer-width", `${nextWidth}px`);
  }

  if (options.persist !== false) {
    try {
      window.localStorage.setItem(FILES_EXPLORER_WIDTH_STORAGE_KEY, String(nextWidth));
    } catch {}
  }

  window.requestAnimationFrame(() => {
    monacoEditorInstance?.layout?.();
  });
}

function startFilesDividerDrag(clientX) {
  if (filesViewMode !== "edit") {
    return;
  }

  filesDividerDragState = {
    startX: clientX,
    startWidth: filesExplorerWidth,
  };

  filesDivider?.classList.add("is-dragging");
  document.body.classList.add("is-resizing-files");
}

function updateFilesDividerDrag(clientX) {
  if (!filesDividerDragState) {
    return;
  }

  const delta = clientX - filesDividerDragState.startX;
  setFilesExplorerWidth(filesDividerDragState.startWidth + delta, { persist: false });
}

function stopFilesDividerDrag() {
  if (!filesDividerDragState) {
    return;
  }

  filesDividerDragState = null;
  filesDivider?.classList.remove("is-dragging");
  document.body.classList.remove("is-resizing-files");
  setFilesExplorerWidth(filesExplorerWidth);
}

function isLikelySecretFile(entry) {
  const fileName = String(entry?.name || "").toLowerCase();
  const hasSecretTerm = /(token|secret|api[-_. ]?key|private[-_. ]?key|access[-_. ]?key|auth[-_. ]?key|(?:^|[._-])key(?:[._-]|$))/.test(fileName);

  if (!fileName) {
    return false;
  }

  if (fileName === ".env" || fileName.startsWith(".env.")) {
    return true;
  }

  if (["auth.json", "id_rsa", "id_ed25519"].includes(fileName)) {
    return true;
  }

  return hasSecretTerm || (/config/.test(fileName) && hasSecretTerm);
}

function confirmOpenSensitiveFile(entry) {
  if (!isLikelySecretFile(entry)) {
    return true;
  }

  return window.confirm(`"${entry.name}" looks like it may contain secrets. Open it anyway?`);
}

function detectMonacoLanguage(filePath) {
  const name = getFileNameFromPath(filePath).toLowerCase();

  if (name === "dockerfile") {
    return "dockerfile";
  }

  const extension = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const languageMap = {
    ".json": "json",
    ".jsonl": "json",
    ".toml": "ini",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".js": "javascript",
    ".ts": "typescript",
    ".py": "python",
    ".sh": "shell",
    ".bash": "shell",
    ".md": "markdown",
    ".html": "html",
    ".css": "css",
  };

  return languageMap[extension] || "plaintext";
}

function getFileEditorValue() {
  if (monacoEditorInstance && monacoEditorModel && !fileEditorCodeLayer?.hidden) {
    return monacoEditorInstance.getValue();
  }

  return fileEditor?.value || "";
}

function setFileEditorValue(value) {
  const normalizedValue = value !== undefined && value !== null ? String(value) : "";

  if (monacoEditorInstance && monacoEditorModel && !fileEditorCodeLayer?.hidden) {
    monacoEditorStateSyncPaused = true;
    monacoEditorInstance.setValue(normalizedValue);
    monacoEditorStateSyncPaused = false;
    return;
  }

  if (fileEditor) {
    fileEditor.value = normalizedValue;
  }
}

function focusFileEditor() {
  if (monacoEditorInstance && monacoEditorModel && !fileEditorCodeLayer?.hidden) {
    monacoEditorInstance.focus();
    return;
  }

  fileEditor?.focus();
}

function setMonacoEditorVisibility(visible) {
  if (fileEditorCodeLayer) {
    fileEditorCodeLayer.hidden = !visible;
  }

  fileEditorSurface?.classList.toggle("is-monaco-active", visible);

  if (fileEditor) {
    fileEditor.hidden = visible;
  }

  if (fileEditorLines) {
    fileEditorLines.hidden = visible;
  }
}

function updateMonacoEditorOptions() {
  if (!monacoEditorInstance) {
    updateFileEditorToggleButtons();
    return;
  }

  monacoEditorInstance.updateOptions({
    wordWrap: fileEditorWordWrapEnabled ? "on" : "off",
    minimap: {
      enabled: fileEditorMinimapEnabled,
    },
  });
  updateFileEditorToggleButtons();
}

function defineAnxosMonacoTheme(monaco) {
  const styles = window.getComputedStyle(document.documentElement);
  const background = styles.getPropertyValue("--bg").trim() || "#07020f";
  const panel = styles.getPropertyValue("--panel").trim() || "#150a24";
  const line = styles.getPropertyValue("--line").trim() || "#3a2552";
  const accent = styles.getPropertyValue("--accent").trim() || "#b66cff";
  const text = styles.getPropertyValue("--text").trim() || "#f8f5ff";
  const muted = styles.getPropertyValue("--muted").trim() || "#b9abc8";
  const success = styles.getPropertyValue("--success").trim() || "#45e08f";
  const danger = styles.getPropertyValue("--danger").trim() || "#ff6b8a";

  monaco.editor.defineTheme("anxos-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "F8F5FF", background: "090C12" },
      { token: "comment", foreground: "8E7AA7" },
      { token: "string", foreground: "C7A1FF" },
      { token: "keyword", foreground: "B66CFF", fontStyle: "bold" },
      { token: "number", foreground: "F5C451" },
      { token: "regexp", foreground: "45E08F" },
      { token: "type", foreground: "D8B4FE" },
      { token: "delimiter", foreground: "B9ABC8" },
      { token: "invalid", foreground: "FFF4F7", background: "E04A68" },
    ],
    colors: {
      "editor.background": "#090C12",
      "editor.foreground": text,
      "editorLineNumber.foreground": "#6E6180",
      "editorLineNumber.activeForeground": accent,
      "editorCursor.foreground": accent,
      "editor.selectionBackground": "rgba(182, 108, 255, 0.24)",
      "editor.inactiveSelectionBackground": "rgba(182, 108, 255, 0.14)",
      "editor.lineHighlightBackground": "rgba(255, 255, 255, 0.03)",
      "editor.lineHighlightBorder": "rgba(182, 108, 255, 0.14)",
      "editorIndentGuide.background1": "rgba(58, 37, 82, 0.72)",
      "editorIndentGuide.activeBackground1": accent,
      "editorBracketMatch.background": "rgba(182, 108, 255, 0.16)",
      "editorBracketMatch.border": accent,
      "editorGutter.background": "#090C12",
      "editorWidget.background": panel,
      "editorWidget.border": line,
      "editorSuggestWidget.background": panel,
      "editorSuggestWidget.border": line,
      "editorSuggestWidget.selectedBackground": "rgba(182, 108, 255, 0.18)",
      "editorHoverWidget.background": panel,
      "editorHoverWidget.border": line,
      "editor.findMatchBackground": "rgba(245, 196, 81, 0.22)",
      "editor.findMatchHighlightBackground": "rgba(245, 196, 81, 0.12)",
      "editorOverviewRuler.border": "rgba(255,255,255,0)",
      "editorError.foreground": danger,
      "editorWarning.foreground": "#f5c451",
      "editorInfo.foreground": accent,
      "scrollbarSlider.background": "rgba(182, 108, 255, 0.22)",
      "scrollbarSlider.hoverBackground": "rgba(182, 108, 255, 0.36)",
      "scrollbarSlider.activeBackground": "rgba(182, 108, 255, 0.5)",
      "minimap.selectionHighlight": "rgba(182, 108, 255, 0.16)",
      "minimap.errorHighlight": danger,
      "minimap.warningHighlight": "#f5c451",
      "badge.background": accent,
      "badge.foreground": background,
      "focusBorder": accent,
      "inputValidation.errorBackground": "rgba(255, 107, 138, 0.12)",
      "inputValidation.infoBackground": "rgba(182, 108, 255, 0.14)",
      "inputValidation.warningBackground": "rgba(245, 196, 81, 0.12)",
      "list.focusOutline": accent,
      "list.activeSelectionBackground": "rgba(182, 108, 255, 0.16)",
      "list.hoverBackground": "rgba(255, 255, 255, 0.04)",
      "statusBar.foreground": muted,
      "statusBar.noFolderBackground": panel,
      "statusBar.debuggingBackground": success,
    },
  });
}

function getMonacoBaseUrl() {
  return new URL("./node_modules/monaco-editor/min/vs", window.location.href).href;
}

function loadMonacoEditorApi() {
  if (monacoApi) {
    return Promise.resolve(monacoApi);
  }

  if (monacoLoadPromise) {
    return monacoLoadPromise;
  }

  monacoLoadPromise = new Promise((resolve, reject) => {
    const loaderUrl = new URL("./node_modules/monaco-editor/min/vs/loader.js", window.location.href).href;
    const baseUrl = getMonacoBaseUrl();
    const bootLoader = () => {
      if (typeof window.require !== "function") {
        reject(new Error("Monaco AMD loader is unavailable."));
        return;
      }

      const workerMainUrl = `${baseUrl}/base/worker/workerMain.js`;
      const workerBootstrap = `self.MonacoEnvironment={baseUrl:${JSON.stringify(`${baseUrl}/`)}};importScripts(${JSON.stringify(workerMainUrl)});`;
      const workerDataUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(workerBootstrap)}`;

      window.MonacoEnvironment = {
        getWorkerUrl: () => workerDataUrl,
        getWorker: (_, label) => new Worker(workerDataUrl, {
          name: `anxos-monaco-${label || "worker"}`,
        }),
      };

      window.require.config({
        paths: {
          vs: baseUrl,
        },
      });

      window.require(["vs/editor/editor.main", "vs/basic-languages/monaco.contribution"], () => {
        monacoApi = window.monaco;

        if (!monacoApi) {
          reject(new Error("Monaco editor did not initialize."));
          return;
        }

        defineAnxosMonacoTheme(monacoApi);
        resolve(monacoApi);
      }, reject);
    };

    if (typeof window.require === "function" && window.require.config) {
      bootLoader();
      return;
    }

    const existingLoader = document.querySelector('script[data-monaco-loader="true"]');

    if (existingLoader) {
      existingLoader.addEventListener("load", bootLoader, { once: true });
      existingLoader.addEventListener("error", () => reject(new Error("Monaco loader failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = loaderUrl;
    script.dataset.monacoLoader = "true";
    script.addEventListener("load", bootLoader, { once: true });
    script.addEventListener("error", () => reject(new Error("Monaco loader failed to load.")), { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    monacoLoadPromise = null;
    throw error;
  });

  return monacoLoadPromise;
}

async function ensureMonacoEditor() {
  const monaco = await loadMonacoEditorApi();

  if (!fileEditorCodeLayer) {
    throw new Error("File editor container is unavailable.");
  }

  if (!monacoEditorContainer) {
    monacoEditorContainer = document.createElement("div");
    monacoEditorContainer.className = "file-editor-monaco";
    fileEditorCodeLayer.replaceChildren(monacoEditorContainer);
  }

  if (!monacoEditorInstance) {
    monacoEditorInstance = monaco.editor.create(monacoEditorContainer, {
      automaticLayout: false,
      theme: "anxos-dark",
      language: "plaintext",
      lineNumbers: "on",
      folding: true,
      guides: {
        indentation: true,
      },
      bracketPairColorization: {
        enabled: true,
      },
      matchBrackets: "always",
      scrollBeyondLastLine: false,
      renderLineHighlight: "line",
      smoothScrolling: true,
      minimap: {
        enabled: fileEditorMinimapEnabled,
      },
      wordWrap: fileEditorWordWrapEnabled ? "on" : "off",
      fontSize: 13,
      fontFamily: "\"Cascadia Code\", \"SFMono-Regular\", Consolas, \"Liberation Mono\", monospace",
      lineHeight: 21,
      padding: {
        top: 14,
        bottom: 14,
      },
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        alwaysConsumeMouseWheel: false,
      },
      overviewRulerBorder: false,
      contextmenu: true,
      tabSize: 2,
      insertSpaces: true,
      formatOnPaste: true,
      formatOnType: true,
    });

    monacoEditorSubscription = monacoEditorInstance.onDidChangeModelContent(() => {
      if (!monacoEditorStateSyncPaused) {
        syncFileEditorDirtyState();
      }
    });

    monacoEditorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveRemoteTextFile();
    });
  }

  defineAnxosMonacoTheme(monaco);
  monaco.editor.setTheme("anxos-dark");
  updateMonacoEditorOptions();
  setMonacoEditorVisibility(true);
  window.requestAnimationFrame(() => {
    monacoEditorInstance?.layout?.();
  });
  return monaco;
}

function disposeMonacoModel() {
  if (monacoEditorModel) {
    monacoEditorModel.dispose();
    monacoEditorModel = null;
  }

  if (monacoEditorInstance) {
    monacoEditorInstance.setModel(null);
  }
}

function disposeMonacoEditorResources() {
  disposeMonacoModel();
  monacoEditorSubscription?.dispose?.();
  monacoEditorSubscription = null;
  monacoEditorInstance?.dispose?.();
  monacoEditorInstance = null;
  monacoEditorContainer?.remove?.();
  monacoEditorContainer = null;
}

function setTitlebarWindowState(isMaximized) {
  titlebarWindowIsMaximized = Boolean(isMaximized);
  document.body.classList.toggle("window-is-maximized", titlebarWindowIsMaximized);

  if (titlebarMaximizeButton) {
    titlebarMaximizeButton.classList.toggle("is-maximized", titlebarWindowIsMaximized);
    titlebarMaximizeButton.setAttribute("aria-label", titlebarWindowIsMaximized ? "Restore window" : "Maximize window");
    titlebarMaximizeButton.title = titlebarWindowIsMaximized ? "Restore" : "Maximize";
  }
}

async function syncTitlebarWindowState() {
  const windowApi = getDesktopWindowApi();

  if (typeof windowApi?.isMaximized !== "function") {
    setTitlebarWindowState(false);
    return;
  }

  try {
    setTitlebarWindowState(await windowApi.isMaximized());
  } catch {
    setTitlebarWindowState(false);
  }
}

function setTitlebarConnectionState(connected, label) {
  if (!titlebarConnection || !titlebarConnectionLabel) {
    return;
  }

  titlebarConnection.classList.toggle("is-disconnected", !connected);
  titlebarConnectionLabel.textContent = label;
}

function getTitlebarConnectionState(pageName = getActivePageName()) {
  switch (pageName) {
    case "amp":
    case "minecraft": {
      const connected =
        latestAmpSnapshot?.status === "connected" ||
        latestAmpSnapshot?.connection?.status === "connected" ||
        latestAmpSnapshot?.connected === true;
      return {
        connected,
        label: connected ? "Connected" : "Disconnected",
      };
    }
    case "playit": {
      const connected = latestPlayitSnapshot?.connected === true;
      return {
        connected,
        label: connected ? "Connected" : "Disconnected",
      };
    }
    case "docker": {
      const connected = Boolean(latestDockerSnapshot?.installed && latestDockerSnapshot?.daemonRunning);
      return {
        connected,
        label: connected ? "Connected" : "Disconnected",
      };
    }
    case "ssh": {
      const session = getActiveSshSession();
      return {
        connected: session?.status === "connected",
        label: session?.status === "connected" ? "Connected" : "Disconnected",
      };
    }
    case "files":
      return {
        connected: filesConnectionState.connected,
        label: filesConnectionState.connected ? "Connected" : "Disconnected",
      };
    case "settings":
      return {
        connected: agentConnectionState === "connected",
        label:
          agentConnectionState === "testing"
            ? "Testing..."
            : agentConnectionState === "connected"
              ? "Connected"
              : "Disconnected",
      };
    default:
      return {
        connected: true,
        label: "Connected",
      };
  }
}

function updateTitlebar(pageName = getActivePageName()) {
  if (titlebarPageTarget) {
    titlebarPageTarget.textContent = getPageDisplayName(pageName);
  }

  const connectionState = getTitlebarConnectionState(pageName);
  setTitlebarConnectionState(connectionState.connected, connectionState.label);
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

  if (monacoApi) {
    defineAnxosMonacoTheme(monacoApi);
    monacoApi.editor.setTheme("anxos-dark");
  }

  if (sidebarTitleTarget) {
    sidebarTitleTarget.textContent = getSidebarTitle(displayName);
  }

  if (startupAudioElement) {
    startupAudioElement.volume = startupAudio.usingElement ? getStartupSoundVolume() : startupAudioElement.volume;
  }

  if (options.openDefaultPage) {
    showPage(getSafePageName(settings["general.defaultPage"]));
  } else {
    updateTitlebar();
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

  if (pageName === "playit") {
    refreshPlayitStatus();
  }

  if (pageName === "docker") {
    refreshDockerStatus();
  }

  if (pageName === "files") {
    renderFilesView();

    if (filesConnectionState.connected) {
      refreshFileListing({
        profileId: getFilesRequestProfileId(),
        path: filesConnectionState.currentPath || filesConnectionState.homePath || "/",
      });
    }
  }

  if (pageName === "ssh") {
    renderSshView();
    resizeActiveSshSession();
  }

  updateTitlebar(pageName);
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

  if (minutes === 0) {
    return `${Math.floor(totalSeconds)}s`;
  }

  return `${minutes}m`;
}

function formatDateTime(value) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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

function getConfiguredPlayitAddress() {
  const value = readStoredSettings()["playit.address"];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function setPlayitVisualState(state) {
  const states = ["connected", "running", "stopped", "missing"];

  states.forEach((name) => {
    playitStatusCard?.classList.toggle(`is-${name}`, state === name);
    playitStatusPill?.classList.toggle(`is-${name}`, state === name);
  });
}

function renderPlayitSnapshot(snapshot) {
  latestPlayitSnapshot = snapshot;
  const configuredAddress = getConfiguredPlayitAddress();
  const tunnelAddress = snapshot?.tunnelAddress || snapshot?.tunnelDomain || configuredAddress || "Unavailable";
  const localIp = snapshot?.localIp || "Unavailable";
  const localPort = snapshot?.localPort || "Unavailable";
  const protocol = snapshot?.protocol || "Unavailable";
  const tunnelId = snapshot?.tunnelId || "Unavailable";
  const installed = snapshot?.installed === true;
  const running = snapshot?.running === true;
  const connected = snapshot?.connected === true;
  const connectedLabel = connected ? "Connected" : running ? "Not connected" : "Disconnected";
  const state = !installed ? "missing" : connected ? "connected" : running ? "running" : "stopped";

  setPlayitVisualState(state);
  setField("playitInstalled", installed ? "Installed" : "Missing");
  setField("playitRunning", running ? "Running" : "Stopped");
  setField("playitConnected", connectedLabel);
  setField("playitTunnelAddress", tunnelAddress);
  setField("playitLocalIp", localIp);
  setField("playitLocalPort", localPort);
  setField("playitProtocol", protocol);
  setField("playitTunnelId", tunnelId);
  setField("playitLastSuccessfulRefresh", formatDateTime(snapshot?.lastSuccessfulRefreshAt));
  setField("playitLatency", "Unavailable");
  setField("playitTraffic", "Unavailable");
  setField(
    "playitSummary",
    connected
      ? "Playit tunnel is running and forwarding traffic."
      : running
        ? "Playit is running, but no connected tunnel was detected."
        : installed
          ? "Playit is installed, but the tunnel process is stopped."
          : "Playit is not installed.",
  );
  updateTitlebar();
}

function renderPlayitUnavailable(message = "Playit status unavailable.") {
  latestPlayitSnapshot = null;
  setPlayitVisualState("missing");
  setField("playitInstalled", "Unavailable");
  setField("playitRunning", "Unavailable");
  setField("playitConnected", "Unavailable");
  setField("playitTunnelAddress", getConfiguredPlayitAddress() || "Unavailable");
  setField("playitLocalIp", "Unavailable");
  setField("playitLocalPort", "Unavailable");
  setField("playitProtocol", "Unavailable");
  setField("playitTunnelId", "Unavailable");
  setField("playitLastSuccessfulRefresh", "Unavailable");
  setField("playitLatency", "Unavailable");
  setField("playitTraffic", "Unavailable");
  setField("playitSummary", message);
  updateTitlebar();
}

function setDockerDetail(name, value) {
  dockerDetailFields.forEach((field) => {
    if (field.dataset.dockerDetail === name) {
      field.textContent = value;
    }
  });
}

function setDockerLoading(isLoading) {
  if (dockerLoading) {
    dockerLoading.hidden = !isLoading;
  }
}

function setDockerEmpty(isEmpty) {
  if (dockerEmpty) {
    dockerEmpty.hidden = !isEmpty;
  }
}

function clearDockerRows() {
  if (dockerList) {
    dockerList.replaceChildren();
  }
}

function formatDockerValue(value) {
  return value === null || value === undefined || value === "" ? "Unavailable" : String(value);
}

function formatDockerPorts(value) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "Unavailable";
  }

  return formatDockerValue(value);
}

function formatDockerCpu(container) {
  return formatDockerValue(container?.stats?.cpuPercent);
}

function formatDockerMemory(container) {
  const usage = container?.stats?.memoryUsage;
  const limit = container?.stats?.memoryLimit;

  if (usage && limit) {
    return `${usage} / ${limit}`;
  }

  return formatDockerValue(container?.stats?.memoryRaw || usage);
}

function formatDockerResources(container) {
  const cpu = formatDockerCpu(container);
  const memory = formatDockerMemory(container);

  if (cpu === "Unavailable" && memory === "Unavailable") {
    return "Unavailable";
  }

  return `CPU ${cpu} · RAM ${memory}`;
}

function getDockerContainers(snapshot = latestDockerSnapshot) {
  return Array.isArray(snapshot?.containers) ? snapshot.containers : [];
}

function findDockerContainer(containerId, snapshot = latestDockerSnapshot) {
  if (!containerId) {
    return null;
  }

  return getDockerContainers(snapshot).find((container) => container?.id === containerId) || null;
}

function normalizeDockerActionState(container) {
  const rawState = String(container?.state || container?.status || "").trim().toLowerCase();

  if (/^up\b|running/.test(rawState)) {
    return "running";
  }

  if (/created|exited|dead|paused|removing|stopped/.test(rawState)) {
    return rawState.includes("created") ? "created" : "stopped";
  }

  return rawState || "unknown";
}

function canStartDockerContainer(container) {
  return ["created", "stopped"].includes(normalizeDockerActionState(container));
}

function canStopDockerContainer(container) {
  return normalizeDockerActionState(container) === "running";
}

function canRestartDockerContainer(container) {
  return normalizeDockerActionState(container) === "running";
}

function updateDockerActionButtons() {
  const selectedContainer = findDockerContainer(selectedDockerContainerId);
  const hasActions = getDesktopApiState().hasActions;
  const disableManagedActions = dockerActionRequestInFlight || !selectedContainer || !hasActions;

  if (dockerRefreshButton) {
    dockerRefreshButton.disabled = dockerRequestInFlight || dockerActionRequestInFlight;
  }

  if (dockerStartButton) {
    dockerStartButton.disabled = disableManagedActions || !canStartDockerContainer(selectedContainer);
  }

  if (dockerStopButton) {
    dockerStopButton.disabled = disableManagedActions || !canStopDockerContainer(selectedContainer);
  }

  if (dockerRestartButton) {
    dockerRestartButton.disabled = disableManagedActions || !canRestartDockerContainer(selectedContainer);
  }

  dockerActionButtons.forEach((button) => {
    const action = button.dataset.dockerAction;

    if (action !== "refresh" && action !== "start" && action !== "stop" && action !== "restart") {
      button.disabled = true;
    }
  });
}

function getDockerStateLabel(snapshot) {
  if (!snapshot?.installed) {
    return {
      installed: "Missing",
      daemon: "Unavailable",
      message: "Docker CLI is missing.",
    };
  }

  if (!snapshot.daemonRunning) {
    return {
      installed: "Installed",
      daemon: "Stopped",
      message: "Docker daemon is stopped or unavailable.",
    };
  }

  return {
    installed: "Installed",
    daemon: "Running",
    message: "No containers found.",
  };
}

function setDockerDetails(container = null) {
  if (!container) {
    setField("dockerDetailState", "None");
    setDockerDetail("name", "None selected");
    setDockerDetail("status", "Unavailable");
    setDockerDetail("image", "Unavailable");
    setDockerDetail("resources", "Unavailable");
    setDockerDetail("ports", "Unavailable");
    setDockerDetail("uptime", "Unavailable");
    return;
  }

  setField("dockerDetailState", formatDockerValue(container.state || container.status));
  setDockerDetail("name", formatDockerValue(container.name));
  setDockerDetail("status", formatDockerValue(container.status || container.state));
  setDockerDetail("image", formatDockerValue(container.image));
  setDockerDetail("resources", formatDockerResources(container));
  setDockerDetail("ports", formatDockerPorts(container.ports));
  setDockerDetail("uptime", formatDockerValue(container.runningFor || container.createdAt));
}

function selectDockerContainer(containerId) {
  const selectedContainer = findDockerContainer(containerId);
  selectedDockerContainerId = selectedContainer?.id || null;
  setDockerDetails(selectedContainer);

  if (dockerList) {
    [...dockerList.querySelectorAll("tr")].forEach((row) => {
      row.classList.toggle("is-selected", row.dataset.dockerContainerId === selectedDockerContainerId);
    });
  }

  updateDockerActionButtons();
}

function addDockerCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  row.appendChild(cell);
}

function renderDockerRows(containers) {
  clearDockerRows();

  if (!dockerList) {
    return;
  }

  containers.forEach((container) => {
    const row = document.createElement("tr");
    row.dataset.dockerContainerId = container.id || "";
    row.tabIndex = 0;
    row.addEventListener("click", () => selectDockerContainer(container.id));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectDockerContainer(container.id);
      }
    });
    addDockerCell(row, formatDockerValue(container.name));
    addDockerCell(row, formatDockerValue(container.status || container.state));
    addDockerCell(row, formatDockerValue(container.image));
    addDockerCell(row, formatDockerCpu(container));
    addDockerCell(row, formatDockerMemory(container));
    addDockerCell(row, formatDockerPorts(container.ports));
    addDockerCell(row, formatDockerValue(container.runningFor || container.createdAt));
    dockerList.appendChild(row);
  });
}

function renderDockerSnapshot(snapshot) {
  const containers = Array.isArray(snapshot?.containers) ? snapshot.containers : [];
  const state = getDockerStateLabel(snapshot);
  const nextSelectedContainer =
    findDockerContainer(selectedDockerContainerId, snapshot) ||
    containers[0] ||
    null;

  latestDockerSnapshot = snapshot;
  selectedDockerContainerId = nextSelectedContainer?.id || null;

  setField("dockerInstalled", state.installed);
  setField("dockerDaemon", state.daemon);
  setField("dockerRunningContainers", Number.isFinite(snapshot?.summary?.runningContainers) ? snapshot.summary.runningContainers : "Unavailable");
  setField("dockerTotalContainers", Number.isFinite(snapshot?.summary?.totalContainers) ? snapshot.summary.totalContainers : "Unavailable");
  setField("dockerEmptyMessage", state.message);
  setField("dockerLoadingMessage", "Checking Docker daemon status...");
  renderDockerRows(containers);
  selectDockerContainer(selectedDockerContainerId);
  setDockerLoading(false);
  setDockerEmpty(containers.length === 0);
  updateTitlebar();
}

function renderDockerUnavailable(message = "Docker status unavailable.") {
  latestDockerSnapshot = null;
  selectedDockerContainerId = null;
  setField("dockerInstalled", "Unavailable");
  setField("dockerDaemon", "Unavailable");
  setField("dockerRunningContainers", "Unavailable");
  setField("dockerTotalContainers", "Unavailable");
  setField("dockerEmptyMessage", message);
  clearDockerRows();
  setDockerDetails(null);
  setDockerLoading(false);
  setDockerEmpty(true);
  updateDockerActionButtons();
  updateTitlebar();
}

function setFileDetail(name, value) {
  fileDetailFields.forEach((field) => {
    if (field.dataset.fileDetail === name) {
      field.textContent = value;
    }
  });
}

function setFileDetails(entry = null) {
  if (!entry) {
    if (filesDetailsStatus) {
      filesDetailsStatus.textContent = "None";
    }

    setFileDetail("name", "None selected");
    setFileDetail("type", "Unavailable");
    setFileDetail("size", "Unavailable");
    setFileDetail("modified", "Unavailable");
    setFileDetail("path", "Unavailable");
    return;
  }

  if (filesDetailsStatus) {
    filesDetailsStatus.textContent = entry.isDirectory ? "Folder" : "Selected";
  }

  setFileDetail("name", formatFileValue(entry.name));
  setFileDetail("type", formatFileType(entry));
  setFileDetail("size", entry.isDirectory ? "Folder" : formatBytes(entry.size));
  setFileDetail("modified", formatDateTime(entry.modifiedAt));
  setFileDetail("path", formatFileValue(entry.path));
}

function setFileEditorMessage(message) {
  if (fileEditorMessage) {
    fileEditorMessage.textContent = message;
  }
}

function setFileEditorPath(value) {
  setFileEditorName(value ? getFileNameFromPath(value) : null);

  if (fileEditorPath) {
    fileEditorPath.textContent = value || "No file opened";
  }
}

function setFileEditorDirtyIndicator(isDirty) {
  if (fileEditorDirtyIndicator) {
    fileEditorDirtyIndicator.hidden = !isDirty;
  }
}

function getFileEditorLineCount(value) {
  return Math.max(1, String(value || "").split("\n").length);
}

function renderFileEditorLines(value = "") {
  if (!fileEditorLines) {
    return;
  }

  const lineCount = getFileEditorLineCount(value);
  fileEditorLines.replaceChildren();

  for (let index = 1; index <= lineCount; index += 1) {
    const item = document.createElement("li");
    item.textContent = `${index}`;
    fileEditorLines.appendChild(item);
  }
}

function syncFileEditorLineScroll() {
  if (!fileEditor || !fileEditorLines) {
    return;
  }

  fileEditorLines.style.transform = `translateY(${-fileEditor.scrollTop}px)`;
}

function setFileEditorHeight(value) {
  const nextHeight = Math.max(360, Math.min(1100, Number(value) || 560));
  fileEditorHeight = nextHeight;

  if (fileEditorSurface) {
    fileEditorSurface.style.setProperty("--file-editor-height", `${nextHeight}px`);
  }

  if (fileEditorHeightInput) {
    fileEditorHeightInput.value = `${nextHeight}`;
  }

  window.requestAnimationFrame(() => {
    monacoEditorInstance?.layout?.();
  });
}

function hasOpenFileEditorDocument() {
  return Boolean(latestFileDocument?.path);
}

function setFilesViewMode(mode) {
  const nextMode = mode === "edit" && hasOpenFileEditorDocument() ? "edit" : "browse";
  filesViewMode = nextMode;

  if (nextMode !== "edit" && fileEditorPanel) {
    fileEditorPanel.classList.remove("is-fullscreen");
  }

  renderFilesView();
}

function toggleFileEditorFullscreen() {
  if (!fileEditorPanel) {
    return;
  }

  if (!fileEditorPanel.classList.contains("is-fullscreen") && hasOpenFileEditorDocument()) {
    filesViewMode = "edit";
  }

  fileEditorPanel.classList.toggle("is-fullscreen");

  if (fileEditorFullscreenButton) {
    fileEditorFullscreenButton.textContent = fileEditorPanel.classList.contains("is-fullscreen")
      ? "Exit Fullscreen"
      : "Fullscreen Editor";
  }

  renderFilesView();
}

async function copyActiveFilePath() {
  const value = latestFileDocument?.path || selectedFileEntryPath || filesConnectionState.currentPath || "";

  if (!value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    showToast("Remote path copied.");
  } catch {
    showToast(value);
  }
}

function toggleFileEditorWordWrap() {
  if (!latestFileDocument?.supported) {
    return;
  }

  fileEditorWordWrapEnabled = !fileEditorWordWrapEnabled;
  persistFileEditorPreferences();
  updateMonacoEditorOptions();
}

function toggleFileEditorMinimap() {
  if (!latestFileDocument?.supported) {
    return;
  }

  fileEditorMinimapEnabled = !fileEditorMinimapEnabled;
  persistFileEditorPreferences();
  updateMonacoEditorOptions();
  window.requestAnimationFrame(() => {
    monacoEditorInstance?.layout?.();
  });
}

function resetFileEditor(message = "Open a text file to view and edit it here.") {
  disposeMonacoModel();
  latestFileDocument = null;
  filesViewMode = "browse";

  if (fileEditor) {
    fileEditor.value = "";
    fileEditor.disabled = true;
    fileEditor.scrollTop = 0;
  }

  if (fileEditorStatus) {
    fileEditorStatus.textContent = "Read Only";
  }

  setFileEditorDirtyIndicator(false);
  setFileEditorPath(null);
  setMonacoEditorVisibility(false);
  renderFileEditorLines("");
  syncFileEditorLineScroll();
  if (fileEditorPanel) {
    fileEditorPanel.classList.remove("is-fullscreen");
  }
  setFileEditorMessage(message);
  syncFileEditorButtons();
}

function applyFileEditorDocument(documentState) {
  latestFileDocument = documentState;

  if (fileEditor) {
    fileEditor.disabled = !documentState?.supported;
    fileEditor.value = documentState?.supported ? documentState.content || "" : "";
    fileEditor.scrollTop = 0;
  }

  if (fileEditorStatus) {
    fileEditorStatus.textContent = !documentState?.supported
      ? "Unsupported"
      : documentState?.dirty
        ? "Unsaved"
        : "Ready";
  }

  setFileEditorDirtyIndicator(Boolean(documentState?.dirty));
  setFileEditorPath(documentState?.path || selectedFileEntryPath || null);
  renderFileEditorLines(documentState?.supported ? documentState.content || "" : "");
  syncFileEditorLineScroll();
  setFileEditorMessage(documentState?.message || "Open a text file to view and edit it here.");
  setMonacoEditorVisibility(Boolean(documentState?.supported && monacoEditorInstance));
  syncFileEditorButtons();
}

function syncFileEditorDirtyState() {
  if (!latestFileDocument?.supported) {
    return;
  }

  latestFileDocument.content = getFileEditorValue();
  latestFileDocument.dirty = latestFileDocument.content !== latestFileDocument.savedContent;

  if (fileEditorStatus) {
    fileEditorStatus.textContent = latestFileDocument.dirty ? "Unsaved" : "Ready";
  }

  setFileEditorDirtyIndicator(latestFileDocument.dirty);
  setFileEditorPath(latestFileDocument.path || selectedFileEntryPath || null);
  if (!monacoEditorInstance || fileEditorCodeLayer?.hidden) {
    renderFileEditorLines(getFileEditorValue());
    syncFileEditorLineScroll();
  }
  syncFileEditorButtons();
}

function syncFileEditorButtons() {
  const selectedEntry = getSelectedFileEntry(latestFilesListing?.entries || []);
  const canOpenSelectedText = Boolean(filesConnectionState.connected && selectedEntry && !selectedEntry.isDirectory);
  const hasEditableDocument = Boolean(latestFileDocument?.supported && latestFileDocument?.path);
  const isDirty = Boolean(latestFileDocument?.dirty);
  const isBusy = filesRequestInFlight || filesActionRequestInFlight;

  if (fileEditorOpenButton) {
    fileEditorOpenButton.disabled = !canOpenSelectedText || isBusy;
  }

  if (fileEditorSaveButton) {
    fileEditorSaveButton.disabled = !hasEditableDocument || !isDirty || isBusy;
  }

  if (fileEditorRevertButton) {
    fileEditorRevertButton.disabled = !hasEditableDocument || !isDirty || isBusy;
  }

  if (fileEditorCopyPathButton) {
    fileEditorCopyPathButton.disabled = !(latestFileDocument?.path || selectedFileEntryPath);
  }

  if (fileEditorWrapButton) {
    fileEditorWrapButton.disabled = !hasEditableDocument;
  }

  if (fileEditorMinimapButton) {
    fileEditorMinimapButton.disabled = !hasEditableDocument;
  }

  if (fileEditorFullscreenButton) {
    fileEditorFullscreenButton.disabled = !hasEditableDocument && !fileEditorPanel?.classList.contains("is-fullscreen");
  }

  updateFileEditorToggleButtons();
}

function updateFileActionButtons() {
  const selectedEntry = getSelectedFileEntry(latestFilesListing?.entries || []);
  const connected = filesConnectionState.connected;
  const busy = filesRequestInFlight || filesActionRequestInFlight;
  const canBrowse = connected && !busy;
  const canMutate = connected && !busy;
  const canDownload = connected && selectedEntry && !selectedEntry.isDirectory && !busy;
  const hasOpenDocument = hasOpenFileEditorDocument();

  if (filesConnectButton) {
    filesConnectButton.disabled = !filesSelectedProfileId || busy || (connected && filesConnectionState.profileId === filesSelectedProfileId);
  }

  if (filesDisconnectButton) {
    filesDisconnectButton.disabled = !connected || busy;
  }

  if (filesServerSelect) {
    filesServerSelect.disabled = sshProfilesState.servers.length === 0 || busy;
  }

  if (filesProfileSelect) {
    filesProfileSelect.disabled = getFilesFilteredProfiles().length === 0 || busy;
  }

  if (filesPathInput) {
    filesPathInput.disabled = !connected || busy;
  }

  if (filesSearchInput) {
    filesSearchInput.disabled = !connected;
  }

  if (filesGoButton) {
    filesGoButton.disabled = !canBrowse;
  }

  if (filesHomeButton) {
    filesHomeButton.disabled = !canBrowse;
  }

  filesModeButtons.forEach((button) => {
    const mode = button.dataset.filesMode || "browse";
    button.disabled = mode === "edit" && !hasOpenDocument;
    button.classList.toggle("is-active", mode === filesViewMode);
    button.setAttribute("aria-selected", mode === filesViewMode ? "true" : "false");
  });

  fileActionButtons.forEach((button) => {
    if (button === filesGoButton || button === filesHomeButton) {
      return;
    }

    const action = button.dataset.fileAction;

    if (action === "refresh") {
      button.disabled = !connected || busy;
      return;
    }

    if (action === "upload" || action === "new-folder") {
      button.disabled = !canMutate;
      return;
    }

    if (action === "download") {
      button.disabled = !canDownload;
      return;
    }

    button.disabled = !(connected && selectedEntry) || busy;
  });

  syncFileEditorButtons();
}

function setFilesLoading(isLoading, message = "Loading files...") {
  if (filesLoading) {
    filesLoading.hidden = !isLoading;
    const statusText = filesLoading.querySelector("span:last-child");

    if (statusText) {
      statusText.textContent = message;
    }
  }
}

function setFilesEmpty(isVisible, title, message) {
  if (filesEmpty) {
    filesEmpty.hidden = !isVisible;

    const titleTarget = filesEmpty.querySelector("strong");
    const messageTarget = filesEmpty.querySelector("span:last-child");

    if (titleTarget && title) {
      titleTarget.textContent = title;
    }

    if (messageTarget && message) {
      messageTarget.textContent = message;
    }
  }
}

function clearFileRows() {
  if (filesList) {
    filesList.replaceChildren();
  }
}

function normalizeFilesArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatFileValue(value) {
  return value === null || value === undefined || value === "" ? "Unavailable" : String(value);
}

function formatFileType(entry) {
  if (!entry) {
    return "Unavailable";
  }

  if (entry.isDirectory) {
    return "Folder";
  }

  if (entry.type && entry.type !== "file") {
    return formatFileValue(entry.type);
  }

  if (entry.extension) {
    return `${String(entry.extension).toUpperCase()} File`;
  }

  return "File";
}

function normalizeRemotePathValue(value, fallback = "/") {
  const rawValue = String(value || "").trim();
  const fallbackValue = String(fallback || "/").trim() || "/";
  const sourceValue = rawValue || fallbackValue;
  const absoluteValue = sourceValue.startsWith("/") ? sourceValue : `${fallbackValue.replace(/\/+$/, "")}/${sourceValue}`;
  const segments = absoluteValue.split("/").filter(Boolean);
  const normalizedSegments = [];

  segments.forEach((segment) => {
    if (segment === ".") {
      return;
    }

    if (segment === "..") {
      normalizedSegments.pop();
      return;
    }

    normalizedSegments.push(segment);
  });

  return `/${normalizedSegments.join("/")}` || "/";
}

function joinRemotePath(basePath, childName) {
  return normalizeRemotePathValue(`${normalizeRemotePathValue(basePath).replace(/\/+$/, "")}/${String(childName || "").trim()}`);
}

function getRemoteParentPath(remotePath) {
  const normalizedPath = normalizeRemotePathValue(remotePath);

  if (normalizedPath === "/") {
    return "/";
  }

  const parts = normalizedPath.split("/").filter(Boolean);
  parts.pop();
  return parts.length > 0 ? `/${parts.join("/")}` : "/";
}

function isProtectedRemotePathForConfirm(remotePath) {
  const normalizedPath = normalizeRemotePathValue(remotePath);
  return normalizedPath === "/" || ["/etc", "/usr", "/bin"].some((candidate) => normalizedPath === candidate || normalizedPath.startsWith(`${candidate}/`));
}

function compareFileEntries(left, right) {
  if (left.isDirectory !== right.isDirectory) {
    return left.isDirectory ? -1 : 1;
  }

  return String(left.name || "").localeCompare(String(right.name || ""), undefined, { sensitivity: "base" });
}

function getSelectedFileEntry(entries) {
  if (!selectedFileEntryPath) {
    return entries[0] || null;
  }

  return entries.find((entry) => entry.path && entry.path === selectedFileEntryPath) || entries[0] || null;
}

function selectFileEntry(entry) {
  selectedFileEntryPath = entry?.path || null;
  setFileDetails(entry);
  if (!latestFileDocument?.path || latestFileDocument?.path === selectedFileEntryPath) {
    setFileEditorPath(selectedFileEntryPath || null);
  }

  if (!filesList) {
    return;
  }

  [...filesList.querySelectorAll("tr")].forEach((row) => {
    row.classList.toggle("is-selected", row.dataset.filePath === selectedFileEntryPath);
  });

  syncFileEditorButtons();
}

function getFileEntryBadge(entry) {
  if (entry?.isDirectory) {
    return "DIR";
  }

  const lowerName = String(entry?.name || "").toLowerCase();

  if (lowerName === "dockerfile") {
    return "DOC";
  }

  const badgeMap = {
    ".env": "ENV",
    ".json": "{}",
    ".jsonl": "{}",
    ".toml": "CFG",
    ".yml": "YML",
    ".yaml": "YML",
    ".js": "JS",
    ".ts": "TS",
    ".py": "PY",
    ".sh": "SH",
    ".bash": "SH",
    ".md": "MD",
    ".html": "HT",
    ".css": "CS",
  };

  const extension = lowerName.includes(".") ? lowerName.slice(lowerName.lastIndexOf(".")) : "";
  return badgeMap[extension] || "TXT";
}

function buildFileNameCell(entry) {
  const wrapper = document.createElement("div");
  wrapper.className = "file-entry-name";

  const icon = document.createElement("span");
  icon.className = "file-entry-icon";
  icon.textContent = getFileEntryBadge(entry);
  wrapper.appendChild(icon);

  const text = document.createElement("div");
  text.className = "file-entry-name-text";

  const title = document.createElement("strong");
  title.textContent = formatFileValue(entry.name);
  text.appendChild(title);

  const meta = document.createElement("span");
  meta.textContent = entry.isDirectory ? "Folder" : detectMonacoLanguage(entry.path || entry.name);
  text.appendChild(meta);

  wrapper.appendChild(text);
  return wrapper;
}

function addFileCell(row, value) {
  const cell = document.createElement("td");

  if (value instanceof Node) {
    cell.appendChild(value);
  } else {
    cell.textContent = value;
  }

  row.appendChild(cell);
}

function filterFileRows() {
  const query = (filesSearchInput?.value || "").trim().toLowerCase();

  if (!filesList) {
    return;
  }

  [...filesList.querySelectorAll("tr")].forEach((row) => {
    row.hidden = query.length > 0 && !row.textContent.toLowerCase().includes(query);
  });
}

function renderFileRows(entries) {
  clearFileRows();

  if (!filesList) {
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement("tr");
    row.dataset.filePath = entry.path || entry.name || "";
    row.tabIndex = 0;
    row.addEventListener("click", () => selectFileEntry(entry));
    row.addEventListener("dblclick", () => {
      handleFileEntryActivation(entry);
    });
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleFileEntryActivation(entry);
      }

      if (event.key === " ") {
        event.preventDefault();
        selectFileEntry(entry);
      }
    });
    addFileCell(row, buildFileNameCell(entry));
    addFileCell(row, formatFileType(entry));
    addFileCell(row, entry.isDirectory ? "Folder" : formatBytes(entry.size));
    addFileCell(row, formatDateTime(entry.modifiedAt));
    filesList.appendChild(row);
  });

  filterFileRows();
}

function renderFileBreadcrumbs(listing) {
  if (!filesBreadcrumbBar) {
    return;
  }

  const breadcrumbs = normalizeFilesArray(listing?.breadcrumbs);

  filesBreadcrumbBar.replaceChildren();

  const root = document.createElement(filesConnectionState.connected ? "button" : "span");
  root.className = "breadcrumb-root";
  root.textContent = "Files";

  if (filesConnectionState.connected) {
    root.type = "button";
    root.addEventListener("click", () => navigateRemoteDirectory(filesConnectionState.homePath || "/"));
  }

  filesBreadcrumbBar.appendChild(root);

  if (breadcrumbs.length === 0) {
    const separator = document.createElement("span");
    separator.className = "breadcrumb-separator";
    separator.textContent = "/";
    filesBreadcrumbBar.appendChild(separator);

    const fallback = document.createElement("span");
    fallback.textContent = listing?.currentPath || listing?.message || "Unavailable";
    filesBreadcrumbBar.appendChild(fallback);
    return;
  }

  breadcrumbs.forEach((crumb) => {
    const separator = document.createElement("span");
    separator.className = "breadcrumb-separator";
    separator.textContent = "/";
    filesBreadcrumbBar.appendChild(separator);

    const segment = document.createElement(filesConnectionState.connected ? "button" : "span");
    segment.textContent = crumb?.name || crumb?.path || "Folder";

    if (filesConnectionState.connected) {
      segment.type = "button";
      segment.addEventListener("click", () => navigateRemoteDirectory(crumb?.path || filesConnectionState.currentPath));
    }

    filesBreadcrumbBar.appendChild(segment);
  });
}

function renderFolderRoots(listing) {
  if (!filesFolderPanel) {
    return;
  }

  const existingList = filesFolderPanel.querySelector(".folder-tree-list");

  if (existingList) {
    existingList.remove();
  }

  const roots = normalizeFilesArray(listing?.roots);

  if (filesFolderStatus) {
    filesFolderStatus.textContent = listing?.connected ? "Connected" : "Disconnected";
  }

  if (filesFolderEmpty) {
    filesFolderEmpty.hidden = roots.length > 0;

    const titleTarget = filesFolderEmpty.querySelector("strong");
    const messageTarget = filesFolderEmpty.querySelector("span:last-child");

    if (titleTarget) {
      titleTarget.textContent = listing?.connected ? "No folder roots available" : "No filesystem connected";
    }

    if (messageTarget) {
      messageTarget.textContent = listing?.connected
        ? "The file service did not return any folder roots."
        : (listing?.message || "No folder roots are connected.");
    }
  }

  if (roots.length === 0) {
    return;
  }

  const list = document.createElement("ul");
  list.className = "folder-tree-list";

  roots.forEach((root) => {
    const item = document.createElement("li");
    const label = document.createElement("button");
    label.type = "button";
    label.className = "inline-action";
    label.disabled = !filesConnectionState.connected;
    label.textContent = root?.name || root?.path || "Root";
    label.addEventListener("click", () => navigateRemoteDirectory(root?.path || filesConnectionState.homePath || "/"));
    item.appendChild(label);
    list.appendChild(item);
  });

  filesFolderPanel.appendChild(list);
}

function getFilesFilteredProfiles() {
  return sshProfilesState.profiles.filter((profile) => {
    if (!filesSelectedServerId) {
      return true;
    }

    return profile.serverId === filesSelectedServerId;
  });
}

function syncFilesSelectionState() {
  const availableServerIds = new Set(sshProfilesState.servers.map((server) => server.id));

  if (!availableServerIds.has(filesSelectedServerId)) {
    filesSelectedServerId = sshProfilesState.defaultServerId || sshProfilesState.servers[0]?.id || null;
  }

  const filteredProfiles = getFilesFilteredProfiles();

  if (!filteredProfiles.some((profile) => profile.id === filesSelectedProfileId)) {
    filesSelectedProfileId = filteredProfiles[0]?.id || sshProfilesState.defaultProfileId || null;
  }
}

function renderFilesProfileSelectors() {
  syncFilesSelectionState();

  if (filesServerSelect) {
    filesServerSelect.replaceChildren();

    sshProfilesState.servers.forEach((server) => {
      const option = document.createElement("option");
      option.value = server.id;
      option.textContent = server.displayName;
      option.selected = server.id === filesSelectedServerId;
      filesServerSelect.appendChild(option);
    });

    if (sshProfilesState.servers.length === 0) {
      const option = document.createElement("option");
      option.textContent = "No servers configured";
      filesServerSelect.appendChild(option);
    }
  }

  if (filesProfileSelect) {
    filesProfileSelect.replaceChildren();

    const filteredProfiles = getFilesFilteredProfiles();

    filteredProfiles.forEach((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = `${profile.displayName} (${profile.username}@${profile.host}:${profile.port})`;
      option.selected = profile.id === filesSelectedProfileId;
      filesProfileSelect.appendChild(option);
    });

    if (filteredProfiles.length === 0) {
      const option = document.createElement("option");
      option.textContent = "No profiles configured";
      filesProfileSelect.appendChild(option);
    }
  }
}

function getFilesProfileById(profileId) {
  return sshProfilesState.profiles.find((profile) => profile.id === profileId) || null;
}

function getActiveFilesProfile() {
  return getFilesProfileById(filesSelectedProfileId);
}

function setFilesPasswordPromptState(visible, message = "") {
  filesPasswordPromptVisible = visible;

  if (filesPasswordPrompt) {
    filesPasswordPrompt.hidden = !visible;
  }

  if (filesPasswordMessage) {
    filesPasswordMessage.textContent = message || "Password is used for this file session only and is not saved.";
  }

  if (!visible) {
    filesPendingPasswordProfileId = null;

    if (filesPasswordInput) {
      filesPasswordInput.value = "";
    }
  }

  updateFilesStickyOffsets();
}

function focusFilesPasswordPrompt() {
  if (filesPasswordInput) {
    window.requestAnimationFrame(() => {
      filesPasswordInput.focus();
      filesPasswordInput.select?.();
    });
  }
}

function updateFilesConnectionState(nextState = {}) {
  filesConnectionState.connected = Boolean(nextState.connected);
  filesConnectionState.profileId = nextState.profileId || null;
  filesConnectionState.currentPath = nextState.currentPath || null;
  filesConnectionState.homePath = nextState.homePath || null;
  filesConnectionState.status = nextState.status || (filesConnectionState.connected ? "connected" : "disconnected");
  filesConnectionState.message = nextState.message || (filesConnectionState.connected ? "Remote filesystem connected." : "No remote filesystem connected.");

  if (filesPathInput) {
    filesPathInput.value = filesConnectionState.currentPath || filesConnectionState.homePath || "";
  }

  updateTitlebar();
}

function normalizeFileListingForRenderer(listing) {
  if (!listing || typeof listing !== "object") {
    return {
      configured: false,
      connected: false,
      status: "unavailable",
      message: "File service unavailable.",
      currentPath: null,
      roots: [],
      breadcrumbs: [],
      entries: [],
      summary: {
        directoryCount: 0,
        fileCount: 0,
        totalCount: 0,
      },
    };
  }

  const entries = normalizeFilesArray(listing.entries).slice().sort(compareFileEntries);
  const roots = normalizeFilesArray(listing.roots);
  const breadcrumbs = normalizeFilesArray(listing.breadcrumbs);

  return {
    ...listing,
    roots,
    breadcrumbs,
    entries,
    summary: listing.summary && typeof listing.summary === "object"
      ? listing.summary
      : {
          directoryCount: entries.filter((entry) => entry.isDirectory).length,
          fileCount: entries.filter((entry) => !entry.isDirectory).length,
          totalCount: entries.length,
        },
  };
}

function renderFileListing(listing) {
  const normalized = normalizeFileListingForRenderer(listing);
  const entries = normalized.entries;
  const selectedEntry = getSelectedFileEntry(entries);

  updateFilesConnectionState({
    connected: normalized.connected,
    profileId: normalized.profileId || filesSelectedProfileId,
    currentPath: normalized.currentPath || filesConnectionState.currentPath,
    homePath: normalized.homePath || filesConnectionState.homePath,
    status: normalized.status || "connected",
    message: normalized.message || "Remote filesystem connected.",
  });
  latestFilesListing = normalized;
  renderFileBreadcrumbs(normalized);
  renderFolderRoots(normalized);
  renderFileRows(entries);
  selectFileEntry(selectedEntry);
  setFilesLoading(false);

  if (!normalized.connected) {
    setFilesEmpty(true, "File service unavailable", normalized.message || "File service is disconnected.");
    updateFileActionButtons();
    return;
  }

  if (entries.length === 0) {
    setFilesEmpty(true, "No files to show", "This folder is empty.");
    updateFileActionButtons();
    return;
  }

  setFilesEmpty(false, null, null);
  updateFileActionButtons();
}

function renderFileListingUnavailable(message = "File listing unavailable.") {
  latestFilesListing = null;
  selectedFileEntryPath = null;
  updateFilesConnectionState({
    connected: false,
    profileId: filesSelectedProfileId,
    currentPath: null,
    homePath: null,
    status: "disconnected",
    message,
  });
  clearFileRows();
  renderFolderRoots({
    connected: false,
    roots: [],
    message,
  });
  renderFileBreadcrumbs({
    currentPath: null,
    breadcrumbs: [],
    message,
  });
  setFileDetails(null);
  resetFileEditor(message);
  setFilesLoading(false);
  setFilesEmpty(true, "File service unavailable", message);
  updateFileActionButtons();
}

function renderFilesView() {
  if (filesViewMode === "edit" && !hasOpenFileEditorDocument()) {
    filesViewMode = "browse";
  }

  renderFilesProfileSelectors();

  if (fileManagerShell) {
    fileManagerShell.classList.toggle("is-edit-mode", filesViewMode === "edit");
    fileManagerShell.classList.toggle("is-browse-mode", filesViewMode !== "edit");
  }

  if (filesDivider) {
    filesDivider.hidden = filesViewMode !== "edit";
  }

  if (filesFolderStatus) {
    filesFolderStatus.textContent = filesConnectionState.connected ? "Connected" : "Disconnected";
    filesFolderStatus.classList.toggle("is-connected", filesConnectionState.connected);
    filesFolderStatus.classList.toggle("is-disconnected", !filesConnectionState.connected);
  }

  if (filesDetailsStatus) {
    filesDetailsStatus.classList.toggle("is-connected", Boolean(selectedFileEntryPath));
  }

  if (fileEditorFullscreenButton) {
    fileEditorFullscreenButton.textContent = fileEditorPanel?.classList.contains("is-fullscreen")
      ? "Exit Fullscreen"
      : "Fullscreen Editor";
  }

  filesModeButtons.forEach((button) => {
    const active = button.dataset.filesMode === filesViewMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });

  updateFilesStickyOffsets();
  updateFileActionButtons();
  window.requestAnimationFrame(() => {
    monacoEditorInstance?.layout?.();
  });
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

function formatMinecraftState(summary, fallback) {
  const state = summary?.state;

  if (state === null || state === undefined || state === "") {
    return fallback;
  }

  return typeof state === "number" ? `State ${state}` : String(state);
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
    updateTitlebar();
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
    status: formatMinecraftState(snapshot.summary, statusText),
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
  updateTitlebar();
}

async function refreshAmpDashboard() {
  if (ampRequestInFlight) {
    return;
  }

  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasAmp) {
    const message = desktopApiState.hasBridge ? "AMP IPC bridge unavailable." : "Desktop preload bridge unavailable.";
    latestAmpSnapshot = null;
    setField("ampConnection", message);
    setField("ampStatus", "Unavailable");
    setField("ampInstances", "Unavailable");
    setField("ampPlayers", "Unavailable");
    setField("ampUsage", "Unavailable");
    setField("ampRuntime", "Unavailable");
    setField("ampVersion", "Unavailable");
    setField("ampDashboardConnection", message);
    setField("ampDashboardStatus", "Unavailable");
    setField("ampDashboardInstances", "Unavailable");
    setField("ampDashboardUsage", "Unavailable");
    setField("minecraftDashboardSelection", "Unavailable");
    setField("minecraftDashboardPlayers", "Unavailable");
    setField("minecraftDashboardRuntime", "Unavailable");
    setField("minecraftDashboardVersion", "Unavailable");
    setMinecraftPageUnavailable("Unavailable", message);
    markStartupReady("amp");
    updateTitlebar();
    return;
  }

  const activePage = getActivePageName();
  if (lastAmpRefreshAt > 0 && activePage !== "dashboard" && activePage !== "amp" && activePage !== "minecraft") {
    return;
  }

  ampRequestInFlight = true;

  try {
    const snapshot = normalizeAmpSnapshotForRenderer(await desktopApiState.api.amp.getSnapshot());
    latestAmpSnapshot = snapshot;
    ampRendererReceiveCount += 1;
    renderAmpSnapshot(latestAmpSnapshot);
    lastAmpRefreshAt = Date.now();
  } catch (error) {
    const message = `AMP IPC request failed: ${error?.message || "Unknown error"}`;
    latestAmpSnapshot = null;
    setField("ampConnection", message);
    setField("ampStatus", "Unavailable");
    setField("ampInstances", "Unavailable");
    setField("ampPlayers", "Unavailable");
    setField("ampUsage", "Unavailable");
    setField("ampRuntime", "Unavailable");
    setField("ampVersion", "Unavailable");
    setField("ampDashboardConnection", message);
    setField("ampDashboardStatus", "Unavailable");
    setField("ampDashboardInstances", "Unavailable");
    setField("ampDashboardUsage", "Unavailable");
    setField("minecraftDashboardSelection", "Unavailable");
    setField("minecraftDashboardPlayers", "Unavailable");
    setField("minecraftDashboardRuntime", "Unavailable");
    setField("minecraftDashboardVersion", "Unavailable");
    setMinecraftPageUnavailable("Unavailable", message);
    updateTitlebar();
  } finally {
    markStartupReady("amp");
    ampRequestInFlight = false;
  }
}

async function refreshDashboard() {
  const desktopApiState = getDesktopApiState();

  if (systemRequestInFlight || !desktopApiState.hasSystem) {
    setField("osVersion", "Desktop API unavailable");
    return;
  }

  systemRequestInFlight = true;

  try {
    renderSnapshot(await desktopApiState.api.system.getSnapshot());
  } catch {
    showToast("System metrics are unavailable.");
  } finally {
    markStartupReady("system");
    systemRequestInFlight = false;
  }
}

async function refreshPlayitStatus() {
  if (playitRequestInFlight) {
    return;
  }

  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasPlayit) {
    renderPlayitUnavailable(desktopApiState.hasBridge ? "Playit IPC bridge unavailable." : "Desktop preload bridge unavailable.");
    return;
  }

  playitRequestInFlight = true;

  try {
    renderPlayitSnapshot(await desktopApiState.api.playit.getSnapshot());
  } catch (error) {
    renderPlayitUnavailable(`Playit status request failed: ${error?.message || "Unknown error"}`);
  } finally {
    playitRequestInFlight = false;
  }
}

function getDockerActionDefinition(actionName) {
  const definitions = {
    start: {
      actionId: "docker.start",
      confirmLabel: "Start",
      successMessage: "Docker start request sent.",
      allowed: canStartDockerContainer,
    },
    stop: {
      actionId: "docker.stop",
      confirmLabel: "Stop",
      successMessage: "Docker stop request sent.",
      allowed: canStopDockerContainer,
    },
    restart: {
      actionId: "docker.restart",
      confirmLabel: "Restart",
      successMessage: "Docker restart request sent.",
      allowed: canRestartDockerContainer,
    },
  };

  return definitions[actionName] || null;
}

function getDockerContainerLabel(container) {
  return container?.name || container?.id || "this container";
}

function getDockerContainerTarget(container) {
  return container?.id || container?.name || null;
}

function getDockerActionErrorMessage(error) {
  if (typeof error?.message === "string" && error.message.trim() !== "") {
    return error.message.trim();
  }

  return "Docker action failed.";
}

async function refreshDockerStatus() {
  if (dockerRequestInFlight) {
    return;
  }

  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasDocker) {
    renderDockerUnavailable(desktopApiState.hasBridge ? "Docker IPC bridge unavailable." : "Desktop preload bridge unavailable.");
    return;
  }

  dockerRequestInFlight = true;
  setDockerLoading(true);

  try {
    renderDockerSnapshot(await desktopApiState.api.docker.getSnapshot());
  } catch (error) {
    renderDockerUnavailable(`Docker status request failed: ${error?.message || "Unknown error"}`);
  } finally {
    dockerRequestInFlight = false;
    updateDockerActionButtons();
  }
}

async function handleDockerAction(actionName) {
  const definition = getDockerActionDefinition(actionName);
  const selectedContainer = findDockerContainer(selectedDockerContainerId);

  if (!definition || !selectedContainer || !definition.allowed(selectedContainer)) {
    updateDockerActionButtons();
    return;
  }

  const containerLabel = getDockerContainerLabel(selectedContainer);
  const confirmed = window.confirm(`${definition.confirmLabel} ${containerLabel}?`);

  if (!confirmed) {
    return;
  }

  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasActions) {
    showToast("Docker actions are unavailable in this build.");
    updateDockerActionButtons();
    return;
  }

  dockerActionRequestInFlight = true;
  updateDockerActionButtons();

  try {
    const containerTarget = getDockerContainerTarget(selectedContainer);

    if (!containerTarget) {
      showToast("Docker action failed: no container target was selected.");
      return;
    }

    const response = await desktopApiState.api.actions.executeAction(definition.actionId, {
      target: {
        container: containerTarget,
      },
    });

    showToast(response?.error?.message || definition.successMessage);

    if (response?.ok === false || response?.status === "not_implemented" || response?.error) {
      return;
    }

    await refreshDockerStatus();
  } catch (error) {
    showToast(getDockerActionErrorMessage(error));
  } finally {
    dockerActionRequestInFlight = false;
    updateDockerActionButtons();
  }
}

function getFilesRequestProfileId() {
  return filesConnectionState.profileId || filesSelectedProfileId || null;
}

function hasDirtyFileEditor() {
  return Boolean(latestFileDocument?.supported && latestFileDocument?.dirty);
}

function confirmDiscardFileEditor(actionLabel = "continue") {
  if (!hasDirtyFileEditor()) {
    return true;
  }

  return window.confirm(`You have unsaved file changes. Discard them and ${actionLabel}?`);
}

async function refreshFileListing(options = {}) {
  if (filesRequestInFlight) {
    return null;
  }

  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasFiles) {
    renderFileListingUnavailable(desktopApiState.hasBridge ? "Files IPC bridge unavailable." : "Desktop preload bridge unavailable.");
    return null;
  }

  const profileId = options.profileId || getFilesRequestProfileId();

  if (!profileId) {
    renderFileListingUnavailable("No SSH profile is selected for remote file access.");
    return null;
  }

  filesRequestInFlight = true;
  setFilesLoading(true, options.loadingMessage || "Loading current directory...");
  updateFileActionButtons();

  try {
    const listing = await desktopApiState.api.files.list({
      profileId,
      path: options.path || filesConnectionState.currentPath || filesConnectionState.homePath || undefined,
      password: options.password,
    });

    renderFileListing(listing);
    renderFilesView();
    setFilesPasswordPromptState(false);
    return listing;
  } catch (error) {
    const message = error?.message || "Unknown error";

    if (!latestFilesListing || !filesConnectionState.connected) {
      renderFileListingUnavailable(`File listing request failed: ${message}`);
    } else {
      setFilesLoading(false);
      setFilesEmpty(latestFilesListing.entries.length === 0, "No files to show", message);
      updateFilesConnectionState({
        connected: filesConnectionState.connected,
        profileId,
        currentPath: filesConnectionState.currentPath,
        homePath: filesConnectionState.homePath,
        status: "connected",
        message,
      });
      renderFilesView();
      showToast(message);
    }

    return null;
  } finally {
    filesRequestInFlight = false;
    updateFileActionButtons();
  }
}

async function connectFilesSession(options = {}) {
  const desktopApiState = getDesktopApiState();
  const profile = getActiveFilesProfile();
  const switchingProfiles = Boolean(filesConnectionState.connected && filesConnectionState.profileId && filesConnectionState.profileId !== profile?.id);

  if (!desktopApiState.hasFiles || !profile || filesRequestInFlight) {
    if (!desktopApiState.hasFiles) {
      renderFileListingUnavailable(desktopApiState.hasBridge ? "Files IPC bridge unavailable." : "Desktop preload bridge unavailable.");
    }
    return;
  }

  if (switchingProfiles && !confirmDiscardFileEditor(`switch to ${profile.displayName || profile.host}`)) {
    return;
  }

  if (profile.authType === "password" && filesPendingPasswordProfileId !== profile.id && !options.password) {
    filesPendingPasswordProfileId = profile.id;
    setFilesPasswordPromptState(true, `Enter the password for ${profile.username}@${profile.host}.`);
    updateFilesConnectionState({
      connected: false,
      profileId: profile.id,
      currentPath: null,
      homePath: null,
      status: "disconnected",
      message: `Password required for ${profile.username}@${profile.host}.`,
    });
    renderFilesView();
    focusFilesPasswordPrompt();
    return;
  }

  const listing = await refreshFileListing({
    profileId: profile.id,
    path: filesConnectionState.connected && filesConnectionState.profileId === profile.id
      ? filesConnectionState.currentPath || filesConnectionState.homePath
      : undefined,
    password: options.password,
    loadingMessage: `Connecting to ${profile.displayName || profile.host}...`,
  });

  if (listing?.connected) {
    if (switchingProfiles) {
      resetFileEditor("Open a text file to view and edit it here.");
    }
    showToast(`Connected to ${profile.displayName || profile.host}.`);
  }
}

async function disconnectFilesSession() {
  const desktopApiState = getDesktopApiState();
  const profileId = getFilesRequestProfileId();

  if (!desktopApiState.hasFiles || !profileId) {
    return;
  }

  if (!confirmDiscardFileEditor("disconnect")) {
    return;
  }

  filesActionRequestInFlight = true;
  updateFileActionButtons();

  try {
    await desktopApiState.api.files.disconnect(profileId);
  } catch {}
  finally {
    renderFileListingUnavailable("Remote filesystem disconnected.");
    setFilesPasswordPromptState(false);
    renderFilesView();
    showToast("Remote filesystem disconnected.");
    filesActionRequestInFlight = false;
    updateFileActionButtons();
  }
}

async function navigateRemoteDirectory(remotePath) {
  if (!filesConnectionState.connected) {
    return;
  }

  const nextPath = normalizeRemotePathValue(remotePath, filesConnectionState.currentPath || filesConnectionState.homePath || "/");

  if (nextPath !== (filesConnectionState.currentPath || filesConnectionState.homePath || "/") && !confirmDiscardFileEditor(`open ${nextPath}`)) {
    return;
  }

  await refreshFileListing({
    profileId: getFilesRequestProfileId(),
    path: nextPath,
    loadingMessage: "Loading remote directory...",
  });
}

function getUnsupportedFileMessage(reason) {
  if (reason === "file_too_large") {
    return "This file is larger than 1 MB and is not opened in the inline editor.";
  }

  if (reason === "binary_unsupported") {
    return "Binary files are not shown in the inline text editor.";
  }

  return "This file cannot be opened in the inline editor.";
}

async function openRemoteTextFile(entry = getSelectedFileEntry(latestFilesListing?.entries || [])) {
  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasFiles || !entry || entry.isDirectory || !filesConnectionState.connected) {
    return;
  }

  if (latestFileDocument?.path !== entry.path && !confirmDiscardFileEditor(`open ${entry.name}`)) {
    return;
  }

  if (!confirmOpenSensitiveFile(entry)) {
    return;
  }

  filesActionRequestInFlight = true;
  setFileEditorMessage(`Opening ${entry.name}...`);
  updateFileActionButtons();

  try {
    const payload = await desktopApiState.api.files.readText({
      profileId: getFilesRequestProfileId(),
      path: entry.path,
    });

    if (!payload?.supported) {
      disposeMonacoModel();
      setMonacoEditorVisibility(false);
      applyFileEditorDocument({
        path: entry.path,
        supported: false,
        content: "",
        savedContent: "",
        dirty: false,
        message: getUnsupportedFileMessage(payload?.reason),
      });
      return;
    }

    try {
      const monaco = await ensureMonacoEditor();
      disposeMonacoModel();
      monacoEditorStateSyncPaused = true;
      monacoEditorModel = monaco.editor.createModel(payload.content || "", detectMonacoLanguage(payload.path || entry.path));
      monacoEditorInstance.setModel(monacoEditorModel);
      monacoEditorStateSyncPaused = false;
      monacoEditorInstance.setScrollTop(0);
      monacoEditorInstance.setScrollLeft(0);
      setMonacoEditorVisibility(true);
    } catch (error) {
      setMonacoEditorVisibility(false);
      showToast(error?.message || "Monaco editor could not be loaded. Using the fallback editor.");
    }

    applyFileEditorDocument({
      path: payload.path || entry.path,
      supported: true,
      content: payload.content || "",
      savedContent: payload.content || "",
      dirty: false,
      message: `Editing ${payload.path || entry.path}`,
    });
    filesViewMode = "edit";
    renderFilesView();
    window.requestAnimationFrame(() => {
      focusFileEditor();
    });
  } catch (error) {
    resetFileEditor(error?.message || "Remote file could not be opened.");
    showToast(error?.message || "Remote file could not be opened.");
  } finally {
    filesActionRequestInFlight = false;
    updateFileActionButtons();
  }
}

async function saveRemoteTextFile() {
  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasFiles || !latestFileDocument?.supported || !latestFileDocument?.path) {
    return;
  }

  const nextContent = getFileEditorValue();

  filesActionRequestInFlight = true;
  updateFileActionButtons();

  try {
    await desktopApiState.api.files.writeText({
      profileId: getFilesRequestProfileId(),
      path: latestFileDocument.path,
      content: nextContent,
    });

    latestFileDocument.savedContent = nextContent;
    latestFileDocument.content = nextContent;
    latestFileDocument.dirty = false;
    latestFileDocument.message = `Saved ${latestFileDocument.path}`;
    applyFileEditorDocument(latestFileDocument);
    await refreshFileListing({
      profileId: getFilesRequestProfileId(),
      path: filesConnectionState.currentPath || filesConnectionState.homePath || "/",
      loadingMessage: "Refreshing remote directory...",
    });
    showToast("Remote file saved.");
  } catch (error) {
    showToast(error?.message || "Remote file could not be saved.");
  } finally {
    filesActionRequestInFlight = false;
    updateFileActionButtons();
  }
}

function revertRemoteTextFile() {
  if (!latestFileDocument?.supported) {
    return;
  }

  setFileEditorValue(latestFileDocument.savedContent || "");

  latestFileDocument.content = latestFileDocument.savedContent || "";
  latestFileDocument.dirty = false;
  latestFileDocument.message = `Reverted ${latestFileDocument.path}`;
  applyFileEditorDocument(latestFileDocument);
}

async function handleFileEntryActivation(entry) {
  if (!entry) {
    return;
  }

  if (entry.isDirectory) {
    await navigateRemoteDirectory(entry.path);
    return;
  }

  await openRemoteTextFile(entry);
}

async function runFileMutation(actionName, payload, successMessage, refreshPath) {
  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasFiles) {
    return null;
  }

  filesActionRequestInFlight = true;
  updateFileActionButtons();

  try {
    const result = await desktopApiState.api.files[actionName](payload);

    if (result?.canceled) {
      return result;
    }

    if (refreshPath) {
      await refreshFileListing({
        profileId: payload.profileId,
        path: refreshPath,
        loadingMessage: "Refreshing remote directory...",
      });
    }

    if (successMessage) {
      showToast(successMessage);
    }

    return result;
  } catch (error) {
    showToast(error?.message || "Remote file action failed.");
    return null;
  } finally {
    filesActionRequestInFlight = false;
    updateFileActionButtons();
  }
}

async function createRemoteFolder() {
  if (!filesConnectionState.connected) {
    return;
  }

  const folderName = window.prompt("New folder name");

  if (!folderName) {
    return;
  }

  selectedFileEntryPath = joinRemotePath(filesConnectionState.currentPath || filesConnectionState.homePath || "/", folderName);

  await runFileMutation(
    "mkdir",
    {
      profileId: getFilesRequestProfileId(),
      path: selectedFileEntryPath,
    },
    "Remote folder created.",
    filesConnectionState.currentPath || filesConnectionState.homePath || "/",
  );
}

async function renameRemoteEntry() {
  const entry = getSelectedFileEntry(latestFilesListing?.entries || []);

  if (!entry) {
    return;
  }

  const nextName = window.prompt(`Rename ${entry.name} to`, entry.name);

  if (!nextName || nextName === entry.name) {
    return;
  }

  const nextPath = joinRemotePath(getRemoteParentPath(entry.path), nextName);
  selectedFileEntryPath = nextPath;

  await runFileMutation(
    "rename",
    {
      profileId: getFilesRequestProfileId(),
      oldPath: entry.path,
      newPath: nextPath,
    },
    "Remote item renamed.",
    filesConnectionState.currentPath || filesConnectionState.homePath || "/",
  );

  if (latestFileDocument?.path === entry.path) {
    latestFileDocument.path = nextPath;
    latestFileDocument.message = `Editing ${nextPath}`;
    applyFileEditorDocument(latestFileDocument);
  }
}

async function deleteRemoteEntry() {
  const entry = getSelectedFileEntry(latestFilesListing?.entries || []);

  if (!entry) {
    return;
  }

  if (latestFileDocument?.path === entry.path && !confirmDiscardFileEditor(`delete ${entry.name}`)) {
    return;
  }

  let confirmDangerous = false;

  if (isProtectedRemotePathForConfirm(entry.path)) {
    const typed = window.prompt(`Protected path detected.\nType DELETE ${entry.path} to confirm.`, "");

    if (typed !== `DELETE ${entry.path}`) {
      showToast("Protected delete canceled.");
      return;
    }

    confirmDangerous = true;
  } else if (!window.confirm(`Delete ${entry.name}? This cannot be undone.`)) {
    return;
  }

  selectedFileEntryPath = null;

  await runFileMutation(
    "delete",
    {
      profileId: getFilesRequestProfileId(),
      path: entry.path,
      confirmDangerous,
    },
    "Remote item deleted.",
    filesConnectionState.currentPath || filesConnectionState.homePath || "/",
  );

  if (latestFileDocument?.path === entry.path) {
    resetFileEditor("Open a text file to view and edit it here.");
  }
}

async function uploadRemoteFile() {
  if (!filesConnectionState.connected) {
    return;
  }

  const result = await runFileMutation(
    "upload",
    {
      profileId: getFilesRequestProfileId(),
      directoryPath: filesConnectionState.currentPath || filesConnectionState.homePath || "/",
    },
    "Remote upload complete.",
    filesConnectionState.currentPath || filesConnectionState.homePath || "/",
  );

  if (result?.canceled) {
    showToast("Upload canceled.");
  }
}

async function downloadRemoteFile() {
  const entry = getSelectedFileEntry(latestFilesListing?.entries || []);

  if (!entry || entry.isDirectory) {
    return;
  }

  const result = await runFileMutation(
    "download",
    {
      profileId: getFilesRequestProfileId(),
      path: entry.path,
    },
    "Remote download complete.",
    null,
  );

  if (result?.canceled) {
    showToast("Download canceled.");
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

function logSafeSshDebug(message, details = {}) {
  console.info(`[SSH] ${message}`, details);
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

function getSshSessionList() {
  return [...sshSessions.values()];
}

function getActiveSshSession() {
  return activeSshSessionId ? sshSessions.get(activeSshSessionId) || null : null;
}

function getActiveSshProfile() {
  return sshProfilesState.profiles.find((profile) => profile.id === sshSelectedProfileId) || null;
}

function setSshPasswordPromptState(visible, message = "") {
  sshPasswordPromptVisible = visible;

  if (sshPasswordPrompt) {
    sshPasswordPrompt.hidden = !visible;
  }

  if (sshPasswordMessage) {
    sshPasswordMessage.textContent = message || "Password is used for this session only and is not saved.";
  }

  if (!visible) {
    sshPendingPasswordProfileId = null;

    if (sshPasswordInput) {
      sshPasswordInput.value = "";
    }
  }
}

function focusSshPasswordPrompt() {
  if (sshPasswordInput) {
    window.requestAnimationFrame(() => {
      sshPasswordInput.focus();
      sshPasswordInput.select?.();
    });
  }
}

function getSshProfileFormValues() {
  return {
    name: sshProfileNameInput?.value || "",
    host: sshProfileHostInput?.value || "",
    port: sshProfilePortInput?.value || "22",
    username: sshProfileUsernameInput?.value || "",
    authType: sshProfileAuthSelect?.value || "password",
    privateKeyPath: sshProfilePrivateKeyInput?.value || "",
  };
}

function resetSshProfileForm() {
  if (sshProfileNameInput) {
    sshProfileNameInput.value = "Debian";
  }

  if (sshProfileHostInput) {
    sshProfileHostInput.value = "192.168.1.134";
  }

  if (sshProfilePortInput) {
    sshProfilePortInput.value = "22";
  }

  if (sshProfileUsernameInput) {
    sshProfileUsernameInput.value = "anx";
  }

  if (sshProfileAuthSelect) {
    sshProfileAuthSelect.value = "password";
  }

  if (sshProfilePrivateKeyInput) {
    sshProfilePrivateKeyInput.value = "";
  }

  syncSshProfileAuthField();
}

function setSshProfileFormVisible(visible) {
  sshProfileFormVisible = visible;

  if (sshProfileForm) {
    sshProfileForm.hidden = !visible;
  }

  if (sshProfileToggleButton) {
    sshProfileToggleButton.textContent = visible ? "Close" : "New Session";
  }

  if (visible) {
    window.requestAnimationFrame(() => {
      sshProfileNameInput?.focus();
      sshProfileNameInput?.select?.();
    });
  }
}

function syncSshProfileAuthField() {
  const needsPrivateKey = (sshProfileAuthSelect?.value || "password") === "privateKey";

  if (sshPrivateKeyField) {
    sshPrivateKeyField.hidden = !needsPrivateKey;
  }
}

function getSshProfileById(profileId) {
  return sshProfilesState.profiles.find((profile) => profile.id === profileId) || null;
}

function stripAnsi(value) {
  return String(value || "").replace(
    /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g,
    "",
  );
}

function normalizeSshOutput(value) {
  return stripAnsi(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function getSshRenderableRows(session) {
  if (!session) {
    return [];
  }

  return session.partialLine ? [...session.outputLines, session.partialLine] : [...session.outputLines];
}

function getSshRows() {
  return getSshRenderableRows(getActiveSshSession());
}

function setSshStatus(status, message = "") {
  if (sshStatusLabel) {
    sshStatusLabel.textContent = status;
  }

  if (sshStatusDot) {
    const isConnected = status === "Connected";
    const isConnecting = status === "Connecting";
    const isError = status === "Error";
    sshStatusDot.style.background = isConnected
      ? "var(--success)"
      : isConnecting
        ? "var(--caution)"
        : isError
          ? "var(--danger)"
          : "var(--line)";
    sshStatusDot.style.boxShadow = isConnected
      ? "0 0 0 6px rgba(69, 224, 143, 0.14)"
      : isConnecting
        ? "0 0 0 6px rgba(245, 196, 81, 0.14)"
        : isError
          ? "0 0 0 6px rgba(240, 86, 86, 0.14)"
          : "0 0 0 6px rgba(37, 45, 60, 0.24)";
  }

  if (sshLoading) {
    const messageTarget = sshLoading.querySelector("span:last-child");

    if (messageTarget && message) {
      messageTarget.textContent = message;
    }
  }

  if (sshEmpty) {
    const messageTarget = sshEmpty.querySelector("span:last-child");

    if (messageTarget && message) {
      messageTarget.textContent = message;
    }
  }

  updateTitlebar();
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

function syncSshScrollMode() {
  if (sshAutoscrollInput?.checked && sshTerminalWindow) {
    sshTerminalWindow.scrollTop = sshTerminalWindow.scrollHeight;
  }
}

function renderSshOutput(session) {
  if (!sshOutputList) {
    return;
  }

  sshOutputList.replaceChildren();

  getSshRenderableRows(session).forEach((rowText) => {
    const row = document.createElement("li");
    row.textContent = rowText || " ";
    sshOutputList.appendChild(row);
  });

  updateSshActions();
  syncSshScrollMode();
}

function clearSshOutput() {
  const session = getActiveSshSession();

  if (!session) {
    if (sshOutputList) {
      sshOutputList.replaceChildren();
    }

    updateSshActions();
    return;
  }

  session.outputLines = [];
  session.partialLine = "";
  renderSshOutput(session);
  renderSshView();
}

function getSshShellInputValue() {
  return sshKeyboardMode ? sshKeyboardInputBuffer : sshCommandInput?.value || "";
}

async function copySshOutput() {
  const output = getSshRows().join("\n");

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

function toggleSshFullscreen() {
  if (!sshTerminalCard) {
    return;
  }

  sshTerminalCard.classList.toggle("is-fullscreen");
  window.requestAnimationFrame(() => {
    resizeActiveSshSession();
    syncSshScrollMode();
  });
}

function createLocalSshSession(sessionSnapshot) {
  return {
    ...sessionSnapshot,
    outputLines: [],
    partialLine: "",
  };
}

function mergeSshSessionSnapshot(sessionSnapshot) {
  const existing = sshSessions.get(sessionSnapshot.id);
  const nextValue = existing
    ? {
        ...existing,
        ...sessionSnapshot,
      }
    : createLocalSshSession(sessionSnapshot);

  sshSessions.set(sessionSnapshot.id, nextValue);
  return nextValue;
}

function appendSshOutput(sessionId, chunk) {
  const session = sshSessions.get(sessionId);

  if (!session) {
    return;
  }

  const normalizedChunk = normalizeSshOutput(chunk);
  const parts = normalizedChunk.split("\n");

  if (parts.length === 1) {
    session.partialLine += parts[0];
  } else {
    session.partialLine += parts[0];
    session.outputLines.push(session.partialLine);

    for (let index = 1; index < parts.length - 1; index += 1) {
      session.outputLines.push(parts[index]);
    }

    session.partialLine = parts[parts.length - 1];
  }

  if (session.outputLines.length > SSH_OUTPUT_LINE_LIMIT) {
    session.outputLines = session.outputLines.slice(-SSH_OUTPUT_LINE_LIMIT);
  }

  if (sessionId === activeSshSessionId) {
    renderSshOutput(session);
    renderSshView();
  }
}

function getSshSessionStatusLabel(session) {
  if (sshConnectRequestInFlight && !session) {
    return "Connecting";
  }

  if (!session) {
    return "Disconnected";
  }

  if (session.status === "connected") {
    return "Connected";
  }

  if (session.status === "connecting") {
    return "Connecting";
  }

  if (session.status === "error") {
    return "Error";
  }

  return "Disconnected";
}

function getSshSessionMessage(session) {
  if (sshTransientStatusMessage) {
    return sshTransientStatusMessage;
  }

  if (!session) {
    return "No SSH session is connected.";
  }

  return session.message || (session.status === "connected" ? `Connected to ${session.label}.` : "SSH session is disconnected.");
}

function getSshFilteredProfiles() {
  return sshProfilesState.profiles.filter((profile) => {
    if (!sshSelectedServerId) {
      return true;
    }

    return profile.serverId === sshSelectedServerId;
  });
}

function syncSshSelectionState() {
  const availableServerIds = new Set(sshProfilesState.servers.map((server) => server.id));

  if (!availableServerIds.has(sshSelectedServerId)) {
    sshSelectedServerId = sshProfilesState.defaultServerId || sshProfilesState.servers[0]?.id || null;
  }

  const filteredProfiles = getSshFilteredProfiles();

  if (!filteredProfiles.some((profile) => profile.id === sshSelectedProfileId)) {
    sshSelectedProfileId = filteredProfiles[0]?.id || sshProfilesState.defaultProfileId || null;
  }
}

function renderSshProfileSelectors() {
  syncSshSelectionState();

  if (sshServerSelect) {
    sshServerSelect.replaceChildren();

    sshProfilesState.servers.forEach((server) => {
      const option = document.createElement("option");
      option.value = server.id;
      option.textContent = server.displayName;
      option.selected = server.id === sshSelectedServerId;
      sshServerSelect.appendChild(option);
    });

    if (sshProfilesState.servers.length === 0) {
      const option = document.createElement("option");
      option.textContent = "No servers configured";
      sshServerSelect.appendChild(option);
    }
  }

  if (sshProfileSelect) {
    sshProfileSelect.replaceChildren();

    const filteredProfiles = getSshFilteredProfiles();

    filteredProfiles.forEach((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = `${profile.displayName} (${profile.username}@${profile.host}:${profile.port})`;
      option.selected = profile.id === sshSelectedProfileId;
      sshProfileSelect.appendChild(option);
    });

    if (filteredProfiles.length === 0) {
      const option = document.createElement("option");
      option.textContent = "No profiles configured";
      sshProfileSelect.appendChild(option);
    }
  }
}

function renderSshSessionTabs() {
  if (!sshSessionTabs) {
    return;
  }

  sshSessionTabs.replaceChildren();
  const sessions = getSshSessionList();

  if (sessions.length === 0) {
    const draftTab = document.createElement("button");
    draftTab.className = "ssh-tab is-active";
    draftTab.type = "button";
    draftTab.role = "tab";
    draftTab.setAttribute("aria-selected", "true");
    draftTab.textContent = "New Session";
    sshSessionTabs.appendChild(draftTab);
  } else {
    sessions.forEach((session) => {
      const tab = document.createElement("button");
      tab.className = `ssh-tab${session.id === activeSshSessionId ? " is-active" : ""}`;
      tab.type = "button";
      tab.role = "tab";
      tab.setAttribute("aria-selected", session.id === activeSshSessionId ? "true" : "false");
      tab.textContent = session.label;
      tab.addEventListener("click", () => {
        activeSshSessionId = session.id;

        if (session.serverId) {
          sshSelectedServerId = session.serverId;
        }

        if (session.profileId) {
          sshSelectedProfileId = session.profileId;
        }

        renderSshView();
      });
      sshSessionTabs.appendChild(tab);
    });
  }

  const addTab = document.createElement("button");
  addTab.className = `ssh-tab${activeSshSessionId === null ? " is-active" : ""}`;
  addTab.type = "button";
  addTab.role = "tab";
  addTab.setAttribute("aria-selected", activeSshSessionId === null ? "true" : "false");
  addTab.textContent = "+";
  addTab.disabled = sshProfilesState.profiles.length === 0;
  addTab.addEventListener("click", () => {
    activeSshSessionId = null;
    renderSshView();
  });
  sshSessionTabs.appendChild(addTab);
}

function renderSshView() {
  renderSshProfileSelectors();
  renderSshSessionTabs();

  const session = getActiveSshSession();
  const hasProfiles = sshProfilesState.profiles.length > 0;
  const canConnect = hasProfiles && !sshConnectRequestInFlight && (!session || (session.status !== "connected" && session.status !== "connecting"));
  const canDisconnect = Boolean(session && (session.status === "connected" || session.status === "connecting"));
  const canSend = Boolean(session && session.status === "connected");
  const hasOutput = getSshRenderableRows(session).length > 0;

  if (sshServerSelect) {
    sshServerSelect.disabled = sshProfilesState.servers.length === 0 || sshConnectRequestInFlight;
  }

  if (sshProfileSelect) {
    sshProfileSelect.disabled = getSshFilteredProfiles().length === 0 || sshConnectRequestInFlight;
  }

  if (sshProfileToggleButton) {
    sshProfileToggleButton.disabled = sshConnectRequestInFlight;
  }

  if (sshConnectButton) {
    sshConnectButton.disabled = !canConnect;
  }

  if (sshDisconnectButton) {
    sshDisconnectButton.disabled = !canDisconnect;
  }

  if (sshCommandInput) {
    sshCommandInput.disabled = !canSend;
    sshCommandInput.placeholder = canSend
      ? sshKeyboardMode
        ? "Live keyboard mode enabled"
        : `Connected to ${session.label}`
      : "Connect to enable command input";

    if (sshKeyboardMode) {
      sshCommandInput.value = sshKeyboardInputBuffer;
    }
  }

  if (sshCommandSendButton) {
    sshCommandSendButton.disabled = !canSend;
  }

  if (sshPasswordInput) {
    sshPasswordInput.disabled = sshConnectRequestInFlight;
  }

  if (sshPasswordSubmitButton) {
    sshPasswordSubmitButton.disabled = sshConnectRequestInFlight;
  }

  if (sshPasswordCancelButton) {
    sshPasswordCancelButton.disabled = sshConnectRequestInFlight;
  }

  if (sshLoading) {
    sshLoading.hidden = !(sshConnectRequestInFlight || session?.status === "connecting");
  }

  if (sshEmpty) {
    sshEmpty.hidden = hasOutput || sshConnectRequestInFlight || session?.status === "connecting" || session?.status === "connected";
  }

  setSshStatus(getSshSessionStatusLabel(session), getSshSessionMessage(session));
  renderSshOutput(session);
}

function measureSshTerminalSize() {
  const width = sshTerminalWindow?.clientWidth || 960;
  const height = sshTerminalWindow?.clientHeight || 480;
  const cols = Math.max(40, Math.floor((width - 28) / 8));
  const rows = Math.max(12, Math.floor((height - 28) / 18));

  return { cols, rows };
}

async function resizeActiveSshSession() {
  const session = getActiveSshSession();
  const desktopApiState = getDesktopApiState();

  if (!session || session.status !== "connected" || !desktopApiState.hasSsh) {
    return;
  }

  const size = measureSshTerminalSize();

  try {
    await desktopApiState.api.ssh.resize(session.id, size);
  } catch {}
}

async function loadSshProfiles(options = {}) {
  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasSsh) {
    setSshStatus("Disconnected", desktopApiState.hasBridge ? "SSH IPC bridge unavailable." : "Desktop preload bridge unavailable.");
    renderSshView();
    renderFilesView();
    return;
  }

  try {
    const payload = await desktopApiState.api.ssh.listProfiles();
    logSafeSshDebug("Profiles loaded.", {
      configPath: payload?.configPath || null,
      profileCount: Array.isArray(payload?.profiles) ? payload.profiles.length : 0,
      serverCount: Array.isArray(payload?.servers) ? payload.servers.length : 0,
    });
    sshProfilesState.servers = Array.isArray(payload?.servers) ? payload.servers : [];
    sshProfilesState.profiles = Array.isArray(payload?.profiles) ? payload.profiles : [];
    sshProfilesState.defaultServerId = payload?.defaultServerId || sshProfilesState.servers[0]?.id || null;
    sshProfilesState.defaultProfileId = payload?.defaultProfileId || sshProfilesState.profiles[0]?.id || null;

    if (options.profileId) {
      const savedProfile = sshProfilesState.profiles.find((profile) => profile.id === options.profileId) || null;

      if (savedProfile) {
        sshSelectedProfileId = savedProfile.id;
        sshSelectedServerId = savedProfile.serverId || sshSelectedServerId;
      }
    }

    syncSshSelectionState();
    syncFilesSelectionState();
    renderSshView();
    renderFilesView();
  } catch (error) {
    setSshStatus("Disconnected", `SSH profiles unavailable: ${error?.message || "Unknown error"}`);
    console.error("[SSH] Profile load failed.", {
      message: error?.message || "Unknown error",
    });
    renderSshView();
    renderFilesView();
  }
}

async function saveSshProfile(event) {
  event?.preventDefault?.();
  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasSsh || typeof desktopApiState.api?.ssh?.saveProfile !== "function") {
    sshTransientStatusMessage = "SSH profile saving is unavailable.";
    renderSshView();
    showToast("SSH profile saving is unavailable.");
    return;
  }

  try {
    const payload = getSshProfileFormValues();
    const result = await desktopApiState.api.ssh.saveProfile(payload);
    logSafeSshDebug("Profile saved.", {
      configPath: result?.profiles?.configPath || null,
      profileId: result?.profile?.id || null,
      profileName: result?.profile?.displayName || payload.name || null,
    });
    await loadSshProfiles({
      profileId: result?.profile?.id || null,
    });
    sshTransientStatusMessage = `Saved SSH profile ${result?.profile?.displayName || payload.name}.`;
    setSshProfileFormVisible(false);
    renderSshView();
    showToast("SSH profile saved.");
  } catch (error) {
    sshTransientStatusMessage = error?.message || "SSH profile could not be saved.";
    console.error("[SSH] Profile save failed.", {
      message: error?.message || "Unknown error",
    });
    renderSshView();
    showToast(error?.message || "SSH profile could not be saved.");
  }
}

function ensureSshEventSubscription() {
  if ((sshDataUnsubscribe || sshStatusUnsubscribe) || !getDesktopApiState().hasSsh) {
    return;
  }

  sshStatusUnsubscribe = getDesktopApiState().api.ssh.onStatus((payload) => {
    if (payload?.type === "session-updated" && payload.session) {
      const session = mergeSshSessionSnapshot(payload.session);
      sshTransientStatusMessage = session.message || "";

      if (!activeSshSessionId && session.status === "connected") {
        activeSshSessionId = session.id;
      }

      if (!activeSshSessionId) {
        activeSshSessionId = session.id;
      }

      if (session.status === "connected") {
        setSshPasswordPromptState(false);
      }

      renderSshView();
      return;
    }

    if (payload?.type === "session-error") {
      const session = sshSessions.get(payload.sessionId);

      if (session) {
        session.status = "error";
        session.message = payload.message || "SSH session failed.";
      }

       sshTransientStatusMessage = payload.message || "SSH session failed.";

      if (payload?.message) {
        showToast(payload.message);
      }

      renderSshView();
      return;
    }

    if (payload?.type === "session-closed") {
      const session = sshSessions.get(payload.sessionId);

      if (session) {
        session.status = "disconnected";
        session.message = payload.message || "SSH session disconnected.";
      }

      sshTransientStatusMessage = payload.message || "SSH session disconnected.";

      renderSshView();
    }
  });

  sshDataUnsubscribe = getDesktopApiState().api.ssh.onData((payload) => {
    if (payload?.sessionId && typeof payload.chunk === "string") {
      appendSshOutput(payload.sessionId, payload.chunk);
    }
  });
}

async function connectSshSession(options = {}) {
  const desktopApiState = getDesktopApiState();
  const profile = getActiveSshProfile();

  if (!desktopApiState.hasSsh || !profile || sshConnectRequestInFlight) {
    if (!desktopApiState.hasSsh) {
      sshTransientStatusMessage = desktopApiState.hasBridge ? "SSH bridge unavailable." : "Desktop preload bridge unavailable.";
      renderSshView();
    }
    return;
  }

  if (profile.authType === "password" && sshPendingPasswordProfileId !== profile.id) {
    sshPendingPasswordProfileId = profile.id;
    setSshPasswordPromptState(true, `Enter the password for ${profile.username}@${profile.host}.`);
    sshTransientStatusMessage = `Password required for ${profile.username}@${profile.host}.`;
    renderSshView();
    focusSshPasswordPrompt();
    return;
  }

  const password = typeof options.password === "string" ? options.password : "";

  if (profile.authType === "password") {
    if (!password) {
      setSshPasswordPromptState(true, "Password required before connecting.");
      sshTransientStatusMessage = "Password required before connecting.";
      renderSshView();
      focusSshPasswordPrompt();
      return;
    }
  }

  sshConnectRequestInFlight = true;
  sshTransientStatusMessage = `Connecting to ${profile.username}@${profile.host}:${profile.port}...`;
  renderSshView();

  try {
    const session = await desktopApiState.api.ssh.connect({
      profileId: profile.id,
      password,
      ...measureSshTerminalSize(),
    });

    setSshPasswordPromptState(false);
    mergeSshSessionSnapshot(session);
    activeSshSessionId = session.id;
    sshTransientStatusMessage = session.message || `Connected to ${session.label}.`;
    renderSshView();
  } catch (error) {
    setSshPasswordPromptState(true, error?.message || "SSH connection failed.");
    sshTransientStatusMessage = error?.message || "SSH connection failed.";
    showToast(error?.message || "SSH connection failed.");
    renderSshView();
  } finally {
    sshConnectRequestInFlight = false;
    renderSshView();
  }
}

async function disconnectSshSession() {
  const desktopApiState = getDesktopApiState();
  const session = getActiveSshSession();

  if (!desktopApiState.hasSsh || !session) {
    return;
  }

  try {
    await desktopApiState.api.ssh.disconnect(session.id);
    session.status = "disconnected";
    session.message = "SSH session disconnected.";
    sshTransientStatusMessage = "SSH session disconnected.";
    renderSshView();
  } catch (error) {
    sshTransientStatusMessage = error?.message || "SSH disconnect failed.";
    showToast(error?.message || "SSH disconnect failed.");
  }
}

async function sendSshCommand(commandText) {
  const desktopApiState = getDesktopApiState();
  const session = getActiveSshSession();
  const command = typeof commandText === "string" ? commandText : "";

  if (!desktopApiState.hasSsh || !session || session.status !== "connected" || !command) {
    return;
  }

  try {
    await desktopApiState.api.ssh.write(session.id, `${command}\n`);
  } catch (error) {
    showToast(error?.message || "SSH command failed.");
  }
}

async function writeSshInput(input) {
  const desktopApiState = getDesktopApiState();
  const session = getActiveSshSession();
  const data = typeof input === "string" ? input : "";

  if (!desktopApiState.hasSsh || !session || session.status !== "connected" || !data) {
    return false;
  }

  try {
    await desktopApiState.api.ssh.write(session.id, data);
    return true;
  } catch (error) {
    showToast(error?.message || "SSH input failed.");
    return false;
  }
}

async function disconnectAllSshListeners() {
  sshDataUnsubscribe?.();
  sshStatusUnsubscribe?.();
  sshDataUnsubscribe = null;
  sshStatusUnsubscribe = null;
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

function getAgentSettingInputValue(input) {
  return typeof input?.value === "string" ? input.value : "";
}

function setAgentSettingInputValue(input, value) {
  if (!input) {
    return;
  }

  input.value = value !== undefined && value !== null ? value : "";
}

function getAgentSettingsFormValues() {
  const settings = { ...DEFAULT_AGENT_SETTINGS };

  agentSettingsInputs.forEach((input) => {
    settings[input.dataset.agentSetting] = getAgentSettingInputValue(input);
  });

  return settings;
}

function setAgentActionButtonsDisabled(disabled) {
  if (agentSettingsSaveButton) {
    agentSettingsSaveButton.disabled = disabled;
  }

  if (agentSettingsTestButton) {
    agentSettingsTestButton.disabled = disabled;
  }
}

function setAgentConnectionDisplay(status, message, options = {}) {
  agentConnectionState = status;

  if (agentConnectionPill) {
    const connected = status === "connected";
    const testing = status === "testing";
    agentConnectionPill.textContent = testing ? "Testing..." : connected ? "Connected" : "Disconnected";
    agentConnectionPill.classList.toggle("is-connected", connected);
    agentConnectionPill.classList.toggle("is-disconnected", !connected && !testing);
  }

  if (agentConnectionMessage) {
    agentConnectionMessage.textContent = message;
  }

  if (agentConfigSource && options.configSourceText) {
    agentConfigSource.textContent = options.configSourceText;
  }

  updateTitlebar();
}

function getAgentConfigSourceText(settingsPayload) {
  const configPath = settingsPayload?.configPath || "config/agent.json";
  const overrides = settingsPayload?.overrides || {};
  const activeOverrides = [];

  if (overrides.backendMode) {
    activeOverrides.push("Backend Mode");
  }

  if (overrides.agentUrl) {
    activeOverrides.push("Agent URL");
  }

  if (overrides.agentToken) {
    activeOverrides.push("Agent Token");
  }

  if (activeOverrides.length === 0) {
    return `Saved in ${configPath}.`;
  }

  return `Saved in ${configPath}. Environment overrides active for ${activeOverrides.join(", ")}.`;
}

function renderAgentSettings(settingsPayload) {
  const storedSettings = {
    ...DEFAULT_AGENT_SETTINGS,
    ...(settingsPayload?.stored || {}),
  };

  agentSettingsInputs.forEach((input) => {
    setAgentSettingInputValue(input, storedSettings[input.dataset.agentSetting]);
  });

  setAgentConnectionDisplay(
    "disconnected",
    "Use Test Connection to verify the current Agent settings.",
    {
      configSourceText: getAgentConfigSourceText(settingsPayload),
    },
  );
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
  refreshPlayitStatus();
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

async function loadAgentSettings() {
  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasSettings) {
    setAgentActionButtonsDisabled(true);
    setAgentConnectionDisplay(
      "disconnected",
      desktopApiState.hasBridge
        ? "Agent settings are unavailable in this desktop build."
        : "Desktop preload bridge unavailable.",
      { configSourceText: "Saved Agent settings are unavailable." },
    );
    return;
  }

  agentSettingsRequestInFlight = true;
  setAgentActionButtonsDisabled(true);

  try {
    renderAgentSettings(await desktopApiState.api.settings.getAgentConfig());
    await testAgentConnection({ silent: true });
  } catch {
    setAgentConnectionDisplay("disconnected", "Agent settings could not be loaded.", {
      configSourceText: "Saved Agent settings are unavailable.",
    });
  } finally {
    agentSettingsRequestInFlight = false;
    setAgentActionButtonsDisabled(false);
  }
}

async function saveAgentConfiguration() {
  if (agentSettingsRequestInFlight) {
    return;
  }

  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasSettings) {
    showToast("Agent settings are unavailable.");
    return;
  }

  agentSettingsRequestInFlight = true;
  setAgentActionButtonsDisabled(true);

  try {
    const response = await desktopApiState.api.settings.saveAgentConfig(getAgentSettingsFormValues());
    renderAgentSettings(response);
    showToast("Agent settings saved.");
    await testAgentConnection({ silent: true });
  } catch {
    showToast("Agent settings could not be saved.");
  } finally {
    agentSettingsRequestInFlight = false;
    setAgentActionButtonsDisabled(false);
  }
}

async function testAgentConnection(options = {}) {
  if (agentConnectionTestInFlight) {
    return;
  }

  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasSettings) {
    if (!options.silent) {
      showToast("Agent connection test is unavailable.");
    }
    return;
  }

  agentConnectionTestInFlight = true;
  setAgentActionButtonsDisabled(true);
  setAgentConnectionDisplay("testing", "Checking the Agent health endpoint...");

  try {
    const result = await desktopApiState.api.settings.testAgentConnection(getAgentSettingsFormValues());
    setAgentConnectionDisplay(result?.connected ? "connected" : "disconnected", result?.message || "Agent unavailable.");

    if (!options.silent) {
      showToast(result?.connected ? "Agent connected." : "Agent unavailable.");
    }
  } catch {
    setAgentConnectionDisplay("disconnected", "Agent unavailable.");

    if (!options.silent) {
      showToast("Agent unavailable.");
    }
  } finally {
    agentConnectionTestInFlight = false;
    setAgentActionButtonsDisabled(agentSettingsRequestInFlight);
  }
}

function setAboutFields(info) {
  aboutFields.forEach((field) => {
    const value = info?.[field.dataset.aboutField];
    field.textContent = value || "Unavailable";
  });
}

async function loadRuntimeInfo() {
  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasApp) {
    setAboutFields(null);
    return;
  }

  try {
    setAboutFields(await desktopApiState.api.app.getRuntimeInfo());
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

async function toggleWindowMaximize() {
  const windowApi = getDesktopWindowApi();

  if (!windowApi) {
    return;
  }

  if (titlebarWindowIsMaximized) {
    windowApi.restore();
    return;
  }

  windowApi.maximize();
}

titlebarWindowButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const windowApi = getDesktopWindowApi();
    const action = button.dataset.windowAction;

    if (!windowApi || !action) {
      return;
    }

    if (action === "maximize") {
      toggleWindowMaximize();
      return;
    }

    windowApi[action]?.();
  });
});

(titlebarDragSurface || titlebar)?.addEventListener("dblclick", (event) => {
  if (event.target.closest("button, input, textarea, select, a")) {
    return;
  }

  toggleWindowMaximize();
});

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
sshServerSelect?.addEventListener("change", () => {
  sshSelectedServerId = sshServerSelect.value || null;
  setSshPasswordPromptState(false);
  sshTransientStatusMessage = "";
  syncSshSelectionState();
  renderSshView();
});
sshProfileSelect?.addEventListener("change", () => {
  sshSelectedProfileId = sshProfileSelect.value || null;
  setSshPasswordPromptState(false);
  sshTransientStatusMessage = "";
  renderSshView();
});
sshConnectButton?.addEventListener("click", connectSshSession);
sshDisconnectButton?.addEventListener("click", disconnectSshSession);
sshProfileToggleButton?.addEventListener("click", () => {
  if (!sshProfileFormVisible) {
    resetSshProfileForm();
  }

  setSshProfileFormVisible(!sshProfileFormVisible);
});
sshProfileCancelButton?.addEventListener("click", () => {
  setSshProfileFormVisible(false);
});
sshProfileAuthSelect?.addEventListener("change", syncSshProfileAuthField);
sshProfileSaveButton?.addEventListener("click", () => {
  sshProfileForm?.requestSubmit();
});
sshProfileForm?.addEventListener("submit", saveSshProfile);
sshPasswordSubmitButton?.addEventListener("click", () => connectSshSession({ password: sshPasswordInput?.value || "" }));
sshPasswordCancelButton?.addEventListener("click", () => {
  setSshPasswordPromptState(false);
  sshTransientStatusMessage = "SSH connection canceled.";
  renderSshView();
});
sshPasswordInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    connectSshSession({ password: sshPasswordInput.value || "" });
  }
});
sshCommandInput?.addEventListener("focus", () => {
  sshKeyboardMode = true;
  sshKeyboardInputBuffer = sshCommandInput.value || "";
  renderSshView();
});
sshCommandInput?.addEventListener("blur", () => {
  sshKeyboardMode = false;
  sshKeyboardInputBuffer = "";
  renderSshView();
});
sshCommandInput?.addEventListener("keydown", async (event) => {
  const session = getActiveSshSession();

  if (!session || session.status !== "connected") {
    return;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    await writeSshInput("\t");
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    await writeSshInput("\n");
    sshKeyboardInputBuffer = "";
    if (sshCommandInput) {
      sshCommandInput.value = "";
    }
    return;
  }

  if (event.key === "Backspace") {
    if (sshKeyboardInputBuffer) {
      sshKeyboardInputBuffer = sshKeyboardInputBuffer.slice(0, -1);
    }

    await writeSshInput("\b");
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    await writeSshInput("\u001b");
    return;
  }

  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
    const arrowMap = {
      ArrowUp: "\u001b[A",
      ArrowDown: "\u001b[B",
      ArrowRight: "\u001b[C",
      ArrowLeft: "\u001b[D",
    };
    await writeSshInput(arrowMap[event.key] || "");
    return;
  }

  if (event.ctrlKey || event.metaKey || event.altKey) {
    if (event.ctrlKey && !event.altKey && !event.metaKey && event.key.length === 1) {
      event.preventDefault();
      await writeSshInput(String.fromCharCode(event.key.toUpperCase().charCodeAt(0) - 64));
    }
    return;
  }

  if (event.key.length === 1) {
    sshKeyboardInputBuffer += event.key;
    await writeSshInput(event.key);
  }
});
sshCommandForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const command = getSshShellInputValue();

  if (!command.trim()) {
    return;
  }

  if (sshKeyboardMode) {
    await writeSshInput("\n");
  } else {
    await sendSshCommand(command);
  }

  if (sshCommandInput) {
    sshCommandInput.value = "";
  }

  sshKeyboardInputBuffer = "";
});
updateSshActions();
resetSshProfileForm();
ensureSshEventSubscription();
loadSshProfiles();
window.addEventListener("resize", () => {
  resizeActiveSshSession();
  updateFilesStickyOffsets();
  monacoEditorInstance?.layout?.();
});
window.addEventListener("mousemove", (event) => {
  updateFilesDividerDrag(event.clientX);
});
window.addEventListener("mouseup", () => {
  stopFilesDividerDrag();
});
window.addEventListener("beforeunload", () => {
  windowMaximizedUnsubscribe?.();
  stopFilesDividerDrag();
  disposeMonacoEditorResources();
  disconnectAllSshListeners();
});
filesServerSelect?.addEventListener("change", () => {
  filesSelectedServerId = filesServerSelect.value || null;
  setFilesPasswordPromptState(false);
  syncFilesSelectionState();
  renderFilesView();
});
filesProfileSelect?.addEventListener("change", () => {
  filesSelectedProfileId = filesProfileSelect.value || null;
  setFilesPasswordPromptState(false);
  renderFilesView();
});
filesConnectButton?.addEventListener("click", () => connectFilesSession());
filesDisconnectButton?.addEventListener("click", disconnectFilesSession);
filesPasswordSubmitButton?.addEventListener("click", () => connectFilesSession({ password: filesPasswordInput?.value || "" }));
filesPasswordCancelButton?.addEventListener("click", () => {
  setFilesPasswordPromptState(false);
  renderFilesView();
});
filesPasswordInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    connectFilesSession({ password: filesPasswordInput.value || "" });
  }
});
filesModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setFilesViewMode(button.dataset.filesMode || "browse");
  });
});
filesPathInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    navigateRemoteDirectory(filesPathInput.value || filesConnectionState.currentPath || "/");
  }
});
filesGoButton?.addEventListener("click", () => {
  navigateRemoteDirectory(filesPathInput?.value || filesConnectionState.currentPath || "/");
});
filesHomeButton?.addEventListener("click", () => {
  navigateRemoteDirectory(filesConnectionState.homePath || "/");
});
filesSearchInput?.addEventListener("input", filterFileRows);
filesRefreshButton?.addEventListener("click", () => {
  refreshFileListing({
    profileId: getFilesRequestProfileId(),
    path: filesConnectionState.currentPath || filesConnectionState.homePath || "/",
  });
});
document.querySelector('[data-file-action="upload"]')?.addEventListener("click", uploadRemoteFile);
document.querySelector('[data-file-action="download"]')?.addEventListener("click", downloadRemoteFile);
document.querySelector('[data-file-action="rename"]')?.addEventListener("click", renameRemoteEntry);
document.querySelector('[data-file-action="delete"]')?.addEventListener("click", deleteRemoteEntry);
document.querySelector('[data-file-action="new-folder"]')?.addEventListener("click", createRemoteFolder);
fileEditorOpenButton?.addEventListener("click", () => openRemoteTextFile());
fileEditorSaveButton?.addEventListener("click", saveRemoteTextFile);
fileEditorRevertButton?.addEventListener("click", revertRemoteTextFile);
fileEditorCopyPathButton?.addEventListener("click", copyActiveFilePath);
fileEditorWrapButton?.addEventListener("click", toggleFileEditorWordWrap);
fileEditorMinimapButton?.addEventListener("click", toggleFileEditorMinimap);
fileEditorFullscreenButton?.addEventListener("click", toggleFileEditorFullscreen);
fileEditorHeightInput?.addEventListener("input", () => {
  setFileEditorHeight(fileEditorHeightInput.value);
});
filesDivider?.addEventListener("mousedown", (event) => {
  event.preventDefault();
  startFilesDividerDrag(event.clientX);
});
filesDivider?.addEventListener("dblclick", () => {
  setFilesExplorerWidth(DEFAULT_FILES_EXPLORER_WIDTH);
});
fileEditor?.addEventListener("input", syncFileEditorDirtyState);
fileEditor?.addEventListener("scroll", syncFileEditorLineScroll);
fileEditor?.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveRemoteTextFile();
  }
});
window.addEventListener("keydown", (event) => {
  if (
    !event.defaultPrevented &&
    getActivePageName() === "files" &&
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "s" &&
    latestFileDocument?.supported
  ) {
    event.preventDefault();
    saveRemoteTextFile();
  }
});
filesExplorerWidth = readFilesExplorerWidth();
const fileEditorPreferences = readFileEditorPreferences();
fileEditorWordWrapEnabled = fileEditorPreferences.wordWrap;
fileEditorMinimapEnabled = fileEditorPreferences.minimap;
setFilesExplorerWidth(filesExplorerWidth, { persist: false });
setFileEditorHeight(fileEditorHeight);
resetFileEditor();
renderFilesView();
dockerSearchInput?.setAttribute("disabled", "");
dockerFilterSelect?.setAttribute("disabled", "");
dockerRefreshButton?.addEventListener("click", refreshDockerStatus);
dockerStartButton?.addEventListener("click", () => handleDockerAction("start"));
dockerStopButton?.addEventListener("click", () => handleDockerAction("stop"));
dockerRestartButton?.addEventListener("click", () => handleDockerAction("restart"));
updateDockerActionButtons();
settingsInputs.forEach((input) => {
  input.addEventListener("input", saveSettings);
  input.addEventListener("change", saveSettings);
});
settingsResetButton?.addEventListener("click", resetSettings);
agentSettingsSaveButton?.addEventListener("click", saveAgentConfiguration);
agentSettingsTestButton?.addEventListener("click", () => testAgentConnection());
windowMaximizedUnsubscribe = getDesktopWindowApi()?.onMaximizedChanged?.((isMaximized) => {
  setTitlebarWindowState(isMaximized);
}) || null;
syncTitlebarWindowState();
loadSettings();
loadAgentSettings();
applySettings(readStoredSettings(), { openDefaultPage: true });
loadRuntimeInfo();
startStartupFallback();

registerRefreshTask(updateLocalTime, 30000);
registerRefreshTask(refreshDashboard, 1000);
registerRefreshTask(refreshAmpDashboard, AMP_REFRESH_INTERVAL_MS);
registerRefreshTask(refreshPlayitStatus, 5000);
registerRefreshTask(refreshDockerStatus, 5000);
