const http = require("http");
const { URL } = require("url");

const { handleActionInvoke, handleActionsList } = require("./routes/actions");
const { handleAmpInstances, handleAmpSnapshot, handleAmpStatus } = require("./routes/amp");
const { auditAction } = require("./audit/auditLogger");
const { handleBackupsList } = require("./routes/backups");
const { handleConsoleCommands, handleConsoleLogs } = require("./routes/console");
const { isAuthorized } = require("./auth");
const { getConfig } = require("./config");
const { handleDockerContainers, handleDockerSnapshot, handleDockerSummary } = require("./routes/docker");
const { handleFilesList, handleFilesRead, handleFilesStat } = require("./routes/files");
const { handleHealth } = require("./routes/health");
const { handleInstances } = require("./routes/instances");
const { handlePlayitSnapshot, handlePlayitStatus } = require("./routes/playit");
const { handleSystemSummary } = require("./routes/system");

const config = getConfig();

function sendJson(response, statusCode, body) {
  const payload = JSON.stringify(body);

  if (Buffer.byteLength(payload) > config.maxResponseBytes) {
    sendError(response, 413, "RESPONSE_TOO_LARGE");
    return;
  }

  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  response.end(payload);
}

function sendError(response, statusCode, code) {
  sendJson(response, statusCode, {
    error: {
      code,
      message: "Request failed.",
    },
  });
}

function isActionInvokeRoute(request, pathname) {
  return request.method === "POST" && pathname.startsWith("/api/v1/actions/");
}

function getActionIdFromPath(pathname) {
  const prefix = "/api/v1/actions/";
  return pathname.startsWith(prefix) ? decodeURIComponent(pathname.slice(prefix.length)) : null;
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      bytes += chunk.length;

      if (bytes > config.maxRequestBytes) {
        reject(Object.assign(new Error("request too large"), { statusCode: 413 }));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

async function routeRequest(request, url) {
  const pathname = url.pathname;

  if (isActionInvokeRoute(request, pathname)) {
    return handleActionInvoke(request, url);
  }

  if (pathname === "/api/v1/instances" || pathname.startsWith("/api/v1/instances/")) {
    return handleInstances(request, url);
  }

  if (request.method !== "GET") {
    return {
      statusCode: 405,
      body: {
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Request failed.",
        },
      },
    };
  }

  if (pathname === "/api/v1/health") {
    return handleHealth();
  }

  if (pathname === "/api/v1/system/summary") {
    return handleSystemSummary();
  }

  if (pathname === "/api/v1/docker/containers") {
    return handleDockerContainers();
  }

  if (pathname === "/api/v1/docker/snapshot") {
    return handleDockerSnapshot();
  }

  if (pathname === "/api/v1/docker/summary") {
    return handleDockerSummary();
  }

  if (pathname === "/api/v1/playit/snapshot") {
    return handlePlayitSnapshot();
  }

  if (pathname === "/api/v1/playit/status") {
    return handlePlayitStatus();
  }

  if (pathname === "/api/v1/amp/snapshot") {
    return handleAmpSnapshot();
  }

  if (pathname === "/api/v1/amp/status") {
    return handleAmpStatus();
  }

  if (pathname === "/api/v1/amp/instances") {
    return handleAmpInstances();
  }

  if (pathname === "/api/v1/files/list") {
    return handleFilesList(url);
  }

  if (pathname === "/api/v1/files/stat") {
    return handleFilesStat(url);
  }

  if (pathname === "/api/v1/files/read") {
    return handleFilesRead(url);
  }

  if (pathname === "/api/v1/console/commands") {
    return handleConsoleCommands();
  }

  if (pathname === "/api/v1/console/logs") {
    return handleConsoleLogs(url);
  }

  if (pathname === "/api/v1/backups/list") {
    return handleBackupsList();
  }

  if (pathname === "/api/v1/actions") {
    return handleActionsList();
  }

  return {
    statusCode: 404,
    body: {
      error: {
        code: "NOT_FOUND",
        message: "Request failed.",
      },
    },
  };
}

async function handleRequest(request, response) {
  request.setTimeout(config.requestTimeoutMs, () => {
    request.destroy();
  });

  try {
    request.body = await readRequestBody(request);

    const url = new URL(request.url, `http://${request.headers.host || `${config.host}:${config.port}`}`);
    const auth = isAuthorized(request, config, url.pathname);

    if (!auth.ok) {
      if (isActionInvokeRoute(request, url.pathname)) {
        auditAction(request, {
          actionId: getActionIdFromPath(url.pathname),
          permission: null,
          outcome: "denied",
          reason: auth.code,
        });
      }

      sendError(response, auth.statusCode, auth.code);
      return;
    }

    const result = await routeRequest(request, url);
    sendJson(response, result.statusCode, result.body);
  } catch (error) {
    if (!response.headersSent) {
      sendError(response, error.statusCode || 500, error.code || (error.statusCode === 413 ? "REQUEST_TOO_LARGE" : "INTERNAL_ERROR"));
    }
  }
}

const server = http.createServer(handleRequest);

server.headersTimeout = config.requestTimeoutMs + 1000;
server.requestTimeout = config.requestTimeoutMs;

server.on("clientError", (error, socket) => {
  if (socket.writable) {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  }
});

server.on("error", (error) => {
  console.error(`AnxOS Agent failed to start: ${error.code || "STARTUP_ERROR"}`);
  process.exitCode = 1;
});

server.listen(config.port, config.host, () => {
  console.info(`AnxOS Agent listening on http://${config.host}:${config.port}`);
});
