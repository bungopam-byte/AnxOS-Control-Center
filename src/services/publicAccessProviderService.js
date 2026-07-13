const { getPlayitSnapshot } = require("./serviceRouter");

const PUBLIC_ACCESS_PROVIDERS = [
  {
    id: "playit",
    className: "PlayitProvider",
    name: "Playit.gg",
    status: "supported",
    description: "Expose selected local services through Playit.gg tunnels.",
  },
  {
    id: "cloudflare-tunnel",
    className: "CloudflareTunnelProvider",
    name: "Cloudflare Tunnel",
    status: "coming-soon",
    description: "Cloudflare-managed tunnel support is planned.",
  },
  {
    id: "tailscale",
    className: "TailscaleProvider",
    name: "Tailscale",
    status: "coming-soon",
    description: "Private network access through Tailscale is planned.",
  },
  {
    id: "anxos-relay",
    className: "AnxOSRelayProvider",
    name: "AnxOS Relay",
    status: "coming-soon",
    description: "Managed AnxOS relay access is planned.",
  },
];

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
    status,
    protocol: snapshot.protocol || null,
    tunnelId: snapshot.tunnelId || null,
    lastCheckedAt: snapshot.lastSuccessfulRefreshAt || null,
  };
}

async function getPublicAccessSnapshot(options = {}) {
  const provider = PUBLIC_ACCESS_PROVIDERS[0];
  const snapshot = await getPlayitSnapshot(options);
  const service = buildServiceFromPlayitSnapshot(snapshot);

  return {
    provider,
    providers: PUBLIC_ACCESS_PROVIDERS,
    services: [service],
    activeTunnels: service.publicAddress ? 1 : 0,
    connectedProvider: provider.name,
    tunnelStatus: service.status,
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
}

module.exports = {
  PUBLIC_ACCESS_PROVIDERS,
  PlayitProvider: PUBLIC_ACCESS_PROVIDERS[0],
  CloudflareTunnelProvider: PUBLIC_ACCESS_PROVIDERS[1],
  TailscaleProvider: PUBLIC_ACCESS_PROVIDERS[2],
  AnxOSRelayProvider: PUBLIC_ACCESS_PROVIDERS[3],
  getPublicAccessSnapshot,
  _test: {
    buildServiceFromPlayitSnapshot,
  },
};
