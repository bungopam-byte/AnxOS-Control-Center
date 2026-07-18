const REQUIRED_AZURE_ENV = Object.freeze([
  "AZURE_TENANT_ID",
  "AZURE_CLIENT_ID",
  "AZURE_CLIENT_SECRET",
  "AZURE_TRUSTED_SIGNING_ENDPOINT",
  "AZURE_TRUSTED_SIGNING_ACCOUNT_NAME",
  "AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE_NAME",
  "AZURE_TRUSTED_SIGNING_PUBLISHER_NAME",
]);

function getAzureSigningConfig(environment = process.env) {
  const windowsBuildRequested = process.platform === "win32"
    || process.argv.includes("--win")
    || environment.ANXOS_WINDOWS_BUILD_REQUESTED === "1";
  if (!windowsBuildRequested) return null;
  const present = REQUIRED_AZURE_ENV.filter((name) => String(environment[name] || "").trim());
  if (present.length === 0) return null;
  const missing = REQUIRED_AZURE_ENV.filter((name) => !String(environment[name] || "").trim());
  if (missing.length > 0) {
    throw new Error(`Azure Trusted Signing configuration is partial. Missing: ${missing.join(", ")}`);
  }
  return {
    publisherName: environment.AZURE_TRUSTED_SIGNING_PUBLISHER_NAME,
    endpoint: environment.AZURE_TRUSTED_SIGNING_ENDPOINT,
    certificateProfileName: environment.AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE_NAME,
    codeSigningAccountName: environment.AZURE_TRUSTED_SIGNING_ACCOUNT_NAME,
  };
}

module.exports = { REQUIRED_AZURE_ENV, getAzureSigningConfig };
