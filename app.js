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
const consoleSourceSearchInput = document.querySelector("[data-console-source-search]");
const consoleSourceList = document.querySelector("[data-console-source-list]");
const consoleSourceEmpty = document.querySelector("[data-console-source-empty]");
const consoleTabs = document.querySelector("[data-console-tabs]");
const consoleFilterButtons = document.querySelectorAll("[data-console-filter]");
const consoleCrashBanner = document.querySelector("[data-console-crash-banner]");
const consoleShowErrorsButton = document.querySelector("[data-console-show-errors]");
const consoleTitle = document.querySelector("[data-console-title]");
const consoleCommandForm = document.querySelector("[data-console-command-form]");
const consoleCommandInput = document.querySelector("[data-console-command]");
const consoleSendButton = document.querySelector("[data-console-send]");
const consoleStateBadge = document.querySelector("[data-console-state]");
const consoleMetricFields = document.querySelectorAll("[data-console-metric]");
const consoleDetailFields = document.querySelectorAll("[data-console-detail]");
const consoleStatusFields = document.querySelectorAll("[data-console-status]");
const consoleActivityList = document.querySelector("[data-console-activity]");
const consoleActionButtons = document.querySelectorAll("[data-console-action]");
const consoleNavButtons = document.querySelectorAll("[data-console-nav]");
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
const instancesDetailsPanel = document.querySelector(".instances-details-panel");
const instancesList = document.querySelector("[data-instances-list]");
const instancesLoading = document.querySelector("[data-instances-loading]");
const instancesEmpty = document.querySelector("[data-instances-empty]");
const instancesDetailFields = document.querySelectorAll("[data-instance-detail]");
const instancesSearchInput = document.querySelector("[data-instances-search]");
const instancesLogStreamSelect = document.querySelector("[data-instances-log-stream]");
const instancesLogLimitSelect = document.querySelector("[data-instances-log-limit]");
const instanceActionButtons = document.querySelectorAll("[data-instance-action]");
const instancesRefreshButton = document.querySelector('[data-instance-action="refresh"]');
const instancesCreateToggleButton = document.querySelector('[data-instance-action="create"]');
const instancesStartButton = document.querySelector('[data-instance-action="start"]');
const instancesStopButton = document.querySelector('[data-instance-action="stop"]');
const instancesRestartButton = document.querySelector('[data-instance-action="restart"]');
const instancesDeleteButton = document.querySelector('[data-instance-action="delete"]');
const instancesLogsButton = document.querySelector('[data-instance-action="logs"]');
const instanceCreateForm = document.querySelector("[data-instance-create-form]");
const instanceCreateSubmitButton = document.querySelector("[data-instance-create-submit]");
const instanceFormInputs = document.querySelectorAll("[data-instance-form]");
const instanceTypeSelect = document.querySelector('[data-instance-form="type"]');
const instanceEntrypointField = document.querySelector("[data-instance-entrypoint-field]");
const instanceFormMessage = document.querySelector("[data-instance-form-message]");
const instancesLogList = document.querySelector("[data-instances-logs]");
const instancesLogEmpty = document.querySelector("[data-instances-log-empty]");
const instancesLogCount = document.querySelector("[data-instances-log-count]");
const instanceTemplateButtons = document.querySelectorAll("[data-instance-template]");
const instanceCustomFields = document.querySelectorAll("[data-instance-custom-field]");
const instanceTabs = document.querySelectorAll("[data-instance-tab]");
const instanceTabPanels = document.querySelectorAll("[data-instance-panel]");
const instanceConsoleSearchInput = document.querySelector("[data-instance-console-search]");
const instanceConsoleAutoscrollInput = document.querySelector("[data-instance-console-autoscroll]");
const instanceConsolePauseInput = document.querySelector("[data-instance-console-pause]");
const instanceConsoleForm = document.querySelector("[data-instance-console-form]");
const instanceConsoleCommandInput = document.querySelector("[data-instance-console-command]");
const instanceConsoleViewer = document.querySelector(".instance-console-viewer");
const instanceConfigForm = document.querySelector("[data-instance-config-form]");
const instanceConfigInputs = document.querySelectorAll("[data-instance-config]");
const instanceConfigSaveButton = document.querySelector("[data-instance-config-save]");
const instanceConfigCancelButton = document.querySelector("[data-instance-config-cancel]");
const instanceConfigDirtyLabel = document.querySelector("[data-instance-config-dirty]");
const instanceMinecraftSettings = document.querySelector("[data-instance-minecraft-settings]");
const instanceMinecraftSummary = document.querySelector("[data-instance-minecraft-summary]");
const instanceMinecraftSummaryFields = document.querySelectorAll("[data-minecraft-summary]");
const instanceAppProfile = document.querySelector("[data-instance-app-profile]");
const instanceAppIcon = document.querySelector("[data-instance-app-icon]");
const instanceAppName = document.querySelector("[data-instance-app-name]");
const instanceAppDescription = document.querySelector("[data-instance-app-description]");
const minecraftPropertyInputs = document.querySelectorAll("[data-minecraft-property]");
const instanceNetworkList = document.querySelector("[data-instance-network-list]");
const instanceNetworkPortInput = document.querySelector("[data-instance-network-port]");
const instanceNetworkAddButton = document.querySelector("[data-instance-network-add]");
const instanceNetworkSummary = document.querySelector("[data-instance-network-summary]");
const instanceNetworkDetails = document.querySelectorAll("[data-instance-network-detail]");
const instanceRawJson = document.querySelector("[data-instance-raw-json]");
const instanceAdvancedInputs = document.querySelectorAll("[data-instance-advanced]");
const instanceFilesList = document.querySelector("[data-instance-files-list]");
const instanceFilePathLabel = document.querySelector("[data-instance-file-path]");
const instanceFileEditor = document.querySelector("[data-instance-file-editor]");
const instanceFileEditorName = document.querySelector("[data-instance-file-editor-name]");
const instanceFileEditorMeta = document.querySelector("[data-instance-file-editor-meta]");
const instanceFileEditorState = document.querySelector("[data-instance-file-editor-state]");
const instanceFileDropzone = document.querySelector("[data-instance-file-dropzone]");
const instanceFileShortcuts = document.querySelector("[data-instance-file-shortcuts]");
const instanceConsoleFilterSelect = document.querySelector("[data-instance-console-filter]");
const instanceBackupTitle = document.querySelector("[data-instance-backup-title]");
const instanceBackupDescription = document.querySelector("[data-instance-backup-description]");
const instanceBackupEmptyTitle = document.querySelector("[data-instance-backup-empty-title]");
const instanceBackupEmptyMessage = document.querySelector("[data-instance-backup-empty-message]");
const marketplaceSearchInput = document.querySelector("[data-marketplace-search]");
const marketplaceCategories = document.querySelector("[data-marketplace-categories]");
const marketplaceRefreshButton = document.querySelector("[data-marketplace-refresh]");
const marketplaceGrid = document.querySelector("[data-marketplace-grid]");
const marketplaceLoading = document.querySelector("[data-marketplace-loading]");
const marketplaceEmpty = document.querySelector("[data-marketplace-empty]");
const marketplaceSelectedName = document.querySelector("[data-marketplace-selected-name]");
const marketplaceSelectedMeta = document.querySelector("[data-marketplace-selected-meta]");
const marketplaceInstallState = document.querySelector("[data-marketplace-install-state]");
const marketplaceWizard = document.querySelector("[data-marketplace-wizard]");
const marketplaceWizardSteps = document.querySelector("[data-marketplace-wizard-steps]");
const marketplaceFields = document.querySelectorAll("[data-marketplace-field]");
const marketplaceInstallButton = document.querySelector("[data-marketplace-install]");
const marketplaceCancelButton = document.querySelector("[data-marketplace-cancel]");
const marketplaceMessage = document.querySelector("[data-marketplace-message]");
const marketplaceProgress = document.querySelector("[data-marketplace-progress]");
const downloadRefreshButton = document.querySelector("[data-download-refresh]");
const downloadList = document.querySelector("[data-download-list]");
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
const appWorkspace = document.querySelector("[data-app-workspace]");
const sidebar = document.querySelector("[data-sidebar]");
const sidebarHeader = document.querySelector(".sidebar-header");
const sidebarBrand = document.querySelector(".brand");
const sidebarBrandCopy = document.querySelector(".brand-copy");
const sidebarToggleButton = document.querySelector("[data-sidebar-toggle]");
const sidebarToggleIcon = sidebarToggleButton?.querySelector("svg") || null;
const sidebarFooter = document.querySelector("[data-sidebar-footer]");
const sidebarFooterCopy = document.querySelector(".sidebar-footer__copy");
const sidebarNavLabels = document.querySelectorAll(".nav-item__label");
const appNameTargets = document.querySelectorAll("[data-app-name]");
const sidebarTitleTarget = document.querySelector("[data-sidebar-title]");
const startupMessage = document.querySelector("[data-startup-message]");
const startupDetail = document.querySelector("[data-startup-detail]");
const playitStatusCard = document.querySelector("[data-playit-status-card]");
const playitStatusPill = document.querySelector("[data-playit-status-pill]");
const ampPanelLink = document.querySelector("[data-amp-panel-link]");
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
const sshWorkspaceStatusFields = document.querySelectorAll("[data-ssh-status]");
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
let instancesRequestInFlight = false;
let instanceActionRequestInFlight = false;
let instanceLogsRequestInFlight = false;
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
let lastLoggedAmpUrlSource = null;
let latestInstancesSnapshot = null;
let latestInstanceMetrics = null;
let marketplaceRequestInFlight = false;
let marketplaceInstallInFlight = false;
let marketplaceCatalog = { categories: [], templates: [] };
let marketplaceSelectedTemplateId = null;
let marketplaceActiveCategory = "All";
let selectedInstanceId = null;
let staleInstanceIdsLoaded = false;
let instanceCreateFormVisible = false;
let lastMissingInstanceNoticeAt = 0;
let lastStaleInstanceRemovedNoticeAt = 0;
let activeInstanceTab = "overview";
let latestMinecraftProperties = {};
let instanceConfigSnapshot = "";
let instanceMinecraftSnapshot = "";
let instanceCurrentFilePath = ".";
let selectedInstanceFilePath = null;
let openedInstanceFilePath = null;
let openedInstanceFileSavedContent = "";
let latestFilesListing = null;
let latestFileDocument = null;
let selectedDockerContainerId = null;
let selectedFileEntryPath = null;
let activeSshSessionId = null;
const refreshTaskIds = [];
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
let sidebarCollapsed = false;
let sidebarHoverExpanded = false;
let sidebarHoverExpansionLocked = false;
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
let activeConsoleInstanceId = null;
let activeConsoleFilter = "all";
let consoleOpenInstanceIds = [];
let consoleBufferedEntries = [];
let consoleLogsRequestInFlight = false;
let consoleSuppressAutoSelect = false;
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
const SIDEBAR_STATE_STORAGE_KEY = "anxos.sidebar.v1";
const FILES_EXPLORER_WIDTH_STORAGE_KEY = "anxos.files.explorerWidth.v1";
const FILES_EDITOR_PREFS_STORAGE_KEY = "anxos.files.editorPrefs.v1";
const INSTANCE_TAB_STORAGE_KEY = "anxos.instances.activeTab.v1";
const LAST_PAGE_STORAGE_KEY = "anxos.navigation.lastPage.v1";
const LAST_INSTANCE_STORAGE_KEY = "anxos.instances.lastSelected.v1";
const STALE_INSTANCE_STORAGE_KEY = "anxos.instances.staleIds.v1";
const staleInstanceIds = new Set();
const instanceRemovalAllowedIds = new Set();
const PRIMARY_NAVIGATION_ORDER = [
  "dashboard",
  "marketplace",
  "instances",
  "docker",
  "files",
  "ssh",
  "playit",
  "console",
  "backups",
  "settings",
];
const LEGACY_PRIMARY_PAGES = new Set(["minecraft", "amp", "coolpals"]);
const INSTANCE_WORKSPACE_PROFILES = [
  {
    id: "minecraft",
    label: "Minecraft Server",
    icon: "MC",
    description: "Minecraft servers use the shared instance workspace with server.properties, console commands, files, networking, and backups.",
    fileShortcuts: ["server.properties", "eula.txt", "plugins", "mods", "config", "world", "logs", "whitelist.json", "ops.json", "banned-players.json", "banned-ips.json"],
    backupTitle: "Minecraft Backups",
    backupDescription: "Back up worlds, plugins, mods, configuration, and logs through the shared backup system.",
    matches: (instance) => {
      const searchable = [instance?.type, ...(Array.isArray(instance?.tags) ? instance.tags : [])].join(" ").toLowerCase();
      return searchable.includes("minecraft") || instance?.type === "minecraft-paper";
    },
  },
  {
    id: "discord-bot",
    label: "Discord Bot",
    icon: "BOT",
    description: "Bot instances share console, logs, files, environment, and restart controls.",
    matches: (instance) => [instance?.id, instance?.displayName, ...(Array.isArray(instance?.tags) ? instance.tags : [])].join(" ").toLowerCase().includes("discord"),
  },
  {
    id: "node",
    label: "Node.js Application",
    icon: "JS",
    description: "Node.js applications share the runtime console, files, environment, networking, and process metrics.",
    matches: (instance) => instance?.type === "node-app",
  },
  {
    id: "python",
    label: "Python Application",
    icon: "PY",
    description: "Python applications share the runtime console, files, environment, networking, and process metrics.",
    matches: (instance) => instance?.type === "python-app",
  },
  {
    id: "java",
    label: "Java Application",
    icon: "JAR",
    description: "Java services share jar configuration, JVM arguments, console, files, and metrics.",
    matches: (instance) => instance?.type === "java-app",
  },
  {
    id: "database",
    label: "Database Service",
    icon: "DB",
    description: "Database templates share process metrics, logs, files, ports, and backup entry points.",
    matches: (instance) => [instance?.type, instance?.id, instance?.displayName, ...(Array.isArray(instance?.tags) ? instance.tags : [])].join(" ").toLowerCase().match(/\b(postgresql|mariadb|redis|database)\b/),
  },
  {
    id: "application",
    label: "Application",
    icon: "APP",
    description: "Marketplace applications use the shared workspace for lifecycle, logs, files, metrics, and networking.",
    matches: (instance) => [instance?.id, instance?.displayName, ...(Array.isArray(instance?.tags) ? instance.tags : [])].join(" ").toLowerCase().match(/\b(jellyfin|immich|gitea|grafana|prometheus|nextcloud|uptime-kuma)\b/),
  },
];
const DEFAULT_APP_NAME = "AnxOS Control Center";
const DEFAULT_ACCENT_COLOR = "#b66cff";
const DEFAULT_AGENT_URL = "http://127.0.0.1:47131";
const DEFAULT_FILES_EXPLORER_WIDTH = 320;
const MIN_FILES_EXPLORER_WIDTH = 220;
const MAX_FILES_EXPLORER_WIDTH = 520;
const SIDEBAR_EXPANDED_WIDTH = 248;
const SIDEBAR_COLLAPSED_WIDTH = 72;
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
    hasMarketplace:
      typeof api?.marketplace?.listTemplates === "function" &&
      typeof api?.marketplace?.installTemplate === "function" &&
      typeof api?.marketplace?.getDownloads === "function" &&
      typeof api?.marketplace?.cancelDownload === "function" &&
      typeof api?.marketplace?.retryDownload === "function",
    hasInstances:
      typeof api?.instances?.list === "function" &&
      typeof api?.instances?.create === "function" &&
      typeof api?.instances?.update === "function" &&
      typeof api?.instances?.getStatus === "function" &&
      typeof api?.instances?.getMetrics === "function" &&
      typeof api?.instances?.getLogs === "function" &&
      typeof api?.instances?.clearLogs === "function" &&
      typeof api?.instances?.sendCommand === "function" &&
      typeof api?.instances?.start === "function" &&
      typeof api?.instances?.stop === "function" &&
      typeof api?.instances?.restart === "function" &&
      typeof api?.instances?.forceKill === "function" &&
      typeof api?.instances?.delete === "function" &&
      typeof api?.instances?.listFiles === "function" &&
      typeof api?.instances?.readFile === "function" &&
      typeof api?.instances?.writeFile === "function" &&
      typeof api?.instances?.deleteFile === "function" &&
      typeof api?.instances?.createFolder === "function" &&
      typeof api?.instances?.renameFile === "function" &&
      typeof api?.instances?.getMinecraftProperties === "function" &&
      typeof api?.instances?.saveMinecraftProperties === "function",
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

