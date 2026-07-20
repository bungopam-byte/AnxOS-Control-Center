const assert = require("assert");
const fs = require("fs");

const source = fs.readFileSync(require.resolve("../src/services/agentClient"), "utf8");
assert(source.includes("UND_ERR_SOCKET"), "File writes must classify Undici socket resets.");
assert(source.includes("ECONNRESET") && source.includes("EPIPE"), "File writes must classify common transport resets.");
assert(source.includes("return request();"), "File writes must retry the idempotent Agent request.");
assert(source.includes("FILE_WRITE_TIMEOUT_MS"), "File writes must use a bounded long-operation timeout.");
console.log("Marketplace file-write retry smoke checks passed.");
