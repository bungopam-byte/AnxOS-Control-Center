const {
  createPublicAccessService,
  deletePublicAccessService,
  getPublicAccessSnapshot,
  listPublicAccessServices,
} = require("../services/publicAccessProviderService");

async function readRequestJson(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.readJson === "function") return request.readJson();
  if (typeof request.body === "string" && request.body.trim()) {
    try {
      return JSON.parse(request.body);
    } catch {
      throw Object.assign(new Error("Invalid JSON payload."), {
        code: "INVALID_JSON",
        statusCode: 400,
      });
    }
  }
  return {};
}

function errorResponse(error) {
  return {
    statusCode: error?.statusCode || 400,
    body: {
      error: {
        code: error?.code || "PUBLIC_ACCESS_REQUEST_FAILED",
        message: error?.message || "Public Access request failed.",
        details: error?.details || null,
      },
    },
  };
}

async function handlePublicAccess(request, url) {
  if (request.method === "GET" && url.pathname === "/api/v1/public-access/snapshot") {
    return {
      statusCode: 200,
      body: await getPublicAccessSnapshot(),
    };
  }
  if (request.method === "GET" && url.pathname === "/api/v1/public-access/services") {
    return {
      statusCode: 200,
      body: await listPublicAccessServices(),
    };
  }
  if (request.method === "POST" && url.pathname === "/api/v1/public-access/services") {
    try {
      return {
        statusCode: 201,
        body: await createPublicAccessService(await readRequestJson(request)),
      };
    } catch (error) {
      return errorResponse(error);
    }
  }
  const deleteMatch = url.pathname.match(/^\/api\/v1\/public-access\/services\/([^/]+)$/);
  if (request.method === "DELETE" && deleteMatch) {
    try {
      return {
        statusCode: 200,
        body: await deletePublicAccessService(decodeURIComponent(deleteMatch[1])),
      };
    } catch (error) {
      return errorResponse(error);
    }
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

module.exports = {
  handlePublicAccess,
};
