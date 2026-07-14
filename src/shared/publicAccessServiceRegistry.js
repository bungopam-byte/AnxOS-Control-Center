const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SCHEMA_VERSION = 1;
const DEFAULT_FILE_NAME = "public-access-services.json";
const SUPPORTED_PROTOCOLS = new Set(["tcp", "udp", "http", "https"]);

function nowIso() {
  return new Date().toISOString();
}

function createAccessServiceError(code, message, details = {}, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  error.statusCode = statusCode;
  return error;
}

function defaultConfigDirectory() {
  return process.env.ANXHUB_CONFIG_DIR || path.join(process.cwd(), "config");
}

function registryPath(options = {}) {
  return options.filePath || path.join(options.configDir || defaultConfigDirectory(), DEFAULT_FILE_NAME);
}

function readJsonFile(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function atomicWriteJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tempPath, filePath);
}

function normalizeProtocol(value) {
  const protocol = String(value || "tcp").trim().toLowerCase();
  if (!SUPPORTED_PROTOCOLS.has(protocol)) {
    throw createAccessServiceError("INVALID_PROTOCOL", "Choose a supported protocol.", {
      field: "protocol",
      received: value,
      expected: [...SUPPORTED_PROTOCOLS],
    });
  }
  return protocol;
}

function normalizePort(value, field = "localPort") {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) {
    throw createAccessServiceError("INVALID_SERVICE_PORT", "Service port must be a whole number from 1 to 65535.", {
      field,
      received: value,
      expected: "integer 1-65535",
    });
  }
  const number = Number(text);
  if (!Number.isInteger(number) || number < 1 || number > 65535) {
    throw createAccessServiceError("INVALID_SERVICE_PORT", "Service port must be a whole number from 1 to 65535.", {
      field,
      received: value,
      expected: "integer 1-65535",
    });
  }
  return number;
}

function normalizeHost(value) {
  const host = String(value || "127.0.0.1").trim();
  if (!host || /\s/.test(host)) {
    throw createAccessServiceError("INVALID_LOCAL_ENDPOINT", "Local host must be a hostname or IP address.", {
      field: "localHost",
      received: value,
      expected: "hostname or IP address",
    });
  }
  return host;
}

function normalizeEndpointAddress(value) {
  const text = String(value || "").trim();
  return text || null;
}

function sanitizeServiceName(value, fallback) {
  const name = String(value || "").trim().replace(/\s+/g, " ");
  return (name || fallback || "Access Service").slice(0, 80);
}

function createServiceId(service) {
  const hash = crypto
    .createHash("sha256")
    .update([
      service.nodeId,
      service.providerId,
      service.localHost,
      service.localPort,
      service.protocol,
      service.linkedInstanceId || "",
      service.name || "",
    ].join("|"))
    .digest("hex")
    .slice(0, 16);
  return `access-${hash}`;
}

function normalizeAccessService(input = {}, existing = {}) {
  const providerId = String(input.providerId || existing.providerId || "").trim();
  const nodeId = String(input.nodeId || existing.nodeId || "").trim();
  if (!providerId) {
    throw createAccessServiceError("PROVIDER_REQUIRED", "Choose an access provider.", { field: "providerId" });
  }
  if (!nodeId) {
    throw createAccessServiceError("NODE_REQUIRED", "Choose a target node.", { field: "nodeId" });
  }
  const protocol = normalizeProtocol(input.protocol || existing.protocol);
  const localPort = normalizePort(input.localPort ?? existing.localPort);
  const localHost = normalizeHost(input.localHost || existing.localHost);
  const now = nowIso();
  const normalized = {
    id: existing.id || null,
    name: sanitizeServiceName(input.name || existing.name, `${providerId} ${protocol.toUpperCase()} ${localPort}`),
    providerId,
    providerName: input.providerName || existing.providerName || null,
    accessType: input.accessType || existing.accessType || (providerId === "tailscale" ? "private-tailnet" : "public-internet"),
    nodeId,
    linkedInstanceId: input.linkedInstanceId || existing.linkedInstanceId || null,
    localHost,
    localPort,
    protocol,
    providerResourceId: input.providerResourceId || existing.providerResourceId || null,
    publicAddress: input.publicAddress || existing.publicAddress || null,
    privateAddress: normalizeEndpointAddress(input.privateAddress || existing.privateAddress),
    hostname: input.hostname || existing.hostname || null,
    IPv4: input.IPv4 || existing.IPv4 || null,
    IPv6: input.IPv6 || existing.IPv6 || null,
    state: input.state || existing.state || "pending-provider-setup",
    status: input.status || existing.status || "Pending provider setup",
    createdAt: existing.createdAt || now,
    updatedAt: now,
    lastCheckedAt: input.lastCheckedAt || existing.lastCheckedAt || null,
  };
  normalized.id = existing.id || input.id || createServiceId(normalized);
  return normalized;
}

function endpointKey(service) {
  return [
    service.nodeId,
    service.providerId,
    service.localHost,
    String(service.localPort),
    service.protocol,
  ].join("|").toLowerCase();
}

function normalizeState(parsed = {}) {
  const services = Array.isArray(parsed.services) ? parsed.services : [];
  const byId = new Map();
  for (const service of services) {
    try {
      const normalized = normalizeAccessService(service, service);
      byId.set(normalized.id, normalized);
    } catch {
      // Ignore malformed legacy entries rather than breaking Public Access startup.
    }
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    services: [...byId.values()].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))),
  };
}

