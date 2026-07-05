const http = require("http");
const { URL } = require("url");

const { handleActionInvoke, handleActionsList } = require("./routes/actions");
const { handleAmpInstances, handleAmpStatus } = require("./routes/amp");
const { handleBackupsList } = require("./routes/backups");
const { handleConsoleCommands, handleConsoleLogs } = require("./routes/console");
const { isAuthorized } = require("./auth");
const { getConfig } = require("./config");
const { handleDockerContainers, handleDockerSummary } = require("./routes/docker");
const { handleFilesList, handleFilesRead, handleFilesStat } = require("./routes/files");
const { handleHealth } = require("./routes/health");
const { handlePlayitStatus } = require("./routes/playit");
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

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let bytes = 0;

    request.on("data", (chunk) => {
      bytes += chunk.length;

      if (bytes > config.maxRequestBytes) {
        reject(Object.assign(new Error("request too large"), { statusCode: 413 }));
        request.destroy();
      }
    });

    request.on("end", resolve);
    request.on("error", reject);
  });
}

async function routeRequest(request, url) {
  const pathname = url.pathname;

  if (request.method === "POST" && pathname.startsWith("/api/v1/actions/")) {
    return handleActionInvoke(request, url);
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

  if (pathname === "/api/v1/docker/summary") {
    return handleDockerSummary();
  }

  if (pathname === "/api/v1/playit/status") {
    return handlePlayitStatus();
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
    await readRequestBody(request);

    const url = new URL(request.url, `http://${request.headers.host || `${config.host}:${config.port}`}`);
    const auth = isAuthorized(request, config, url.pathname);

    if (!auth.ok) {
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