function configurePrimaryNavigation() {
  const navMenu = document.querySelector(".nav-menu");

  if (!navMenu) {
    return;
  }

  const orderedItems = PRIMARY_NAVIGATION_ORDER
    .map((pageName) => navMenu.querySelector(`[data-page-target="${pageName}"]`))
    .filter(Boolean);

  orderedItems.forEach((item) => {
    item.hidden = false;
    navMenu.appendChild(item);
  });

  navMenu.querySelectorAll("[data-page-target]").forEach((item) => {
    const pageTarget = item.dataset.pageTarget;
    if (LEGACY_PRIMARY_PAGES.has(pageTarget) || !PRIMARY_NAVIGATION_ORDER.includes(pageTarget)) {
      item.hidden = true;
      item.removeAttribute("aria-current");
    }
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

function hexToMonacoColor(hex, alpha = 1) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : DEFAULT_ACCENT_COLOR.slice(1);
  const clampedAlpha = Math.min(Math.max(Number(alpha), 0), 1);
  const alphaHex = Math.round(clampedAlpha * 255).toString(16).padStart(2, "0");

  return `#${normalized}${alphaHex}`.toUpperCase();
}

function getSafePageName(pageName) {
  if (pageName === "minecraft") {
    return "instances";
  }

  if (pageName === "amp" || pageName === "coolpals") {
    return "dashboard";
  }

  if (pageName === "console") {
    return "console";
  }

  return Array.from(pages).some((page) => page.dataset.page === pageName) ? pageName : DEFAULT_SETTINGS["general.defaultPage"];
}

function readLastPageName() {
  try {
    return getSafePageName(window.localStorage.getItem(LAST_PAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_SETTINGS["general.defaultPage"];
  }
}

function storeLastPageName(pageName) {
  try {
    window.localStorage.setItem(LAST_PAGE_STORAGE_KEY, getSafePageName(pageName));
  } catch {}
}

function readLastInstanceId() {
  try {
    return window.localStorage.getItem(LAST_INSTANCE_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function storeLastInstanceId(instanceId) {
  try {
    if (instanceId) {
      window.localStorage.setItem(LAST_INSTANCE_STORAGE_KEY, instanceId);
    } else {
      window.localStorage.removeItem(LAST_INSTANCE_STORAGE_KEY);
    }
  } catch {}
}

function loadStaleInstanceIds() {
  if (staleInstanceIdsLoaded) {
    return;
  }

  staleInstanceIdsLoaded = true;
  staleInstanceIds.clear();

  try {
    const parsedValue = JSON.parse(window.localStorage.getItem(STALE_INSTANCE_STORAGE_KEY) || "[]");
    if (Array.isArray(parsedValue)) {
      parsedValue
        .filter((instanceId) => typeof instanceId === "string" && instanceId.trim())
        .forEach((instanceId) => staleInstanceIds.add(instanceId));
    }
  } catch {
    staleInstanceIds.clear();
  }
}

function persistStaleInstanceIds() {
  try {
    if (staleInstanceIds.size > 0) {
      window.localStorage.setItem(STALE_INSTANCE_STORAGE_KEY, JSON.stringify([...staleInstanceIds]));
    } else {
      window.localStorage.removeItem(STALE_INSTANCE_STORAGE_KEY);
    }
  } catch {}
}

function isStaleInstanceId(instanceId) {
  loadStaleInstanceIds();
  return Boolean(instanceId && staleInstanceIds.has(instanceId));
}

function filterStaleInstances(instances, reason = "list-render") {
  const normalizedInstances = Array.isArray(instances) ? instances.filter((instance) => instance?.id) : [];
  console.info("[Instances] Renderer filter result.", {
    reason,
    inputCount: Array.isArray(instances) ? instances.length : 0,
    outputCount: normalizedInstances.length,
    filteredIds: [],
  });
  return normalizedInstances;
}

function forgetStaleInstanceId(instanceId) {
  if (!instanceId) {
    return;
  }

  loadStaleInstanceIds();
  if (staleInstanceIds.delete(instanceId)) {
    persistStaleInstanceIds();
  }
}

function notifyStaleInstanceRemoved(error = null) {
  if (error) {
    console.warn("[Instances] Removed stale instance from renderer state.", error);
  }

  const now = Date.now();
  if (now - lastStaleInstanceRemovedNoticeAt > 5000) {
    showToast("Removed stale instance from the list.", "warning");
    lastStaleInstanceRemovedNoticeAt = now;
  }
}

function markStaleInstanceId(instanceId, error = null) {
  if (!instanceId) {
    return false;
  }

  loadStaleInstanceIds();
  const wasAdded = !staleInstanceIds.has(instanceId);
  staleInstanceIds.add(instanceId);
  persistStaleInstanceIds();

  if (selectedInstanceId === instanceId) {
    selectedInstanceId = null;
    storeLastInstanceId(null);
  }

  notifyStaleInstanceRemoved(error);
  return wasAdded;
}

function logInstanceCreateFlow(message, details = {}) {
  console.info("[Instances] Create flow:", message, details);
}

function logInstanceStaleCleanup(instanceId, reason, details = {}) {
  console.warn("[Instances] Stale cleanup triggered.", {
    instanceId,
    reason,
    refreshedInstanceIds: details.refreshedInstanceIds || getInstances().map((instance) => instance.id),
    errorCode: details.error ? getAgentErrorCode(details.error) : null,
  });
}

function logInstanceLifecycle(message, details = {}) {
  console.info("[Instances] Lifecycle:", message, details);
}

function debounce(callback, waitMs = 120) {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), waitMs);
  };
}

function getPageDisplayName(pageName) {
  const item = Array.from(navItems).find((candidate) => candidate.dataset.pageTarget === pageName);
  return item?.dataset.pageLabel || item?.querySelector("[data-nav-label]")?.textContent?.trim() || "Dashboard";
}

function getSidebarTitle(displayName) {
  return displayName;
}

function isDesktopSidebarCollapsible() {
  return window.matchMedia("(min-width: 981px)").matches;
}

function canHoverExpandSidebar() {
  return isDesktopSidebarCollapsible() && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function readSidebarCollapsed() {
  try {
    const storedValue = window.localStorage.getItem(SIDEBAR_STATE_STORAGE_KEY);

    if (!storedValue) {
      return false;
    }

    if (storedValue === "collapsed") {
      return true;
    }

    if (storedValue === "expanded") {
      return false;
    }

    const parsedValue = JSON.parse(storedValue);
    return parsedValue === true || parsedValue?.collapsed === true;
  } catch {
    return false;
  }
}

function persistSidebarState() {
  try {
    window.localStorage.setItem(SIDEBAR_STATE_STORAGE_KEY, sidebarCollapsed ? "collapsed" : "expanded");
  } catch {}
}

function updateSidebarFooterTooltip() {
  if (!sidebarFooter) {
    return;
  }

  const hostname = document.querySelector(".sidebar-footer [data-field='hostname']")?.textContent?.trim() || "Local network only";
  const localTime = timeTarget?.textContent?.trim() || "Loading local time...";
  const tooltip = `${hostname} | ${localTime}`;

  sidebarFooter.dataset.tooltip = tooltip;
  if (sidebarCollapsed && !sidebarHoverExpanded && isDesktopSidebarCollapsible()) {
    sidebarFooter.title = tooltip;
  }
}

function syncSidebarTooltips() {
  const showCollapsedTooltips = sidebarCollapsed && !sidebarHoverExpanded && isDesktopSidebarCollapsible();

  navItems.forEach((item) => {
    const label = item.dataset.pageLabel || item.querySelector("[data-nav-label]")?.textContent?.trim() || "";
    item.title = showCollapsedTooltips ? label : "";
  });

  if (sidebarFooter) {
    sidebarFooter.title = showCollapsedTooltips ? sidebarFooter.dataset.tooltip || "" : "";
  }

  if (sidebarToggleButton) {
    sidebarToggleButton.title = `${sidebarCollapsed ? "Expand" : "Collapse"} sidebar (Ctrl+B)`;
  }
}

function syncSidebarState() {
  if (!appWorkspace || !sidebar) {
    return;
  }

  const collapsedOnDesktop = sidebarCollapsed && isDesktopSidebarCollapsible();
  const hoverExpanded = collapsedOnDesktop && sidebarHoverExpanded;
  const sidebarIsCollapsed = collapsedOnDesktop && !hoverExpanded;
  const sidebarWidth = sidebarIsCollapsed ? `${SIDEBAR_COLLAPSED_WIDTH}px` : `${SIDEBAR_EXPANDED_WIDTH}px`;
  const hiddenLabelTargets = [sidebarBrandCopy, sidebarFooterCopy, ...Array.from(sidebarNavLabels)].filter(Boolean);

  appWorkspace.classList.toggle("is-sidebar-collapsed", collapsedOnDesktop);
  appWorkspace.classList.toggle("is-sidebar-hover-expanded", hoverExpanded);
  sidebar.dataset.sidebarState = sidebarIsCollapsed ? "collapsed" : "expanded";
  sidebar.setAttribute("aria-expanded", sidebarIsCollapsed ? "false" : "true");
  sidebar.style.width = isDesktopSidebarCollapsible() ? sidebarWidth : "";
  sidebar.style.flexBasis = isDesktopSidebarCollapsible() ? sidebarWidth : "";
  sidebar.style.minWidth = isDesktopSidebarCollapsible() ? (sidebarIsCollapsed ? sidebarWidth : "0px") : "";
  sidebar.style.maxWidth = isDesktopSidebarCollapsible() ? sidebarWidth : "";
  sidebar.style.paddingLeft = sidebarIsCollapsed ? "10px" : "";
  sidebar.style.paddingRight = sidebarIsCollapsed ? "10px" : "";

  if (sidebarHeader) {
    sidebarHeader.style.flexDirection = sidebarIsCollapsed ? "column" : "";
    sidebarHeader.style.alignItems = sidebarIsCollapsed ? "center" : "";
    sidebarHeader.style.gap = sidebarIsCollapsed ? "10px" : "";
  }

  if (sidebarBrand) {
    sidebarBrand.style.justifyContent = sidebarIsCollapsed ? "center" : "";
    sidebarBrand.style.gap = sidebarIsCollapsed ? "0px" : "";
  }

  if (sidebarFooter) {
    sidebarFooter.style.justifyContent = sidebarIsCollapsed ? "center" : "";
    sidebarFooter.style.gap = sidebarIsCollapsed ? "0px" : "";
    sidebarFooter.style.paddingLeft = sidebarIsCollapsed ? "0px" : "";
    sidebarFooter.style.paddingRight = sidebarIsCollapsed ? "0px" : "";
  }

  hiddenLabelTargets.forEach((target) => {
    target.style.maxWidth = sidebarIsCollapsed ? "0px" : "";
    target.style.margin = sidebarIsCollapsed ? "0" : "";
    target.style.opacity = sidebarIsCollapsed ? "0" : "";
    target.style.pointerEvents = sidebarIsCollapsed ? "none" : "";
    target.style.transform = sidebarIsCollapsed ? "translateX(-8px)" : "";
  });

  sidebarNavLabels.forEach((label) => {
    label.style.display = sidebarIsCollapsed ? "block" : "";
  });

  navItems.forEach((item) => {
    item.style.justifyContent = sidebarIsCollapsed ? "center" : "";
    item.style.gap = sidebarIsCollapsed ? "0px" : "";
    item.style.paddingLeft = sidebarIsCollapsed ? "0px" : "";
    item.style.paddingRight = sidebarIsCollapsed ? "0px" : "";
    item.style.textAlign = sidebarIsCollapsed ? "center" : "";
  });

  if (sidebarToggleIcon) {
    sidebarToggleIcon.style.transform = sidebarIsCollapsed ? "rotate(180deg)" : "";
  }

  if (sidebarToggleButton) {
    sidebarToggleButton.setAttribute("aria-label", collapsedOnDesktop ? "Expand sidebar" : "Collapse sidebar");
    sidebarToggleButton.setAttribute("aria-pressed", collapsedOnDesktop ? "true" : "false");
  }

  syncSidebarTooltips();
  updateSidebarFooterTooltip();
}

function setSidebarHoverExpanded(nextValue) {
  const normalizedValue = Boolean(nextValue);

  if (!sidebarCollapsed || sidebarHoverExpansionLocked || !canHoverExpandSidebar() || sidebarHoverExpanded === normalizedValue) {
    return;
  }

  sidebarHoverExpanded = normalizedValue;
  syncSidebarState();
}

function setSidebarCollapsed(nextValue, options = {}) {
  const normalizedValue = Boolean(nextValue);

  if (sidebarCollapsed === normalizedValue && !options.force) {
    return;
  }

  sidebarCollapsed = normalizedValue;
  sidebarHoverExpanded = false;
  sidebarHoverExpansionLocked = normalizedValue ? options.lockHoverExpand === true : false;
  syncSidebarState();

  if (options.persist !== false) {
    persistSidebarState();
  }
}

function toggleSidebarCollapsed(options = {}) {
  setSidebarCollapsed(!sidebarCollapsed, options);
}

function syncSidebarViewportState() {
  if (!isDesktopSidebarCollapsible() && sidebarHoverExpanded) {
    sidebarHoverExpanded = false;
  }

  syncSidebarState();
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
  const transparent = "#00000000";

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
      { token: "invalid", foreground: "FF9AB1" },
    ],
    colors: {
      "editor.background": "#090C12",
      "editor.foreground": text,
      "editorLineNumber.foreground": "#6E6180",
      "editorLineNumber.activeForeground": accent,
      "editorCursor.foreground": accent,
      "editor.selectionBackground": hexToMonacoColor(accent, 0.24),
      "editor.inactiveSelectionBackground": hexToMonacoColor(accent, 0.14),
      "editor.lineHighlightBackground": hexToMonacoColor(accent, 0.08),
      "editor.lineHighlightBorder": transparent,
      "editorIndentGuide.background1": hexToMonacoColor(line, 0.72),
      "editorIndentGuide.activeBackground1": accent,
      "editorBracketMatch.background": hexToMonacoColor(accent, 0.16),
      "editorBracketMatch.border": accent,
      "editorGutter.background": "#090C12",
      "editorWidget.background": panel,
      "editorWidget.border": line,
      "editorSuggestWidget.background": panel,
      "editorSuggestWidget.border": line,
      "editorSuggestWidget.selectedBackground": hexToMonacoColor(accent, 0.18),
      "editorHoverWidget.background": panel,
      "editorHoverWidget.border": line,
      "editor.findMatchBackground": hexToMonacoColor("#f5c451", 0.22),
      "editor.findMatchHighlightBackground": hexToMonacoColor("#f5c451", 0.12),
      "editorOverviewRuler.border": transparent,
      "editorError.foreground": danger,
      "editorWarning.foreground": "#f5c451",
      "editorInfo.foreground": accent,
      "scrollbarSlider.background": hexToMonacoColor(accent, 0.22),
      "scrollbarSlider.hoverBackground": hexToMonacoColor(accent, 0.36),
      "scrollbarSlider.activeBackground": hexToMonacoColor(accent, 0.5),
      "minimap.selectionHighlight": hexToMonacoColor(accent, 0.16),
      "minimap.errorHighlight": danger,
      "minimap.warningHighlight": "#f5c451",
      "badge.background": accent,
      "badge.foreground": background,
      "focusBorder": accent,
      "inputValidation.errorBackground": hexToMonacoColor(danger, 0.12),
      "inputValidation.infoBackground": hexToMonacoColor(accent, 0.14),
      "inputValidation.warningBackground": hexToMonacoColor("#f5c451", 0.12),
      "list.focusOutline": accent,
      "list.activeSelectionBackground": hexToMonacoColor(accent, 0.16),
      "list.hoverBackground": "#FFFFFF0A",
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
      const connected = latestAmpSnapshot?.connected === true;
      return {
        connected,
        label: connected ? "Connected" : "Disconnected",
      };
    }
    case "playit": {
      const playitState = getPlayitState(latestPlayitSnapshot, getConfiguredPlayitAddress());
      const connected = playitState.state === "connected" || playitState.state === "running";
      return {
        connected,
        label: playitState.label === "Unknown" ? "Disconnected" : playitState.label,
      };
    }
    case "docker": {
      const connected = Boolean(latestDockerSnapshot?.installed && latestDockerSnapshot?.daemonRunning);
      return {
        connected,
        label: connected ? "Connected" : "Disconnected",
      };
    }
    case "instances": {
      const connected = Array.isArray(latestInstancesSnapshot?.instances);
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
    showPage(readLastPageName() || getSafePageName(settings["general.defaultPage"]));
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
  const safePageName = getSafePageName(pageName);
  navItems.forEach((item) => {
    const isActive = item.dataset.pageTarget === safePageName;
    item.classList.toggle("is-active", isActive);

    if (isActive) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });

  pages.forEach((page) => {
    page.classList.toggle("is-active", page.dataset.page === safePageName);
  });

  storeLastPageName(safePageName);

  if (
    (safePageName === "dashboard" || safePageName === "amp" || safePageName === "minecraft") &&
    Date.now() - lastAmpRefreshAt > AMP_REFRESH_INTERVAL_MS
  ) {
    refreshAmpDashboard();
  }

  if (safePageName === "playit") {
    refreshPlayitStatus();
  }

  if (safePageName === "docker") {
    refreshDockerStatus();
  }

  if (safePageName === "instances") {
    refreshInstances();
  }

  if (safePageName === "console") {
    consoleSuppressAutoSelect = false;
    renderConsoleWorkspace();
    refreshInstances({ refreshMetrics: false }).then(() => {
      refreshConsoleMetrics();
      refreshConsoleLogs({ silent: true });
    }).catch((error) => {
      console.warn("[Console] Initial refresh failed.", error);
      renderConsoleWorkspace();
    });
  }

  if (safePageName === "marketplace") {
    refreshMarketplace();
    refreshMarketplaceDownloads();
  }

  if (safePageName === "files") {
    renderFilesView();

    if (filesConnectionState.connected) {
      refreshFileListing({
        profileId: getFilesRequestProfileId(),
        path: filesConnectionState.currentPath || filesConnectionState.homePath || "/",
      });
    }
  }

  if (safePageName === "ssh") {
    renderSshView();
    resizeActiveSshSession();
  }

  updateTitlebar(safePageName);
}

function getActivePageName() {
  return document.querySelector(".page.is-active")?.dataset.page || "dashboard";
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : "Unavailable";
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean" || Array.isArray(value)) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeAmpPercentValue(value) {
  const number = toFiniteNumber(value);

  if (number === null) {
    return null;
  }

  return number <= 1 ? number * 100 : number;
}

function parseAmpDurationSeconds(value) {
  if (typeof value === "string") {
    const parts = value.split(":").map((part) => toFiniteNumber(part));

    if (!parts.some((part) => part === null)) {
      if (parts.length === 4) {
        const [days, hours, minutes, seconds] = parts;
        return days * 86400 + hours * 3600 + minutes * 60 + seconds;
      }

      if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return hours * 3600 + minutes * 60 + seconds;
      }
    }
  }

  return toFiniteNumber(value);
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
  updateSidebarFooterTooltip();
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
  updateSidebarFooterTooltip();
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
    setField("networkThroughput", `${formatBytes(snapshot.network.downloadPerSecond)}/s down · ${formatBytes(snapshot.network.uploadPerSecond)}/s up`);
    setField("networkTotalDownload", formatBytes(snapshot.network.totalDownload));
    setField("networkTotalUpload", formatBytes(snapshot.network.totalUpload));
  } else {
    setField("networkUsage", "Unavailable");
    setField("networkDownload", "Unavailable");
    setField("networkUpload", "Unavailable");
    setField("networkThroughput", "Unavailable");
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

function getPlayitState(snapshot, configuredAddress = null) {
  const installed = snapshot?.installed === true;
  const running = snapshot?.running === true;
  const connected = snapshot?.connected === true ? true : snapshot?.connected === false ? false : null;
  const hasTunnelDomainEvidence = Boolean(snapshot?.tunnelAddress || snapshot?.tunnelDomain);
  const hasConfiguredAddress = Boolean(configuredAddress);
  const hasTunnelEvidence = hasTunnelDomainEvidence || Boolean(snapshot?.localTarget || snapshot?.tunnelId);
  const hasAnyEvidence = installed || running || hasTunnelDomainEvidence || hasConfiguredAddress;
  const isPartialRunning = running && hasTunnelDomainEvidence && connected !== true;

  if (connected === true) {
    return {
      installed,
      running,
      connected,
      state: "connected",
      label: "Connected",
      summary: "Playit tunnel is running and forwarding traffic.",
      hasTunnelEvidence,
    };
  }

  if (running) {
    return {
      installed,
      running,
      connected,
      state: "running",
      label: "Running",
      summary: isPartialRunning
        ? "Playit is running and tunnel domain is available."
        : hasTunnelEvidence
          ? "Playit is running and partial tunnel diagnostics are available."
          : "Playit is running.",
      hasTunnelEvidence,
    };
  }

  if (installed) {
    return {
      installed,
      running,
      connected,
      state: "stopped",
      label: "Disconnected",
      summary: "Playit is installed, but the tunnel process is stopped.",
      hasTunnelEvidence,
    };
  }

  if (hasAnyEvidence) {
    return {
      installed,
      running,
      connected,
      state: "running",
      label: "Running",
      summary: "Playit tunnel details were detected, but the running state could not be verified.",
      hasTunnelEvidence,
    };
  }

  return {
    installed,
    running,
    connected,
    state: "missing",
    label: "Unknown",
    summary: "Playit status could not be determined.",
    hasTunnelEvidence: false,
  };
}

function renderPlayitSnapshot(snapshot) {
  latestPlayitSnapshot = snapshot;
  const configuredAddress = getConfiguredPlayitAddress();
  const playitState = getPlayitState(snapshot, configuredAddress);
  const tunnelAddress = snapshot?.tunnelAddress || snapshot?.tunnelDomain || configuredAddress || "Unavailable";
  const localIp = snapshot?.localIp || "Unavailable";
  const localPort = snapshot?.localPort || "Unavailable";
  const protocol = snapshot?.protocol || "Unavailable";
  const tunnelId = snapshot?.tunnelId || "Unavailable";
  const installed = playitState.installed;
  const running = playitState.running;

  setPlayitVisualState(playitState.state);
  setField("playitInstalled", installed ? "Installed" : "Missing");
  setField("playitRunning", running ? "Running" : "Stopped");
  setField("playitConnected", playitState.label);
  setField("playitTunnelAddress", tunnelAddress);
  setField("playitLocalIp", localIp);
  setField("playitLocalPort", localPort);
  setField("playitProtocol", protocol);
  setField("playitTunnelId", tunnelId);
  setField("playitLastSuccessfulRefresh", formatDateTime(snapshot?.lastSuccessfulRefreshAt));
  setField("playitLatency", "Unavailable");
  setField("playitTraffic", "Unavailable");
  setField("playitSummary", playitState.summary);
  renderInstanceNetwork(findInstance());
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
  renderInstanceNetwork(findInstance());
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
  setField("dockerSummaryContainers", Number.isFinite(snapshot?.summary?.totalContainers) ? `${snapshot.summary.runningContainers || 0} / ${snapshot.summary.totalContainers}` : "Unavailable");
  setField("dockerSummaryStatus", state.message);
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
  setField("dockerSummaryContainers", "Unavailable");
  setField("dockerSummaryStatus", message);
  setField("dockerEmptyMessage", message);
  clearDockerRows();
  setDockerDetails(null);
  setDockerLoading(false);
  setDockerEmpty(true);
  updateDockerActionButtons();
  updateTitlebar();
}

function normalizeInstancesPayload(payload) {
  const instances = Array.isArray(payload?.instances)
    ? payload.instances
    : Array.isArray(payload?.data?.instances)
      ? payload.data.instances
      : [];

  return {
    root: payload?.root || payload?.data?.root || null,
    instances: filterStaleInstances(instances, "list-response"),
  };
}

function normalizeInstanceResponse(payload) {
  return payload?.instance && typeof payload.instance === "object" ? payload.instance : payload;
}

function normalizeMetricsResponse(payload) {
  return payload?.metrics && typeof payload.metrics === "object" ? payload.metrics : payload;
}

function getInstances() {
  return Array.isArray(latestInstancesSnapshot?.instances) ? latestInstancesSnapshot.instances : [];
}

function findInstance(instanceId = selectedInstanceId) {
  if (!instanceId) {
    return null;
  }

  return getInstances().find((instance) => instance?.id === instanceId) || null;
}

function updateInstanceSnapshot(instanceId, patch = {}) {
  if (!latestInstancesSnapshot || !instanceId) {
    return false;
  }

  let updated = false;
  latestInstancesSnapshot = {
    ...latestInstancesSnapshot,
    instances: getInstances().map((instance) => {
      if (instance?.id !== instanceId) {
        return instance;
      }

      updated = true;
      return {
        ...instance,
        ...patch,
      };
    }),
  };

  if (updated) {
    renderInstanceRows(getInstances());
    setInstanceDetails(findInstance(selectedInstanceId));
    updateInstanceActionButtons();
    renderConsoleWorkspace();
  }

  return updated;
}

function removeInstanceFromSnapshot(instanceId) {
  if (!latestInstancesSnapshot || !instanceId) {
    return false;
  }

  const nextInstances = getInstances().filter((instance) => instance?.id !== instanceId);
  if (nextInstances.length === getInstances().length) {
    return false;
  }

  latestInstancesSnapshot = {
    ...latestInstancesSnapshot,
    instances: nextInstances,
  };
  renderInstanceRows(nextInstances);
  setInstancesEmpty(nextInstances.length === 0);
  updateInstanceActionButtons();
  renderConsoleWorkspace();
  updateTitlebar();
  return true;
}

function setInstanceDetail(name, value) {
  instancesDetailFields.forEach((field) => {
    if (field.dataset.instanceDetail === name) {
      field.textContent = value;
    }
  });
}

function formatInstanceValue(value) {
  return value === null || value === undefined || value === "" ? "Unavailable" : String(value);
}

function formatInstanceType(value) {
  return formatInstanceValue(value).replace(/-/g, " ");
}

function formatInstanceList(value) {
  if (!Array.isArray(value)) {
    return formatInstanceValue(value);
  }

  return value.length > 0 ? value.join(", ") : "Unavailable";
}

function formatInstancePorts(instance, metrics = null) {
  const metricPorts = Array.isArray(metrics?.ports) ? metrics.ports : null;

  if (metricPorts && metricPorts.length > 0) {
    return metricPorts.map((entry) => `${entry.port}${entry.open ? " open" : " closed"}`).join(", ");
  }

  return formatInstanceList(instance?.ports);
}

function getInstanceMetrics(instanceId = selectedInstanceId) {
  return latestInstanceMetrics?.id === instanceId ? latestInstanceMetrics : null;
}

function formatInstanceCpu(metrics) {
  if (!metrics) {
    return "Unavailable";
  }

  const percent = Number.isFinite(metrics.cpuPercent) ? `${metrics.cpuPercent.toFixed(1)}%` : "CPU warming";
  const seconds = Number.isFinite(metrics.cpuSeconds) ? `${metrics.cpuSeconds.toFixed(2)}s` : "seconds unavailable";
  return `${percent} · ${seconds}`;
}

function formatInstanceMemory(metrics) {
  return Number.isFinite(metrics?.memoryRssBytes) ? formatBytes(metrics.memoryRssBytes) : "Unavailable";
}

function formatInstanceDisk(metrics) {
  return Number.isFinite(metrics?.diskBytes) ? formatBytes(metrics.diskBytes) : "Unavailable";
}

function getInstanceStateClass(state) {
  return String(state || "stopped").trim().toLowerCase();
}

function isInstanceRunning(instance) {
  return ["running", "starting", "restarting"].includes(getInstanceStateClass(instance?.state));
}

function canStartInstance(instance) {
  return instance && ["stopped", "failed"].includes(getInstanceStateClass(instance.state));
}

function canStopInstance(instance) {
  return instance && ["running", "starting", "restarting"].includes(getInstanceStateClass(instance.state));
}

function canRestartInstance(instance) {
  return instance && ["running", "starting", "failed"].includes(getInstanceStateClass(instance.state));
}

function isMinecraftInstance(instance = findInstance()) {
  return getInstanceWorkspaceProfile(instance)?.id === "minecraft";
}

function getInstanceWorkspaceProfile(instance) {
  if (!instance) {
    return null;
  }

  return INSTANCE_WORKSPACE_PROFILES.find((profile) => profile.matches(instance)) || {
    id: "generic",
    label: formatInstanceType(instance.type || "Instance"),
    icon: "APP",
    description: "Generic managed service using the shared Universal Instance Workspace.",
    fileShortcuts: [],
    backupTitle: "Instance Backups",
    backupDescription: "Use the shared backup system for this managed instance.",
  };
}

function setMinecraftSummaryField(name, value) {
  instanceMinecraftSummaryFields.forEach((field) => {
    if (field.dataset.minecraftSummary === name) {
      field.textContent = formatInstanceValue(value);
    }
  });
}

function inferMinecraftServerType(instance) {
  const searchable = [instance?.type, instance?.id, instance?.displayName, ...(Array.isArray(instance?.tags) ? instance.tags : [])].join(" ").toLowerCase();
  if (searchable.includes("purpur")) return "Purpur";
  if (searchable.includes("fabric")) return "Fabric";
  if (searchable.includes("forge") && !searchable.includes("neoforge")) return "Forge";
  if (searchable.includes("neoforge")) return "NeoForge";
  if (searchable.includes("vanilla")) return "Vanilla";
  if (searchable.includes("paper")) return "Paper";
  return instance?.type === "minecraft-paper" ? "Paper" : "Java";
}

function inferMinecraftVersion(instance) {
  const searchable = [instance?.displayName, instance?.id, ...(Array.isArray(instance?.tags) ? instance.tags : [])].join(" ");
  return searchable.match(/\b1\.\d+(?:\.\d+)?\b/)?.[0] || "Unavailable";
}

function renderInstanceWorkspaceProfile(instance) {
  const profile = getInstanceWorkspaceProfile(instance);

  if (instanceAppProfile) {
    instanceAppProfile.hidden = !profile;
  }
  if (instanceAppIcon) {
    instanceAppIcon.textContent = profile?.icon || "APP";
  }
  if (instanceAppName) {
    instanceAppName.textContent = profile?.label || "Application";
  }
  if (instanceAppDescription) {
    instanceAppDescription.textContent = profile?.description || "Shared instance workspace.";
  }

  renderInstanceFileShortcuts(profile);
  renderInstanceBackupProfile(profile);
}

function renderInstanceFileShortcuts(profile) {
  if (!instanceFileShortcuts) {
    return;
  }

  const shortcuts = Array.isArray(profile?.fileShortcuts) ? profile.fileShortcuts : [];
  instanceFileShortcuts.replaceChildren();
  instanceFileShortcuts.hidden = shortcuts.length === 0;

  shortcuts.forEach((shortcut) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "instance-file-shortcut";
    button.textContent = shortcut.endsWith("/") ? shortcut : shortcut;
    button.addEventListener("click", () => openInstanceShortcut(shortcut));
    instanceFileShortcuts.append(button);
  });
}

async function openInstanceShortcut(shortcut) {
  const pathValue = String(shortcut || "").replace(/\/+$/, "");
  if (!pathValue) {
    return;
  }

  if (isEditableInstanceFile(pathValue)) {
    await openInstanceTextFile(pathValue);
    return;
  }

  await refreshInstanceFiles(pathValue);
}

function renderInstanceBackupProfile(profile) {
  if (instanceBackupTitle) {
    instanceBackupTitle.textContent = profile?.backupTitle || "Instance Backups";
  }
  if (instanceBackupDescription) {
    instanceBackupDescription.textContent = profile?.backupDescription || "Use the shared backup system for this instance.";
  }
  if (instanceBackupEmptyTitle) {
    instanceBackupEmptyTitle.textContent = profile?.id === "minecraft" ? "Minecraft backup history" : "Backup history is shared";
  }
  if (instanceBackupEmptyMessage) {
    instanceBackupEmptyMessage.textContent = profile?.id === "minecraft"
      ? "Use Backup Now or open the Backups page for configured schedules and restore history."
      : "Open the Backups page to view configured local backup paths.";
  }
}

function renderMinecraftWorkspaceSummary(instance, metrics) {
  if (instanceMinecraftSummary) {
    instanceMinecraftSummary.hidden = !isMinecraftInstance(instance);
  }

  if (!isMinecraftInstance(instance)) {
    return;
  }

  setMinecraftSummaryField("version", inferMinecraftVersion(instance));
  setMinecraftSummaryField("serverType", inferMinecraftServerType(instance));
  setMinecraftSummaryField("java", instance?.executable || "java");
  setMinecraftSummaryField("players", "Unavailable");
  setMinecraftSummaryField("maxPlayers", latestMinecraftProperties["max-players"] || "Unavailable");
  setMinecraftSummaryField("tps", "Placeholder");
  setMinecraftSummaryField("world", latestMinecraftProperties["level-name"] || "world");
  setMinecraftSummaryField("seed", latestMinecraftProperties["level-seed"] || "Unavailable");
  setMinecraftSummaryField("playit", latestPlayitSnapshot?.connected ? "Connected" : "Unavailable");
  setMinecraftSummaryField("ram", formatInstanceMemory(metrics));
  setMinecraftSummaryField("cpu", formatInstanceCpu(metrics));
  setMinecraftSummaryField("disk", formatInstanceDisk(metrics));
  setMinecraftSummaryField("uptime", formatDuration(metrics?.uptimeSeconds));
}

function readStoredInstanceTab() {
  try {
    const value = window.localStorage.getItem(INSTANCE_TAB_STORAGE_KEY);
    return value || "overview";
  } catch {
    return "overview";
  }
}

function setActiveInstanceTab(tabName) {
  activeInstanceTab = tabName || "overview";
  instanceTabs.forEach((button) => {
    const active = button.dataset.instanceTab === activeInstanceTab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  instanceTabPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.instancePanel === activeInstanceTab);
  });

  try {
    window.localStorage.setItem(INSTANCE_TAB_STORAGE_KEY, activeInstanceTab);
  } catch {}

  if (activeInstanceTab === "console") {
    refreshInstanceLogs({ silent: true });
  } else if (activeInstanceTab === "files") {
    refreshInstanceFiles();
  } else if (activeInstanceTab === "configuration") {
    loadMinecraftProperties();
  }
}

function stringifyArgs(args) {
  return Array.isArray(args) ? args.join(" ") : "";
}

function parseMemoryFromArgs(instance) {
  const memoryArg = Array.isArray(instance?.args) ? instance.args.find((arg) => /^-Xmx/i.test(arg)) : null;
  return instance?.memoryLimit || (memoryArg ? memoryArg.replace(/^-Xmx/i, "") : "");
}

function parseJarFromArgs(instance) {
  const args = Array.isArray(instance?.args) ? instance.args : [];
  const jarIndex = args.indexOf("-jar");
  return jarIndex >= 0 ? args[jarIndex + 1] || "" : "";
}

function getStartupArgsForConfig(instance) {
  const args = Array.isArray(instance?.args) ? [...instance.args] : [];
  const jarIndex = args.indexOf("-jar");

  if (jarIndex >= 0) {
    args.splice(jarIndex, 2);
  }

  return args.filter((arg) => !/^-Xmx/i.test(arg) && arg !== "nogui").join(" ");
}

function setInstanceConfigValue(name, value) {
  instanceConfigInputs.forEach((input) => {
    if (input.dataset.instanceConfig !== name) {
      return;
    }

    if (input.type === "checkbox") {
      input.checked = Boolean(value);
    } else {
      input.value = value ?? "";
    }
  });
}

function getInstanceConfigValue(name) {
  const input = Array.from(instanceConfigInputs).find((candidate) => candidate.dataset.instanceConfig === name);

  if (!input) {
    return "";
  }

  return input.type === "checkbox" ? input.checked : input.value.trim();
}

function setMinecraftPropertyValue(name, value) {
  minecraftPropertyInputs.forEach((input) => {
    if (input.dataset.minecraftProperty === name) {
      input.value = value ?? "";
    }
  });
}

function collectMinecraftProperties() {
  return Array.from(minecraftPropertyInputs).reduce((properties, input) => {
    properties[input.dataset.minecraftProperty] = input.value.trim();
    return properties;
  }, {});
}

function collectInstanceConfigPayload() {
  const selectedInstance = findInstance();
  const args = parseArgs(getInstanceConfigValue("args"));
  const jar = getInstanceConfigValue("jar");
  const memory = normalizeMemoryLimit(getInstanceConfigValue("memoryLimit"));

  if (jar && (selectedInstance?.type === "java-app" || selectedInstance?.type === "minecraft-paper")) {
    const nextArgs = [];
    if (memory) {
      nextArgs.push(`-Xmx${memory}`);
    }
    nextArgs.push("-jar", jar);
    if (selectedInstance?.type === "minecraft-paper") {
      nextArgs.push("nogui");
    }
    nextArgs.push(...args);

    return {
      displayName: getInstanceConfigValue("displayName"),
      workingDirectory: getInstanceConfigValue("workingDirectory"),
      executable: getInstanceConfigValue("executable"),
      args: nextArgs,
      memoryLimit: memory || null,
      restartPolicy: getInstanceConfigValue("restartPolicy"),
      startupTimeoutMs: Number.parseInt(getInstanceConfigValue("startupTimeoutMs"), 10),
      shutdownTimeoutMs: Number.parseInt(getInstanceConfigValue("shutdownTimeoutMs"), 10),
      autoStart: getInstanceConfigValue("autoStart"),
    };
  }

  return {
    displayName: getInstanceConfigValue("displayName"),
    workingDirectory: getInstanceConfigValue("workingDirectory"),
    executable: getInstanceConfigValue("executable"),
    args,
    memoryLimit: memory || null,
    restartPolicy: getInstanceConfigValue("restartPolicy"),
    startupTimeoutMs: Number.parseInt(getInstanceConfigValue("startupTimeoutMs"), 10),
    shutdownTimeoutMs: Number.parseInt(getInstanceConfigValue("shutdownTimeoutMs"), 10),
    autoStart: getInstanceConfigValue("autoStart"),
  };
}

function syncInstanceConfigDirtyState() {
  let configDirty = true;
  try {
    configDirty = JSON.stringify(collectInstanceConfigPayload()) !== instanceConfigSnapshot;
  } catch {
    configDirty = true;
  }
  const minecraftDirty = JSON.stringify(collectMinecraftProperties()) !== instanceMinecraftSnapshot;
  const dirty = configDirty || minecraftDirty;

  if (instanceConfigSaveButton) {
    instanceConfigSaveButton.disabled = !dirty || !selectedInstanceId || instanceActionRequestInFlight;
  }

  if (instanceConfigCancelButton) {
    instanceConfigCancelButton.disabled = !dirty || !selectedInstanceId || instanceActionRequestInFlight;
  }

  if (instanceConfigDirtyLabel) {
    instanceConfigDirtyLabel.textContent = dirty ? "Unsaved changes" : "Saved";
  }
}

function populateInstanceConfigForm(instance) {
  if (!instance) {
    instanceConfigSnapshot = "";
    instanceMinecraftSnapshot = "";
    syncInstanceConfigDirtyState();
    return;
  }

  setInstanceConfigValue("displayName", instance.displayName || "");
  setInstanceConfigValue("id", instance.id || "");
  setInstanceConfigValue("workingDirectory", instance.workingDirectory || "data");
  setInstanceConfigValue("executable", instance.executable || "");
  setInstanceConfigValue("jar", parseJarFromArgs(instance));
  setInstanceConfigValue("memoryLimit", parseMemoryFromArgs(instance));
  setInstanceConfigValue("args", getStartupArgsForConfig(instance));
  setInstanceConfigValue("restartPolicy", instance.restartPolicy || "never");
  setInstanceConfigValue("startupTimeoutMs", instance.startupTimeoutMs || "");
  setInstanceConfigValue("shutdownTimeoutMs", instance.shutdownTimeoutMs || "");
  setInstanceConfigValue("autoStart", instance.autoStart === true);
  instanceConfigSnapshot = JSON.stringify(collectInstanceConfigPayload());

  if (instanceMinecraftSettings) {
    instanceMinecraftSettings.hidden = !isMinecraftInstance(instance);
  }

  if (instanceMinecraftSummary) {
    instanceMinecraftSummary.hidden = !isMinecraftInstance(instance);
  }

  instanceAdvancedInputs.forEach((input) => {
    const key = input.dataset.instanceAdvanced;
    if (key === "args") {
      input.value = stringifyArgs(instance.args);
    } else if (key === "environment") {
      input.value = Object.keys(instance.environment || {}).join(", ");
    } else if (key === "tags") {
      input.value = formatInstanceList(instance.tags) === "Unavailable" ? "" : formatInstanceList(instance.tags);
    } else {
      input.value = instance[key] ?? "";
    }
  });

  if (instanceRawJson) {
    instanceRawJson.value = JSON.stringify(instance, null, 2);
  }

  syncInstanceConfigDirtyState();
}

function populateMinecraftProperties(properties = {}) {
  const defaults = {
    "server-port": "25565",
    motd: "AnxOS Minecraft Server",
    "max-players": "20",
    difficulty: "easy",
    gamemode: "survival",
    "view-distance": "10",
    "simulation-distance": "10",
    "online-mode": "true",
    "allow-flight": "false",
    "spawn-protection": "16",
    pvp: "true",
    "white-list": "false",
    "generate-structures": "true",
    "level-seed": "",
  };

  latestMinecraftProperties = { ...defaults, ...properties };
  Object.entries(latestMinecraftProperties).forEach(([key, value]) => setMinecraftPropertyValue(key, value));
  instanceMinecraftSnapshot = JSON.stringify(collectMinecraftProperties());
  renderMinecraftWorkspaceSummary(findInstance(), getInstanceMetrics());
  renderInstanceNetwork(findInstance());
  syncInstanceConfigDirtyState();
}

function renderInstanceNetwork(instance) {
  if (!instanceNetworkList) {
    return;
  }

  instanceNetworkList.replaceChildren();
  renderInstanceNetworkSummary(instance);
  const ports = Array.isArray(instance?.ports) ? instance.ports : [];
  const metrics = getInstanceMetrics(instance?.id);
  const portStatus = new Map((Array.isArray(metrics?.ports) ? metrics.ports : []).map((entry) => [entry.port, entry.open]));

  if (ports.length === 0) {
    const empty = document.createElement("p");
    empty.className = "ssh-password-note";
    empty.textContent = "No configured ports.";
    instanceNetworkList.appendChild(empty);
    return;
  }

  ports.forEach((port) => {
    const row = document.createElement("div");
    row.className = "instance-network-row";
    const label = document.createElement("span");
    label.textContent = `${port} · ${portStatus.has(port) ? (portStatus.get(port) ? "listening" : "closed") : "unchecked"}`;
    const remove = document.createElement("button");
    remove.className = "inline-action";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => updateInstancePorts(ports.filter((candidate) => candidate !== port)));
    row.append(label, remove);
    instanceNetworkList.appendChild(row);
  });
}

function setInstanceNetworkDetail(name, value) {
  instanceNetworkDetails.forEach((field) => {
    if (field.dataset.instanceNetworkDetail === name) {
      field.textContent = value;
    }
  });
}

function renderInstanceNetworkSummary(instance) {
  if (!instanceNetworkSummary) {
    return;
  }

  const isMinecraft = isMinecraftInstance(instance);
  instanceNetworkSummary.hidden = !instance;
  const ports = Array.isArray(instance?.ports) ? instance.ports : [];
  const configuredPort = ports[0] || latestMinecraftProperties["server-port"] || "Unavailable";
  const tunnelAddress = latestPlayitSnapshot?.tunnelAddress || latestPlayitSnapshot?.tunnelDomain || "Unavailable";
  const localIp = latestPlayitSnapshot?.localIp || "127.0.0.1";
  const localPort = latestPlayitSnapshot?.localPort || configuredPort;

  setInstanceNetworkDetail("localAddress", localPort === "Unavailable" ? "Unavailable" : `${localIp}:${localPort}`);
  setInstanceNetworkDetail("publicAddress", tunnelAddress);
  setInstanceNetworkDetail("configuredPort", formatInstanceValue(configuredPort));
  setInstanceNetworkDetail("playitTunnel", isMinecraft ? tunnelAddress : "Shared Playit page");
  setInstanceNetworkDetail("tunnelStatus", latestPlayitSnapshot?.connected ? "Connected" : "Unavailable");
}

async function updateInstancePorts(ports) {
  const selectedInstance = findInstance();
  const uniquePorts = [...new Set(ports.map((port) => Number.parseInt(port, 10)).filter((port) => Number.isFinite(port) && port > 0 && port <= 65535))];

  if (!selectedInstance) {
    return;
  }

  try {
    await getDesktopApiState().api.instances.update(selectedInstance.id, { ports: uniquePorts });
    showToast("Ports updated.");
    await refreshInstances();
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await handleMissingSelectedInstance(error, selectedInstance.id);
    } else {
      console.warn("[Instances] Port update failed.", error);
      showToast(getAgentErrorMessage(error, "Port update failed."));
    }
  }
}

async function saveInstanceConfiguration(event) {
  event?.preventDefault();
  const selectedInstance = findInstance();
  const desktopApiState = getDesktopApiState();

  if (!selectedInstance || !desktopApiState.hasInstances) {
    return;
  }

  instanceActionRequestInFlight = true;
  syncInstanceConfigDirtyState();

  try {
    await desktopApiState.api.instances.update(selectedInstance.id, collectInstanceConfigPayload());

    if (isMinecraftInstance(selectedInstance)) {
      await desktopApiState.api.instances.saveMinecraftProperties(selectedInstance.id, collectMinecraftProperties());
    }

    showToast("Instance configuration saved.");
    await refreshInstances();
    await loadMinecraftProperties();
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await handleMissingSelectedInstance(error, selectedInstance.id);
    } else {
      console.warn("[Instances] Configuration save failed.", error);
      showToast(getAgentErrorMessage(error, "Configuration save failed."));
    }
  } finally {
    instanceActionRequestInFlight = false;
    syncInstanceConfigDirtyState();
  }
}

