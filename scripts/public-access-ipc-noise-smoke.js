#!/usr/bin/env node
const assert = require("assert");

const publicAccessIpc = require("../src/ipc/publicAccessIpc");

(async () => {
  const { invokePublicAccessRead, expectedPublicAccessLogState, isExpectedPublicAccessError } = publicAccessIpc._test;
  expectedPublicAccessLogState.clear();

  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    const unauthorized = Object.assign(new Error("Authentication failed."), {
      code: "UNAUTHORIZED",
      status: 401,
      details: {
        nodeId: "anxlab",
        targetLabel: "node:anxlab",
        responseBody: { token: "must-not-leak" },
      },
    });

    assert.strictEqual(isExpectedPublicAccessError(unauthorized), true, "Unauthorized public access failures should be expected operational errors.");
    const first = await invokePublicAccessRead("publicAccess:getSnapshot", () => Promise.reject(unauthorized));
    const second = await invokePublicAccessRead("publicAccess:getSnapshot", () => Promise.reject(unauthorized));

    assert.strictEqual(first.ok, false, "Expected public access errors should return a structured failure.");
    assert.strictEqual(first.error.code, "UNAUTHORIZED", "Structured failure should preserve the authentication category.");
    assert.strictEqual(second.error.code, "UNAUTHORIZED", "Repeated structured failure should preserve the authentication category.");
    assert.strictEqual(warnings.length, 1, "Repeated identical expected failures should log once inside the suppression interval.");
    assert(!JSON.stringify(first).includes("must-not-leak"), "Structured expected errors must not expose authentication response bodies.");
    assert(!JSON.stringify(warnings).includes("must-not-leak"), "Expected error logs must not expose authentication response bodies.");

    await assert.rejects(
      () => invokePublicAccessRead("publicAccess:getSnapshot", () => Promise.reject(Object.assign(new Error("programming failure"), { code: "TYPE_ERROR" }))),
      /programming failure/,
      "Unexpected public access errors should still reject with diagnostic detail.",
    );
  } finally {
    console.warn = originalWarn;
  }

  console.log("Public Access IPC noise smoke checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
