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
  assert(indexHtml.includes("data-owner-workspace-toggle"), "Owner Workspace sidebar group should be collapsible.");
  assert(indexHtml.includes('data-owner-nav-section="workspace"'), "Owner Workspace group should include Workspace section.");
  assert(indexHtml.includes('data-owner-nav-section="development"'), "Owner Workspace group should include Development section.");
  assert(indexHtml.includes('data-owner-nav-section="diagnostics"'), "Owner Workspace group should include Diagnostics section.");
  assert(indexHtml.includes('data-owner-nav-section="custom"'), "Owner Workspace group should include custom pages section.");
  assert(!indexHtml.includes("owner-page-rail"), "Redundant Owner Workspace Pages panel should be removed.");
  assert(indexHtml.includes('data-page="owner-workspace"'), "Owner Workspace page route should be present.");
  assert(preloadJs.includes("ownerWorkspace:getWorkspace"), "Owner Workspace preload bridge should expose workspace IPC.");
  assert(preloadJs.includes("ownerWorkspace:selectPage"), "Owner Workspace preload bridge should expose selected page persistence.");
  assert(mainJs.includes("registerOwnerWorkspaceIpc()"), "Owner Workspace IPC should be registered by the main process.");
  assert(appJs.includes("ownerWorkspaceAvailable"), "Renderer should use the trusted owner workspace availability state.");
  assert(appJs.includes("function shouldShowOwnerWorkspaceNav()"), "Renderer should keep the Owner Workspace entry visible when owner auth is locked.");
  assert(appJs.includes("Sign in as Owner to open Owner Workspace."), "Locked Owner Workspace navigation should direct the user to sign in.");
  assert(!appJs.includes("if (securityState?.authenticated === true) {\n    return false;\n  }"), "Authenticated non-owner state must not remove the locked Owner Workspace navigation entry.");
  assert(!appJs.includes('if (!isOwnerWorkspaceAuthorized() && getActivePageName() === "owner-workspace") {\n    ownerWorkspaceState = { authorized: false'), "Security refresh must not wipe Owner Workspace state just because auth is locked.");
  assert(appJs.includes("ownerPageTool(page?.id"), "Renderer should route built-in pages to their own tools.");
  assert(appJs.includes("toggleOwnerNavExpanded"), "Renderer should support collapsible Owner Workspace navigation.");
  assert(!appJs.includes("ownerWorkspaceNavPages.replaceChildren()"), "Renderer must not delete the Owner sidebar scaffold when locked.");
  assert(appJs.includes('showPage("owner-workspace")'), "Owner sidebar toggle should navigate to the Owner Workspace.");
  assert(appJs.includes('selectedPageId: ownerWorkspaceState.selectedPageId || workspace.selectedPageId || "overview"'), "Owner Workspace should default to Overview on first renderer mount.");
  assert(appJs.includes("saveOwnerJson"), "JSON Editor should validate and save JSON content.");
  assert(appJs.includes("renderOwnerLogs"), "Log Viewer should support rendering and filtering logs.");

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
  const builtIns = ["overview", "notes", "scratchpad", "ui-sandbox", "feature-flags", "api-tester", "internal-analytics", "command-center", "json-editor", "log-viewer"];
  for (const pageId of builtIns) {
    assert(data.pages.some((page) => page.id === pageId), `Built-in ${pageId} page should be available.`);
  }
  assert.strictEqual(data.selectedPageId, "overview", "Default selected workspace page should be Overview.");
  workspace.selectPage({ pageId: "api-tester" });
  data = workspace.getWorkspace();
  assert.strictEqual(data.selectedPageId, "api-tester", "Selected workspace page should persist.");
  workspace.saveContent({ pageId: "notes", markdown: "# Private\n\nSaved locally." });
  data = workspace.getWorkspace();
  assert.strictEqual(data.contents.notes.markdown.includes("Saved locally."), true, "Autosaved content should persist.");
  workspace.saveContent({ pageId: "json-editor", json: "{\"ok\":true}" });
  data = workspace.getWorkspace();
  assert.strictEqual(data.contents["json-editor"].json.includes("\"ok\""), true, "JSON Editor content should persist.");

  const created = workspace.createPage({ title: "Smoke Page", icon: "test", accent: "#45e08f" });
  workspace.saveContent({ pageId: created.page.id, markdown: "- [ ] checklist\n```js\nconsole.log('ok')\n```" });
  const duplicate = workspace.duplicatePage({ id: created.page.id });
  assert(duplicate.page.title.includes("Copy"), "Custom pages should duplicate.");
  workspace.updatePage({ id: created.page.id, title: "Smoke Page Renamed", pinned: false });
  data = workspace.getWorkspace();
  assert(data.pages.some((page) => page.title === "Smoke Page Renamed" && page.pinned === false), "Custom pages should rename and pin/unpin.");
  workspace.deletePage({ id: duplicate.page.id });
  data = workspace.getWorkspace();
  assert(!data.pages.some((page) => page.id === duplicate.page.id), "Custom pages should delete.");
  assert(fs.existsSync(workspace.getWorkspacePath()), "Workspace should use a separate owner-workspace storage file.");
  assert(!workspace.getWorkspacePath().endsWith("security.json"), "Workspace data must be separate from security settings.");

  const workspaceDataPath = workspace.getWorkspacePath();
  fs.writeFileSync(workspaceDataPath, JSON.stringify({
    version: 1,
    customPages: [{ id: "existing-custom", title: "Existing Custom", builtIn: false, pinned: true }],
    contents: { "existing-custom": { markdown: "keep me" } },
  }, null, 2));
  data = workspace.getWorkspace();
  assert(data.pages.some((page) => page.id === "overview"), "Empty or old workspace files should migrate built-in pages.");
  assert(data.pages.some((page) => page.id === "existing-custom"), "Workspace migration should preserve custom pages.");
  assert.strictEqual(data.contents["existing-custom"].markdown, "keep me", "Workspace migration should preserve custom content.");

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
