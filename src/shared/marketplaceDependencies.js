const DEPENDENCY_ID_PATTERN = /^[a-z][a-z0-9-]{1,63}$/;

const DEPENDENCY_REGISTRY = Object.freeze({
  java: {
    id: "java",
    displayName: "Java runtime",
    commands: ["java"],
    versionCommand: { command: "java", args: ["-version"], stream: "stderr" },
    versionPattern: /version "?(\d+(?:\.\d+){0,2})/,
    minVersion: "17",
    groups: ["minecraft-hosting"],
    reason: "Required by Minecraft servers, Java applications, and Java-based installers.",
    packages: {
      apt: ["openjdk-21-jre-headless"],
      dnf: ["java-21-openjdk-headless"],
    },
    supportedDistributions: ["debian", "ubuntu", "fedora", "rocky", "almalinux"],
    requiresElevation: true,
  },
  "dotnet-runtime": {
    id: "dotnet-runtime",
    displayName: ".NET runtime",
    commands: ["dotnet"],
    versionCommand: { command: "dotnet", args: ["--list-runtimes"], stream: "stdout" },
    versionPattern: /Microsoft\.NETCore\.App\s+(\d+(?:\.\d+){0,2})/,
    minVersion: "8.0",
    groups: ["dotnet-game-servers"],
    reason: "Required by TShock and other .NET-based servers.",
    packages: {
      apt: ["dotnet-runtime-8.0"],
      dnf: ["dotnet-runtime-8.0"],
    },
    supportedDistributions: ["debian", "ubuntu", "fedora", "rocky", "almalinux"],
    requiresElevation: true,
    notes: "If your distribution does not publish .NET packages, add the Microsoft package repository using the official Microsoft instructions, then retry.",
  },
  steamcmd: {
    id: "steamcmd",
    displayName: "SteamCMD",
    commands: ["steamcmd"],
    groups: ["steam-game-servers"],
    reason: "Required by Steam dedicated servers such as Palworld, Valheim, Rust, and Counter-Strike 2.",
    packages: {
      apt: ["steamcmd"],
      dnf: ["steamcmd"],
    },
    supportedDistributions: ["debian", "ubuntu", "fedora", "rocky", "almalinux"],
    requiresElevation: true,
    notes: "Some distributions require non-free or multilib repositories before SteamCMD is available.",
  },
  docker: {
    id: "docker",
    displayName: "Docker",
    commands: ["docker"],
    versionCommand: { command: "docker", args: ["--version"], stream: "stdout" },
    versionPattern: /Docker version\s+(\d+(?:\.\d+){0,2})/i,
    groups: ["container-workloads"],
    reason: "Required by Docker-backed Marketplace templates.",
    packages: {
      apt: ["docker.io", "docker-compose"],
      dnf: ["docker", "docker-compose-plugin"],
    },
    supportedDistributions: ["debian", "ubuntu", "fedora", "rocky", "almalinux"],
    requiresElevation: true,
    service: "docker",
    serviceRestartRequired: true,
    notes: "Users may need to sign out and back in after being added to the docker group.",
  },
  nodejs: {
    id: "nodejs",
    displayName: "Node.js",
    commands: ["node"],
    versionCommand: { command: "node", args: ["--version"], stream: "stdout" },
    versionPattern: /v?(\d+(?:\.\d+){0,2})/,
    minVersion: "18",
    groups: ["application-runtimes"],
    reason: "Required by Node.js app and bot templates.",
    packages: {
      apt: ["nodejs"],
      dnf: ["nodejs"],
    },
    supportedDistributions: ["debian", "ubuntu", "fedora", "rocky", "almalinux"],
    requiresElevation: true,
  },
  python: {
    id: "python",
    displayName: "Python",
    commands: ["python3"],
    versionCommand: { command: "python3", args: ["--version"], stream: "stdout" },
    versionPattern: /Python\s+(\d+(?:\.\d+){0,2})/,
    minVersion: "3.10",
    groups: ["application-runtimes"],
    reason: "Required by Python app and bot templates.",
    packages: {
      apt: ["python3"],
      dnf: ["python3"],
    },
    supportedDistributions: ["debian", "ubuntu", "fedora", "rocky", "almalinux"],
    requiresElevation: true,
  },
  unzip: {
    id: "unzip",
    displayName: "Unzip",
    commands: ["unzip"],
    versionCommand: { command: "unzip", args: ["-v"], stream: "stdout" },
    versionPattern: /UnZip\s+(\d+(?:\.\d+){0,2})/i,
    groups: ["archive-tools"],
    reason: "Required to extract ZIP-based server archives.",
    packages: {
      apt: ["unzip"],
      dnf: ["unzip"],
    },
    supportedDistributions: ["debian", "ubuntu", "fedora", "rocky", "almalinux"],
    requiresElevation: true,
  },
  tar: {
    id: "tar",
    displayName: "tar",
    commands: ["tar"],
    versionCommand: { command: "tar", args: ["--version"], stream: "stdout" },
    versionPattern: /tar\s+\(GNU tar\)\s+(\d+(?:\.\d+){0,2})/i,
    groups: ["archive-tools"],
    reason: "Required to extract tar archives and nested Linux server payloads.",
    packages: {
      apt: ["tar"],
      dnf: ["tar"],
    },
    supportedDistributions: ["debian", "ubuntu", "fedora", "rocky", "almalinux"],
    requiresElevation: true,
  },
  xz: {
    id: "xz",
    displayName: "XZ tools",
    commands: ["xz"],
    versionCommand: { command: "xz", args: ["--version"], stream: "stdout" },
    versionPattern: /xz\s+\(XZ Utils\)\s+(\d+(?:\.\d+){0,2})/i,
    groups: ["archive-tools"],
    reason: "Required to extract .tar.xz server archives.",
    packages: {
      apt: ["xz-utils"],
      dnf: ["xz"],
    },
    supportedDistributions: ["debian", "ubuntu", "fedora", "rocky", "almalinux"],
    requiresElevation: true,
  },
  curl: {
    id: "curl",
    displayName: "curl",
    commands: ["curl"],
    versionCommand: { command: "curl", args: ["--version"], stream: "stdout" },
    versionPattern: /curl\s+(\d+(?:\.\d+){0,2})/i,
    groups: ["archive-tools"],
    reason: "Required by templates that fetch external runtime assets.",
    packages: {
      apt: ["curl", "ca-certificates"],
      dnf: ["curl", "ca-certificates"],
    },
    supportedDistributions: ["debian", "ubuntu", "fedora", "rocky", "almalinux"],
    requiresElevation: true,
  },
  wine: {
    id: "wine",
    displayName: "Wine",
    commands: ["wine"],
    versionCommand: { command: "wine", args: ["--version"], stream: "stdout" },
    versionPattern: /wine-(\d+(?:\.\d+){0,2})/i,
    groups: ["application-runtimes"],
    reason: "Required by Windows-only server runtimes running on Linux.",
    packages: {
      apt: ["wine"],
      dnf: ["wine"],
    },
    supportedDistributions: ["debian", "ubuntu", "fedora", "rocky", "almalinux"],
    requiresElevation: true,
  },
});

