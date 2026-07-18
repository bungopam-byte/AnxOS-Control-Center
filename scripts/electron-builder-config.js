const fs = require("fs");
const path = require("path");

const { getAzureSigningConfig } = require("./azure-signing-config");

function readBuildConfiguration() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
  return JSON.parse(JSON.stringify(packageJson.build || {}));
}

function createElectronBuilderConfig(environment = process.env) {
  const config = readBuildConfiguration();
  const azureSignOptions = getAzureSigningConfig(environment);
  config.win = { ...(config.win || {}) };
  delete config.win.signtoolOptions;
  if (azureSignOptions) config.win.azureSignOptions = azureSignOptions;
  else delete config.win.azureSignOptions;
  return config;
}

module.exports = createElectronBuilderConfig();
