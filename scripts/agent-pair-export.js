#!/usr/bin/env node

const agentUrl = String(process.env.AGENT_URL || "http://127.0.0.1:47131").replace(/\/+$/, "");

async function main() {
  const response = await fetch(`${agentUrl}/api/v1/pairing/start`, { method: "POST" });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.pairingCode) {
    throw new Error(payload?.error?.message || `Agent pairing session failed with HTTP ${response.status}.`);
  }
  console.log("AnxOS Agent Pairing");
  console.log("-------------------");
  console.log(`agentUrl: ${payload.agentUrl || agentUrl}`);
  console.log(`expiresAt: ${payload.expiresAt}`);
  console.log("");
  console.log("Pairing code:");
  console.log(payload.pairingCode);
  console.log("");
  console.log("Paste this temporary code into AnxOS Control Center -> Add Node -> Pair with Code.");
  console.log("The permanent Agent credential is created automatically during pairing and is not printed.");
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exitCode = 1;
});