async function loadMinecraftProperties() {
  const selectedInstance = findInstance();
  const desktopApiState = getDesktopApiState();

  if (!selectedInstance || !isMinecraftInstance(selectedInstance) || !desktopApiState.hasInstances) {
    populateMinecraftProperties({});
    return;
  }

  try {
    const payload = await desktopApiState.api.instances.getMinecraftProperties(selectedInstance.id);
    populateMinecraftProperties(payload?.properties || {});
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await handleMissingSelectedInstance(error, selectedInstance.id);
      return;
    }
    console.warn("[Instances] Minecraft properties unavailable.", error);
    populateMinecraftProperties({});
  }
}

function syncConsoleLogSearch() {
  const query = (instanceConsoleSearchInput?.value || "").trim().toLowerCase();
  const filter = instanceConsoleFilterSelect?.value || "all";

  if (!instancesLogList) {
    return;
  }

  [...instancesLogList.querySelectorAll("li")].forEach((row) => {
    const text = row.textContent.toLowerCase();
    const stream = row.dataset.stream || "";
    const severity = row.dataset.severity || "info";
    const matchesQuery = !query || text.includes(query);
    const matchesFilter =
      filter === "all" ||
      filter === stream ||
      filter === severity ||
      (filter === "error" && stream === "stderr");
    row.hidden = !matchesQuery || !matchesFilter;
  });
}

function getLogSeverity(entry) {
  const message = String(entry?.message || "").toLowerCase();
  if (entry?.stream === "stderr" || /\b(error|exception|failed|fatal)\b/.test(message)) {
    return "error";
  }
  if (/\b(warn|warning)\b/.test(message)) {
    return "warn";
  }
  return "info";
}

function appendAnsiText(target, text) {
  const ansiPattern = /\u001b\[([0-9;]*)m/g;
  const colorMap = {
    30: "ansi-black",
    31: "ansi-red",
    32: "ansi-green",
    33: "ansi-yellow",
    34: "ansi-blue",
    35: "ansi-magenta",
    36: "ansi-cyan",
    37: "ansi-white",
    90: "ansi-gray",
    91: "ansi-red",
    92: "ansi-green",
    93: "ansi-yellow",
    94: "ansi-blue",
    95: "ansi-magenta",
    96: "ansi-cyan",
    97: "ansi-white",
  };
  let lastIndex = 0;
  let activeClass = "";
  let match;

  function appendSegment(value) {
    if (!value) {
      return;
    }

    const span = document.createElement("span");
    span.textContent = value;
    if (activeClass) {
      span.className = activeClass;
    }
    target.append(span);
  }

  while ((match = ansiPattern.exec(text)) !== null) {
    appendSegment(text.slice(lastIndex, match.index));
    const codes = (match[1] || "0").split(";").map((code) => Number.parseInt(code || "0", 10));
    if (codes.includes(0)) {
      activeClass = "";
    }
    const colorCode = codes.find((code) => colorMap[code]);
    if (colorCode) {
      activeClass = colorMap[colorCode];
    }
    lastIndex = ansiPattern.lastIndex;
  }

  appendSegment(text.slice(lastIndex));
}

async function sendInstanceConsoleCommand(event) {
  event?.preventDefault();
  const command = instanceConsoleCommandInput?.value?.trim() || "";
  const selectedInstance = findInstance();

  if (!command || !selectedInstance) {
    return;
  }

  try {
    await getDesktopApiState().api.instances.sendCommand(selectedInstance.id, command);
    instanceConsoleCommandInput.value = "";
    await refreshInstanceLogs();
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await handleMissingSelectedInstance(error, selectedInstance.id);
    } else {
      showToast(getAgentErrorMessage(error, "Command failed."));
    }
  }
}

