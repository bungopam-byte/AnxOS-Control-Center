const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const { requireNodeContext } = require("../src/ipc/nodeContext");

assert.strictEqual(requireNodeContext({ nodeId: "node-a" }, "smoke").nodeId, "node-a");
assert.throws(
  () => requireNodeContext({}, "smoke feature"),
  (error) => error.code === "NODE_REQUIRED" && error.statusCode === 400 && /smoke feature/.test(error.message),
  "Missing feature node context should fail closed.",
);

[
  ["src/ipc/dockerIpc.js", "requireDockerNodeContext(payload"],
  ["src/ipc/backupsIpc.js", "requireNodeContext(payload"],
  ["src/ipc/publicAccessIpc.js", "requireNodeContext(payload"],
  ["src/ipc/ampIpc.js", "requireNodeContext(payload"],
  ["src/ipc/systemIpc.js", "requireNodeContext(payload"],
  ["src/ipc/dependenciesIpc.js", "const requireDependencyNodeContext = requireNodeContext"],
].forEach(([relativePath, needle]) => {
  const source = read(relativePath);
  assert(source.includes('require("./nodeContext")'), `${relativePath} should import shared node-context guard.`);
  assert(source.includes(needle), `${relativePath} should require explicit node context.`);
});

const dockerSource = read("src/ipc/dockerIpc.js");
[
  "docker:getSnapshot",
  "docker:listContainers",
  "docker:create",
  "docker:compose",
  "docker:cleanup",
].forEach((channel) => assert(dockerSource.includes(channel), `Docker IPC should still register ${channel}.`));
assert(!/getDockerSnapshot\(payload\)/.test(dockerSource), "Docker snapshot must not pass unguarded payloads.");

console.log("Feature IPC node-context smoke checks passed.");
