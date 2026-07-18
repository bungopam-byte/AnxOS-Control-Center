const assert = require("assert");
const { wrapExpectedAgentRead } = require("../src/ipc/expectedAgentError");

async function main() {
  assert.deepStrictEqual(
    await wrapExpectedAgentRead("smoke:success", async () => ({ value: 1 })),
    { value: 1 },
    "Expected Agent wrapper must preserve successful response shapes.",
  );

  const expected = await wrapExpectedAgentRead("smoke:offline", async () => {
    throw Object.assign(new Error("Agent offline"), { code: "AGENT_UNAVAILABLE", statusCode: 503 });
  });
  assert.strictEqual(expected.ok, false);
  assert.strictEqual(expected.error.code, "AGENT_UNAVAILABLE");

  await assert.rejects(
    wrapExpectedAgentRead("smoke:unexpected", async () => {
      throw Object.assign(new Error("Authorization: Bearer read-secret"), { code: "AGENT_RESPONSE_INVALID", statusCode: 502 });
    }),
    (error) => {
      assert.strictEqual(error.code, "AGENT_RESPONSE_INVALID");
      assert.strictEqual(error.statusCode, 502);
      assert(!JSON.stringify(error).includes("read-secret"));
      return true;
    },
  );
  console.log("Expected Agent error contract smoke checks passed.");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
