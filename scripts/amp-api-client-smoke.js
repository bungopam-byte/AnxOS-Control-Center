#!/usr/bin/env node
const assert = require("assert");
const http = require("http");
const { AMPAPI } = require("../src/services/ampApiClient");

async function main() {
  const requests = [];
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      requests.push({ url: request.url, body });
      response.setHeader("Content-Type", "application/json");
      if (request.url === "/API/Core/GetAPISpec") {
        response.end(JSON.stringify({ result: {
          Core: {
            GetAPISpec: { Parameters: [] },
            Login: { Parameters: [{ Name: "username" }, { Name: "password" }, { Name: "token" }, { Name: "rememberMe" }] },
          },
          ADSModule: { GetInstances: { Parameters: [] } },
        } }));
        return;
      }
      if (request.url === "/API/Core/Login") {
        response.end(JSON.stringify({ result: { success: true, sessionID: "fixture-session" } }));
        return;
      }
      if (request.url === "/API/Core/Oversized") {
        response.setHeader("Content-Length", "2048");
        response.end("x".repeat(2048));
        return;
      }
      response.end(JSON.stringify({ result: [{ InstanceID: "instance-1" }] }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const api = new AMPAPI(`http://127.0.0.1:${server.address().port}`, { responseLimitBytes: 1024 });
    assert.strictEqual(await api.initAsync(), true, "AMP API specification must initialize dynamic methods.");
    const login = await api.Core.LoginAsync("owner", "secret", "", false);
    assert.strictEqual(login.sessionID, "fixture-session");
    api.sessionId = login.sessionID;
    assert.deepStrictEqual(await api.ADSModule.GetInstancesAsync(), [{ InstanceID: "instance-1" }]);
    assert.deepStrictEqual(requests[1].body, { SESSIONID: "", username: "owner", password: "secret", token: "", rememberMe: false });
    assert.strictEqual(requests[2].body.SESSIONID, "fixture-session", "authenticated calls must carry the AMP session id.");
    await assert.rejects(
      api.APICall("Core", "Oversized"),
      (error) => error?.code === "AMP_RESPONSE_TOO_LARGE",
      "AMP responses must be rejected before exceeding the configured byte limit.",
    );
    assert.throws(() => new AMPAPI("https://user:password@example.invalid"), (error) => error?.code === "AMP_URL_CREDENTIALS_FORBIDDEN");
    api.API.__proto__ = { Polluted: { Parameters: [] } };
    api.bindMethods();
    assert.strictEqual(Object.prototype.Polluted, undefined, "hostile API module names must not pollute prototypes.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  console.log("AMP API client smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
