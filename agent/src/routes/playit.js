const { getPlayitStatus } = require("../services/playitService");

async function handlePlayitStatus() {
  return {
    statusCode: 200,
    body: await getPlayitStatus(),
  };
}

module.exports = {
  handlePlayitStatus,
};
