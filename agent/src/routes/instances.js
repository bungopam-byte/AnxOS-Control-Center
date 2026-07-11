const {
  clearLogs,
  createInstance,
  createInstanceFolder,
  deleteInstance,
  deleteInstanceFile,
  forceKillInstance,
  getMetrics,
  getStatus,
  instanceFileExists,
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
  const validation = getValidationErrorDetails(error);
  return result(error.statusCode || 500, {
    error: {
      code: error.code || "INSTANCE_REQUEST_FAILED",
      message: error.message && error.message !== error.code
        ? error.message
        : validation?.userMessage || "Request failed.",
      details: validation || undefined,
    },
  });
}

function getValidationErrorDetails(error) {
  const code = error?.code || "INSTANCE_REQUEST_FAILED";
  const definitions = {
    INVALID_INSTANCE_ID: { field: "id", expected: "2-64 letters, numbers, underscores, or dashes", userMessage: "Use a valid instance ID." },
    INVALID_DISPLAY_NAME: { field: "displayName", expected: "1-120 characters without line breaks", userMessage: "Enter a valid instance name." },
    INVALID_INSTANCE_TYPE: { field: "type", expected: "custom-command, node-app, python-app, java-app, or minecraft-paper", userMessage: "This installer generated an unsupported instance type." },
    INVALID_EXECUTABLE: { field: "executable", expected: "safe executable name or approved absolute path", userMessage: "The generated startup executable is invalid." },
    EXECUTABLE_NOT_ALLOWED: { field: "executable", expected: "absolute executable inside approved roots, or executable name resolved by PATH", userMessage: "The selected executable is outside approved paths." },
    INVALID_ARGS: { field: "args", expected: "argument array with safe string values", userMessage: "The generated startup arguments are invalid." },
    INVALID_PORTS: { field: "ports", expected: "ports between 1 and 65535", userMessage: "Enter valid ports between 1 and 65535." },
    INVALID_MEMORY_LIMIT: { field: "memoryLimit", expected: "memory value such as 512M, 2G, or 2048M", userMessage: "Use memory like 512M, 2G, or 2048M." },
    INVALID_RESTART_POLICY: { field: "restartPolicy", expected: "never, on-failure, or always", userMessage: "The restart policy is invalid." },
    RUNTIME_FIELDS_READ_ONLY: { field: "state", expected: "runtime fields omitted from create/update requests", userMessage: "Runtime-only fields cannot be changed by install requests." },
    PATH_NOT_ALLOWED: { field: "workingDirectory", expected: "path inside the approved instance directory", userMessage: "The generated path is outside the instance directory." },
  };
  const base = definitions[code];
  if (!base) {
    return undefined;
  }
  return {
    ...base,
    code,
    received: error?.received,
  };
}

function getValidationFieldForCode(code) {
  return getValidationErrorDetails({ code })?.field || null;
}

function attachReceivedValidationValue(error, body = {}) {
  if (!error || error.received !== undefined) {
    return error;
  }
  const field = getValidationFieldForCode(error.code);
  if (!field || !body || typeof body !== "object" || Array.isArray(body)) {
    return error;
  }
  if (Object.prototype.hasOwnProperty.call(body, field)) {
    error.received = body[field];
  } else if (field === "displayName") {
    error.received = body.displayName ?? body.name;
  } else if (field === "executable") {
    error.received = body.executable ?? body.command;
  } else if (field === "memoryLimit") {
    error.received = body.memoryLimit ?? body.memory;
  }
  return error;
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
      const body = parseJsonBody(request);
      try {
        return result(201, {
          instance: await createInstance(body),
        });
      } catch (error) {
        throw attachReceivedValidationValue(error, body);
      }
    }

    const updateId = getDirectInstanceId(url.pathname);
    if ((request.method === "PATCH" || request.method === "PUT") && updateId) {
      const body = parseJsonBody(request);
      try {
        return result(200, {
          instance: await updateInstance(updateId, body),
        });
      } catch (error) {
        throw attachReceivedValidationValue(error, body);
      }
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

    const existsId = getInstanceIdFromPath(url.pathname, "/exists");
    if (request.method === "GET" && existsId) {
      return result(200, await instanceFileExists(existsId, url.searchParams.get("path") || "."));
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
