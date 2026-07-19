const assert = require("assert");
const fs = require("fs");

const source = fs.readFileSync("app.js", "utf8");
assert(source.includes('const paired = options.paired === true;'), "Pairing badge must have an explicit paired state.");
assert(source.includes('local.agentStatus?.state === "Connected"'), "Pairing badge must recognize connected remote Agent status.");
assert(source.includes('agentPairingStatus.textContent = paired ? "Paired"'), "Pairing badge must display Paired when authenticated.");
console.log("Paired Agent badge smoke checks passed.");
