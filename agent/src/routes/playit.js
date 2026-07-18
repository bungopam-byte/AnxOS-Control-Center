const { getPlayitSnapshot, getPlayitStatus } = require("../services/playitService");

async function handlePlayitSnapshot() {
  return {
    statusCode: 200,
    body: await getPlayitSnapshot(),
  };
}

async function handlePlayitStatus() {
  return {
    statusCode: 200,
    body: await getPlayitStatus(),
  };
}

module.exports = {
  handlePlayitSnapshot,
  handlePlayitStatus,
};