const DEPENDENCY_GROUPS = Object.freeze({
  "minecraft-hosting": {
    id: "minecraft-hosting",
    displayName: "Minecraft hosting",
    dependencyIds: ["java", "curl"],
  },
  "steam-game-servers": {
    id: "steam-game-servers",
    displayName: "Steam game servers",
    dependencyIds: ["steamcmd"],
  },
  "dotnet-game-servers": {
    id: "dotnet-game-servers",
    displayName: ".NET game servers",
    dependencyIds: ["dotnet-runtime", "unzip", "tar"],
  },
  "container-workloads": {
    id: "container-workloads",
    displayName: "Container workloads",
    dependencyIds: ["docker"],
  },
  "archive-tools": {
    id: "archive-tools",
    displayName: "General archive and download tools",
    dependencyIds: ["curl", "unzip", "tar", "xz"],
  },
  "application-runtimes": {
    id: "application-runtimes",
    displayName: "Application and bot runtimes",
    dependencyIds: ["nodejs", "python"],
  },
});

const COMMAND_DEPENDENCY_MAP = Object.freeze({
  java: "java",
  dotnet: "dotnet-runtime",
  steamcmd: "steamcmd",
  docker: "docker",
  node: "nodejs",
  nodejs: "nodejs",
  python: "python",
  python3: "python",
  unzip: "unzip",
  tar: "tar",
  xz: "xz",
  curl: "curl",
  wine: "wine",
});

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeDependencyId(id) {
  const normalized = String(id || "").trim().toLowerCase();
  return DEPENDENCY_ID_PATTERN.test(normalized) ? normalized : null;
}

function assertKnownDependencyId(id) {
  const normalized = normalizeDependencyId(id);
  if (!normalized || !DEPENDENCY_REGISTRY[normalized]) {
    const error = new Error(`Unsupported dependency ID: ${id}`);
    error.code = "DEPENDENCY_UNSUPPORTED";
    error.statusCode = 400;
    error.details = { dependencyId: id };
    throw error;
  }
  return normalized;
}

