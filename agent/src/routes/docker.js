const { getDockerContainers, getDockerSnapshot, getDockerSummary } = require("../services/dockerService");

async function handleDockerSnapshot() {
  return {
    statusCode: 200,
    body: await getDockerSnapshot(),
  };
}

async function handleDockerSummary() {
  return {
    statusCode: 200,
    body: await getDockerSummary(),
  };
}

async function handleDockerContainers() {
  return {
    statusCode: 200,
    body: await getDockerContainers(),
  };
}

module.exports = {
  handleDockerContainers,
  handleDockerSnapshot,
  handleDockerSummary,
};
