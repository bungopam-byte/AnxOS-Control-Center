const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-owner-workspace-"));
process.env.ANXHUB_CONFIG_DIR = path.join(root, "config");
process.env.NODE_ENV = "development";
process.env.ANXOS_TRUSTED_DEVELOPMENT_MODE = "1";

const repoRoot = path.join(__dirname, "..");

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function reload(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

async function main() {
  const indexHtml = readRepoFile("index.html");
  const appJs = readRepoFile("app.js");
  const preloadJs = readRepoFile("preload.js");
  const mainJs = readRepoFile("main.js");

  assert(indexHtml.includes("data-owner-workspace-nav"), "Owner Workspace sidebar section should be present.");
  assert(indexHtml.includes('data-page-target="owner-workspace"'), "Owner Workspace sidebar route should be registered.");
  assert(indexHtml.includes('data-page="owner-workspace"'), "Owner Workspace page route should be present.");
  assert(preloadJs.includes("ownerWorkspace:getWorkspace"), "Owner Workspace preload bridge should expose workspace IPC.");
  assert(mainJs.includes("registerOwnerWorkspaceIpc()"), "Owner Workspace IPC should be registered by the main process.");
  assert(appJs.includes("ownerWorkspaceAvailable"), "Renderer should use the trusted owner workspace availability state.");

  const securityPath = "../src/services/securityService";
  const workspacePath = "../src/services/ownerWorkspaceService";

  let security = reload(securityPath);
  let workspace = reload(workspacePath);

  assert.throws(() => workspace.getWorkspace(), /Owner access is required/, "Non-owner direct workspace reads should be denied.");
  assert.throws(() => workspace.saveContent({ pageId: "notes", markdown: "nope" }), /Owner access is required/, "Non-owner workspace writes should be denied.");

  await security.setupAdmin({
    username: "Anx",
    password: "1245",
    passwordConfirm: "1245",
  });
  assert.strictEqual(security.getStatus().user.role, "Owner", "Trusted development fallback should create an owner session.");

  let data = workspace.getWorkspace();
  assert(data.pages.some((page) => page.id === "notes"), "Built-in Notes page should be available.");
  workspace.saveContent({ pageId: "notes", markdown: "# Private\n\nSaved locally." });
  data = workspace.getWorkspace();
  assert.strictEqual(data.contents.notes.markdown.includes("Saved locally."), true, "Autosaved content should persist.");

  const created = workspace.createPage({ title: "Smoke Page", icon: "test", accent: "#45e08f" });
  workspace.saveContent({ pageId: created.page.id, markdown: "- [ ] checklist\n```js\nconsole.log('ok')\n```" });
  assert(fs.existsSync(workspace.getWorkspacePath()), "Workspace should use a separate owner-workspace storage file.");
  assert(!workspace.getWorkspacePath().endsWith("security.json"), "Workspace data must be separate from security settings.");

  assert.throws(
    () => workspace._test.assertApprovedApiUrl("https://example.com/"),
    /restricted to local AnxOS services|API Tester/,
    "API Tester should reject arbitrary internet URLs.",
  );
  const redacted = workspace._test.redactSecrets("authorization: Bearer abcdefghijklmnopqrstuvwxyz123456 password=secret");
  assert(!redacted.includes("abcdefghijklmnopqrstuvwxyz123456") && !redacted.includes("secret"), "API history/log redaction should remove secrets.");

  const flags = workspace.getFeatureFlags();
  assert(flags.some((flag) => flag.name === "ownerWorkspace.enabled"), "Feature flags should be listed.");
  workspace.setFeatureFlag({ name: "dev.mockData", value: true });

  security.logout();
  assert.throws(() => workspace.getCommandCatalog(), /Owner access is required/, "Logout should immediately remove command access.");

  process.env.ANXOS_FORCE_PRODUCTION = "1";
  fs.rmSync(process.env.ANXHUB_CONFIG_DIR, { recursive: true, force: true });
  security = reload(securityPath);
  workspace = reload(workspacePath);
  await assert.rejects(
    () => security.setupAdmin({ username: "Anx", password: "1245", passwordConfirm: "1245" }),
    /Password must be at least|Choose a stronger owner password/,
    "Production mode must reject the default development password.",
  );

  console.log("Owner Workspace smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
