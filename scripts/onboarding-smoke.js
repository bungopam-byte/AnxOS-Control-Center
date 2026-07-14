const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-onboarding-smoke-"));
process.env.ANXHUB_CONFIG_DIR = path.join(tempRoot, "config");

const prefs = require("../src/services/settingsPreferenceService");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const packageJson = fs.readFileSync(path.join(root, "package.json"), "utf8");

try {
  const initial = prefs.readPreferences();
  assert.strictEqual(initial.settings["onboarding.started"], false, "Onboarding should not start by default.");
  assert.strictEqual(initial.settings["onboarding.completed"], false, "Onboarding should not be completed by default.");
  assert.strictEqual(initial.settings["onboarding.currentStep"], "welcome", "Onboarding should start at the welcome step.");
  assert.strictEqual(initial.settings["onboarding.skipped"], false, "Onboarding should not be skipped by default.");
  assert.strictEqual(initial.settings["onboarding.welcomeGuidance"], true, "Welcome guidance should default on.");
  assert.strictEqual(initial.settings["onboarding.contextualTips"], true, "Contextual tips should default on.");
  assert.strictEqual(initial.settings["onboarding.version"], prefs.ONBOARDING_VERSION, "Onboarding version should be persisted.");

  const skipped = prefs.updatePreferences({
    "onboarding.started": false,
    "onboarding.completed": false,
    "onboarding.currentStep": "welcome",
    "onboarding.skipped": true,
    "onboarding.welcomeGuidance": true,
    "onboarding.contextualTips": true,
  });
  assert.strictEqual(skipped.settings["onboarding.skipped"], true, "Skipped onboarding state should persist.");

  const completed = prefs.updatePreferences({
    "onboarding.started": true,
    "onboarding.completed": true,
    "onboarding.currentStep": "complete",
    "onboarding.skipped": false,
  });
  assert.strictEqual(completed.settings["onboarding.completed"], true, "Completed onboarding state should persist.");
  assert.strictEqual(completed.settings["onboarding.currentStep"], "complete", "Current onboarding step should persist.");

  fs.writeFileSync(prefs.getSettingsPath(), "{not valid json");
  const recovered = prefs.readPreferences();
  assert.strictEqual(recovered.settings["onboarding.currentStep"], "welcome", "Malformed onboarding settings should recover safely.");
  assert.strictEqual(recovered.settings["onboarding.welcomeGuidance"], true, "Malformed onboarding settings should keep safe defaults.");

  [
    "data-onboarding-welcome",
    "Welcome to AnxOS Control Center",
    "Manage your servers, applications, files, containers, remote systems, and public access from one place.",
    "Manage local and remote systems",
    "Install and control servers",
    "Monitor health and services",
    'data-onboarding-action="start"',
    'data-onboarding-action="skip"',
    'data-onboarding-action="restart"',
    'data-onboarding-action="reset"',
    'data-setting="onboarding.welcomeGuidance"',
    'data-setting="onboarding.contextualTips"',
  ].forEach((needle) => assert(index.includes(needle), `Onboarding UI missing: ${needle}`));

  [
    "shouldShowOnboardingWelcome",
    "maybeOpenOnboardingWelcome",
    "handleOnboardingAction",
    "setOnboardingWelcomeVisible",
    '"onboarding.completed": true',
    '"onboarding.skipped": true',
    '"onboarding.currentStep": "welcome"',
    "activateModal(onboardingWelcomeModal",
  ].forEach((needle) => assert(app.includes(needle), `Onboarding renderer wiring missing: ${needle}`));

  assert(styles.includes(".app-modal--welcome"), "Welcome modal CSS should be scoped.");
  assert(styles.includes(".onboarding-feature-grid"), "Welcome feature grid CSS should exist.");
  assert(packageJson.includes('"onboarding:smoke"'), "package.json should expose onboarding smoke command.");

  console.log("Onboarding smoke checks passed.");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
