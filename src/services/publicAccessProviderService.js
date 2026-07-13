const { getPlayitSnapshot } = require("./serviceRouter");
const { execFile } = require("child_process");
const { summarizePublicAccessReadiness } = require("./readinessService");

const COMMAND_TIMEOUT_MS = 2200;

const PUBLIC_ACCESS_PROVIDERS = [
  {
    id: "playit",
    dependencyId: "playit",
    className: "PlayitProvider",
    name: "Playit.gg",
    status: "supported",
    description: "Expose selected local services through Playit.gg tunnels.",
    exposureScope: "public-internet",
    capabilities: {
      detection: true,
      authenticationStatus: true,
      connectionStatus: true,
      serviceExposure: true,
      createTunnel: false,
      listTunnels: true,
      startTunnel: false,
      stopTunnel: false,
      deleteTunnel: false,
      publicAddress: true,
      healthCheck: true,
      diagnostics: true,
    },
  },
  {
    id: "cloudflare-tunnel",
    dependencyId: "cloudflared",
    className: "CloudflareTunnelProvider",
    name: "Cloudflare Tunnel",
    status: "foundation",
    description: "CLI detection and setup guidance only. Tunnel creation and DNS routing are not enabled yet.",
    exposureScope: "public-internet",
    capabilities: {
      detection: true,
      authenticationStatus: false,
      connectionStatus: false,
      serviceExposure: false,
      createTunnel: false,
      listTunnels: false,
      startTunnel: false,
      stopTunnel: false,
      deleteTunnel: false,
      publicAddress: false,
      healthCheck: false,
      diagnostics: true,
    },
  },
  {
    id: "tailscale",
    dependencyId: "tailscale",
    className: "TailscaleProvider",
    name: "Tailscale",
    status: "foundation",
    description: "CLI and daemon status detection only. Tailnet-only access is not presented as public internet exposure.",
    exposureScope: "tailnet-only",
    capabilities: {
      detection: true,
      authenticationStatus: true,
      connectionStatus: true,
      serviceExposure: false,
      createTunnel: false,
      listTunnels: false,
      startTunnel: false,
      stopTunnel: false,
      deleteTunnel: false,
      publicAddress: false,
      healthCheck: true,
      diagnostics: true,
    },
  },
  {
    id: "anxos-relay",
    dependencyId: null,
    className: "AnxOSRelayProvider",
    name: "AnxOS Relay",
    status: "disabled",
    description: "Managed AnxOS Relay requires a real backend and remains disabled.",
    exposureScope: "unavailable",
    capabilities: {
      detection: false,
      authenticationStatus: false,
      connectionStatus: false,
      serviceExposure: false,
      createTunnel: false,
      listTunnels: false,
      startTunnel: false,
      stopTunnel: false,
      deleteTunnel: false,
      publicAddress: false,
      healthCheck: false,
      diagnostics: false,
    },
  },
];

function runCommand(command, args = []) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: COMMAND_TIMEOUT_MS, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        errorCode: error?.code || error?.name || null,
        stdout: String(stdout || "").trim(),
        stderr: String(stderr || "").trim(),
      });
    });
  });
}

function redactOutput(value) {
  return String(value || "")
    .replace(/(\b(?:token|secret|password|credential|api[_-]?key)\b\s*[:=]\s*)\S+/gi, "$1[redacted]")
    .replace(/(\bBearer\s+)\S+/gi, "$1[redacted]");
}

function createProviderState(provider, overrides = {}) {
  return {
    ...provider,
    available: false,
    installed: false,
    authenticated: null,
    connected: false,
    health: "unavailable",
    publicAddress: null,
    tailnetAddress: null,
    version: null,
    diagnostics: [],
    recoveryAction: "Provider is not available in this build.",
    ...overrides,
  };
}

async function detectTailscaleProvider() {
  const provider = PUBLIC_ACCESS_PROVIDERS.find((entry) => entry.id === "tailscale");
  const version = await runCommand("tailscale", ["version"]);
  if (!version.ok) {
    return createProviderState(provider, {
      recoveryAction: "Install Tailscale and sign in with the Tailscale CLI before AnxOS can inspect tailnet status.",
      dependencyId: provider.dependencyId,
      diagnostics: [{ command: "tailscale version", ok: false, errorCode: version.errorCode }],
    });
  }

  const status = await runCommand("tailscale", ["status", "--json"]);
  let parsed = null;
  try {
    parsed = status.stdout ? JSON.parse(status.stdout) : null;
  } catch {}
  const self = parsed?.Self || {};
  const tailnetAddress = Array.isArray(self.TailscaleIPs) ? self.TailscaleIPs[0] || null : null;
  const authenticated = status.ok && !/logged out|not logged in|needs login/i.test(`${status.stdout}\n${status.stderr}`);
  return createProviderState(provider, {
    available: true,
    installed: true,
    dependencyId: provider.dependencyId,
    authenticated,
    connected: Boolean(authenticated && tailnetAddress),
    health: authenticated && tailnetAddress ? "healthy" : "auth-required",
    tailnetAddress,
    version: redactOutput(version.stdout || version.stderr).split(/\r?\n/)[0] || null,
    recoveryAction: authenticated
      ? "Tailscale is detected. AnxOS does not yet create Serve or Funnel routes."
      : "Install Tailscale through Dependency Manager if needed, run tailscale up from a trusted terminal, then refresh Public Access.",
    diagnostics: [
      { command: "tailscale version", ok: version.ok, errorCode: version.errorCode, hasOutput: Boolean(version.stdout || version.stderr) },
      { command: "tailscale status --json", ok: status.ok, errorCode: status.errorCode, hasOutput: Boolean(status.stdout || status.stderr) },
    ],
  });
}