async function clearInstanceConsole() {
  const selectedInstance = findInstance();

  if (!selectedInstance || !window.confirm(`Clear logs for ${selectedInstance.displayName || selectedInstance.id}?`)) {
    return;
  }

  try {
    await getDesktopApiState().api.instances.clearLogs(selectedInstance.id, {
      stream: instancesLogStreamSelect?.value || "all",
    });
    clearInstanceLogs("Logs cleared.");
    showToast("Logs cleared.");
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await handleMissingSelectedInstance(error, selectedInstance.id);
    } else {
      showToast(getAgentErrorMessage(error, "Clear logs failed."));
    }
  }
}

async function copyInstanceConsole() {
  const text = [...(instancesLogList?.querySelectorAll("li:not([hidden])") || [])].map((row) => row.textContent).join("\n");

  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast("Console copied.");
  } catch {
    showToast("Console could not be copied.");
  }
}

function downloadInstanceLogs() {
  const text = [...(instancesLogList?.querySelectorAll("li") || [])].map((row) => row.textContent).join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${selectedInstanceId || "instance"}-logs.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function joinInstancePath(basePath, childName) {
  const base = String(basePath || ".").replace(/\\/g, "/").replace(/\/+$/, "");
  return base === "." ? childName : `${base}/${childName}`;
}

function getInstanceParentPath(currentPath) {
  const parts = String(currentPath || ".").split("/").filter(Boolean);
  parts.pop();
  return parts.length > 0 ? parts.join("/") : ".";
}

const FILE_TYPE_MAP = new Map([
  [".jar", { label: "JAR", badge: "JAR" }],
  [".class", { label: "Java Class", badge: "JVM" }],
  [".zip", { label: "ZIP", badge: "ZIP" }],
  [".tar.gz", { label: "TAR.GZ", badge: "TGZ" }],
  [".tgz", { label: "TAR.GZ", badge: "TGZ" }],
  [".gz", { label: "GZip", badge: "GZ" }],
  [".7z", { label: "7-Zip", badge: "7Z" }],
  [".rar", { label: "RAR", badge: "RAR" }],
  [".exe", { label: "Executable", badge: "EXE" }],
  [".msi", { label: "Windows Installer", badge: "MSI" }],
  [".dll", { label: "DLL", badge: "DLL" }],
  [".sh", { label: "Shell Script", badge: "SH" }],
  [".bash", { label: "Shell Script", badge: "SH" }],
  [".bat", { label: "Batch Script", badge: "BAT" }],
  [".cmd", { label: "Batch Script", badge: "BAT" }],
  [".ps1", { label: "PowerShell Script", badge: "PS1" }],
  [".js", { label: "JavaScript", badge: "JS" }],
  [".mjs", { label: "JavaScript", badge: "JS" }],
  [".cjs", { label: "JavaScript", badge: "JS" }],
  [".ts", { label: "TypeScript", badge: "TS" }],
  [".json", { label: "JSON", badge: "{}" }],
  [".jsonl", { label: "JSON", badge: "{}" }],
  [".yaml", { label: "YAML", badge: "YML" }],
  [".yml", { label: "YAML", badge: "YML" }],
  [".toml", { label: "TOML", badge: "TOML" }],
  [".ini", { label: "INI", badge: "INI" }],
  [".properties", { label: "Properties", badge: "PROP" }],
  [".env", { label: "Environment", badge: "ENV" }],
  [".py", { label: "Python", badge: "PY" }],
  [".java", { label: "Java", badge: "JAVA" }],
  [".kt", { label: "Kotlin", badge: "KT" }],
  [".kts", { label: "Kotlin", badge: "KT" }],
  [".go", { label: "Go", badge: "GO" }],
  [".rs", { label: "Rust", badge: "RS" }],
  [".php", { label: "PHP", badge: "PHP" }],
  [".html", { label: "HTML", badge: "HTML" }],
  [".htm", { label: "HTML", badge: "HTML" }],
  [".css", { label: "CSS", badge: "CSS" }],
  [".md", { label: "Markdown", badge: "MD" }],
  [".txt", { label: "Text", badge: "TXT" }],
  [".log", { label: "Text", badge: "LOG" }],
  [".cfg", { label: "Configuration", badge: "CFG" }],
  [".conf", { label: "Configuration", badge: "CONF" }],
  [".png", { label: "PNG", badge: "PNG" }],
  [".jpg", { label: "JPEG", badge: "JPG" }],
  [".jpeg", { label: "JPEG", badge: "JPG" }],
  [".webp", { label: "WebP", badge: "WEBP" }],
  [".gif", { label: "GIF", badge: "GIF" }],
  [".svg", { label: "SVG", badge: "SVG" }],
  [".ico", { label: "ICO", badge: "ICO" }],
  [".mp3", { label: "MP3", badge: "MP3" }],
  [".wav", { label: "WAV", badge: "WAV" }],
  [".mp4", { label: "MP4", badge: "MP4" }],
  [".mkv", { label: "MKV", badge: "MKV" }],
  [".pdf", { label: "PDF", badge: "PDF" }],
]);

function getFileTypeInfo(entryOrName) {
  const entry = typeof entryOrName === "object" && entryOrName !== null ? entryOrName : { name: entryOrName };
  if (entry.isDirectory) {
    return { label: "Directory", badge: "DIR" };
  }

  const lowerName = String(entry.path || entry.name || "").split("/").pop().toLowerCase();
  if (lowerName === "dockerfile") {
    return { label: "Dockerfile", badge: "DOC" };
  }

  const extension = [...FILE_TYPE_MAP.keys()].find((candidate) => lowerName.endsWith(candidate));
  return extension ? FILE_TYPE_MAP.get(extension) : { label: "File", badge: "FILE" };
}

function isEditableInstanceFile(filePath) {
  return /\.(txt|properties|ya?ml|json|toml|cfg|conf)$/i.test(String(filePath || ""));
}

async function refreshInstanceFiles(pathValue = instanceCurrentFilePath) {
  const selectedInstance = findInstance();
  const desktopApiState = getDesktopApiState();

  if (!selectedInstance || !desktopApiState.hasInstances || !instanceFilesList) {
    return;
  }

  try {
    const listing = await desktopApiState.api.instances.listFiles(selectedInstance.id, pathValue || ".");
    instanceCurrentFilePath = listing.currentPath || ".";
    if (instanceFilePathLabel) {
      instanceFilePathLabel.textContent = `data/${instanceCurrentFilePath === "." ? "" : instanceCurrentFilePath}`;
    }
    renderInstanceFileRows(listing.entries || []);
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await handleMissingSelectedInstance(error, selectedInstance.id);
    } else {
      showToast(getAgentErrorMessage(error, "File listing failed."));
    }
  }
}

function renderInstanceFileRows(entries) {
  instanceFilesList?.replaceChildren();
  entries.forEach((entry) => {
    const typeInfo = getFileTypeInfo(entry);
    const entryPath = entry.path || entry.name || "";
    const row = document.createElement("tr");
    row.dataset.instanceFilePath = entryPath;
    row.classList.toggle("is-directory", Boolean(entry.isDirectory));
    row.classList.toggle("is-file", !entry.isDirectory);
    row.tabIndex = 0;
    row.addEventListener("click", () => selectInstanceFile(entryPath));
    row.addEventListener("dblclick", () => activateInstanceFile(entry));

    const nameCell = document.createElement("td");
    const nameWrap = document.createElement("div");
    nameWrap.className = "file-entry-name instance-file-name";
    const icon = document.createElement("span");
    icon.className = "file-entry-icon";
    icon.textContent = typeInfo.badge;
    const nameText = document.createElement("div");
    nameText.className = "file-entry-name-text";
    const title = document.createElement("strong");
    title.textContent = entry.name || "Unnamed";
    const meta = document.createElement("span");
    meta.textContent = entry.isDirectory ? "Open folder" : entryPath;
    nameText.append(title, meta);
    nameWrap.append(icon, nameText);
    nameCell.append(nameWrap);

    const typeCell = document.createElement("td");
    typeCell.textContent = typeInfo.label;
    const sizeCell = document.createElement("td");
    sizeCell.textContent = entry.isDirectory ? "Directory" : formatBytes(entry.size);
    const modifiedCell = document.createElement("td");
    modifiedCell.textContent = formatDateTime(entry.modifiedAt);
    row.append(nameCell, typeCell, sizeCell, modifiedCell);
    instanceFilesList.appendChild(row);
  });
}

function selectInstanceFile(filePath) {
  selectedInstanceFilePath = filePath;
  [...(instanceFilesList?.querySelectorAll("tr") || [])].forEach((row) => {
    row.classList.toggle("is-selected", row.dataset.instanceFilePath === selectedInstanceFilePath);
  });
}

async function activateInstanceFile(entry) {
  const entryPath = entry?.path || entry?.name || "";
  if (entry.isDirectory) {
    await refreshInstanceFiles(entryPath);
    return;
  }

  if (isEditableInstanceFile(entryPath)) {
    await openInstanceTextFile(entryPath);
  }
}

async function openInstanceTextFile(filePath) {
  const selectedInstance = findInstance();

  if (!selectedInstance) {
    return;
  }

  if (!confirmDiscardInstanceFile("open another file")) {
    return;
  }

  try {
    const file = await getDesktopApiState().api.instances.readFile(selectedInstance.id, filePath);
    openedInstanceFilePath = file.path || filePath;
    openedInstanceFileSavedContent = file.supported ? file.content || "" : "";
    if (instanceFileEditor) {
      instanceFileEditor.disabled = !file.supported;
      instanceFileEditor.value = openedInstanceFileSavedContent;
    }
    if (instanceFileEditorName) {
      instanceFileEditorName.textContent = openedInstanceFilePath;
    }
    if (instanceFileEditorMeta) {
      const typeInfo = getFileTypeInfo(openedInstanceFilePath);
      const sizeLabel = Number.isFinite(file.size) ? ` · ${formatBytes(file.size)}` : "";
      instanceFileEditorMeta.textContent = `${typeInfo.label}${sizeLabel}`;
    }
    syncInstanceFileDirtyState();
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await handleMissingSelectedInstance(error, selectedInstance.id);
    } else {
      showToast(getAgentErrorMessage(error, "Open file failed."));
    }
  }
}

function hasDirtyInstanceFile() {
  return Boolean(openedInstanceFilePath && instanceFileEditor && instanceFileEditor.value !== openedInstanceFileSavedContent);
}

function confirmDiscardInstanceFile(actionLabel = "continue") {
  return !hasDirtyInstanceFile() || window.confirm(`Discard unsaved file changes and ${actionLabel}?`);
}

function syncInstanceFileDirtyState() {
  const dirty = hasDirtyInstanceFile();
  const saveButton = document.querySelector('[data-instance-file-action="save"]');
  if (saveButton) {
    saveButton.disabled = !dirty;
  }
  if (instanceFileEditorState) {
    instanceFileEditorState.textContent = dirty ? "Unsaved" : "Clean";
  }
}

async function saveInstanceTextFile() {
  const selectedInstance = findInstance();

  if (!selectedInstance || !openedInstanceFilePath || !instanceFileEditor) {
    return;
  }

  try {
    await getDesktopApiState().api.instances.writeFile(selectedInstance.id, openedInstanceFilePath, instanceFileEditor.value);
    openedInstanceFileSavedContent = instanceFileEditor.value;
    syncInstanceFileDirtyState();
    showToast("File saved.");
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await handleMissingSelectedInstance(error, selectedInstance.id);
    } else {
      showToast(getAgentErrorMessage(error, "Save file failed."));
    }
  }
}

function isJavaJarInstance(instance) {
  const args = Array.isArray(instance?.args) ? instance.args : [];
  return instance?.type === "java-app" ||
    instance?.type === "minecraft-paper" ||
    (String(instance?.executable || "").toLowerCase().includes("java") && args.includes("-jar"));
}

function getConfiguredJarPath(instance) {
  return parseJarFromArgs(instance) || (instance?.type === "minecraft-paper" ? "paper.jar" : "");
}

function setMissingInstanceFileHint(filePath) {
  selectedInstanceFilePath = filePath;
  if (instanceFileEditorName) {
    instanceFileEditorName.textContent = `Missing: ${filePath}`;
  }
  if (instanceFileEditorMeta) {
    instanceFileEditorMeta.textContent = `${getFileTypeInfo(filePath).label} · Upload this file into the data folder.`;
  }
  if (instanceFileEditorState) {
    instanceFileEditorState.textContent = "Upload required";
  }
}

async function focusMissingJarInFiles(instance, jarPath) {
  setActiveInstanceTab("files");
  const parentPath = getInstanceParentPath(jarPath);
  instanceCurrentFilePath = parentPath;
  setMissingInstanceFileHint(jarPath);
  await refreshInstanceFiles(parentPath);
  selectInstanceFile(jarPath);
  setMissingInstanceFileHint(jarPath);
}

async function verifyJavaJarBeforeLaunch(instance) {
  if (!isJavaJarInstance(instance)) {
    return true;
  }

  const jarPath = getConfiguredJarPath(instance);
  if (!jarPath) {
    window.alert("No server JAR is configured for this instance.\nUpload a server JAR to the data folder or install this server from the Marketplace.");
    return false;
  }

  try {
    await getDesktopApiState().api.instances.readFile(instance.id, jarPath);
    return true;
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await handleMissingSelectedInstance(error, instance.id, "launch-preflight-instance-not-found");
      return false;
    }

    if (getAgentErrorCode(error) === "PATH_NOT_FOUND") {
      const message = `${getFileNameFromPath(jarPath)} was not found in this instance.\nUpload a Paper server JAR to the data folder or install this server from the Marketplace.`;
      window.alert(message);
      showToast(`${getFileNameFromPath(jarPath)} was not found. Upload it in Files or use Marketplace.`, "warning");
      await focusMissingJarInFiles(instance, jarPath);
      return false;
    }

    console.warn("[Instances] Jar preflight failed.", error);
    showToast(getAgentErrorMessage(error, "Could not verify the configured server JAR."));
    return false;
  }
}

function updateInstanceActionButtons() {
  const desktopApiState = getDesktopApiState();
  const selectedInstance = findInstance();
  const busy = instancesRequestInFlight || instanceActionRequestInFlight;
  const hasInstancesBridge = desktopApiState.hasInstances;

  if (instancesRefreshButton) {
    instancesRefreshButton.disabled = instancesRequestInFlight || instanceActionRequestInFlight || !hasInstancesBridge;
  }

  if (instancesCreateToggleButton) {
    instancesCreateToggleButton.disabled = busy || !hasInstancesBridge;
  }

  if (instanceCreateSubmitButton) {
    instanceCreateSubmitButton.disabled = busy || !hasInstancesBridge;
  }

  if (instancesSearchInput) {
    instancesSearchInput.disabled = !hasInstancesBridge || getInstances().length === 0;
  }

  if (instancesLogStreamSelect) {
    instancesLogStreamSelect.disabled = !selectedInstance || !hasInstancesBridge || instanceLogsRequestInFlight;
  }

  if (instancesLogLimitSelect) {
    instancesLogLimitSelect.disabled = !selectedInstance || !hasInstancesBridge || instanceLogsRequestInFlight;
  }

  if (instancesStartButton) {
    instancesStartButton.disabled = busy || !hasInstancesBridge || !canStartInstance(selectedInstance);
  }

  if (instancesStopButton) {
    instancesStopButton.disabled = busy || !hasInstancesBridge || !canStopInstance(selectedInstance);
  }

  if (instancesRestartButton) {
    instancesRestartButton.disabled = busy || !hasInstancesBridge || !canRestartInstance(selectedInstance);
  }

  if (instancesDeleteButton) {
    instancesDeleteButton.disabled = busy || !hasInstancesBridge || !selectedInstance;
    instancesDeleteButton.textContent = instanceActionRequestInFlight ? "Working..." : "Delete";
  }

  if (instancesLogsButton) {
    instancesLogsButton.disabled = !selectedInstance || !hasInstancesBridge || instanceLogsRequestInFlight;
  }
}

function setInstancesLoading(isLoading) {
  if (instancesLoading) {
    instancesLoading.hidden = !isLoading;
  }
}

function setInstancesEmpty(isVisible, message = "Create an instance to begin.") {
  if (instancesEmpty) {
    instancesEmpty.hidden = !isVisible;
  }

  setField("instancesEmptyMessage", message);
}

function clearInstanceRows() {
  instancesList?.replaceChildren();
}

function addInstanceCell(row, value) {
  const cell = document.createElement("td");

  if (value instanceof Node) {
    cell.appendChild(value);
  } else {
    cell.textContent = value;
  }

  row.appendChild(cell);
}

function buildInstanceNameCell(instance) {
  const wrapper = document.createElement("div");
  wrapper.className = "instance-name-cell";
  const title = document.createElement("strong");
  title.textContent = instance?.displayName || instance?.id || "Unnamed instance";
  const meta = document.createElement("span");
  meta.textContent = instance?.id || "missing-id";
  wrapper.append(title, meta);
  return wrapper;
}

function buildInstanceStatePill(instance) {
  const pill = document.createElement("span");
  const state = instance?.state || "Stopped";
  pill.className = `instance-state is-${getInstanceStateClass(state)}`;
  pill.textContent = state;
  return pill;
}

function renderInstanceRows(instances) {
  clearInstanceRows();

  if (!instancesList) {
    return;
  }

  instances.forEach((instance) => {
    const metrics = getInstanceMetrics(instance.id);
    const row = document.createElement("tr");
    row.dataset.instanceId = instance.id || "";
    row.tabIndex = 0;
    row.addEventListener("click", () => selectInstance(instance.id));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectInstance(instance.id);
      }
    });

    addInstanceCell(row, buildInstanceNameCell(instance));
    addInstanceCell(row, formatInstanceType(instance.type));
    addInstanceCell(row, buildInstanceStatePill(instance));
    addInstanceCell(row, formatInstanceValue(instance.pid));
    addInstanceCell(row, formatDuration(metrics?.uptimeSeconds));
    addInstanceCell(row, formatInstanceCpu(metrics));
    addInstanceCell(row, formatInstanceMemory(metrics));
    addInstanceCell(row, formatInstancePorts(instance, metrics));
    addInstanceCell(row, formatInstanceList(instance.tags));
    instancesList.appendChild(row);
  });

  filterInstanceRows();
}

function setInstanceDetails(instance = null) {
  const metrics = instance ? getInstanceMetrics(instance.id) : null;

  if (!instance) {
    setField("instanceDetailState", "None");
    setField("instancesSelectedCpu", "Unavailable");
    setField("instancesSelectedMemory", "Unavailable");
    setInstanceDetail("name", "None selected");
    setInstanceDetail("id", "Unavailable");
    setInstanceDetail("type", "Unavailable");
    setInstanceDetail("command", "Unavailable");
    setInstanceDetail("pid", "Unavailable");
    setInstanceDetail("uptime", "Unavailable");
    setInstanceDetail("cpu", "Unavailable");
    setInstanceDetail("memory", "Unavailable");
    setInstanceDetail("disk", "Unavailable");
    setInstanceDetail("ports", "Unavailable");
    setInstanceDetail("tags", "Unavailable");
    setInstanceDetail("workingDirectory", "Unavailable");
    renderInstanceWorkspaceProfile(null);
    populateInstanceConfigForm(null);
    renderInstanceNetwork(null);
    return;
  }

  const command = [instance.executable, ...(Array.isArray(instance.args) ? instance.args : [])].filter(Boolean).join(" ");
  setField("instanceDetailState", instance.state || "Unavailable");
  setField("instancesSelectedCpu", formatInstanceCpu(metrics));
  setField("instancesSelectedMemory", formatInstanceMemory(metrics));
  setInstanceDetail("name", formatInstanceValue(instance.displayName));
  setInstanceDetail("id", formatInstanceValue(instance.id));
  setInstanceDetail("type", formatInstanceType(instance.type));
  setInstanceDetail("command", command || "Unavailable");
  setInstanceDetail("pid", formatInstanceValue(instance.pid));
  setInstanceDetail("uptime", formatDuration(metrics?.uptimeSeconds));
  setInstanceDetail("cpu", formatInstanceCpu(metrics));
  setInstanceDetail("memory", formatInstanceMemory(metrics));
  setInstanceDetail("disk", formatInstanceDisk(metrics));
  setInstanceDetail("ports", formatInstancePorts(instance, metrics));
  setInstanceDetail("tags", formatInstanceList(instance.tags));
  setInstanceDetail("workingDirectory", formatInstanceValue(instance.workingDirectory));
  renderInstanceWorkspaceProfile(instance);
  renderMinecraftWorkspaceSummary(instance, metrics);
  populateInstanceConfigForm(instance);
  renderInstanceNetwork(instance);
}

function selectInstance(instanceId, options = {}) {
  const previousSelectedInstanceId = selectedInstanceId;
  const selectedInstance = findInstance(instanceId);
  selectedInstanceId = selectedInstance?.id || null;
  storeLastInstanceId(selectedInstanceId);
  if (previousSelectedInstanceId !== selectedInstanceId) {
    clearInstanceLogs(selectedInstanceId ? "Refresh logs to load the selected instance." : "Select an instance and refresh logs.");
  }
  setInstanceDetails(selectedInstance);

  if (instancesList) {
    [...instancesList.querySelectorAll("tr")].forEach((row) => {
      row.classList.toggle("is-selected", row.dataset.instanceId === selectedInstanceId);
    });
  }

  updateInstanceActionButtons();

  if (selectedInstanceId && options.refreshMetrics !== false) {
    refreshSelectedInstanceMetrics();
  }
}

