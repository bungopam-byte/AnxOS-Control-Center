const { getAmpInstances, getAmpStatus } = require("../services/ampService");

async function handleAmpStatus() {
  return {
    statusCode: 200,
    body: await getAmpStatus(),
  };
}

async function handleAmpInstances() {
  return {
    statusCode: 200,
    body: await getAmpInstances(),
  };
}

module.exports = {
  handleAmpInstances,
  handleAmpStatus,
};
