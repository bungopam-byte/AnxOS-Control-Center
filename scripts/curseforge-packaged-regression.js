const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.join(__dirname, "..");

function read(filePath) {
  return fs.readFileSync(path.join(repoRoot, filePath), "utf8");
}

function getLocalSecret() {
  try {
    const parsed = JSON.parse(read("config/marketplace.json"));
    return String(parsed.curseForgeApiKey || "").trim();
  } catch {
    return "";
  }
}

function assertRendererBundleDoesNotContainSecret() {
  const secret = getLocalSecret();
  if (!secret) {
    return;
  }
  for (const filePath of ["app.js", "preload.js", "index.html"]) {
    assert(!read(filePath).includes(secret), `${filePath} must not contain the local CurseForge API key.`);
  }
}

function runCleanConfigProbe() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anx-cf-clean-"));
  try {
    const probe = spawnSync(process.execPath, ["-e", `
      process.env.ANXHUB_CONFIG_DIR = ${JSON.stringify(tempRoot)};
      process.env.ANXHUB_DISABLE_CURSEFORGE_KEY_MIGRATION = "1";
      process.env.ANXHUB_DISABLE_CURSEFORGE_ENV_FALLBACK = "1";
      delete process.env.CURSEFORGE_API_KEY;
      delete process.env.CF_API_KEY;
      delete process.env.ANXHUB_CURSEFORGE_API_KEY;
      const provider = require("./src/services/providers/curseforgeProvider");
      const diagnostics = provider._test.getConfigurationDiagnostics();
      if (diagnostics.mode !== "unavailable") {
        throw new Error("Expected unavailable clean-machine mode, got " + diagnostics.mode);
      }
      try {
        provider._test.requireApiKey({});
        throw new Error("Expected missing-key failure.");
      } catch (error) {
        if (error.code !== "CURSEFORGE_API_KEY_REQUIRED") throw error;
      }
    `], {
      cwd: repoRoot,
      env: {
        ...process.env,
        ANXHUB_ENV_PATH: path.join(tempRoot, "missing.env"),
        ANXOS_CURSEFORGE_PROXY_URL: "",
        ANXHUB_CURSEFORGE_PROXY_URL: "",
        CURSEFORGE_PROXY_URL: "",
      },
      encoding: "utf8",
    });
    assert.strictEqual(probe.status, 0, `Clean config probe failed: ${probe.stderr || probe.stdout}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function assertPackagedConfigurationSurface() {
  const providerSource = read("src/services/providers/curseforgeProvider.js");
  const agentSource = read("agent/src/services/curseforgeProxyService.js");
  assert(providerSource.includes("ANXOS_CURSEFORGE_PROXY_URL"), "Desktop provider must support hosted proxy configuration.");
  assert(providerSource.includes("requestAgentProxyJson"), "Desktop provider must support Agent proxy configuration.");
  assert(agentSource.includes("/api/v1/marketplace/curseforge/download"), "Agent must expose a CurseForge download proxy route.");
  assert(agentSource.includes('"x-api-key"'), "Agent CurseForge proxy must attach x-api-key.");
  assert(
    agentSource.includes("return { statusCode: 200, body: result };"),
    "Agent CurseForge test endpoint should return diagnostic failures as structured 200 responses."
  );
}

function assertDownloadAuthenticationCoverage() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anx-cf-download-"));
  try {
    const probe = spawnSync(process.execPath, ["-e", `
      process.env.ANXHUB_CONFIG_DIR = ${JSON.stringify(tempRoot)};
      process.env.ANXHUB_DISABLE_CURSEFORGE_KEY_MIGRATION = "1";
      process.env.ANXHUB_DISABLE_CURSEFORGE_ENV_FALLBACK = "1";
      const provider = require("./src/services/providers/curseforgeProvider");
      const headers = provider._test.buildDownloadHeaders("https://edge.forgecdn.net/files/1/2/example.jar", { cfApiKey: "test-key" });
      if (headers["x-api-key"] !== "test-key") {
        throw new Error("ForgeCDN downloads must attach x-api-key from resolved configuration.");
      }
    `], {
      cwd: repoRoot,
      env: {
        ...process.env,
        ANXHUB_ENV_PATH: path.join(tempRoot, "missing.env"),
        CURSEFORGE_API_KEY: "",
        CF_API_KEY: "",
        ANXHUB_CURSEFORGE_API_KEY: "",
      },
      encoding: "utf8",
    });
    assert.strictEqual(probe.status, 0, `Download auth probe failed: ${probe.stderr || probe.stdout}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function assertScenarioCoverageDocumented() {
  const doc = read("docs/CURSEFORGE_CLEAN_MACHINE_VALIDATION.md");
  [
    "Development build with valid configuration",
    "Packaged build with valid Agent/proxy configuration",
    "Packaged build without configuration",
    "Invalid key",
    "Unauthorized response",
    "Rate limiting",
    "Browse success followed by download failure",
    "Modpack with a server pack",
    "Modpack without a server pack",
    "Dependency download",
    "Redirected CDN download",
    "Secret masking",
    "Renderer bundle inspection",
  ].forEach((needle) => assert(doc.includes(needle), `Validation doc missing scenario: ${needle}`));
}

assertRendererBundleDoesNotContainSecret();
runCleanConfigProbe();
assertPackagedConfigurationSurface();
assertDownloadAuthenticationCoverage();
assertScenarioCoverageDocumented();

console.log("CurseForge packaged regression checks passed.");
