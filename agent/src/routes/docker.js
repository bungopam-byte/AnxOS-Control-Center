const {
  createContainer,
  createNetwork,
  deleteContainer,
  execContainer,
  getCleanupPreview,
  getComposeLogs,
  getComposeStatus,
  getContainerLogs,
  getContainerStats,
  getDockerContainers,
  getDockerSnapshot,
  getDockerSummary,
  inspectImage,
  inspectContainer,
  inspectNetwork,
  inspectVolume,
  killContainer,
  listImages,
  listComposeProjects,
  listNetworks,
  listVolumes,
  pauseContainer,
  pullImage,
  pruneImages,
  pruneNetworks,
  pruneVolumes,
  recreateComposeProject,
  removeImage,
  removeComposeProject,
  removeNetwork,
  removeVolume,
  renameContainer,
  restartContainer,
  restartComposeProject,
  runCleanup,
  startContainer,
  startComposeProject,
  stopContainer,
  stopComposeProject,
  pullComposeProject,
  buildComposeProject,
  validateComposeConfig,
  connectNetwork,
  disconnectNetwork,
  unpauseContainer,
} = require("../services/dockerService");

function parseJsonBody(request) {
  if (!request.body) {
    return {};
  }
  try {
    return JSON.parse(request.body);
  } catch {
    const error = new Error("INVALID_JSON");
    error.code = "INVALID_JSON";
    error.statusCode = 400;
    throw error;
  }
}

function result(statusCode, body) {
  return { statusCode, body };
}

function errorResult(error) {
  return result(error.statusCode || 500, {
    error: {
      code: error.code || "DOCKER_REQUEST_FAILED",
      message: error.message || "Docker request failed.",
    },
  });
}

async function handleDockerSnapshot() {
  return {
    statusCode: 200,
    body: await getDockerSnapshot(),
  };
}

async function handleDockerSummary() {
  return {
    statusCode: 200,
    body: await getDockerSummary(),
  };
}

async function handleDockerContainers() {
  return {
    statusCode: 200,
    body: await getDockerContainers(),
  };
}

function getContainerFromPath(pathname, suffix = "") {
  const prefix = "/api/v1/docker/containers/";
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) {
    return null;
  }
  return decodeURIComponent(pathname.slice(prefix.length, suffix ? -suffix.length : undefined).replace(/\/$/, ""));
}

function getImageFromPath(pathname) {
  const prefix = "/api/v1/docker/images/";
  if (!pathname.startsWith(prefix)) {
    return null;
  }
  return decodeURIComponent(pathname.slice(prefix.length).replace(/\/$/, ""));
}

function getVolumeFromPath(pathname, suffix = "") {
  const prefix = "/api/v1/docker/volumes/";
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) return null;
  return decodeURIComponent(pathname.slice(prefix.length, suffix ? -suffix.length : undefined).replace(/\/$/, ""));
}

function getNetworkFromPath(pathname, suffix = "") {
  const prefix = "/api/v1/docker/networks/";
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) return null;
  return decodeURIComponent(pathname.slice(prefix.length, suffix ? -suffix.length : undefined).replace(/\/$/, ""));
}

