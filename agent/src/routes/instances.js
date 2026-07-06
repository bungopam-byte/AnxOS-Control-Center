const {
  createInstance,
  deleteInstance,
  getMetrics,
  getStatus,
  listInstances,
  readLogs,
  restartInstance,
  startInstance,
  stopInstance,
} = require("../services/instances/instanceService");

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
  return {
    statusCode,
    body,
  };
}

function errorResult(error) {
  return result(error.statusCode || 500, {
    error: {
      code: error.code || "INSTANCE_REQUEST_FAILED",
      message: "Request failed.",
    },
  });
}

function getInstanceIdFromPath(pathname, suffix = "") {
  const prefix = "/api/v1/instances/";

  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) {
    return null;
  }

  const raw = pathname.slice(prefix.length, suffix ? -suffix.length : undefined);
  return decodeURIComponent(raw.replace(/\/$/, ""));
}

async function handleInstances(request, url) {
  try {
    if (request.method === "GET" && url.pathname === "/api/v1/instances") {
      return result(200, await listInstances());
    }

    if (request.method === "POST" && url.pathname === "/api/v1/instances") {
      return result(201, {
        instance: await createInstance(parseJsonBody(request)),
      });
    }

    const statusId = getInstanceIdFromPath(url.pathname, "/status");
    if (request.method === "GET" && statusId) {
      return result(200, {
        instance: await getStatus(statusId),
      });
    }

    const metricsId = getInstanceIdFromPath(url.pathname, "/metrics");
    if (request.method === "GET" && metricsId) {
      return result(200, {
        metrics: await getMetrics(metricsId),
      });
    }

    const logsId = getInstanceIdFromPath(url.pathname, "/logs");
    if (request.method === "GET" && logsId) {
      return result(200, await readLogs(logsId, {
        limit: url.searchParams.get("limit"),
        stream: url.searchParams.get("stream") || "all",
      }));
    }

    const startId = getInstanceIdFromPath(url.pathname, "/start");
    if (request.method === "POST" && startId) {
      return result(200, {
        instance: await startInstance(startId),
      });
    }

    const stopId = getInstanceIdFromPath(url.pathname, "/stop");
    if (request.method === "POST" && stopId) {
      return result(200, {
        instance: await stopInstance(stopId),
      });
    }

    const restartId = getInstanceIdFromPath(url.pathname, "/restart");
    if (request.method === "POST" && restartId) {
      return result(200, {
        instance: await restartInstance(restartId),
      });
    }

    const deleteId = getInstanceIdFromPath(url.pathname);
    if (request.method === "DELETE" && deleteId) {
      return result(200, await deleteInstance(deleteId));
    }

    return result(404, {
      error: {
        code: "NOT_FOUND",
        message: "Request failed.",
      },
    });
  } catch (error) {
    return errorResult(error);
  }
}

module.exports = {
  handleInstances,
};
