const { getAmpInstances, getAmpStatus } = require("../services/ampService");

async function handleAmpSnapshot() {
  return {
    statusCode: 200,
    body: await getAmpStatus(),
  };
}

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
  handleAmpSnapshot,
  handleAmpStatus,
};
