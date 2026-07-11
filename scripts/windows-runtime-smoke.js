const assert = require("assert");
const path = require("path");

const { resolveElectronPaths } = require("../src/services/electronPaths");

function makeFetchResponse(payload) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => "application/json" },
    json: async () => payload,
  };
}

async function expectRejects(fn) {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error("Expected operation to reject.");
}

async function main() {
  process.env.ANXHUB_CONFIG_DIR = path.join(require("os").tmpdir(), `anxos-runtime-smoke-${process.pid}`);
  const agentClient = require("../src/services/agentClient");

  const requestedUrls = [];
  const originalFetch = global.fetch;
  const originalConsoleError = console.error;
  const consoleErrors = [];

  try {
    global.fetch = async (url) => {
      requestedUrls.push(String(url));
      return makeFetchResponse({ ok: true, identity: { deviceId: "remote-device", agentVersion: "0.1.0" } });
    };

    await agentClient.getHealth({
      backendMode: "agent",
      agentUrl: "http://192.168.1.134:47131",
      agentToken: "test-token",
      targetLabel: "selected-agent",
    });
    assert.strictEqual(requestedUrls[0], "http://192.168.1.134:47131/api/v1/health");
    assert(!requestedUrls.some((url) => url.includes("127.0.0.1")), "selected remote health checks must not use localhost");

    console.error = (...args) => consoleErrors.push(args);
    global.fetch = async () => {
      const error = new Error("connect ECONNREFUSED 127.0.0.1:47131");
      error.cause = { code: "ECONNREFUSED" };
      throw error;
    };

    const localConfig = {
      backendMode: "agent",
      agentUrl: "http://127.0.0.1:47131",
      targetLabel: "local-agent",
      suppressConnectionRefusedLog: true,
      logThrottleMs: 60000,
    };
    const firstLocalError = await expectRejects(() => agentClient.getHealth(localConfig));
    const secondLocalError = await expectRejects(() => agentClient.getHealth(localConfig));
    assert.strictEqual(firstLocalError.code, "ECONNREFUSED");
    assert.strictEqual(secondLocalError.code, "ECONNREFUSED");
    assert.strictEqual(consoleErrors.length, 0, "expected suppressed local ECONNREFUSED checks to stay out of the error log");

    const remoteConfig = {
      backendMode: "agent",
      agentUrl: "http://192.168.1.134:47131",
      targetLabel: "selected-agent",
      logThrottleMs: 60000,
    };
    await expectRejects(() => agentClient.getHealth(remoteConfig));
    await expectRejects(() => agentClient.getHealth(remoteConfig));
    assert.strictEqual(consoleErrors.length, 1, "expected repeated identical remote failures to be deduplicated");
    assert.strictEqual(consoleErrors[0][1].targetLabel, "selected-agent");

    const paths = resolveElectronPaths({
      platform: "win32",
      env: {
        APPDATA: "C:\\Users\\anjor\\AppData\\Roaming",
        LOCALAPPDATA: "C:\\Users\\anjor\\AppData\\Local",
        TEMP: "C:\\Users\\anjor\\AppData\\Local\\Temp",
      },
    });
    assert(paths.userData.startsWith("C:\\Users\\anjor\\AppData\\Roaming"), "userData should be under the roaming per-user directory");
    assert(paths.cache.startsWith("C:\\Users\\anjor\\AppData\\Local"), "cache should be under the local per-user directory");
    assert(paths.sessionData.startsWith("C:\\Users\\anjor\\AppData\\Local"), "sessionData should be under the local per-user directory");
    assert(!/Program Files/i.test(paths.cache), "cache must not resolve inside Program Files");

    console.log("Windows runtime smoke checks passed.");
  } finally {
    global.fetch = originalFetch;
    console.error = originalConsoleError;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