function renderInstancesSnapshot(snapshot) {
  const previousInstances = getInstances();
  const normalizedSnapshot = normalizeInstancesPayload(snapshot);
  const incomingInstances = normalizedSnapshot.instances;
  const incomingIds = new Set(incomingInstances.map((instance) => instance.id));
  const preservedInstances = previousInstances.filter((instance) => {
    return instance?.id && !incomingIds.has(instance.id) && !instanceRemovalAllowedIds.has(instance.id);
  });
  const removedIds = previousInstances
    .filter((instance) => instance?.id && !incomingIds.has(instance.id) && instanceRemovalAllowedIds.has(instance.id))
    .map((instance) => instance.id);

  if (preservedInstances.length > 0 || removedIds.length > 0) {
    console.info("[Instances] List reconciliation.", {
      incomingCount: incomingInstances.length,
      preservedIds: preservedInstances.map((instance) => instance.id),
      removedIds,
    });
  }

  latestInstancesSnapshot = {
    ...normalizedSnapshot,
    instances: [...incomingInstances, ...preservedInstances],
  };
  instanceRemovalAllowedIds.clear();
  const instances = getInstances();
  const previousSelectedInstanceId = selectedInstanceId;
  const storedInstanceId = readLastInstanceId();
  const rememberedInstanceId = storedInstanceId;
  const previousExists = Boolean(previousSelectedInstanceId && findInstance(previousSelectedInstanceId));
  const rememberedExists = Boolean(rememberedInstanceId && findInstance(rememberedInstanceId));
  const selected =
    findInstance(previousSelectedInstanceId) ||
    findInstance(rememberedInstanceId) ||
    instances[0] ||
    null;

  if (
    (previousSelectedInstanceId && !previousExists) ||
    (rememberedInstanceId && !rememberedExists && !previousExists)
  ) {
    notifyMissingSelectedInstance();
    storeLastInstanceId(null);
  }

  selectedInstanceId = selected?.id || null;

  setField("instancesTotal", String(instances.length));
  setField("instancesRunning", String(instances.filter(isInstanceRunning).length));
  setField("instancesLoadingMessage", "Checking agent instance status...");
  renderInstanceRows(instances);
  selectInstance(selectedInstanceId, { refreshMetrics: false });
  renderConsoleWorkspace();
  setInstancesLoading(false);
  setInstancesEmpty(instances.length === 0);
  updateInstanceActionButtons();
  updateTitlebar();
}

function renderInstancesUnavailable(message = "Instance manager unavailable.") {
  latestInstancesSnapshot = null;
  latestInstanceMetrics = null;
  selectedInstanceId = null;
  storeLastInstanceId(null);
  setField("instancesTotal", "Unavailable");
  setField("instancesRunning", "Unavailable");
  setField("instancesSelectedCpu", "Unavailable");
  setField("instancesSelectedMemory", "Unavailable");
  setInstancesLoading(false);
  setInstancesEmpty(true, message);
  clearInstanceRows();
  setInstanceDetails(null);
  clearInstanceLogs("Select an instance and refresh logs.");
  activeConsoleInstanceId = null;
  consoleOpenInstanceIds = [];
  consoleBufferedEntries = [];
  renderConsoleWorkspace();
  updateInstanceActionButtons();
  updateTitlebar();
}

function filterInstanceRows() {
  const query = (instancesSearchInput?.value || "").trim().toLowerCase();

  if (!instancesList) {
    return;
  }

  [...instancesList.querySelectorAll("tr")].forEach((row) => {
    row.hidden = query.length > 0 && !row.textContent.toLowerCase().includes(query);
  });
}

function clearInstanceLogs(message = "Select an instance and refresh logs.") {
  instancesLogList?.replaceChildren();

  if (instancesLogEmpty) {
    instancesLogEmpty.hidden = false;
    const messageTarget = instancesLogEmpty.querySelector("span:last-child");
    if (messageTarget) {
      messageTarget.textContent = message;
    }
  }

  if (instancesLogCount) {
    instancesLogCount.textContent = "0 lines";
  }
}

function renderInstanceLogs(payload) {
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  instancesLogList?.replaceChildren();

  entries.forEach((entry) => {
    const item = document.createElement("li");
    const severity = getLogSeverity(entry);
    item.dataset.stream = entry?.stream || "log";
    item.dataset.severity = severity;
    item.classList.toggle("is-stderr", entry?.stream === "stderr");
    item.classList.toggle("is-stdin", entry?.stream === "stdin");
    item.classList.toggle("is-warn", severity === "warn");
    item.classList.toggle("is-error", severity === "error");
    const time = document.createElement("time");
    time.dateTime = entry?.at || "";
    time.textContent = entry?.at ? formatDateTime(entry.at) : "No timestamp";
    const stream = document.createElement("span");
    stream.className = "instance-log-stream";
    stream.textContent = entry?.stream || "log";
    const message = document.createElement("span");
    appendAnsiText(message, entry?.message || "");
    item.append(time, stream, message);
    instancesLogList?.appendChild(item);
  });

  syncConsoleLogSearch();

  if (instanceConsoleAutoscrollInput?.checked && !instanceConsolePauseInput?.checked && instanceConsoleViewer) {
    instanceConsoleViewer.scrollTop = instanceConsoleViewer.scrollHeight;
  }

  if (instancesLogEmpty) {
    instancesLogEmpty.hidden = entries.length > 0;
  }

  if (instancesLogCount) {
    instancesLogCount.textContent = `${entries.length} ${entries.length === 1 ? "line" : "lines"}`;
  }
}

function getAgentErrorMessage(error, fallback = "Instance request failed.") {
  const backendCode = error?.payload?.error?.code || error?.code;
  const backendMessage = error?.payload?.error?.message;
  const wrappedMessage = String(error?.message || "");
  const wrappedCode = wrappedMessage.match(/\b[A-Z][A-Z0-9_]{2,}\b/)?.[0] || null;
  const effectiveCode = backendCode && backendCode !== "AGENT_HTTP_ERROR" ? backendCode : wrappedCode;
  const friendlyMessages = {
    INSTANCE_ALREADY_EXISTS: "An instance with this ID already exists.",
    INSTANCE_NOT_FOUND: "The selected instance no longer exists.",
    INSTANCE_VERIFICATION_FAILED: error?.message || "Created instance could not be verified.",
    NOT_FOUND: "The selected instance no longer exists.",
    INSTANCE_RUNNING: "Stop the instance before deleting it.",
    INSTANCE_ALREADY_RUNNING: "This instance is already running.",
    INSTANCE_NOT_RUNNING: "This instance is not running.",
    EXECUTABLE_NOT_ALLOWED: "This executable is not allowed by the agent.",
    INVALID_MEMORY_LIMIT: "Use memory like 512M, 2G, or 2048M.",
    INVALID_INSTANCE_ID: "Use an ID with 2-64 letters, numbers, underscores, or dashes.",
    INVALID_DISPLAY_NAME: "Enter a valid instance name.",
    INVALID_PORTS: "Enter valid ports between 1 and 65535.",
    PATH_NOT_FOUND: "The requested file or folder was not found.",
    DOWNLOAD_FAILED: "The template download failed.",
    DOWNLOAD_REQUIRED: "This template requires a downloadable server file.",
    DOWNLOAD_URL_INCOMPLETE: "The template download URL is incomplete.",
    DOWNLOAD_RESOLVE_FAILED: "Unable to resolve the latest server download.",
    FABRIC_RESOLVE_FAILED: "Unable to resolve Fabric download.",
    FORGE_RESOLVE_FAILED: "Unable to download Forge installer.",
    NEOFORGE_RESOLVE_FAILED: "Unable to download NeoForge installer.",
    PROXY_RESOLVE_FAILED: "Unable to resolve proxy download.",
    TEMPLATE_NOT_READY: "This template is not ready yet.",
    TEMPLATE_INSTALL_TIMEOUT: "The template installer did not finish in time.",
    STARTUP_CONFIGURATION_FAILED: "The startup command could not be configured.",
    MARKETPLACE_INSTALL_FAILED: "Template install failed.",
  };

  if (friendlyMessages[effectiveCode]) {
    return friendlyMessages[effectiveCode];
  }

  if (backendCode && backendCode !== "AGENT_HTTP_ERROR") {
    return backendMessage && backendMessage !== "Request failed."
      ? `${backendCode}: ${backendMessage}`
      : backendCode;
  }

  if (wrappedCode) {
    return wrappedCode;
  }

  return error?.message || fallback;
}

function getAgentErrorCode(error) {
  const backendCode = error?.payload?.error?.code || error?.code;
  if (backendCode && backendCode !== "AGENT_HTTP_ERROR") {
    return backendCode;
  }

  return String(error?.message || "").match(/\b[A-Z][A-Z0-9_]{2,}\b/)?.[0] || null;
}

function isInstanceNotFoundError(error) {
  const code = getAgentErrorCode(error);
  return code === "INSTANCE_NOT_FOUND" || code === "NOT_FOUND";
}

function notifyMissingSelectedInstance(error = null) {
  if (error) {
    console.warn("[Instances] Selected instance no longer exists.", error);
  }

  const now = Date.now();
  if (now - lastMissingInstanceNoticeAt > 5000) {
    showToast("Selected instance no longer exists.", "warning");
    lastMissingInstanceNoticeAt = now;
  }
}

async function handleMissingSelectedInstance(error = null, instanceId = selectedInstanceId, reason = "instance-not-found") {
  const missingInstanceId = instanceId || selectedInstanceId;

  if (missingInstanceId) {
    console.warn("[Instances] Instance request failed; keeping renderer list intact.", {
      instanceId: missingInstanceId,
      reason,
      errorCode: error ? getAgentErrorCode(error) : null,
    });
  } else {
    notifyMissingSelectedInstance(error);
  }

  latestInstanceMetrics = null;

  if (missingInstanceId && findInstance(missingInstanceId)) {
    updateInstanceSnapshot(missingInstanceId, {
      state: "Failed",
      failureReason: getAgentErrorMessage(error, "Instance request failed."),
    });
    showToast(getAgentErrorMessage(error, "Instance request failed."), "warning");
    return;
  }

  if (selectedInstanceId === missingInstanceId) {
    selectedInstanceId = null;
    storeLastInstanceId(null);
    clearInstanceLogs("Selected instance no longer exists.");
    setInstanceDetails(null);
  }

  updateInstanceActionButtons();
}

function getMarketplaceField(name) {
  return document.querySelector(`[data-marketplace-field="${name}"]`);
}

function setMarketplaceMessage(message, tone = "neutral") {
  if (!marketplaceMessage) {
    return;
  }

  marketplaceMessage.textContent = message;
  marketplaceMessage.dataset.tone = tone;
}

function getMarketplaceTemplates() {
  return Array.isArray(marketplaceCatalog.templates) ? marketplaceCatalog.templates : [];
}

function findMarketplaceTemplate(templateId = marketplaceSelectedTemplateId) {
  return getMarketplaceTemplates().find((template) => template.id === templateId) || null;
}

function setMarketplaceLoading(loading) {
  marketplaceRequestInFlight = Boolean(loading);
  if (marketplaceLoading) {
    marketplaceLoading.hidden = !loading;
  }
  if (marketplaceRefreshButton) {
    marketplaceRefreshButton.disabled = loading;
  }
}

function renderMarketplaceCategories() {
  if (!marketplaceCategories) {
    return;
  }

  marketplaceCategories.replaceChildren();
  const categories = ["All", ...(Array.isArray(marketplaceCatalog.categories) ? marketplaceCatalog.categories : [])];

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "marketplace-category";
    button.textContent = category;
    button.classList.toggle("is-active", category === marketplaceActiveCategory);
    button.addEventListener("click", () => {
      marketplaceActiveCategory = category;
      renderMarketplaceCategories();
      renderMarketplaceTemplates();
    });
    marketplaceCategories.append(button);
  });
}

function getFilteredMarketplaceTemplates() {
  const query = (marketplaceSearchInput?.value || "").trim().toLowerCase();
  return getMarketplaceTemplates().filter((template) => {
    const matchesCategory = marketplaceActiveCategory === "All" || template.category === marketplaceActiveCategory;
    const haystack = [
      template.displayName,
      template.name,
      template.description,
      template.author,
      template.version,
      template.category,
      template.id,
    ].filter(Boolean).join(" ").toLowerCase();
    return matchesCategory && (!query || haystack.includes(query));
  });
}

function renderMarketplaceTemplates() {
  if (!marketplaceGrid) {
    return;
  }

  marketplaceGrid.replaceChildren();
  const templates = getFilteredMarketplaceTemplates();
  if (marketplaceEmpty) {
    marketplaceEmpty.hidden = marketplaceRequestInFlight || templates.length > 0;
  }

  templates.forEach((template) => {
    const card = document.createElement("article");
    card.className = "marketplace-card";
    card.classList.toggle("is-selected", template.id === marketplaceSelectedTemplateId);
    card.classList.toggle("is-disabled", Boolean(template.comingSoon || template.disabled));

    const icon = document.createElement("span");
    icon.className = "marketplace-card__icon";
    icon.textContent = template.icon || "APP";

    const body = document.createElement("div");
    body.className = "marketplace-card__body";
    const title = document.createElement("strong");
    title.textContent = template.displayName || template.id;
    const description = document.createElement("p");
    description.textContent = template.description || "No description provided.";
    const meta = document.createElement("span");
    meta.className = "marketplace-card__meta";
    meta.textContent = `${template.author || "Unknown"} · v${template.version || "0.0.0"} · ${template.category || "Uncategorized"}`;
    body.append(title, description, meta);

    const install = document.createElement("button");
    install.type = "button";
    install.className = "inline-action";
    install.textContent = template.comingSoon || template.disabled ? "Coming soon" : "Install";
    install.disabled = marketplaceInstallInFlight || Boolean(template.comingSoon || template.disabled);
    install.addEventListener("click", () => openMarketplaceWizard(template.id));

    card.append(icon, body, install);
    card.addEventListener("dblclick", () => {
      if (template.comingSoon || template.disabled) {
        setMarketplaceMessage(template.comingSoonMessage || "This template is not ready yet.", "warning");
        return;
      }
      openMarketplaceWizard(template.id);
    });
    marketplaceGrid.append(card);
  });
}

function setMarketplaceInstallState(label, status = "ready") {
  if (marketplaceInstallState) {
    marketplaceInstallState.textContent = label;
    marketplaceInstallState.dataset.status = status;
  }
}

function renderMarketplaceWizardSteps(template) {
  if (!marketplaceWizardSteps) {
    return;
  }

  const isMinecraft = template?.category === "Minecraft";
  const steps = isMinecraft
    ? ["Server Name", "Version", "Server Type", "Memory", "Port", "Playit", "Accept EULA"]
    : ["Name", "Storage Location", "Port", "Memory"];
  marketplaceWizardSteps.replaceChildren();
  steps.forEach((step, index) => {
    const item = document.createElement("span");
    item.textContent = `${index + 1}. ${step}`;
    marketplaceWizardSteps.append(item);
  });
}

function syncMarketplaceWizardFields(template) {
  const isMinecraft = template?.category === "Minecraft";
  document.querySelectorAll("[data-marketplace-field-wrap]").forEach((wrapper) => {
    const field = wrapper.dataset.marketplaceFieldWrap;
    const shouldShow = isMinecraft
      ? ["version", "serverType", "playitTunnel", "acceptEula"].includes(field)
      : ["storageLocation"].includes(field);
    wrapper.hidden = !shouldShow;
  });
}

function openMarketplaceWizard(templateId) {
  const template = findMarketplaceTemplate(templateId);
  if (!template) {
    showToast("Template not found.");
    return;
  }
  if (template.comingSoon || template.disabled) {
    const message = template.comingSoonMessage || "This template is not ready yet.";
    setMarketplaceMessage(message, "warning");
    showToast(message, "info");
    return;
  }

  marketplaceSelectedTemplateId = template.id;
  if (marketplaceWizard) {
    marketplaceWizard.hidden = false;
  }

  if (marketplaceSelectedName) {
    marketplaceSelectedName.textContent = template.displayName || template.id;
  }
  if (marketplaceSelectedMeta) {
    marketplaceSelectedMeta.textContent = `${template.category || "Template"} · ${template.instanceType || "custom-command"} · ${template.startupType || "runtime"}`;
  }

  const nameField = getMarketplaceField("name");
  const versionField = getMarketplaceField("version");
  const serverTypeField = getMarketplaceField("serverType");
  const storageField = getMarketplaceField("storageLocation");
  const memoryField = getMarketplaceField("memory");
  const portField = getMarketplaceField("port");
  const acceptEulaField = getMarketplaceField("acceptEula");
  const startField = getMarketplaceField("start");

  if (nameField) {
    nameField.value = template.displayName || "";
  }
  if (versionField) {
    versionField.value = "latest";
  }
  if (serverTypeField) {
    const serverType = (template.displayName || template.id || "Paper").replace(/^Minecraft\s+/i, "");
    serverTypeField.value = [...serverTypeField.options].some((option) => option.value === serverType) ? serverType : "Paper";
    serverTypeField.disabled = true;
  }
  if (storageField) {
    storageField.value = "data";
  }
  if (memoryField) {
    memoryField.value = template.defaultRam || "1G";
  }
  if (portField) {
    portField.value = Array.isArray(template.defaultPorts) && template.defaultPorts.length > 0 ? String(template.defaultPorts[0]) : "";
  }
  if (acceptEulaField) {
    acceptEulaField.checked = false;
  }
  if (startField) {
    startField.checked = true;
  }

  syncMarketplaceWizardFields(template);
  renderMarketplaceWizardSteps(template);
  renderMarketplaceTemplates();
  renderMarketplaceProgress([]);
  setMarketplaceInstallState("Ready", "ready");
  setMarketplaceMessage("Review the generated settings, then install.");
}

function closeMarketplaceWizard() {
  marketplaceSelectedTemplateId = null;
  if (marketplaceWizard) {
    marketplaceWizard.hidden = true;
  }
  if (marketplaceSelectedName) {
    marketplaceSelectedName.textContent = "Select a template";
  }
  if (marketplaceSelectedMeta) {
    marketplaceSelectedMeta.textContent = "Installable templates appear as cards.";
  }
  const serverTypeField = getMarketplaceField("serverType");
  if (serverTypeField) {
    serverTypeField.disabled = false;
  }
  renderMarketplaceTemplates();
}

function collectMarketplaceInstallOptions() {
  const portValue = Number.parseInt(getMarketplaceField("port")?.value || "", 10);
  const ports = Number.isInteger(portValue) && portValue > 0 && portValue <= 65535 ? [portValue] : [];
  return {
    name: getMarketplaceField("name")?.value || "",
    version: getMarketplaceField("version")?.value || "",
    serverType: getMarketplaceField("serverType")?.value || "",
    storageLocation: getMarketplaceField("storageLocation")?.value || "data",
    memory: normalizeMemoryLimit(getMarketplaceField("memory")?.value || ""),
    port: ports[0] || undefined,
    ports,
    playitTunnel: Boolean(getMarketplaceField("playitTunnel")?.checked),
    acceptEula: Boolean(getMarketplaceField("acceptEula")?.checked),
    start: Boolean(getMarketplaceField("start")?.checked),
  };
}

function renderMarketplaceProgress(steps = []) {
  if (!marketplaceProgress) {
    return;
  }

  marketplaceProgress.replaceChildren();
  if (!steps.length) {
    const empty = document.createElement("div");
    empty.className = "marketplace-progress-empty";
    empty.textContent = "Install progress will appear here.";
    marketplaceProgress.append(empty);
    return;
  }

  steps.forEach((step) => {
    const row = document.createElement("div");
    row.className = "marketplace-progress-step";
    row.dataset.status = step.status || "pending";
    const label = document.createElement("strong");
    label.textContent = step.label || "Step";
    const detail = document.createElement("span");
    detail.textContent = step.detail || step.status || "";
    row.append(label, detail);
    marketplaceProgress.append(row);
  });
}

function formatDownloadSpeed(bytesPerSecond) {
  return Number.isFinite(bytesPerSecond) && bytesPerSecond > 0 ? `${formatBytes(bytesPerSecond)}/s` : "Idle";
}

function renderMarketplaceDownloads(downloads = []) {
  if (!downloadList) {
    return;
  }

  downloadList.replaceChildren();
  if (!downloads.length) {
    const empty = document.createElement("div");
    empty.className = "docker-empty-state";
    const title = document.createElement("strong");
    title.textContent = "No downloads queued";
    const detail = document.createElement("span");
    detail.textContent = "Template downloads will appear here.";
    empty.append(title, detail);
    downloadList.append(empty);
    return;
  }

  downloads.forEach((download) => {
    const item = document.createElement("article");
    item.className = "download-item";
    const header = document.createElement("div");
    header.className = "download-item__header";
    const name = document.createElement("strong");
    name.textContent = download.name || download.id;
    const status = document.createElement("span");
    status.className = "status-pill";
    status.textContent = download.status || "queued";
    header.append(name, status);

    const bar = document.createElement("div");
    bar.className = "download-progress";
    const fill = document.createElement("span");
    fill.style.width = `${Math.max(0, Math.min(Number(download.progress) || 0, 100))}%`;
    bar.append(fill);

    const meta = document.createElement("small");
    const eta = Number.isFinite(download.etaSeconds) ? ` · ETA ${formatDuration(download.etaSeconds)}` : "";
    meta.textContent = `${download.progress || 0}% · ${formatDownloadSpeed(download.speedBytesPerSecond)}${eta}`;

    const actions = document.createElement("div");
    actions.className = "download-item__actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "inline-action";
    cancel.textContent = "Cancel";
    cancel.disabled = !download.canCancel;
    cancel.addEventListener("click", () => cancelMarketplaceDownload(download.id));
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "inline-action";
    retry.textContent = "Retry";
    retry.disabled = !download.canRetry;
    retry.addEventListener("click", () => retryMarketplaceDownload(download.id));
    actions.append(cancel, retry);

    item.append(header, bar, meta, actions);
    downloadList.append(item);
  });
}

async function refreshMarketplaceDownloads() {
  const desktopApiState = getDesktopApiState();
  if (!desktopApiState.hasMarketplace) {
    renderMarketplaceDownloads([]);
    return;
  }

  try {
    const payload = await desktopApiState.api.marketplace.getDownloads();
    renderMarketplaceDownloads(Array.isArray(payload?.downloads) ? payload.downloads : []);
  } catch {
    renderMarketplaceDownloads([]);
  }
}

async function cancelMarketplaceDownload(downloadId) {
  try {
    await getDesktopApiState().api.marketplace.cancelDownload(downloadId);
    await refreshMarketplaceDownloads();
  } catch (error) {
    showToast(error?.message || "Download cancel failed.");
  }
}

async function retryMarketplaceDownload(downloadId) {
  try {
    await getDesktopApiState().api.marketplace.retryDownload(downloadId);
    await refreshMarketplaceDownloads();
  } catch (error) {
    showToast(error?.message || "Download retry failed.");
  }
}