async function handleDocker(request, url) {
  try {
    if (request.method === "GET" && url.pathname === "/api/v1/docker/snapshot") {
      return handleDockerSnapshot();
    }
    if (request.method === "GET" && url.pathname === "/api/v1/docker/summary") {
      return handleDockerSummary();
    }
    if (request.method === "GET" && url.pathname === "/api/v1/docker/containers") {
      return handleDockerContainers();
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/containers") {
      return result(201, await createContainer(parseJsonBody(request)));
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/images/pull") {
      return result(200, await pullImage(parseJsonBody(request).image));
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/images/prune") {
      return result(200, await pruneImages());
    }
    if (request.method === "GET" && url.pathname === "/api/v1/docker/images") {
      return result(200, await listImages());
    }
    if (request.method === "GET" && url.pathname === "/api/v1/docker/compose/projects") {
      return result(200, await listComposeProjects());
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/compose/config") {
      return result(200, await validateComposeConfig(parseJsonBody(request)));
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/compose/up") {
      return result(200, await startComposeProject(parseJsonBody(request)));
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/compose/stop") {
      return result(200, await stopComposeProject(parseJsonBody(request)));
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/compose/restart") {
      return result(200, await restartComposeProject(parseJsonBody(request)));
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/compose/pull") {
      return result(200, await pullComposeProject(parseJsonBody(request)));
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/compose/build") {
      return result(200, await buildComposeProject(parseJsonBody(request)));
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/compose/recreate") {
      return result(200, await recreateComposeProject(parseJsonBody(request)));
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/compose/logs") {
      return result(200, await getComposeLogs(parseJsonBody(request)));
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/compose/status") {
      return result(200, await getComposeStatus(parseJsonBody(request)));
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/compose/down") {
      return result(200, await removeComposeProject(parseJsonBody(request)));
    }
    if (request.method === "GET" && url.pathname === "/api/v1/docker/cleanup/preview") {
      return result(200, await getCleanupPreview());
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/cleanup") {
      return result(200, await runCleanup(parseJsonBody(request)));
    }
    if (request.method === "GET" && url.pathname === "/api/v1/docker/networks") {
      return result(200, await listNetworks());
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/networks") {
      return result(201, await createNetwork(parseJsonBody(request)));
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/networks/prune") {
      return result(200, await pruneNetworks());
    }
    if (request.method === "GET" && url.pathname === "/api/v1/docker/volumes") {
      return result(200, await listVolumes());
    }
    if (request.method === "POST" && url.pathname === "/api/v1/docker/volumes/prune") {
      return result(200, await pruneVolumes());
    }
    const imageId = getImageFromPath(url.pathname);
    if (request.method === "GET" && imageId) {
      return result(200, await inspectImage(imageId));
    }
    if (request.method === "DELETE" && imageId) {
      return result(200, await removeImage(imageId));
    }
    const volumeInspect = getVolumeFromPath(url.pathname, "/inspect");
    if (request.method === "GET" && volumeInspect) {
      return result(200, await inspectVolume(volumeInspect));
    }
    const volumeId = getVolumeFromPath(url.pathname);
    if (request.method === "DELETE" && volumeId) {
      return result(200, await removeVolume(volumeId));
    }
    const networkInspect = getNetworkFromPath(url.pathname, "/inspect");
    if (request.method === "GET" && networkInspect) {
      return result(200, await inspectNetwork(networkInspect));
    }
    const networkConnect = getNetworkFromPath(url.pathname, "/connect");
    if (request.method === "POST" && networkConnect) {
      return result(200, await connectNetwork(networkConnect, parseJsonBody(request).container));
    }
    const networkDisconnect = getNetworkFromPath(url.pathname, "/disconnect");
    if (request.method === "POST" && networkDisconnect) {
      return result(200, await disconnectNetwork(networkDisconnect, parseJsonBody(request).container));
    }
    const networkId = getNetworkFromPath(url.pathname);
    if (request.method === "DELETE" && networkId) {
      return result(200, await removeNetwork(networkId));
    }
    const inspectId = getContainerFromPath(url.pathname, "/inspect");
    if (request.method === "GET" && inspectId) {
      return result(200, await inspectContainer(inspectId));
    }
    const logsId = getContainerFromPath(url.pathname, "/logs");
    if (request.method === "GET" && logsId) {
      return result(200, await getContainerLogs(logsId, { tail: url.searchParams.get("tail"), timestamps: url.searchParams.get("timestamps") }));
    }
    const statsId = getContainerFromPath(url.pathname, "/stats");
    if (request.method === "GET" && statsId) {
      return result(200, await getContainerStats(statsId));
    }
    const startId = getContainerFromPath(url.pathname, "/start");
    if (request.method === "POST" && startId) {
      return result(200, await startContainer(startId));
    }
    const stopId = getContainerFromPath(url.pathname, "/stop");
    if (request.method === "POST" && stopId) {
      return result(200, await stopContainer(stopId));
    }
    const restartId = getContainerFromPath(url.pathname, "/restart");
    if (request.method === "POST" && restartId) {
      return result(200, await restartContainer(restartId));
    }
    const pauseId = getContainerFromPath(url.pathname, "/pause");
    if (request.method === "POST" && pauseId) {
      return result(200, await pauseContainer(pauseId));
    }
    const unpauseId = getContainerFromPath(url.pathname, "/unpause");
    if (request.method === "POST" && unpauseId) {
      return result(200, await unpauseContainer(unpauseId));
    }
    const killId = getContainerFromPath(url.pathname, "/kill");
    if (request.method === "POST" && killId) {
      return result(200, await killContainer(killId));
    }
    const renameId = getContainerFromPath(url.pathname, "/rename");
    if (request.method === "POST" && renameId) {
      return result(200, await renameContainer(renameId, parseJsonBody(request).name));
    }
    const execId = getContainerFromPath(url.pathname, "/exec");
    if (request.method === "POST" && execId) {
      return result(200, await execContainer(execId, parseJsonBody(request)));
    }
    const deleteId = getContainerFromPath(url.pathname);
    if (request.method === "DELETE" && deleteId) {
      return result(200, await deleteContainer(deleteId));
    }
    return result(404, { error: { code: "NOT_FOUND", message: "Request failed." } });
  } catch (error) {
    return errorResult(error);
  }
}

module.exports = {
  handleDocker,
  handleDockerContainers,
  handleDockerSnapshot,
  handleDockerSummary,
};
