const { getSystemSummary } = require("../services/systemService");

async function handleSystemSummary() {
  return {
    statusCode: 200,
    body: await getSystemSummary(),
  };
}

module.exports = {
  handleSystemSummary,
};
