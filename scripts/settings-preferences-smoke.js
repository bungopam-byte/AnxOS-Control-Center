const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-settings-prefs-"));
process.env.ANXHUB_CONFIG_DIR = path.join(root, "config");

const prefs = require("../src/services/settingsPreferenceService");

try {
  const initial = prefs.readPreferences();
  assert.strictEqual(initial.settings["app.displayName"], "AnxOS Control Center");
  assert.strictEqual(initial.settings["interface.guidedMode"], true, "clean first-launch settings should enable Guided Mode.");
  assert.strictEqual(initial.settings["interface.advancedMode"], false, "Advanced Mode should default off.");
  assert(initial.definitions["appearance.accentColor"], "setting definitions should be returned for renderer metadata.");

  assert.throws(() => prefs.updatePreferences({ "__proto__.polluted": true }), /Unknown setting key/);
  assert.throws(() => prefs.updatePreferences({ "appearance.accentColor": "purple" }), /hex color/);
  assert.throws(() => prefs.updatePreferences({ "network.proxyUrl": "file:///etc/passwd" }), /Manual proxy URL/);

  const saved = prefs.updatePreferences({
    "app.displayName": "AnxOS Test",
    "appearance.accentColor": "#45e08f",
    "interface.guidedMode": false,
    "interface.advancedMode": true,
    "startup.minimumDurationMs": 999999,
  });
  assert.strictEqual(saved.settings["app.displayName"], "AnxOS Test");
  assert.strictEqual(saved.settings["appearance.accentColor"], "#45e08f");
  assert.strictEqual(saved.settings["interface.guidedMode"], false);
  assert.strictEqual(saved.settings["interface.advancedMode"], true);
  assert.strictEqual(saved.settings["startup.minimumDurationMs"], 15000, "numeric settings should clamp to safe limits.");

  const resetAppearance = prefs.resetPreferences("appearance");
  assert.strictEqual(resetAppearance.settings["appearance.accentColor"], "#b66cff");
  assert.strictEqual(resetAppearance.settings["app.displayName"], "AnxOS Test", "category reset should preserve other categories.");

  fs.writeFileSync(prefs.getSettingsPath(), JSON.stringify({
    "general.startupSound": false,
    "server.ampUrl": "http://amp.local",
    "server.playitAddress": "playit.example",
    "server.minecraftName": "mc.example",
  }));
  const migrated = prefs.readPreferences();
  assert.strictEqual(migrated.settings["interface.guidedMode"], false, "legacy settings with existing values should not unexpectedly enable Guided Mode.");
  assert.strictEqual(migrated.settings["startup.sound"], false);
  assert.strictEqual(migrated.settings["amp.url"], "http://amp.local");
  assert.strictEqual(migrated.settings["playit.address"], "playit.example");
  assert.strictEqual(migrated.settings["minecraft.defaultAddress"], "mc.example");

  fs.writeFileSync(prefs.getSettingsPath(), "{not valid json");
  const recovered = prefs.readPreferences();
  assert.strictEqual(recovered.settings["app.displayName"], "AnxOS Control Center", "corrupt settings should recover to defaults.");

  console.log("Settings preference smoke checks passed.");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
