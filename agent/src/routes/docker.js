const { getDockerContainers, getDockerSummary } = require("../services/dockerService");

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
  handleDockerSummary,
};
