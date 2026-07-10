#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const {
  rotateSharedAgentToken,
} = require("../src/shared/agentTokenStore");

function removeAgentTokenFromEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const original = fs.readFileSync(filePath, "utf8");
  const next = original
    .split(/\r?\n/)
    .filter((line) => !/^\s*AGENT_TOKEN\s*=/.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
  if (next !== original) {
    fs.writeFileSync(filePath, next.endsWith("\n") ? next : `${next}\n`, { mode: 0o600 });
    return true;
  }
  return false;
}

const rotated = rotateSharedAgentToken();
const scrubbed = [
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), "agent", ".env"),
].filter(removeAgentTokenFromEnvFile);

console.log("AnxOS agent token rotated.");
console.log(`fingerprint: ${rotated.fingerprint}`);
console.log(`configPath: ${rotated.configPath}`);
if (scrubbed.length) {
  console.log(`removed AGENT_TOKEN from: ${scrubbed.join(", ")}`);
}
console.log("Restart required: restart the AnxOS agent and desktop app so both reload the shared token.");
console.log("The full token was not printed.");
