const fs = require("fs");
const path = require("path");
const packageJson = require("../../package.json");
const { StructuredLogger } = require("../../../src/shared/structuredLogger");

function getDirectory() {
  if (process.env.ANXOS_LOG_DIR) return process.env.ANXOS_LOG_DIR;
  const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
  if (process.env.NODE_ENV === "development" || fs.existsSync(path.join(repositoryRoot, ".git"))) return path.join(repositoryRoot, ".dev-logs");
  return path.join(process.env.ANXHUB_CONFIG_DIR ? path.dirname(process.env.ANXHUB_CONFIG_DIR) : process.cwd(), "logs");
}

const logger = new StructuredLogger({ directory: getDirectory(), source: "agent", processName: "agent", agentVersion: packageJson.version });
module.exports = { getDirectory, logger };