function normalizeDependencyIds(ids = []) {
  return unique((Array.isArray(ids) ? ids : []).map(assertKnownDependencyId));
}

function commandToDependencyId(command) {
  return COMMAND_DEPENDENCY_MAP[String(command || "").trim().toLowerCase()] || null;
}

function dependencyIdsForGroups(groupIds = []) {
  const ids = [];
  for (const groupId of Array.isArray(groupIds) ? groupIds : []) {
    const normalized = normalizeDependencyId(groupId);
    const group = normalized ? DEPENDENCY_GROUPS[normalized] : null;
    if (!group) {
      const error = new Error(`Unsupported dependency group: ${groupId}`);
      error.code = "DEPENDENCY_GROUP_UNSUPPORTED";
      error.statusCode = 400;
      error.details = { groupId };
      throw error;
    }
    ids.push(...group.dependencyIds);
  }
  return normalizeDependencyIds(ids);
}

function getTemplateExplicitDependencyIds(template = {}) {
  const raw = [
    ...(Array.isArray(template.hostDependencies) ? template.hostDependencies : []),
    ...(Array.isArray(template.dependencies?.host) ? template.dependencies.host : []),
    ...(Array.isArray(template.runtimeDependencies) ? template.runtimeDependencies : []),
  ];
  return raw.map((entry) => {
    if (typeof entry === "string") return entry;
    return entry?.id || entry?.dependencyId || "";
  });
}

function resolveTemplateDependencyIds(template = {}) {
  const ids = [];
  ids.push(...getTemplateExplicitDependencyIds(template));

  const installerType = String(template.installerType || template.installer?.type || template.downloadSource?.type || "").toLowerCase();
  const runtime = String(template.runtime || template.startupType || template.instanceType || "").toLowerCase();
  const category = String(template.category || "").toLowerCase();

  if (category === "minecraft" || runtime.includes("java") || template.startupType === "java-jar") {
    ids.push("java");
  }
  if (runtime.includes("steamcmd") || installerType.includes("steamcmd") || template.downloadSource?.type === "steamcmd") {
    ids.push("steamcmd");
  }
  if (runtime.includes("docker") || template.startupType === "docker-image" || template.runtime === "docker") {
    ids.push("docker");
  }
  if (template.instanceType === "node-app") {
    ids.push("nodejs");
  }
  if (template.instanceType === "python-app") {
    ids.push("python");
  }
  if (template.installer?.type === "archive" || installerType.includes("archive")) {
    ids.push("unzip", "tar");
    const archiveName = String(template.installer?.archive || template.downloadSource?.fileName || "").toLowerCase();
    if (archiveName.endsWith(".xz") || archiveName.endsWith(".tar.xz")) {
      ids.push("xz");
    }
  }

  const requiredCommands = Array.isArray(template.startup?.requiredCommands) ? template.startup.requiredCommands : [];
  for (const command of requiredCommands) {
    ids.push(commandToDependencyId(command));
  }

  return normalizeDependencyIds(ids);
}

function serializeDependency(definition) {
  return {
    id: definition.id,
    displayName: definition.displayName,
    commands: [...definition.commands],
    minVersion: definition.minVersion || null,
    groups: [...(definition.groups || [])],
    reason: definition.reason || null,
    requiresElevation: Boolean(definition.requiresElevation),
    serviceRestartRequired: Boolean(definition.serviceRestartRequired),
    service: definition.service || null,
    supportedDistributions: [...(definition.supportedDistributions || [])],
    packages: {
      apt: [...(definition.packages?.apt || [])],
      dnf: [...(definition.packages?.dnf || [])],
    },
    notes: definition.notes || null,
  };
}

function listDependencyDefinitions() {
  return Object.values(DEPENDENCY_REGISTRY).map(serializeDependency);
}

function listDependencyGroups() {
  return Object.values(DEPENDENCY_GROUPS).map((group) => ({
    id: group.id,
    displayName: group.displayName,
    dependencyIds: [...group.dependencyIds],
  }));
}

function compareVersions(actual, minimum) {
  const parse = (value) => String(value || "0").replace(/^v/, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(actual);
  const right = parse(minimum);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

module.exports = {
  COMMAND_DEPENDENCY_MAP,
  DEPENDENCY_GROUPS,
  DEPENDENCY_REGISTRY,
  assertKnownDependencyId,
  commandToDependencyId,
  compareVersions,
  dependencyIdsForGroups,
  listDependencyDefinitions,
  listDependencyGroups,
  normalizeDependencyIds,
  resolveTemplateDependencyIds,
  serializeDependency,
};
