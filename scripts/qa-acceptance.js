const fs = require("fs");
const path = require("path");
const { _electron: electron } = require("playwright-core");

const root = path.resolve(__dirname, "..");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = path.join(root, "artifacts", "qa", timestamp);
const screenshotDir = path.join(artifactDir, "screenshots");
fs.mkdirSync(screenshotDir, { recursive: true });
const timeline = [];
const results = [];
const rendererErrors = [];
const rendererWarnings = [];
const rendererLogs = [];
const fatalWarnings = [];
const strictSecurity = process.env.ANXOS_QA_STRICT_SECURITY === "1";
const redact = (value) => String(value || "").replace(/(authorization|token|password|secret|api[_-]?key|cookie)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]");
function record(action, target, expected, observed, pass, screenshot = null) {
  const entry = { timestamp: new Date().toISOString(), action, target, expected, observed: redact(observed), pass, screenshot };
  timeline.push(entry);
  results.push({ name: action, pass, observed: entry.observed });
}

async function main() {
  const executable = process.env.ANXOS_QA_EXECUTABLE || undefined;
  const launchOptions = { args: [root, "--qa-mode"], env: { ...process.env, ANXOS_QA_MODE: "1" } };
  if (executable) launchOptions.executablePath = executable;
  const app = await electron.launch(launchOptions);
  const mainLogs = [];
  app.process().stdout?.on("data", (chunk) => mainLogs.push(redact(chunk.toString())));
  app.process().stderr?.on("data", (chunk) => mainLogs.push(redact(chunk.toString())));
  const window = await app.firstWindow();
  window.on("console", (message) => {
    const entry = redact(`${message.type()}: ${message.text()}`);
    if (message.type() === "error") rendererErrors.push(entry);
    else if (message.type() === "warning") {
      rendererWarnings.push(entry);
      if (strictSecurity && /content security policy|CSP/i.test(message.text())) fatalWarnings.push(entry);
    } else rendererLogs.push(entry);
  });
  window.on("pageerror", (error) => rendererErrors.push(redact(`pageerror: ${error.message}`)));
  await window.waitForLoadState("domcontentloaded");
  const shot = async (name) => { const file = path.join(screenshotDir, `${name}.png`); await window.screenshot({ path: file }); return path.relative(artifactDir, file); };
  const title = await window.title();
  record("launch", "main window", "AnxOS Control Center window appears", title, Boolean(title));
  record("qa-indicator", "[data-testid=qa-mode-indicator]", "QA MODE is visible", await window.locator("[data-testid=qa-mode-indicator]").textContent().catch(() => "missing"), await window.locator("[data-testid=qa-mode-indicator]").isVisible().catch(() => false), await shot("launch"));
  for (const page of ["dashboard", "nodes", "agent-control", "marketplace", "instances", "public-access", "diagnostics", "settings"]) {
    const navigationTarget = page === "public-access" ? "playit" : page === "diagnostics" ? "agent-control" : page;
    const link = window.locator(`[data-page-target="${navigationTarget}"]`).first();
    if (await link.count()) {
      await link.click();
      await window.waitForTimeout(300);
      if (page === "diagnostics") {
        const diagnosticsSection = window.locator('[data-agent-control-section-target="diagnostics"]').first();
        if (await diagnosticsSection.count()) await diagnosticsSection.click();
      }
      const visible = page === "diagnostics"
        ? await window.locator('[data-agent-control-section="diagnostics"]').isVisible().catch(() => false)
        : await window.locator(`[data-page="${page === "public-access" ? "playit" : page}"]`).isVisible().catch(() => false);
      record(`navigate-${page}`, page, "page becomes visible", String(visible), visible, await shot(page));
    } else record(`navigate-${page}`, page, "navigation control exists", "control not found", false);
  }
  await app.close();
  fs.writeFileSync(path.join(artifactDir, "timeline.json"), JSON.stringify(timeline, null, 2));
  const failedResults = results.filter((entry) => !entry.pass);
  const acceptancePass = failedResults.length === 0 && rendererErrors.length === 0 && fatalWarnings.length === 0;
  fs.writeFileSync(path.join(artifactDir, "results.json"), JSON.stringify({ results, failedResults, pass: acceptancePass }, null, 2));
  fs.writeFileSync(path.join(artifactDir, "renderer-console.log"), rendererErrors.join("\n"));
  fs.writeFileSync(path.join(artifactDir, "renderer-warnings.log"), rendererWarnings.join("\n"));
  fs.writeFileSync(path.join(artifactDir, "renderer-info.log"), rendererLogs.join("\n"));
  fs.writeFileSync(path.join(artifactDir, "network-errors.json"), "[]\n");
  fs.writeFileSync(path.join(artifactDir, "environment.json"), JSON.stringify({ platform: process.platform, node: process.version, qaMode: true, executable: executable ? path.basename(executable) : "electron" }, null, 2));
  fs.writeFileSync(path.join(artifactDir, "main-process.log"), mainLogs.join(""));
  const summary = [
    "# QA Acceptance",
    "",
    `Result: ${acceptancePass ? "PASS" : "FAIL"}`,
    `Failed checkpoints: ${failedResults.length ? failedResults.map((entry) => `${entry.name} (${entry.observed})`).join("; ") : "none"}`,
    `Renderer errors: ${rendererErrors.length}`,
    `Renderer warnings: ${rendererWarnings.length}${strictSecurity ? " (strict security enabled)" : ""}`,
    `Fatal warnings: ${fatalWarnings.length}`,
    `Screenshots: ${fs.readdirSync(screenshotDir).filter((name) => name.endsWith(".png")).length}`,
    `Artifact directory: ${artifactDir}`,
    "",
    "CSP warnings are non-fatal unless ANXOS_QA_STRICT_SECURITY=1 is set.",
  ].join("\n") + "\n";
  fs.writeFileSync(path.join(artifactDir, "summary.md"), summary);
  console.log(JSON.stringify({ artifactDir, pass: acceptancePass, failedResults, rendererErrors, rendererWarnings, fatalWarnings }, null, 2));
  process.exitCode = acceptancePass ? 0 : 1;
}

main().catch((error) => { console.error(redact(error.stack || error.message)); process.exitCode = 1; });
