const { getConsoleCommands, getRecentLogs } = require("../services/consoleService");

async function handleConsoleCommands() {
  return {
    statusCode: 200,
    body: await getConsoleCommands(),
  };
}

async function handleConsoleLogs(url) {
  return {
    statusCode: 200,
    body: await getRecentLogs(url.searchParams.get("source") || ""),
  };
}

module.exports = {
  handleConsoleCommands,
  handleConsoleLogs,
};
