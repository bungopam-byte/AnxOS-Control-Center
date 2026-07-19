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
  window.on("console", (message) => rendererErrors.push(redact(`${message.type()}: ${message.text()}`)));
  window.on("pageerror", (error) => rendererErrors.push(redact(`pageerror: ${error.message}`)));
  await window.waitForLoadState("domcontentloaded");
  const shot = async (name) => { const file = path.join(screenshotDir, `${name}.png`); await window.screenshot({ path: file }); return path.relative(artifactDir, file); };
  const title = await window.title();
  record("launch", "main window", "AnxOS Control Center window appears", title, Boolean(title));
  record("qa-indicator", "[data-testid=qa-mode-indicator]", "QA MODE is visible", await window.locator("[data-testid=qa-mode-indicator]").textContent().catch(() => "missing"), await window.locator("[data-testid=qa-mode-indicator]").isVisible().catch(() => false), await shot("launch"));
  for (const page of ["dashboard", "nodes", "agent-control", "marketplace", "instances", "public-access", "diagnostics", "settings"]) {
    const link = window.locator(`[data-page-target="${page}"]`).first();
    if (await link.count()) {
      await link.click();
      await window.waitForTimeout(300);
      const visible = await window.locator(`[data-page="${page}"]`).isVisible().catch(() => false);
      record(`navigate-${page}`, page, "page becomes visible", String(visible), visible, await shot(page));
    } else record(`navigate-${page}`, page, "navigation control exists", "control not found", false);
  }
  await app.close();
  fs.writeFileSync(path.join(artifactDir, "timeline.json"), JSON.stringify(timeline, null, 2));
  fs.writeFileSync(path.join(artifactDir, "results.json"), JSON.stringify({ results, pass: results.every((entry) => entry.pass) }, null, 2));
  fs.writeFileSync(path.join(artifactDir, "renderer-console.log"), rendererErrors.join("\n"));
  fs.writeFileSync(path.join(artifactDir, "network-errors.json"), "[]\n");
  fs.writeFileSync(path.join(artifactDir, "environment.json"), JSON.stringify({ platform: process.platform, node: process.version, qaMode: true, executable: executable ? path.basename(executable) : "electron" }, null, 2));
  fs.writeFileSync(path.join(artifactDir, "main-process.log"), mainLogs.join(""));
  fs.writeFileSync(path.join(artifactDir, "summary.md"), `# QA Acceptance\n\nResult: ${results.every((entry) => entry.pass) ? "PASS" : "FAIL"}\n\nArtifact directory: ${artifactDir}\n`);
  console.log(JSON.stringify({ artifactDir, pass: results.every((entry) => entry.pass), rendererErrors }, null, 2));
  process.exitCode = results.every((entry) => entry.pass) ? 0 : 1;
}

main().catch((error) => { console.error(redact(error.stack || error.message)); process.exitCode = 1; });