function handleInstanceBackupAction(action) {
  const selectedInstance = findInstance();

  if (!selectedInstance) {
    showToast("Select an instance first.");
    return;
  }

  if (action === "backup-now") {
    showToast("Backup creation uses the shared Backups system. Opening Backups.");
  } else if (action === "history") {
    showToast("Opening shared backup history.");
  } else {
    showToast("This backup action is not available yet.");
    return;
  }

  showPage("backups");
}

async function refreshMarketplace() {
  const desktopApiState = getDesktopApiState();
  if (!desktopApiState.hasMarketplace || marketplaceRequestInFlight) {
    if (!desktopApiState.hasMarketplace) {
      marketplaceCatalog = { categories: [], templates: [] };
      renderMarketplaceCategories();
      renderMarketplaceTemplates();
      setMarketplaceMessage("Marketplace bridge is unavailable in this build.", "error");
    }
    return;
  }

  setMarketplaceLoading(true);
  try {
    marketplaceCatalog = await desktopApiState.api.marketplace.listTemplates();
    renderMarketplaceCategories();
    renderMarketplaceTemplates();
    setMarketplaceMessage("Template catalog loaded.");
  } catch (error) {
    marketplaceCatalog = { categories: [], templates: [] };
    renderMarketplaceCategories();
    renderMarketplaceTemplates();
    setMarketplaceMessage(error?.message || "Marketplace could not be loaded.", "error");
  } finally {
    setMarketplaceLoading(false);
  }
}

async function installMarketplaceTemplate(event) {
  event?.preventDefault();
  const desktopApiState = getDesktopApiState();
  const template = findMarketplaceTemplate();

  if (!desktopApiState.hasMarketplace || !template || marketplaceInstallInFlight) {
    return;
  }

  let options;
  try {
    const serverTypeField = getMarketplaceField("serverType");
    if (serverTypeField && template.category === "Minecraft") {
      const serverType = (template.displayName || template.id || "Paper").replace(/^Minecraft\s+/i, "");
      serverTypeField.value = [...serverTypeField.options].some((option) => option.value === serverType) ? serverType : "Paper";
    }
    options = collectMarketplaceInstallOptions();
    options.serverType = template.category === "Minecraft"
      ? (template.displayName || template.id || "").replace(/^Minecraft\s+/i, "")
      : options.serverType;
  } catch (error) {
    setMarketplaceMessage(error?.message || "Check install settings.", "error");
    showToast(error?.message || "Check install settings.", "warning");
    return;
  }
  if (!options.name.trim()) {
    setMarketplaceMessage("Enter a name before installing.", "error");
    getMarketplaceField("name")?.focus();
    return;
  }

  if (template.category === "Minecraft" && !options.acceptEula) {
    setMarketplaceMessage("Accept the Minecraft EULA to generate eula.txt.", "error");
    return;
  }

  marketplaceInstallInFlight = true;
  if (marketplaceInstallButton) {
    marketplaceInstallButton.disabled = true;
  }
  setMarketplaceInstallState("Installing", "running");
  renderMarketplaceProgress([
    { label: "Creating folders", status: "running", detail: "Sending install request to the Debian agent." },
  ]);

  try {
    const result = await desktopApiState.api.marketplace.installTemplate({
      templateId: template.id,
      options,
    });
    renderMarketplaceProgress(result?.progress || []);
    renderMarketplaceDownloads(result?.downloads || []);
    selectedInstanceId = result?.instance?.id || selectedInstanceId;
    forgetStaleInstanceId(selectedInstanceId);
    setMarketplaceInstallState("Complete", "complete");
    setMarketplaceMessage("Install complete. Opening the new instance.");
    showToast("Template installed.");
    showPage("instances");
    await refreshInstances();
  } catch (error) {
    setMarketplaceInstallState("Failed", "failed");
    renderMarketplaceProgress([
      { label: "Failed", status: "failed", detail: getAgentErrorMessage(error, "Template install failed.") },
    ]);
    setMarketplaceMessage(getAgentErrorMessage(error, "Template install failed."), "error");
    showToast(getAgentErrorMessage(error, "Template install failed."));
  } finally {
    marketplaceInstallInFlight = false;
    if (marketplaceInstallButton) {
      marketplaceInstallButton.disabled = false;
    }
    renderMarketplaceTemplates();
    refreshMarketplaceDownloads();
  }
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseArgs(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry));
    }
  } catch {}

  return raw.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((part) => part.replace(/^"|"$/g, "")) || [];
}

function normalizeMemoryLimit(value) {
  const memory = String(value || "").trim();

  if (!memory) {
    return "";
  }

  const match = memory.match(/^([1-9][0-9]{0,5})([kKmMgG]?)$/);
  if (!match) {
    throw new Error("Use memory like 512M, 2G, or 2048M.");
  }

  return `${match[1]}${match[2] ? match[2].toUpperCase() : ""}`;
}

function parseEnvironment(value) {
  return parseCsv(value).reduce((environment, entry) => {
    const separatorIndex = entry.indexOf("=");
    if (separatorIndex <= 0) {
      return environment;
    }

    const key = entry.slice(0, separatorIndex).trim();
    const envValue = entry.slice(separatorIndex + 1).trim();
    if (key) {
      environment[key] = envValue;
    }
    return environment;
  }, {});
}

function getInstanceFormValue(name) {
  return document.querySelector(`[data-instance-form="${name}"]`)?.value?.trim() || "";
}

function setInstanceFormMessage(message) {
  if (instanceFormMessage) {
    instanceFormMessage.textContent = message;
  }
}

function syncInstanceCreateTypeFields() {
  const type = instanceTypeSelect?.value || "custom-command";
  const executableInput = document.querySelector('[data-instance-form="executable"]');
  const entrypointInput = document.querySelector('[data-instance-form="entrypoint"]');

  if (instanceEntrypointField) {
    instanceEntrypointField.hidden = type === "custom-command";
  }

  instanceCustomFields.forEach((field) => {
    field.hidden = type !== "custom-command";
  });

  instanceTemplateButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.instanceTemplate === type);
  });

  if (executableInput && !executableInput.value.trim()) {
    executableInput.placeholder =
      type === "custom-command" ? "node" :
        type === "node-app" ? "node" :
          type === "python-app" ? "python3" :
            "java";
  }

  if (entrypointInput) {
    entrypointInput.placeholder =
      type === "node-app" ? "index.js" :
        type === "python-app" ? "app.py" :
          type === "java-app" ? "app.jar" :
            type === "minecraft-paper" ? "paper.jar" :
              "";
  }
}

function buildInstanceCreatePayload() {
  const id = getInstanceFormValue("id");
  const displayName = getInstanceFormValue("displayName");
  const type = getInstanceFormValue("type") || "custom-command";
  const executable = getInstanceFormValue("executable");
  const entrypoint = getInstanceFormValue("entrypoint");
  const workingDirectory = getInstanceFormValue("workingDirectory");
  const args = parseArgs(getInstanceFormValue("args"));
  const memoryLimit = normalizeMemoryLimit(getInstanceFormValue("memoryLimit"));
  const ports = parseCsv(getInstanceFormValue("ports")).map((port) => Number.parseInt(port, 10)).filter(Number.isFinite);
  const tags = parseCsv(getInstanceFormValue("tags"));
  const environment = parseEnvironment(getInstanceFormValue("environment"));

  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(id)) {
    throw new Error("Use an ID with 2-64 letters, numbers, underscores, or dashes.");
  }

  const payload = {
    id,
    displayName: displayName || id,
    type,
    args,
    ports,
    tags,
    environment,
  };

  if (memoryLimit) {
    payload.memoryLimit = memoryLimit;
  }

  if (type === "minecraft-paper" && !payload.tags.includes("minecraft")) {
    payload.tags.push("minecraft");
  }

  if (executable) {
    payload.executable = executable;
  }

  if (workingDirectory) {
    payload.workingDirectory = workingDirectory;
  }

  if (entrypoint && type !== "custom-command") {
    if (type === "java-app" || type === "minecraft-paper") {
      payload.jar = entrypoint;
    } else {
      payload.entrypoint = entrypoint;
    }
  }

  return payload;
}

function setInstanceCreateFormVisible(visible) {
  instanceCreateFormVisible = Boolean(visible);

  if (instanceCreateForm) {
    instanceCreateForm.hidden = !instanceCreateFormVisible;
  }

  if (instancesDetailsPanel) {
    instancesDetailsPanel.hidden = instanceCreateFormVisible;
  }

  if (instancesCreateToggleButton) {
    instancesCreateToggleButton.textContent = instanceCreateFormVisible ? "Hide Form" : "Create";
  }

  syncInstanceCreateTypeFields();
}

async function refreshInstances(options = {}) {
  if (instancesRequestInFlight) {
    return getInstances();
  }

  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasInstances) {
    renderInstancesUnavailable(desktopApiState.hasBridge ? "Instances IPC bridge unavailable." : "Desktop preload bridge unavailable.");
    return getInstances();
  }

  instancesRequestInFlight = true;
  setInstancesLoading(true);
  updateInstanceActionButtons();

  try {
    renderInstancesSnapshot(await desktopApiState.api.instances.list());
    if (options.refreshMetrics !== false) {
      await refreshSelectedInstanceMetrics();
    }
  } catch (error) {
    console.warn("[Instances] List refresh failed; keeping previous renderer state.", error);
    if (latestInstancesSnapshot) {
      setInstancesLoading(false);
      setInstancesEmpty(getInstances().length === 0, "Instance list refresh failed. Keeping the last known list.");
      showToast(getAgentErrorMessage(error, "Instance list refresh failed."), "warning");
    } else {
      renderInstancesUnavailable(`Instance request failed: ${getAgentErrorMessage(error)}`);
    }
  } finally {
    instancesRequestInFlight = false;
    updateInstanceActionButtons();
  }

  return getInstances();
}

async function refreshSelectedInstanceMetrics() {
  if (!selectedInstanceId || instanceActionRequestInFlight) {
    return;
  }

  const requestInstanceId = selectedInstanceId;

  if (!findInstance(requestInstanceId)) {
    await handleMissingSelectedInstance(null, requestInstanceId);
    return;
  }

  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasInstances) {
    return;
  }

  try {
    latestInstanceMetrics = normalizeMetricsResponse(await desktopApiState.api.instances.getMetrics(requestInstanceId));
    renderInstanceRows(getInstances());
    selectInstance(requestInstanceId, { refreshMetrics: false });
  } catch (error) {
    latestInstanceMetrics = null;
    if (isInstanceNotFoundError(error)) {
      await handleMissingSelectedInstance(error, requestInstanceId);
      return;
    }
    console.warn("[Instances] Metrics request failed.", error);
    setInstanceDetails(findInstance());
  }
}

async function refreshInstanceLogs(options = {}) {
  if (!selectedInstanceId || instanceLogsRequestInFlight) {
    return;
  }

  const requestInstanceId = selectedInstanceId;

  if (!findInstance(requestInstanceId)) {
    await handleMissingSelectedInstance(null, requestInstanceId);
    return;
  }

  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasInstances) {
    clearInstanceLogs("Instances IPC bridge unavailable.");
    return;
  }

  instanceLogsRequestInFlight = true;
  updateInstanceActionButtons();

  try {
    const stream = instancesLogStreamSelect?.value || "all";
    const limit = Number.parseInt(instancesLogLimitSelect?.value || "200", 10);
    renderInstanceLogs(await desktopApiState.api.instances.getLogs(requestInstanceId, {
      stream,
      limit: Number.isFinite(limit) ? limit : 200,
    }));
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await handleMissingSelectedInstance(error, requestInstanceId);
    } else if (!options.silent) {
      console.warn("[Instances] Log request failed.", error);
      showToast(getAgentErrorMessage(error, "Log request failed."));
    } else {
      console.warn("[Instances] Silent log request failed.", error);
    }
  } finally {
    instanceLogsRequestInFlight = false;
    updateInstanceActionButtons();
  }
}

async function createInstanceFromForm(event) {
  event?.preventDefault();

  const desktopApiState = getDesktopApiState();

  if (!desktopApiState.hasInstances || instanceActionRequestInFlight) {
    return;
  }

  let payload;

  try {
    payload = buildInstanceCreatePayload();
  } catch (error) {
    setInstanceFormMessage(error?.message || "Check instance form values.");
    return;
  }

  instanceActionRequestInFlight = true;
  updateInstanceActionButtons();
  setInstanceFormMessage("Creating instance...");
  let createdInstanceId = null;
  let createdInstanceAccepted = false;

  try {
    logInstanceCreateFlow("submitting create request", {
      requestedId: payload.id,
      type: payload.type,
      memoryLimit: payload.memoryLimit || null,
    });
    const response = await desktopApiState.api.instances.create(payload);
    const instance = normalizeInstanceResponse(response);
    createdInstanceId = instance?.id || payload.id;
    selectedInstanceId = createdInstanceId;
    forgetStaleInstanceId(createdInstanceId);
    logInstanceCreateFlow("created instance", {
      createdId: createdInstanceId,
      responseId: instance?.id || null,
    });

    const refreshedInstances = await refreshInstances({ refreshMetrics: false });
    const refreshedInstanceIds = refreshedInstances.map((candidate) => candidate.id);
    logInstanceCreateFlow("refreshed after create", {
      createdId: createdInstanceId,
      refreshedInstanceIds,
    });

    if (!refreshedInstanceIds.includes(createdInstanceId)) {
      await handleMissingSelectedInstance(null, createdInstanceId, "create-refresh-missing");
      setInstanceFormMessage("Created instance was not returned by the agent refresh. Removed stale entry from the list.");
      return;
    }

    createdInstanceAccepted = true;
    selectInstance(createdInstanceId, { refreshMetrics: false });

    if (payload.type === "minecraft-paper") {
      const acceptEula = document.querySelector('[data-instance-form="acceptEula"]')?.checked === true;
      if (acceptEula) {
        await desktopApiState.api.instances.writeFile(createdInstanceId, "eula.txt", "eula=true\n");
      }
      await desktopApiState.api.instances.saveMinecraftProperties(createdInstanceId, {
        "server-port": payload.ports?.[0] ? String(payload.ports[0]) : "25565",
        motd: payload.displayName || payload.id,
        "max-players": "20",
        difficulty: "easy",
        gamemode: "survival",
        "view-distance": "10",
        "simulation-distance": "10",
        "online-mode": "true",
        "allow-flight": "false",
        "spawn-protection": "16",
        pvp: "true",
        "white-list": "false",
        "generate-structures": "true",
        "level-seed": "",
      });
    }

    setInstanceCreateFormVisible(false);
    instanceCreateForm?.reset();
    setInstanceFormMessage("Commands run without a shell. Secrets are not accepted in environment variable names.");
    showToast("Instance created.");
    await refreshInstances();
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      const candidateId = createdInstanceId || selectedInstanceId || payload.id;
      const refreshedInstances = await refreshInstances({ refreshMetrics: false });
      const refreshedInstanceIds = refreshedInstances.map((candidate) => candidate.id);
      logInstanceCreateFlow("not-found during create follow-up", {
        createdId: candidateId,
        createdInstanceAccepted,
        refreshedInstanceIds,
        errorCode: getAgentErrorCode(error),
      });

      if (!refreshedInstanceIds.includes(candidateId)) {
        await handleMissingSelectedInstance(error, candidateId, "create-follow-up-not-found-and-missing-after-refresh");
        setInstanceFormMessage("Created instance was not available. Removed stale entry from the list.");
      } else {
        console.warn("[Instances] Create follow-up request returned not found, but the created instance is present after refresh.", {
          createdId: candidateId,
          refreshedInstanceIds,
          error,
        });
        selectedInstanceId = candidateId;
        selectInstance(candidateId, { refreshMetrics: false });
        setInstanceCreateFormVisible(false);
        instanceCreateForm?.reset();
        setInstanceFormMessage("Instance created. A follow-up configuration step was not available yet; refresh or open Configuration to retry.");
        showToast("Instance created. Some setup could not be applied yet.", "warning");
      }
    } else {
      setInstanceFormMessage(getAgentErrorMessage(error, "Create instance failed."));
    }
  } finally {
    instanceActionRequestInFlight = false;
    updateInstanceActionButtons();
  }
}

async function runInstanceAction(actionName) {
  const selectedInstance = findInstance();
  const desktopApiState = getDesktopApiState();

  if (!selectedInstance || !desktopApiState.hasInstances || instanceActionRequestInFlight) {
    updateInstanceActionButtons();
    return;
  }

  const label = selectedInstance.displayName || selectedInstance.id;
  const targetInstanceId = selectedInstance.id;

  if (actionName === "delete") {
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) {
      showToast("Delete canceled.");
      return;
    }
  } else if (!window.confirm(`${actionName[0].toUpperCase()}${actionName.slice(1)} ${label}?`)) {
    return;
  }

  if ((actionName === "start" || actionName === "restart") && !(await verifyJavaJarBeforeLaunch(selectedInstance))) {
    return;
  }

  instanceActionRequestInFlight = true;
  updateInstanceActionButtons();

  try {
    if (actionName === "delete") {
      showToast(`Deleting ${label}...`);
    } else if (actionName === "start") {
      logInstanceLifecycle("start requested", { instanceId: targetInstanceId });
    }

    const actionResult = await desktopApiState.api.instances[actionName](targetInstanceId);
    if (actionName === "start") {
      logInstanceLifecycle("start result", {
        instanceId: targetInstanceId,
        state: actionResult?.instance?.state || actionResult?.state || null,
        pid: actionResult?.instance?.pid || actionResult?.pid || null,
      });
    }
    forgetStaleInstanceId(targetInstanceId);
    showToast(actionName === "delete" ? "Instance deleted." : `Instance ${actionName} request completed.`);

    if (actionName === "delete") {
      selectedInstanceId = null;
      latestInstanceMetrics = null;
      clearInstanceLogs();
      setInstanceDetails(null);
      instanceRemovalAllowedIds.add(targetInstanceId);
      removeInstanceFromSnapshot(targetInstanceId);
    }

    const refreshedInstances = await refreshInstances();
    if (actionName === "start") {
      logInstanceLifecycle("list result after start", {
        instanceId: targetInstanceId,
        count: refreshedInstances.length,
        containsInstance: refreshedInstances.some((instance) => instance.id === targetInstanceId),
      });
    }
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      if (actionName === "delete") {
        instanceRemovalAllowedIds.add(targetInstanceId);
        selectedInstanceId = null;
        latestInstanceMetrics = null;
        storeLastInstanceId(null);
        clearInstanceLogs();
        setInstanceDetails(null);
        removeInstanceFromSnapshot(targetInstanceId);
        showToast("Instance was already deleted. Refreshed the list.", "warning");
        await refreshInstances();
      } else {
        await handleMissingSelectedInstance(error, targetInstanceId, `${actionName}-not-found`);
      }
    } else {
      console.warn(`[Instances] ${actionName} failed.`, error);
      if (actionName === "start" || actionName === "restart") {
        updateInstanceSnapshot(targetInstanceId, {
          state: "Failed",
          failureReason: getAgentErrorMessage(error, `Instance ${actionName} failed.`),
        });
      }
      showToast(getAgentErrorMessage(error, `Instance ${actionName} failed.`));
      const refreshedInstances = await refreshInstances();
      if (actionName === "start") {
        logInstanceLifecycle("list result after failed start", {
          instanceId: targetInstanceId,
          count: refreshedInstances.length,
          containsInstance: refreshedInstances.some((instance) => instance.id === targetInstanceId),
          errorCode: getAgentErrorCode(error),
        });
      }
    }
  } finally {
    instanceActionRequestInFlight = false;
    updateInstanceActionButtons();
  }
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
    return getFileTypeInfo(entry).label;
  }

  if (entry.type && entry.type !== "file") {
    return formatFileValue(entry.type);
  }

  return getFileTypeInfo(entry).label;
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
  return getFileTypeInfo(entry).badge;
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
  meta.textContent = getFileTypeInfo(entry).label;
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
    playerCount: toFiniteNumber(findAmpValue(instance, [
      "playerCount",
      "Players",
      "PlayerCount",
      "CurrentPlayers",
      "ActiveUsers",
      "UsersOnline",
      "OnlinePlayers",
      "PlayersOnline",
    ])),
    maxPlayers: toFiniteNumber(findAmpValue(instance, ["maxPlayers", "MaxPlayers", "MaximumPlayers", "PlayerLimit", "MaxUsers"])),
    tps: toFiniteNumber(findAmpValue(instance, ["tps", "TPS", "TicksPerSecond", "ServerTPS", "CurrentTPS"])),
    cpuUsage: normalizeAmpPercentValue(findAmpValue(instance, ["cpuUsage", "CPUUsage", "CpuUsage", "CPU", "ProcessorUsage", "PercentCPU"])),
    ramUsage: toFiniteNumber(findAmpValue(instance, [
      "ramUsage",
      "MemoryUsageMB",
      "MemoryMB",
      "MemoryUsage",
      "RAMUsage",
      "UsedMemory",
      "Memory",
      "MemUsageMB",
    ])),
    ports: (() => {
      const value = findAmpValue(instance, ["ports", "Ports", "Port", "PortMappings", "ApplicationEndpoints", "NetworkPorts", "Endpoint", "Endpoints"]);

      if (Array.isArray(value)) {
        return value
          .map((port) => {
            if (typeof port === "number" || typeof port === "string") {
              return String(port);
            }

            if (!port || typeof port !== "object") {
              return null;
            }

            const portNumber = findAmpValue(port, ["Port", "port", "HostPort", "ContainerPort", "PublicPort"]);
            const protocol = findAmpValue(port, ["Protocol", "protocol"]);
            return portNumber ? `${portNumber}${protocol ? `/${protocol}` : ""}` : null;
          })
          .filter(Boolean);
      }

      if (value && typeof value === "object") {
        return Object.values(value)
          .map((port) => (typeof port === "object" ? findAmpValue(port, ["Port", "port", "HostPort", "PublicPort"]) : port))
          .filter((port) => port !== null && port !== undefined)
          .map(String);
      }

      const singlePort = toFiniteNumber(value);
      return singlePort === null ? [] : [String(singlePort)];
    })(),
    uptime: parseAmpDurationSeconds(findAmpValue(instance, ["uptime", "Uptime", "UptimeSeconds", "RunningSeconds", "StartedFor", "UptimeSec"])),
    version: findAmpValue(instance, [
      "version",
      "Version",
      "AppVersion",
      "ApplicationVersion",
      "ServerVersion",
      "MinecraftVersion",
      "ProductVersion",
      "ReleaseStream",
      "Build",
    ]),
  };
}

