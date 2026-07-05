const { listBackups } = require("../services/backupService");

async function handleBackupsList() {
  return {
    statusCode: 200,
    body: await listBackups(),
  };
}

module.exports = {
  handleBackupsList,
};
