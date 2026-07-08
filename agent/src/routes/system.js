const { getSystemSummary } = require("../services/systemService");

async function handleSystemSummary() {
  return {
    statusCode: 200,
    body: await getSystemSummary(),
  };
}

async function handleStats() {
  return handleSystemSummary();
}

module.exports = {
  handleStats,
  handleSystemSummary,
};
