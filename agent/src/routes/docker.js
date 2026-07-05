const { getDockerContainers } = require("../services/dockerService");

async function handleDockerContainers() {
  return {
    statusCode: 200,
    body: await getDockerContainers(),
  };
}

module.exports = {
  handleDockerContainers,
};
