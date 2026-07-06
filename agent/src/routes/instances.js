const {
  clearLogs,
  createInstance,
  createInstanceFolder,
  deleteInstance,
  deleteInstanceFile,
  forceKillInstance,
  getMetrics,
  getStatus,
  listInstanceFiles,
  listInstances,
  readInstanceFile,
  readLogs,
  readMinecraftProperties,
  renameInstanceFile,
  restartInstance,
  startInstance,
  stopInstance,
  updateInstance,
  writeInstanceFile,
  writeInstanceInput,
  writeMinecraftProperties,
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
      message: error.message && error.message !== error.code ? error.message : "Request failed.",
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

function getDirectInstanceId(pathname) {
  const id = getInstanceIdFromPath(pathname);
  return id && !id.includes("/") ? id : null;
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

    const updateId = getDirectInstanceId(url.pathname);
    if ((request.method === "PATCH" || request.method === "PUT") && updateId) {
      return result(200, {
        instance: await updateInstance(updateId, parseJsonBody(request)),
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

    if (request.method === "DELETE" && logsId) {
      return result(200, await clearLogs(logsId, {
        stream: url.searchParams.get("stream") || "all",
      }));
    }

    const commandId = getInstanceIdFromPath(url.pathname, "/command");
    if (request.method === "POST" && commandId) {
      return result(200, await writeInstanceInput(commandId, parseJsonBody(request).command));
    }

    const forceKillId = getInstanceIdFromPath(url.pathname, "/force-kill");
    if (request.method === "POST" && forceKillId) {
      return result(200, {
        instance: await forceKillInstance(forceKillId),
      });
    }

    const filesId = getInstanceIdFromPath(url.pathname, "/files");
    if (request.method === "GET" && filesId) {
      return result(200, await listInstanceFiles(filesId, url.searchParams.get("path") || "."));
    }

    const fileId = getInstanceIdFromPath(url.pathname, "/file");
    if (request.method === "GET" && fileId) {
      return result(200, await readInstanceFile(fileId, url.searchParams.get("path") || "."));
    }

    if (request.method === "PUT" && fileId) {
      const body = parseJsonBody(request);
      return result(200, await writeInstanceFile(fileId, body.path, body.content, { encoding: body.encoding }));
    }

    if (request.method === "DELETE" && fileId) {
      return result(200, await deleteInstanceFile(fileId, url.searchParams.get("path") || "."));
    }

    const mkdirId = getInstanceIdFromPath(url.pathname, "/mkdir");
    if (request.method === "POST" && mkdirId) {
      return result(200, await createInstanceFolder(mkdirId, parseJsonBody(request).path));
    }

    const renameId = getInstanceIdFromPath(url.pathname, "/rename");
    if (request.method === "POST" && renameId) {
      const body = parseJsonBody(request);
      return result(200, await renameInstanceFile(renameId, body.oldPath, body.newPath));
    }

    const minecraftPropertiesId = getInstanceIdFromPath(url.pathname, "/minecraft/properties");
    if (request.method === "GET" && minecraftPropertiesId) {
      return result(200, await readMinecraftProperties(minecraftPropertiesId));
    }

    if (request.method === "PUT" && minecraftPropertiesId) {
      return result(200, await writeMinecraftProperties(minecraftPropertiesId, parseJsonBody(request).properties));
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
