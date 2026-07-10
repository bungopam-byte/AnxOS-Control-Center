#!/usr/bin/env node
const fs = require("fs");
const http = require("http");
const https = require("https");
const {
  resolveSharedAgentToken,
} = require("../src/shared/agentTokenStore");

const status = resolveSharedAgentToken();
const config = (() => {
  try {
    return JSON.parse(fs.readFileSync(status.configPath, "utf8"));
  } catch {
    return {};
  }
})();

function requestStatus(url, headers = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;
    const request = client.request(parsed, { method: "GET", headers, timeout: 3000 }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        let body = null;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {}
        resolve({ statusCode: response.statusCode, body });
      });
    });
    request.on("error", () => resolve(null));
    request.on("timeout", () => {
      request.destroy();
      resolve(null);
    });
    request.end();
  });
}

async function getLiveAgentStatus() {
  const baseUrl = String(config.agentUrl || "http://127.0.0.1:47131").replace(/\/+$/, "");
  const health = await requestStatus(`${baseUrl}/api/v1/health`);
  const protectedStatus = status.token
    ? await requestStatus(`${baseUrl}/api/v1/stats`, { Authorization: `Bearer ${status.token}` })
    : null;
  return {
    reachable: health !== null,
    healthStatus: health?.statusCode || null,
    runningFingerprint: health?.body?.tokenFingerprint || null,
    tokenMatches: protectedStatus?.statusCode === 200,
    protectedStatus: protectedStatus?.statusCode || null,
  };
}

getLiveAgentStatus().then((live) => {
  console.log("AnxOS Agent Token Status");
  console.log("------------------------");
  console.log(`configured: ${status.configured ? "yes" : "no"}`);
  console.log(`source: ${status.source}`);
  console.log(`fingerprint: ${status.fingerprint || "not configured"}`);
  console.log(`configPath: ${status.configPath}`);
  console.log(`environmentTokenPresent: ${status.environmentTokenPresent ? "yes" : "no"}`);
  console.log(`environmentTokenMatches: ${status.environmentTokenMatches === null ? "not set" : status.environmentTokenMatches ? "yes" : "no"}`);
  console.log(`environmentTokenIgnored: ${status.environmentTokenIgnored ? "yes" : "no"}`);
  console.log(`runningAgentReachable: ${live.reachable ? "yes" : "no"}`);
  console.log(`runningAgentFingerprint: ${live.runningFingerprint || "not reported"}`);
  console.log(`runningAgentTokenMatches: ${live.reachable ? live.tokenMatches ? "yes" : "no" : "not checked"}`);
  if (status.weakStoredTokenReplaced || status.weakEnvironmentTokenIgnored) {
    console.log("weakTokenHandling: weak/default token ignored or replaced");
  }
  console.log("restartRequiredAfterRotation: yes");
  console.log("note: full tokens are never printed; restart the agent and desktop app after rotation.");
}).catch((error) => {
  console.error(`Token status failed: ${error?.message || "unknown error"}`);
  process.exitCode = 1;
});