async function detectCloudflareProvider() {
  const provider = PUBLIC_ACCESS_PROVIDERS.find((entry) => entry.id === "cloudflare-tunnel");
  const version = await runCommand("cloudflared", ["--version"]);
  if (!version.ok) {
    return createProviderState(provider, {
      recoveryAction: "Install cloudflared and authenticate with Cloudflare before AnxOS can validate tunnel configuration.",
      dependencyId: provider.dependencyId,
      diagnostics: [{ command: "cloudflared --version", ok: false, errorCode: version.errorCode }],
    });
  }
  return createProviderState(provider, {
    available: true,
    installed: true,
    dependencyId: provider.dependencyId,
    authenticated: null,
    connected: false,
    health: "setup-required",
    version: redactOutput(version.stdout || version.stderr).split(/\r?\n/)[0] || null,
    recoveryAction: "cloudflared is detected. AnxOS does not yet create tunnels, write DNS routes, or store credentials.",
    diagnostics: [{ command: "cloudflared --version", ok: true, errorCode: null, hasOutput: Boolean(version.stdout || version.stderr) }],
  });
}

function buildPlayitProviderState(snapshot = {}) {
  const provider = PUBLIC_ACCESS_PROVIDERS.find((entry) => entry.id === "playit");
  return createProviderState(provider, {
    available: true,
    dependencyId: provider.dependencyId,
    installed: snapshot.installed === true,
    authenticated: snapshot.installed === true ? null : false,
    connected: snapshot.connected === true,
    health: snapshot.connected === true
      ? "healthy"
      : snapshot.running === true
        ? "running"
        : snapshot.installed === true
          ? "stopped"
          : "missing",
    publicAddress: snapshot.tunnelAddress || snapshot.tunnelDomain || null,
    version: null,
    diagnostics: snapshot.diagnostics ? [{ provider: "playit", ...snapshot.diagnostics }] : [],
    recoveryAction: snapshot.installed
      ? "Use the Playit service or CLI to manage tunnel lifecycle, then refresh AnxOS."
      : "Install and configure Playit.gg on the selected node. Dependency Manager can detect whether the CLI is available.",
  });
}

function buildServiceFromPlayitSnapshot(snapshot = {}) {
  const publicAddress = snapshot.tunnelAddress || snapshot.tunnelDomain || null;
  const localPort = snapshot.localPort || null;
  const status = snapshot.connected === true
    ? "Public"
    : snapshot.running === true
      ? "Provider running"
      : snapshot.installed === true
        ? "Disabled"
        : "Unavailable";

  return {
    id: "playit-primary",
    name: publicAddress ? "Public service" : "Unconfigured service",
    localPort,
    providerId: "playit",
    providerName: "Playit.gg",
    publicAddress,
    exposureScope: publicAddress ? "public-internet" : "unavailable",
    status,
    protocol: snapshot.protocol || null,
    tunnelId: snapshot.tunnelId || null,
    lastCheckedAt: snapshot.lastSuccessfulRefreshAt || null,
  };
}

async function getPublicAccessSnapshot(options = {}) {
  let snapshot;
  try {
    snapshot = await getPlayitSnapshot(options);
  } catch (error) {
    snapshot = {
      installed: false,
      running: false,
      connected: false,
      diagnostics: {
        errorCode: error?.code || "PLAYIT_SNAPSHOT_FAILED",
        message: error?.message || "Playit snapshot failed.",
      },
    };
  }
  const providerStates = [
    buildPlayitProviderState(snapshot),
    await detectCloudflareProvider(),
    await detectTailscaleProvider(),
    createProviderState(PUBLIC_ACCESS_PROVIDERS.find((entry) => entry.id === "anxos-relay")),
  ];
  const provider = providerStates[0];
  const service = buildServiceFromPlayitSnapshot(snapshot);

  const result = {
    provider,
    providers: providerStates,
    services: [service],
    activeTunnels: service.publicAddress ? 1 : 0,
    connectedProvider: provider.name,
    tunnelStatus: service.status,
    exposureScope: service.exposureScope,
    recentActivity: [
      {
        id: "playit-snapshot",
        label: snapshot.lastSuccessfulRefreshAt ? "Provider status refreshed" : "Provider status checked",
        at: snapshot.lastSuccessfulRefreshAt || null,
        providerId: "playit",
      },
    ],
    playit: snapshot,
  };
  return { ...result, readiness: summarizePublicAccessReadiness(result) };
}

module.exports = {
  PUBLIC_ACCESS_PROVIDERS,
  PlayitProvider: PUBLIC_ACCESS_PROVIDERS[0],
  CloudflareTunnelProvider: PUBLIC_ACCESS_PROVIDERS[1],
  TailscaleProvider: PUBLIC_ACCESS_PROVIDERS[2],
  AnxOSRelayProvider: PUBLIC_ACCESS_PROVIDERS[3],
  getPublicAccessSnapshot,
  _test: {
    buildPlayitProviderState,
    buildServiceFromPlayitSnapshot,
    createProviderState,
    summarizePublicAccessReadiness,
  },
};
