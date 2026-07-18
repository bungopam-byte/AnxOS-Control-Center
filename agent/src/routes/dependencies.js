const {
  checkDependencies,
  getDependencyCatalog,
  installDependencies,
  planDependencyPreparation,
} = require("../services/dependencyService");

function parseJsonBody(request) {
  if (!request.body) {
    return {};
  }
  try {
    return JSON.parse(request.body);
  } catch {
    const error = new Error("Invalid JSON payload.");
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
      code: error.code || "DEPENDENCY_REQUEST_FAILED",
      message: error.message || "Dependency request failed.",
      details: error.details || null,
    },
  });
}

async function handleDependencies(request, url) {
  try {
    if (request.method === "GET" && url.pathname === "/api/v1/dependencies/catalog") {
      return result(200, getDependencyCatalog());
    }
    if (request.method === "POST" && url.pathname === "/api/v1/dependencies/check") {
      return result(200, await checkDependencies(parseJsonBody(request)));
    }
    if (request.method === "POST" && url.pathname === "/api/v1/dependencies/plan") {
      return result(200, await planDependencyPreparation(parseJsonBody(request)));
    }
    if (request.method === "POST" && url.pathname === "/api/v1/dependencies/install") {
      return result(200, await installDependencies(parseJsonBody(request)));
    }
    return result(404, { error: { code: "NOT_FOUND", message: "Request failed." } });
  } catch (error) {
    return errorResult(error);
  }
}

module.exports = { handleDependencies };
