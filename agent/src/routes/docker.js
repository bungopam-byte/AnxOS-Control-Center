const {
  createContainer,
  deleteContainer,
  getContainerLogs,
  getContainerStats,
  getDockerContainers,
  getDockerSnapshot,
  getDockerSummary,
  inspectContainer,
  listImages,
  listNetworks,
  listVolumes,
  removeImage,
  restartContainer,
  startContainer,
  stopContainer,
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
    if (request.method === "GET" && url.pathname === "/api/v1/docker/images") {
      return result(200, await listImages());
    }
    if (request.method === "GET" && url.pathname === "/api/v1/docker/networks") {
      return result(200, await listNetworks());
    }
    if (request.method === "GET" && url.pathname === "/api/v1/docker/volumes") {
      return result(200, await listVolumes());
    }
    const imageId = getImageFromPath(url.pathname);
    if (request.method === "DELETE" && imageId) {
      return result(200, await removeImage(imageId));
    }
    const inspectId = getContainerFromPath(url.pathname, "/inspect");
    if (request.method === "GET" && inspectId) {
      return result(200, await inspectContainer(inspectId));
    }
    const logsId = getContainerFromPath(url.pathname, "/logs");
    if (request.method === "GET" && logsId) {
      return result(200, await getContainerLogs(logsId, { tail: url.searchParams.get("tail") }));
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