function readRegistry(options = {}) {
  return normalizeState(readJsonFile(registryPath(options)));
}

function writeRegistry(state, options = {}) {
  const next = normalizeState(state);
  atomicWriteJson(registryPath(options), next);
  return next;
}

function listAccessServices(options = {}) {
  return readRegistry(options).services.filter((service) => {
    if (options.nodeId && service.nodeId !== options.nodeId) return false;
    if (options.providerId && service.providerId !== options.providerId) return false;
    return true;
  });
}

function createAccessService(input = {}, options = {}) {
  const state = readRegistry(options);
  const service = normalizeAccessService(input);
  const duplicate = state.services.find((entry) => endpointKey(entry) === endpointKey(service));
  if (duplicate) {
    throw createAccessServiceError("DUPLICATE_ACCESS_SERVICE", "An access service already exists for this provider and local endpoint.", {
      existingServiceId: duplicate.id,
      providerId: service.providerId,
      nodeId: service.nodeId,
      localHost: service.localHost,
      localPort: service.localPort,
      protocol: service.protocol,
    }, 409);
  }
  const next = writeRegistry({ ...state, services: [...state.services, service] }, options);
  return next.services.find((entry) => entry.id === service.id);
}

function updateAccessService(serviceId, patch = {}, options = {}) {
  const state = readRegistry(options);
  const index = state.services.findIndex((entry) => entry.id === serviceId);
  if (index === -1) {
    throw createAccessServiceError("PROVIDER_RESOURCE_NOT_FOUND", "Access service was not found.", { serviceId }, 404);
  }
  const service = normalizeAccessService({ ...state.services[index], ...patch }, state.services[index]);
  const duplicate = state.services.find((entry, entryIndex) => entryIndex !== index && endpointKey(entry) === endpointKey(service));
  if (duplicate) {
    throw createAccessServiceError("DUPLICATE_ACCESS_SERVICE", "Another access service already uses this provider and local endpoint.", {
      existingServiceId: duplicate.id,
    }, 409);
  }
  const services = [...state.services];
  services[index] = service;
  const next = writeRegistry({ ...state, services }, options);
  return next.services.find((entry) => entry.id === service.id);
}

function deleteAccessService(serviceId, options = {}) {
  const state = readRegistry(options);
  const service = state.services.find((entry) => entry.id === serviceId);
  if (!service) {
    throw createAccessServiceError("PROVIDER_RESOURCE_NOT_FOUND", "Access service was not found.", { serviceId }, 404);
  }
  writeRegistry({ ...state, services: state.services.filter((entry) => entry.id !== serviceId) }, options);
  return {
    success: true,
    serviceId,
    removed: true,
    service,
  };
}

function reconcileAccessServices(services = [], snapshot = {}) {
  const detectedServices = Array.isArray(snapshot.services) ? snapshot.services : [];
  const providers = Array.isArray(snapshot.providers) ? snapshot.providers : [];
  return services.map((service) => {
    const provider = providers.find((entry) => entry.id === service.providerId || entry.providerId === service.providerId) || {};
    if (service.providerId === "tailscale") {
      const host = service.hostname || provider.DNSName || provider.hostname || provider.IPv4 || provider.IPv6 || provider.tailnetAddress || null;
      const privateAddress = service.privateAddress || (host ? `${String(host).replace(/\.$/, "")}:${service.localPort}` : null);
      return {
        ...service,
        providerName: service.providerName || provider.name || "Tailscale",
        privateAddress,
        hostname: service.hostname || provider.DNSName || provider.hostname || null,
        IPv4: service.IPv4 || provider.IPv4 || null,
        IPv6: service.IPv6 || provider.IPv6 || null,
        accessType: "private-tailnet",
        exposureScope: "tailnet-only",
        state: provider.connected === true || provider.lifecycleState === "running" ? "available" : "provider-unavailable",
        status: provider.connected === true || provider.lifecycleState === "running" ? "Private Tailnet" : "Provider unavailable",
        lastCheckedAt: snapshot.checkedAt || service.lastCheckedAt,
      };
    }
    const detected = detectedServices.find((entry) => (
      entry.providerId === service.providerId &&
      Number(entry.localPort) === Number(service.localPort) &&
      String(entry.protocol || "").toLowerCase() === service.protocol
    )) || null;
    if (detected?.publicAddress || detected?.providerResourceId || detected?.tunnelId) {
      return {
        ...service,
        providerName: detected.providerName || service.providerName,
        providerResourceId: detected.providerResourceId || detected.tunnelId || service.providerResourceId,
        publicAddress: detected.publicAddress || service.publicAddress,
        state: detected.status === "Public" ? "running" : "detected",
        status: detected.status || "Detected",
        lastCheckedAt: detected.lastCheckedAt || snapshot.checkedAt || service.lastCheckedAt,
      };
    }
    return {
      ...service,
      status: service.status || "Pending provider setup",
      state: service.state || "pending-provider-setup",
      lastCheckedAt: snapshot.checkedAt || service.lastCheckedAt,
    };
  });
}

module.exports = {
  DEFAULT_FILE_NAME,
  SUPPORTED_PROTOCOLS,
  createAccessService,
  createAccessServiceError,
  deleteAccessService,
  listAccessServices,
  normalizeAccessService,
  readRegistry,
  reconcileAccessServices,
  registryPath,
  updateAccessService,
};
