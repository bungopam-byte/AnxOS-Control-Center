#!/usr/bin/env node
const { createAgentPairingPayload } = require("../src/shared/agentTokenStore");

const payload = createAgentPairingPayload({
  agentUrl: process.env.AGENT_URL,
});

console.log("AnxOS Agent Pairing");
console.log("-------------------");
console.log(`agentUrl: ${payload.agentUrl}`);
console.log(`fingerprint: ${payload.fingerprint}`);
console.log(`expiresAt: ${payload.expiresAt}`);
console.log("");
console.log("Pairing code:");
console.log(payload.code);
console.log("");
console.log("Paste this code into AnxOS Control Center -> Agent Control -> Agent Connection -> Pair Agent.");
console.log("Treat the pairing code like a temporary secret. It contains the remote agent token.");