function hasAmpDataEvidence(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return false;
  }

  if (Array.isArray(snapshot.instances) && snapshot.instances.length > 0) {
    return true;
  }

  if (snapshot.selectedInstance && typeof snapshot.selectedInstance === "object") {
    return true;
  }

  const summary = snapshot.summary;
  if (!summary || typeof summary !== "object") {
    return false;
  }

  return [
    summary.playerCount,
    summary.maxPlayers,
    summary.tps,
    summary.cpuUsage,
    summary.ramUsage,
    summary.uptime,
  ].some((value) => Number.isFinite(value)) || Boolean(summary.version) || (Array.isArray(summary.ports) && summary.ports.length > 0);
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
  const primaryInstance = selectedInstance || minecraftInstances[0] || normalizedInstances[0] || null;
  const summary = {
    ...(snapshot.summary && typeof snapshot.summary === "object" ? snapshot.summary : {}),
    selectedInstanceId: snapshot.summary?.selectedInstanceId || selectedInstance?.id || null,
    selectedInstanceName: snapshot.summary?.selectedInstanceName || selectedInstance?.name || null,
    minecraftInstanceCount: Number.isFinite(snapshot.summary?.minecraftInstanceCount)
      ? snapshot.summary.minecraftInstanceCount
      : minecraftInstances.length,
    minecraftSelectionMode:
      snapshot.summary?.minecraftSelectionMode ||
      snapshot.minecraftSelectionMode ||
      (minecraftInstances.length === 0 ? "none" : selectedInstance ? "auto" : minecraftInstances.length === 1 ? "auto" : "multiple"),
    state: snapshot.summary?.state || primaryInstance?.state || null,
    playerCount: Number.isFinite(snapshot.summary?.playerCount) ? snapshot.summary.playerCount : primaryInstance?.playerCount ?? null,
    maxPlayers: Number.isFinite(snapshot.summary?.maxPlayers) ? snapshot.summary.maxPlayers : primaryInstance?.maxPlayers ?? null,
    tps: Number.isFinite(snapshot.summary?.tps) ? snapshot.summary.tps : primaryInstance?.tps ?? null,
    cpuUsage: Number.isFinite(snapshot.summary?.cpuUsage) ? snapshot.summary.cpuUsage : primaryInstance?.cpuUsage ?? null,
    ramUsage: Number.isFinite(snapshot.summary?.ramUsage) ? snapshot.summary.ramUsage : primaryInstance?.ramUsage ?? null,
    ports: Array.isArray(snapshot.summary?.ports) && snapshot.summary.ports.length > 0 ? snapshot.summary.ports : primaryInstance?.ports || [],
    uptime: Number.isFinite(snapshot.summary?.uptime) ? snapshot.summary.uptime : primaryInstance?.uptime ?? null,
    version: snapshot.summary?.version || primaryInstance?.version || null,
  };
  const derivedConnected =
    hasAmpDataEvidence({
      ...snapshot,
      instances: normalizedInstances,
      selectedInstance,
      summary,
    }) &&
    snapshot.status !== "auth_failed" &&
    snapshot.status !== "unconfigured";
  const connected = snapshot.connected === true || snapshot.status === "connected" || snapshot.connection?.status === "connected" || derivedConnected;
  const status = connected ? "connected" : snapshot.status;
  const message = connected ? "Connected to AMP." : snapshot.message;
  const connection = {
    ...(snapshot.connection && typeof snapshot.connection === "object" ? snapshot.connection : {}),
    status,
    label: connected ? "Connected" : snapshot.connection?.label || "Unavailable",
    message: connected ? "Connected to AMP." : snapshot.connection?.message || message || "AMP unavailable.",
    connected,
    unreachable: !connected && (status === "unreachable" || status === "error"),
    authFailed: !connected && status === "auth_failed",
  };

  return {
    ...snapshot,
    connected,
    status,
    message,
    connection,
    instanceCount: Number.isFinite(snapshot.instanceCount) ? snapshot.instanceCount : normalizedInstances.length,
    instances: normalizedInstances,
    selectedInstance,
    minecraftInstances,
    summary,
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

function getAmpUrlSource(snapshot) {
  if (snapshot?.diagnostics?.ampUrlPresent || snapshot?.diagnostics?.ampUrlLoaded) {
    return "env";
  }

  if (getConfiguredAmpUrl()) {
    return "settings";
  }

  if (snapshot?.diagnostics?.loadedAmpUrl || snapshot?.diagnostics?.ampUrl) {
    return "runtime config";
  }

  return "missing";
}

function formatAmpDiagnostics(diagnostics, snapshot = null) {
  if (!diagnostics) {
    return "";
  }

  const status = diagnostics.httpStatus ? `HTTP ${diagnostics.httpStatus}` : "No HTTP status";
  const code = diagnostics.networkErrorCode || diagnostics.errorCode ? `Error ${diagnostics.networkErrorCode || diagnostics.errorCode}` : "No error code";
  const urlSource = getAmpUrlSource(snapshot);
  const reachability = diagnostics.loginFailed
    ? "Login failed"
    : diagnostics.serverUnreachable
      ? "Server unreachable"
      : "Connected";
  const ampUrlLoaded =
    urlSource === "env"
      ? diagnostics.ampUrlPresent || diagnostics.ampUrlLoaded
        ? "AMP_URL loaded"
        : "AMP_URL not loaded"
      : urlSource === "settings"
        ? "AMP URL from settings"
        : urlSource === "runtime config"
          ? "AMP URL from runtime config"
          : "AMP_URL unavailable";
  const envStatus =
    urlSource === "env"
      ? diagnostics.envExists || diagnostics.envFileExists
        ? "env exists"
        : "env missing"
      : `source ${urlSource}`;
  const envError =
    urlSource === "env"
      ? diagnostics.envLoaded
        ? "env load ok"
        : diagnostics.envLoadErrorCode
          ? `env error ${diagnostics.envLoadErrorCode}`
          : "env load ok"
      : "runtime URL active";
  const envPath =
    diagnostics.envPath || diagnostics.resolvedEnvPath
      ? `env ${diagnostics.envPath || diagnostics.resolvedEnvPath}`
      : urlSource === "env"
        ? "env path unavailable"
        : "env path not required";
  const cwd = diagnostics.cwd ? `cwd ${diagnostics.cwd}` : "cwd unavailable";
  const sourceDetail = urlSource !== "env" ? `source ${urlSource}` : envStatus;
  return ` · ${getAmpPanelUrl(snapshot) || diagnostics.loadedAmpUrl || diagnostics.ampUrl || "AMP_URL unavailable"} · ${ampUrlLoaded} · ${sourceDetail} · ${envError} · ${envPath} · ${cwd} · ${status} · ${code} · ${reachability}`;

  return ` · ${diagnostics.loadedAmpUrl || diagnostics.ampUrl || "AMP_URL unavailable"} · ${ampUrlLoaded} · ${envStatus} · ${envError} · ${envPath} · ${cwd} · ${status} · ${code} · ${reachability}`;
}

function formatAmpConnection(snapshot) {
  const status = snapshot?.status || snapshot?.connection?.status || "unavailable";

  if (status === "connected" || snapshot?.connected === true) {
    return "Connected: Connected to AMP.";
  }

  const label = snapshot?.connection?.label || "Unavailable";
  const message = snapshot?.connection?.message || snapshot?.message || "AMP unavailable.";
  return `${label}: ${message}${formatAmpDiagnostics(snapshot.diagnostics, snapshot)}`;
}

function getConfiguredAmpUrl() {
  const value = readStoredSettings()["amp.url"];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getAmpPanelUrl(snapshot) {
  return (
    snapshot?.diagnostics?.loadedAmpUrl ||
    snapshot?.diagnostics?.ampUrl ||
    getConfiguredAmpUrl() ||
    ""
  );
}

function updateAmpPanelLink(snapshot) {
  const panelUrl = getAmpPanelUrl(snapshot);
  const ampUrlSource = getAmpUrlSource(snapshot);
  const logPayload = JSON.stringify({
    source: ampUrlSource,
    hasUrl: Boolean(panelUrl),
    connected: snapshot?.connected === true,
  });

  if (logPayload !== lastLoggedAmpUrlSource) {
    lastLoggedAmpUrlSource = logPayload;
    console.info(`[AnxHub][AMP] URL source=${ampUrlSource} connected=${snapshot?.connected === true ? "true" : "false"} hasUrl=${panelUrl ? "true" : "false"}`);
  }

  setField("ampPanelUrl", panelUrl || "Unavailable");

  if (!ampPanelLink) {
    return;
  }

  if (panelUrl) {
    ampPanelLink.href = panelUrl;
    ampPanelLink.textContent = "Open panel";
    ampPanelLink.removeAttribute("aria-disabled");
    return;
  }

  ampPanelLink.removeAttribute("href");
  ampPanelLink.textContent = "Unavailable";
  ampPanelLink.setAttribute("aria-disabled", "true");
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
  updateAmpPanelLink(snapshot);

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
    updateAmpPanelLink(null);
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
    updateAmpPanelLink(null);
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
  const intervalId = window.setInterval(callback, intervalMs);
  refreshTaskIds.push(intervalId);
  callback();
}

function inferToastTone(message, tone) {
  if (tone) {
    return tone;
  }

  const normalized = String(message || "").toLowerCase();
  if (/\b(failed|error|unavailable|could not|invalid|denied)\b/.test(normalized)) {
    return "error";
  }
  if (/\b(canceled|warning|missing|planned|not available)\b/.test(normalized)) {
    return "warning";
  }
  if (/\b(saved|complete|connected|created|updated|installed|copied|cleared|request completed)\b/.test(normalized)) {
    return "success";
  }
  return "info";
}

function showToast(message, tone = null) {
  const nextTone = inferToastTone(message, tone);
  toast.textContent = message;
  toast.dataset.tone = nextTone;
  toast.setAttribute("role", nextTone === "error" ? "alert" : "status");
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

function getActiveConsoleInstance() {
  return activeConsoleInstanceId ? findInstance(activeConsoleInstanceId) : null;
}

function setConsoleDetail(name, value) {
  consoleDetailFields.forEach((field) => {
    if (field.dataset.consoleDetail === name) {
      field.textContent = value;
    }
  });
}

function setConsoleMetric(name, value) {
  consoleMetricFields.forEach((field) => {
    if (field.dataset.consoleMetric === name) {
      field.textContent = value;
    }
  });
}

function setConsoleStatus(name, value) {
  consoleStatusFields.forEach((field) => {
    if (field.dataset.consoleStatus === name) {
      field.textContent = value;
    }
  });
}

function getConsoleStateLabel(instance) {
  return instance?.state || "Unknown";
}

function getConsoleSourceRows() {
  return consoleSourceList ? [...consoleSourceList.querySelectorAll("[data-console-source-id]")] : [];
}

function renderConsoleSources() {
  if (!consoleSourceList) {
    return;
  }

  const instances = getInstances();
  const query = (consoleSourceSearchInput?.value || "").trim().toLowerCase();
  consoleSourceList.replaceChildren();

  instances.forEach((instance) => {
    const searchable = [instance.id, instance.displayName, instance.type, instance.state, ...(Array.isArray(instance.tags) ? instance.tags : [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (query && !searchable.includes(query)) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "console-source-row";
    button.dataset.consoleSourceId = instance.id || "";
    button.classList.toggle("is-active", instance.id === activeConsoleInstanceId);
    button.addEventListener("click", () => selectConsoleInstance(instance.id));

    const dot = document.createElement("span");
    dot.className = `console-source-dot is-${getInstanceStateClass(instance.state)}`;
    dot.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "console-source-copy";
    const name = document.createElement("strong");
    name.textContent = instance.displayName || instance.id || "Unnamed instance";
    const type = document.createElement("small");
    type.textContent = formatInstanceType(instance.type);
    copy.append(name, type);

    const state = document.createElement("span");
    state.className = `instance-state is-${getInstanceStateClass(instance.state)}`;
    state.textContent = getConsoleStateLabel(instance);

    button.append(dot, copy, state);
    consoleSourceList.append(button);
  });

  if (consoleSourceEmpty) {
    consoleSourceEmpty.hidden = instances.length > 0;
  }
}

function renderConsoleTabs() {
  if (!consoleTabs) {
    return;
  }

  consoleTabs.replaceChildren();
  const openIds = consoleOpenInstanceIds.filter((instanceId) => findInstance(instanceId));
  consoleOpenInstanceIds = openIds;

  if (openIds.length === 0) {
    const emptyTab = document.createElement("span");
    emptyTab.className = "console-tab-empty";
    emptyTab.textContent = "No open consoles";
    consoleTabs.append(emptyTab);
    return;
  }

  openIds.forEach((instanceId) => {
    const instance = findInstance(instanceId);
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "console-tab";
    tab.classList.toggle("is-active", instanceId === activeConsoleInstanceId);
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", instanceId === activeConsoleInstanceId ? "true" : "false");
    tab.addEventListener("click", () => selectConsoleInstance(instanceId, { keepOpen: true }));

    const label = document.createElement("span");
    label.textContent = instance?.displayName || instanceId;
    const close = document.createElement("span");
    close.className = "console-tab-close";
    close.textContent = "x";
    close.title = "Close console tab";
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      closeConsoleTab(instanceId);
    });

    tab.append(label, close);
    consoleTabs.append(tab);
  });
}

function getConsoleLogKind(entry) {
  const text = String(entry?.message || "").toLowerCase();
  if (entry?.stream === "stdin" || /^>\s/.test(text) || /\b(command|issued server command)\b/.test(text)) {
    return "command";
  }
  if (entry?.stream === "stderr" || /\b(error|exception|fail|failed|fatal|crash|crashed)\b/.test(text)) {
    return "error";
  }
  if (/\b(warn|warning)\b/.test(text)) {
    return "warn";
  }
  if (/\bdebug\b/.test(text)) {
    return "debug";
  }
  if (/\b(joined|left|chat|say|tellraw|whisper)\b/.test(text)) {
    return "chat";
  }
  return "info";
}

function hasConsoleCrashSignal(entries = consoleBufferedEntries) {
  return entries.some((entry) => {
    const text = String(entry?.message || "").toLowerCase();
    return entry?.stream === "stderr" || /\b(error|exception|fatal|crash|crashed)\b/.test(text);
  });
}

function renderConsoleLogs(entries = consoleBufferedEntries) {
  consoleLogList?.replaceChildren();

  entries.forEach((entry) => {
    const item = document.createElement("li");
    const kind = getConsoleLogKind(entry);
    item.dataset.stream = entry?.stream || "log";
    item.dataset.severity = kind;
    item.classList.toggle("is-stderr", entry?.stream === "stderr");
    item.classList.toggle("is-stdin", entry?.stream === "stdin");
    item.classList.toggle("is-warn", kind === "warn");
    item.classList.toggle("is-error", kind === "error");
    item.classList.toggle("is-debug", kind === "debug");
    item.classList.toggle("is-chat", kind === "chat");
    const time = document.createElement("time");
    time.dateTime = entry?.at || "";
    time.textContent = entry?.at ? formatDateTime(entry.at) : "No timestamp";
    const stream = document.createElement("span");
    stream.className = "instance-log-stream";
    stream.textContent = entry?.stream || "log";
    const message = document.createElement("span");
    appendAnsiText(message, entry?.message || "");
    item.append(time, stream, message);
    consoleLogList?.append(item);
  });

  filterConsoleRows();
  if (consoleAutoscrollInput?.checked && !consolePauseInput?.checked && consoleViewer) {
    consoleViewer.scrollTop = consoleViewer.scrollHeight;
  }
  if (consoleCrashBanner) {
    consoleCrashBanner.hidden = !hasConsoleCrashSignal(entries);
  }
}

function getConsoleEmptyMessage() {
  const desktopApiState = getDesktopApiState();
  const instance = getActiveConsoleInstance();

  if (!desktopApiState.hasInstances) {
    return ["Connection unavailable", "The instance API bridge is unavailable."];
  }

  if (!instance) {
    return ["No instance selected", "Select an instance from the source list to view live output."];
  }

  if (!isInstanceRunning(instance)) {
    return ["Instance stopped", "Start the instance to watch live output, or refresh logs to view previous output."];
  }

  if (consoleLogsRequestInFlight) {
    return ["Loading logs", "Fetching recent output from the selected instance."];
  }

  return ["No logs yet", "No output has been captured for this instance yet."];
}

function updateConsoleEmptyState() {
  const rows = getConsoleRows();
  const visibleRows = rows.filter((row) => !row.hidden);
  const hasRows = rows.length > 0;
  const [title, message] = getConsoleEmptyMessage();

  if (consoleEmptyState) {
    consoleEmptyState.hidden = hasRows;
    const titleTarget = consoleEmptyState.querySelector("strong");
    const messageTarget = consoleEmptyState.querySelector("span");
    if (titleTarget) {
      titleTarget.textContent = title;
    }
    if (messageTarget) {
      messageTarget.textContent = message;
    }
  }

  if (consoleCountTarget) {
    consoleCountTarget.textContent = `${visibleRows.length}/${rows.length} ${rows.length === 1 ? "line" : "lines"}`;
  }

  if (consoleClearButton) {
    consoleClearButton.disabled = !hasRows;
  }

  if (consoleCopyButton) {
    consoleCopyButton.disabled = visibleRows.length === 0;
  }

  setConsoleStatus("lines", `${visibleRows.length}/${rows.length}`);
  setConsoleStatus("autoscroll", consoleAutoscrollInput?.checked ? "On" : "Off");
  setConsoleStatus("paused", consolePauseInput?.checked ? "On" : "Off");
  setConsoleStatus("filter", activeConsoleFilter[0]?.toUpperCase() + activeConsoleFilter.slice(1));
}

function matchesConsoleFilter(row, filter) {
  if (filter === "all") {
    return true;
  }

  return row.dataset.severity === filter || row.dataset.stream === filter || (filter === "error" && row.dataset.stream === "stderr");
}

function filterConsoleRows() {
  const query = (consoleSearchInput?.value || "").trim().toLowerCase();

  getConsoleRows().forEach((row) => {
    const matchesQuery = !query || row.textContent.toLowerCase().includes(query);
    row.hidden = !matchesQuery || !matchesConsoleFilter(row, activeConsoleFilter);
  });

  updateConsoleEmptyState();
}

async function clearConsoleRows() {
  if (!consoleLogList) {
    return;
  }

  const instance = getActiveConsoleInstance();
  if (instance && getDesktopApiState().hasInstances) {
    try {
      await getDesktopApiState().api.instances.clearLogs(instance.id, { stream: "all" });
    } catch (error) {
      console.warn("[Console] Clear logs failed.", error);
      showToast(getAgentErrorMessage(error, "Clear logs failed."));
      return;
    }
  }

  consoleBufferedEntries = [];
  consoleLogList.replaceChildren();
  updateConsoleEmptyState();
  showToast(instance ? "Console logs cleared." : "Console cleared.");
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

  updateConsoleEmptyState();
}

function setConsoleFilter(filter) {
  activeConsoleFilter = filter || "all";
  consoleFilterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.consoleFilter === activeConsoleFilter);
  });
  filterConsoleRows();
}

function selectConsoleInstance(instanceId, options = {}) {
  const instance = findInstance(instanceId);
  activeConsoleInstanceId = instance?.id || null;
  consoleSuppressAutoSelect = false;

  if (activeConsoleInstanceId && !consoleOpenInstanceIds.includes(activeConsoleInstanceId)) {
    consoleOpenInstanceIds.push(activeConsoleInstanceId);
  }

  if (!options.keepLogs) {
    consoleBufferedEntries = [];
    consoleLogList?.replaceChildren();
  }

  renderConsoleWorkspace();

  if (activeConsoleInstanceId && options.refreshLogs !== false) {
    refreshConsoleMetrics();
    refreshConsoleLogs({ silent: true });
  }
}

function closeConsoleTab(instanceId) {
  consoleOpenInstanceIds = consoleOpenInstanceIds.filter((candidate) => candidate !== instanceId);
  if (activeConsoleInstanceId === instanceId) {
    activeConsoleInstanceId = consoleOpenInstanceIds[consoleOpenInstanceIds.length - 1] || null;
    consoleBufferedEntries = [];
    consoleLogList?.replaceChildren();
    consoleSuppressAutoSelect = !activeConsoleInstanceId;
    if (activeConsoleInstanceId) {
      refreshConsoleLogs({ silent: true });
    }
  }
  renderConsoleWorkspace();
}

function getConsoleCommandPlaceholder(instance) {
  if (!instance) {
    return "Select a running instance to send commands";
  }

  if (!isInstanceRunning(instance)) {
    return "Start this instance to enable command input";
  }

  return isMinecraftInstance(instance) ? "Minecraft command: say hello, list, stop" : "Type a command and press Enter";
}

function updateConsoleCommandState() {
  const desktopApiState = getDesktopApiState();
  const instance = getActiveConsoleInstance();
  const canSend = Boolean(instance && isInstanceRunning(instance) && desktopApiState.hasInstances);

  if (consoleCommandInput) {
    consoleCommandInput.disabled = !canSend;
    consoleCommandInput.placeholder = desktopApiState.hasInstances
      ? getConsoleCommandPlaceholder(instance)
      : "Command input is not connected yet";
  }

  if (consoleSendButton) {
    consoleSendButton.disabled = !canSend;
  }
}

function renderConsoleActivity(instance) {
  if (!consoleActivityList) {
    return;
  }

  consoleActivityList.replaceChildren();
  const events = [
    ["Created", instance?.createdAt],
    ["Updated", instance?.updatedAt],
    ["Last started", instance?.lastStartedAt],
    ["Last stopped", instance?.lastStoppedAt],
    ["Failure", instance?.failureReason],
  ].filter(([, value]) => value);

  if (!instance || events.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No activity timestamps available.";
    consoleActivityList.append(item);
    return;
  }

  events.forEach(([label, value]) => {
    const item = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = label;
    const span = document.createElement("span");
    span.textContent = label === "Failure" ? String(value) : formatDateTime(value);
    item.append(strong, span);
    consoleActivityList.append(item);
  });
}

function renderConsoleStatusPanel() {
  const instance = getActiveConsoleInstance();
  const metrics = instance ? getInstanceMetrics(instance.id) : null;
  const state = getConsoleStateLabel(instance);

  if (consoleStateBadge) {
    consoleStateBadge.textContent = state;
    consoleStateBadge.className = `instance-state is-${getInstanceStateClass(state)}`;
  }

  setConsoleMetric("cpu", metrics ? formatInstanceCpu(metrics) : "Coming soon");
  setConsoleMetric("ram", metrics ? formatInstanceMemory(metrics) : "Coming soon");
  setConsoleDetail("pid", formatInstanceValue(instance?.pid));
  setConsoleDetail("uptime", formatDuration(metrics?.uptimeSeconds));
  setConsoleDetail("memoryLimit", formatInstanceValue(instance?.memoryLimit));
  setConsoleDetail("restartPolicy", formatInstanceValue(instance?.restartPolicy));
  setConsoleDetail("ports", formatInstancePorts(instance, metrics));
  setConsoleDetail("lastStartedAt", formatDateTime(instance?.lastStartedAt));
  setConsoleDetail("lastStoppedAt", formatDateTime(instance?.lastStoppedAt));
  setConsoleDetail("failureReason", formatInstanceValue(instance?.failureReason));
  renderConsoleActivity(instance);
}

function updateConsoleActionButtons() {
  const instance = getActiveConsoleInstance();
  const desktopApiState = getDesktopApiState();
  consoleActionButtons.forEach((button) => {
    const action = button.dataset.consoleAction;
    if (action === "refresh") {
      button.disabled = !desktopApiState.hasInstances || consoleLogsRequestInFlight;
      return;
    }
    if (action === "files") {
      button.disabled = !instance;
      return;
    }
    if (action === "start") {
      button.disabled = !desktopApiState.hasInstances || !canStartInstance(instance) || instanceActionRequestInFlight;
      return;
    }
    if (action === "stop") {
      button.disabled = !desktopApiState.hasInstances || !canStopInstance(instance) || instanceActionRequestInFlight;
      return;
    }
    if (action === "restart") {
      button.disabled = !desktopApiState.hasInstances || !canRestartInstance(instance) || instanceActionRequestInFlight;
    }
  });
}

function renderConsoleWorkspace() {
  const instances = getInstances();
  if (activeConsoleInstanceId && !findInstance(activeConsoleInstanceId)) {
    activeConsoleInstanceId = null;
    consoleBufferedEntries = [];
    consoleLogList?.replaceChildren();
  }

  if (!activeConsoleInstanceId && instances.length > 0 && getActivePageName() === "console" && !consoleSuppressAutoSelect) {
    activeConsoleInstanceId = instances[0].id;
    if (activeConsoleInstanceId && !consoleOpenInstanceIds.includes(activeConsoleInstanceId)) {
      consoleOpenInstanceIds.push(activeConsoleInstanceId);
    }
  }

  const instance = getActiveConsoleInstance();
  renderConsoleSources();
  renderConsoleTabs();
  renderConsoleStatusPanel();
  updateConsoleCommandState();
  updateConsoleActionButtons();
  updateConsoleEmptyState();

  if (consoleTitle) {
    consoleTitle.textContent = instance ? `${instance.displayName || instance.id} Console` : "Console Output";
  }

  setConsoleStatus("agent", getDesktopApiState().hasInstances ? agentConnectionState || "Connected" : "Unavailable");
  setConsoleStatus("instance", instance?.displayName || instance?.id || "None");
}

async function refreshConsoleMetrics() {
  const instance = getActiveConsoleInstance();
  const desktopApiState = getDesktopApiState();

  if (!instance || !desktopApiState.hasInstances) {
    renderConsoleStatusPanel();
    return;
  }

  try {
    latestInstanceMetrics = normalizeMetricsResponse(await desktopApiState.api.instances.getMetrics(instance.id));
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      console.warn("[Console] Selected instance no longer exists.", error);
      await refreshInstances({ refreshMetrics: false });
    } else {
      console.warn("[Console] Metrics unavailable.", error);
    }
  } finally {
    renderConsoleWorkspace();
  }
}

