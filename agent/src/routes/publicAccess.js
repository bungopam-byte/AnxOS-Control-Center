const { getPublicAccessSnapshot } = require("../services/publicAccessProviderService");

async function handlePublicAccess(request, url) {
  if (request.method === "GET" && url.pathname === "/api/v1/public-access/snapshot") {
    return {
      statusCode: 200,
      body: await getPublicAccessSnapshot(),
    };
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