async function refreshConsoleLogs(options = {}) {
  const instance = getActiveConsoleInstance();
  const desktopApiState = getDesktopApiState();

  if (!instance) {
    consoleBufferedEntries = [];
    renderConsoleLogs([]);
    return;
  }

  if (!desktopApiState.hasInstances || consoleLogsRequestInFlight) {
    renderConsoleWorkspace();
    return;
  }

  consoleLogsRequestInFlight = true;
  updateConsoleActionButtons();
  updateConsoleEmptyState();

  try {
    const payload = await desktopApiState.api.instances.getLogs(instance.id, {
      stream: "all",
      limit: 500,
    });
    consoleBufferedEntries = Array.isArray(payload?.entries) ? payload.entries : [];
    renderConsoleLogs(consoleBufferedEntries);
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      console.warn("[Console] Logs requested for missing instance.", error);
      await refreshInstances({ refreshMetrics: false });
      showToast("Selected instance no longer exists.", "warning");
    } else {
      console.warn("[Console] Log request failed.", error);
      if (!options.silent) {
        showToast(getAgentErrorMessage(error, "Console logs unavailable."));
      }
    }
  } finally {
    consoleLogsRequestInFlight = false;
    renderConsoleWorkspace();
  }
}

async function sendConsoleCommand(event) {
  event?.preventDefault();
  const instance = getActiveConsoleInstance();
  const command = consoleCommandInput?.value?.trim() || "";

  if (!instance || !command || !getDesktopApiState().hasInstances) {
    return;
  }

  try {
    await getDesktopApiState().api.instances.sendCommand(instance.id, command);
    consoleCommandInput.value = "";
    showToast("Command sent.");
    await refreshConsoleLogs({ silent: true });
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await refreshInstances({ refreshMetrics: false });
      showToast("Selected instance no longer exists.", "warning");
    } else {
      console.warn("[Console] Command failed.", error);
      showToast(getAgentErrorMessage(error, "Command failed."));
    }
  }
}

async function verifyConsoleJavaJarBeforeLaunch(instance) {
  if (!isJavaJarInstance(instance)) {
    return true;
  }

  const jarPath = getConfiguredJarPath(instance);
  if (!jarPath) {
    window.alert("No server JAR is configured for this instance.\nUpload a server JAR to the data folder or install this server from the Marketplace.");
    return false;
  }

  try {
    await getDesktopApiState().api.instances.readFile(instance.id, jarPath);
    return true;
  } catch (error) {
    if (getAgentErrorCode(error) === "PATH_NOT_FOUND") {
      window.alert(`${getFileNameFromPath(jarPath)} was not found.\nUpload a Paper server JAR to the data folder or install this server from the Marketplace.`);
      return false;
    }
    if (isInstanceNotFoundError(error)) {
      await refreshInstances({ refreshMetrics: false });
      showToast("Selected instance no longer exists.", "warning");
      return false;
    }
    console.warn("[Console] Jar preflight failed.", error);
    showToast(getAgentErrorMessage(error, "Could not verify the configured server JAR."));
    return false;
  }
}

async function runConsoleInstanceAction(actionName) {
  const instance = getActiveConsoleInstance();
  const desktopApiState = getDesktopApiState();

  if (!instance || !desktopApiState.hasInstances || !["start", "stop", "restart"].includes(actionName)) {
    updateConsoleActionButtons();
    return;
  }

  if ((actionName === "start" || actionName === "restart") && !(await verifyConsoleJavaJarBeforeLaunch(instance))) {
    return;
  }

  instanceActionRequestInFlight = true;
  updateConsoleActionButtons();

  try {
    await desktopApiState.api.instances[actionName](instance.id);
    showToast(`Instance ${actionName} request completed.`);
    await refreshInstances({ refreshMetrics: false });
    await refreshConsoleMetrics();
    await refreshConsoleLogs({ silent: true });
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await refreshInstances({ refreshMetrics: false });
      showToast("Selected instance no longer exists.", "warning");
    } else {
      console.warn(`[Console] ${actionName} failed.`, error);
      updateInstanceSnapshot(instance.id, {
        state: actionName === "stop" ? instance.state : "Failed",
        failureReason: getAgentErrorMessage(error, `Instance ${actionName} failed.`),
      });
      showToast(getAgentErrorMessage(error, `Instance ${actionName} failed.`));
    }
  } finally {
    instanceActionRequestInFlight = false;
    renderConsoleWorkspace();
  }
}

function openConsoleInstanceFiles() {
  const instance = getActiveConsoleInstance();
  if (!instance) {
    return;
  }

  showPage("instances");
  selectInstance(instance.id, { refreshMetrics: false });
  setActiveInstanceTab("files");
  refreshInstanceFiles(".");
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

function setSshWorkspaceStatus(name, value) {
  sshWorkspaceStatusFields.forEach((field) => {
    if (field.dataset.sshStatus === name) {
      field.textContent = value;
    }
  });
}

function setSshStatus(status, message = "") {
  if (sshStatusLabel) {
    sshStatusLabel.textContent = status;
  }

  setSshWorkspaceStatus("state", status);
  setSshWorkspaceStatus("message", message || "No SSH session is connected.");

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
  updateSshWorkspaceStatus();
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
  updateSshWorkspaceStatus();
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

function updateSshWorkspaceStatus() {
  const session = getActiveSshSession();
  const profile = session?.profileId ? getSshProfileById(session.profileId) : getActiveSshProfile();
  const rows = getSshRenderableRows(session);
  const endpoint = session
    ? `${session.username || profile?.username || "user"}@${session.host || profile?.host || "host"}:${session.port || profile?.port || 22}`
    : profile
      ? `${profile.username}@${profile.host}:${profile.port}`
      : "Unavailable";

  setSshWorkspaceStatus("profile", profile?.displayName || session?.label || "None");
  setSshWorkspaceStatus("host", endpoint);
  setSshWorkspaceStatus("session", session?.label || "None");
  setSshWorkspaceStatus("endpoint", endpoint);
  setSshWorkspaceStatus("lines", `${rows.length} ${rows.length === 1 ? "line" : "lines"}`);
  setSshWorkspaceStatus("autoscroll", sshAutoscrollInput?.checked ? "On" : "Off");
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
    draftTab.innerHTML = "<strong>New Session</strong><span>Select a profile and connect.</span>";
    sshSessionTabs.appendChild(draftTab);
  } else {
    sessions.forEach((session) => {
      const rows = getSshRenderableRows(session);
      const tab = document.createElement("button");
      tab.className = `ssh-tab${session.id === activeSshSessionId ? " is-active" : ""}`;
      tab.type = "button";
      tab.role = "tab";
      tab.setAttribute("aria-selected", session.id === activeSshSessionId ? "true" : "false");
      const state = document.createElement("span");
      state.className = `ssh-tab-state is-${session.status || "disconnected"}`;
      state.setAttribute("aria-hidden", "true");
      const copy = document.createElement("span");
      copy.className = "ssh-tab-copy";
      const title = document.createElement("strong");
      title.textContent = session.label;
      const meta = document.createElement("span");
      meta.textContent = `${getSshSessionStatusLabel(session)} · ${rows.length} ${rows.length === 1 ? "line" : "lines"}`;
      copy.append(title, meta);
      tab.append(state, copy);
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
  addTab.innerHTML = "<strong>New Session</strong><span>Open another connection</span>";
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
  updateSshWorkspaceStatus();
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
sidebarToggleButton?.addEventListener("click", () => {
  toggleSidebarCollapsed({ lockHoverExpand: true });
});
sidebar?.addEventListener("mouseenter", () => setSidebarHoverExpanded(true));
sidebar?.addEventListener("mouseleave", () => {
  sidebarHoverExpansionLocked = false;
  setSidebarHoverExpanded(false);
});
window.addEventListener("resize", syncSidebarViewportState);

consoleSearchInput?.addEventListener("input", debounce(filterConsoleRows, 120));
consoleClearButton?.addEventListener("click", clearConsoleRows);
consoleCopyButton?.addEventListener("click", copyConsoleRows);
consoleAutoscrollInput?.addEventListener("change", syncConsoleScrollMode);
consolePauseInput?.addEventListener("change", syncConsoleScrollMode);
consoleSourceSearchInput?.addEventListener("input", debounce(renderConsoleSources, 120));
consoleFilterButtons.forEach((button) => {
  button.addEventListener("click", () => setConsoleFilter(button.dataset.consoleFilter || "all"));
});
consoleShowErrorsButton?.addEventListener("click", () => setConsoleFilter("error"));
consoleCommandForm?.addEventListener("submit", sendConsoleCommand);
consoleActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.consoleAction;
    if (action === "refresh") {
      refreshInstances({ refreshMetrics: false });
      refreshConsoleMetrics();
      refreshConsoleLogs();
    } else if (action === "files") {
      openConsoleInstanceFiles();
    } else {
      runConsoleInstanceAction(action);
    }
  });
});
consoleNavButtons.forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.consoleNav));
});
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
  refreshTaskIds.forEach((intervalId) => window.clearInterval(intervalId));
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
filesSearchInput?.addEventListener("input", debounce(filterFileRows, 120));
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
  if (!event.defaultPrevented && !event.altKey && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
    event.preventDefault();
    toggleSidebarCollapsed({ lockHoverExpand: Boolean(sidebar?.matches(":hover")) });
    return;
  }

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
sidebarCollapsed = readSidebarCollapsed();
syncSidebarState();
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
marketplaceSearchInput?.addEventListener("input", debounce(renderMarketplaceTemplates, 120));
marketplaceRefreshButton?.addEventListener("click", refreshMarketplace);
downloadRefreshButton?.addEventListener("click", refreshMarketplaceDownloads);
marketplaceWizard?.addEventListener("submit", installMarketplaceTemplate);
marketplaceCancelButton?.addEventListener("click", closeMarketplaceWizard);
document.querySelectorAll("[data-instance-backup-action]").forEach((button) => {
  button.addEventListener("click", () => handleInstanceBackupAction(button.dataset.instanceBackupAction));
});
instancesSearchInput?.addEventListener("input", debounce(filterInstanceRows, 120));
instancesLogStreamSelect?.addEventListener("change", () => refreshInstanceLogs());
instancesLogLimitSelect?.addEventListener("change", () => refreshInstanceLogs());
instancesRefreshButton?.addEventListener("click", refreshInstances);
instancesCreateToggleButton?.addEventListener("click", () => setInstanceCreateFormVisible(!instanceCreateFormVisible));
document.querySelector('[data-instance-action="cancel-create"]')?.addEventListener("click", () => setInstanceCreateFormVisible(false));
instancesStartButton?.addEventListener("click", () => runInstanceAction("start"));
instancesStopButton?.addEventListener("click", () => runInstanceAction("stop"));
instancesRestartButton?.addEventListener("click", () => runInstanceAction("restart"));
instancesDeleteButton?.addEventListener("click", () => runInstanceAction("delete"));
instancesLogsButton?.addEventListener("click", () => refreshInstanceLogs());
document.querySelector('[data-instance-action="force-kill"]')?.addEventListener("click", () => runInstanceAction("forceKill"));
document.querySelector('[data-instance-action="clear-console"]')?.addEventListener("click", clearInstanceConsole);
document.querySelector('[data-instance-action="copy-console"]')?.addEventListener("click", copyInstanceConsole);
document.querySelector('[data-instance-action="download-logs"]')?.addEventListener("click", downloadInstanceLogs);
instanceConsoleSearchInput?.addEventListener("input", syncConsoleLogSearch);
instanceConsoleFilterSelect?.addEventListener("change", syncConsoleLogSearch);
instanceConsoleForm?.addEventListener("submit", sendInstanceConsoleCommand);
instanceTabs.forEach((button) => {
  button.addEventListener("click", () => setActiveInstanceTab(button.dataset.instanceTab || "overview"));
});
instanceTemplateButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const type = button.dataset.instanceTemplate || "custom-command";
    if (type === "docker-compose") {
      showToast("Docker instance wizard is planned. Use Docker page or Custom Command for now.");
      return;
    }
    if (instanceTypeSelect) {
      instanceTypeSelect.value = type;
    }
    syncInstanceCreateTypeFields();
  });
});
instanceCreateForm?.addEventListener("submit", createInstanceFromForm);
instanceTypeSelect?.addEventListener("change", syncInstanceCreateTypeFields);
instanceFormInputs.forEach((input) => {
  input.addEventListener("input", () => {
    if (instanceFormMessage) {
      setInstanceFormMessage("Commands run without a shell. Secrets are not accepted in environment variable names.");
    }
  });
});
instanceConfigForm?.addEventListener("submit", saveInstanceConfiguration);
instanceConfigCancelButton?.addEventListener("click", () => {
  populateInstanceConfigForm(findInstance());
  populateMinecraftProperties(latestMinecraftProperties);
});
instanceConfigInputs.forEach((input) => {
  input.addEventListener("input", syncInstanceConfigDirtyState);
  input.addEventListener("change", syncInstanceConfigDirtyState);
});
minecraftPropertyInputs.forEach((input) => {
  input.addEventListener("input", syncInstanceConfigDirtyState);
  input.addEventListener("change", syncInstanceConfigDirtyState);
});
document.querySelectorAll('[data-instance-form="memoryLimit"], [data-instance-config="memoryLimit"], [data-marketplace-field="memory"]').forEach((input) => {
  input.addEventListener("blur", () => {
    try {
      input.value = normalizeMemoryLimit(input.value);
    } catch {}
    if (input.dataset.instanceConfig === "memoryLimit") {
      syncInstanceConfigDirtyState();
    }
  });
});
instanceNetworkAddButton?.addEventListener("click", () => {
  const selectedInstance = findInstance();
  const port = Number.parseInt(instanceNetworkPortInput?.value || "", 10);
  const currentPorts = Array.isArray(selectedInstance?.ports) ? selectedInstance.ports : [];
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    showToast("Enter a valid port.");
    return;
  }
  if (currentPorts.includes(port)) {
    showToast("Port already exists.");
    return;
  }
  updateInstancePorts([...currentPorts, port]);
});
document.querySelector('[data-instance-file-action="refresh"]')?.addEventListener("click", () => refreshInstanceFiles());
document.querySelector('[data-instance-file-action="up"]')?.addEventListener("click", () => refreshInstanceFiles(getInstanceParentPath(instanceCurrentFilePath)));
document.querySelector('[data-instance-file-action="new-folder"]')?.addEventListener("click", async () => {
  const name = window.prompt("New folder name");
  const selectedInstance = findInstance();
  if (!name || !selectedInstance) {
    return;
  }
  try {
    await getDesktopApiState().api.instances.createFolder(selectedInstance.id, joinInstancePath(instanceCurrentFilePath, name));
    refreshInstanceFiles();
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await handleMissingSelectedInstance(error, selectedInstance.id);
    } else {
      showToast(getAgentErrorMessage(error, "Folder creation failed."));
    }
  }
});
document.querySelector('[data-instance-file-action="rename"]')?.addEventListener("click", async () => {
  const selectedInstance = findInstance();
  if (!selectedInstanceFilePath || !selectedInstance) {
    return;
  }
  const nextName = window.prompt("Rename to", selectedInstanceFilePath.split("/").pop());
  if (!nextName) {
    return;
  }
  try {
    await getDesktopApiState().api.instances.renameFile(selectedInstance.id, selectedInstanceFilePath, joinInstancePath(getInstanceParentPath(selectedInstanceFilePath), nextName));
    refreshInstanceFiles();
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await handleMissingSelectedInstance(error, selectedInstance.id);
    } else {
      showToast(getAgentErrorMessage(error, "Rename failed."));
    }
  }
});
document.querySelector('[data-instance-file-action="delete"]')?.addEventListener("click", async () => {
  const selectedInstance = findInstance();
  if (!selectedInstanceFilePath || !selectedInstance || !window.confirm(`Delete ${selectedInstanceFilePath}?`)) {
    return;
  }
  try {
    await getDesktopApiState().api.instances.deleteFile(selectedInstance.id, selectedInstanceFilePath);
    refreshInstanceFiles();
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await handleMissingSelectedInstance(error, selectedInstance.id);
    } else {
      showToast(getAgentErrorMessage(error, "Delete failed."));
    }
  }
});
document.querySelector('[data-instance-file-action="save"]')?.addEventListener("click", saveInstanceTextFile);
instanceFileEditor?.addEventListener("input", syncInstanceFileDirtyState);
instanceFileDropzone?.addEventListener("dragover", (event) => {
  event.preventDefault();
  instanceFileDropzone.classList.add("is-dragging");
});
instanceFileDropzone?.addEventListener("dragleave", () => {
  instanceFileDropzone.classList.remove("is-dragging");
});
instanceFileDropzone?.addEventListener("drop", async (event) => {
  event.preventDefault();
  instanceFileDropzone.classList.remove("is-dragging");
  const selectedInstance = findInstance();
  const files = [...(event.dataTransfer?.files || [])];
  if (!selectedInstance || files.length === 0) {
    return;
  }
  try {
    for (const file of files) {
      const content = await file.text();
      await getDesktopApiState().api.instances.writeFile(selectedInstance.id, joinInstancePath(instanceCurrentFilePath, file.name), content);
    }
    refreshInstanceFiles();
  } catch (error) {
    if (isInstanceNotFoundError(error)) {
      await handleMissingSelectedInstance(error, selectedInstance.id);
    } else {
      showToast(getAgentErrorMessage(error, "Upload failed."));
    }
  }
});
syncInstanceCreateTypeFields();
setActiveInstanceTab(readStoredInstanceTab());
updateInstanceActionButtons();
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
configurePrimaryNavigation();
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
registerRefreshTask(() => {
  if (getActivePageName() === "instances" || getActivePageName() === "dashboard" || getActivePageName() === "console") {
    refreshInstances();
  }
}, 5000);
registerRefreshTask(() => {
  if (getActivePageName() === "console") {
    refreshConsoleMetrics();
    refreshConsoleLogs({ silent: true });
  }
}, 3000);
registerRefreshTask(() => {
  if (getActivePageName() === "marketplace") {
    refreshMarketplaceDownloads();
  }
}, 2000);
