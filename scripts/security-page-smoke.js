const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-security-page-"));
process.env.ANXHUB_CONFIG_DIR = path.join(root, "config");
process.env.AGENT_INSTANCE_ROOT = path.join(root, "instances");
process.env.AGENT_BACKUP_ROOT = path.join(root, "backups");
process.env.ANXOS_FORCE_PRODUCTION = "1";

const indexHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const preloadJs = fs.readFileSync(path.join(__dirname, "..", "preload.js"), "utf8");
const ipcJs = fs.readFileSync(path.join(__dirname, "..", "src", "ipc", "securityIpc.js"), "utf8");
const security = require("../src/services/securityService");

async function main() {
  [
    "data-security-overview",
    "data-security-recommendations",
    "data-security-account-protection",
    "data-security-permissions",
    "data-security-sessions",
    "data-security-trusted-devices",
    "data-security-remote-status",
    "data-security-token-details",
    "data-security-authentication",
    "data-security-session-timeout",
    "data-security-events",
    "data-security-emergency",
  ].forEach((needle) => {
    assert(indexHtml.includes(needle), `Security page should include ${needle}.`);
  });

  [
    "security:getDashboard",
    "security:revokeSession",
    "security:removeTrustedDevice",
    "security:updateSessionSettings",
    "security:emergencyAction",
  ].forEach((needle) => {
    assert(preloadJs.includes(needle) || ipcJs.includes(needle), `Security IPC should include ${needle}.`);
  });

  assert(appJs.includes("createSecurityConfirmation"), "Security page should use app-native confirmation modals.");
  assert(appJs.includes("dialog.setAttribute(\"aria-modal\", \"true\")"), "Security confirmations should be built with safe DOM APIs.");
  assert(!appJs.includes("Rotate the Agent token? Restart the agent and desktop app after rotation."), "Security page should not use browser confirm for token rotation.");
  assert(appJs.includes("SECURITY_OPERATION_ACTIONS"), "Consequential security actions should be tracked in Operations.");
  assert(appJs.includes("createSecurityActionNotification"), "Consequential security actions should create durable notifications.");
  assert(appJs.includes("renderSecurityPermissions"), "Security page should render role and permission boundaries.");
  assert(appJs.includes("renderSecurityAccountProtection"), "Security page should render account-protection state.");
  assert(appJs.includes("function escapeHtml"), "Security/account render paths should define the HTML escaping helper they use.");
  assert(appJs.includes("data-security-event-filter"), "Security event filtering should be wired.");
  assert(appJs.includes("handleSecurityRecommendation"), "Security recommendation action buttons should be wired.");
  assert(appJs.includes("dismissSecurityRecommendation"), "Security recommendation dismiss buttons should be wired.");
  assert(appJs.includes(".settings-section--security-events"), "Failed sign-in recommendations should navigate to security events.");
  assert(appJs.includes(".settings-section--security-expiration"), "Session-expiration recommendations should navigate to session settings.");
  assert(!appJs.includes("New trusted device name"), "Security page should not use browser prompt for trusted-device rename.");
  assert(indexHtml.includes("data-account-details"), "Account details should have a dedicated visibility container.");
  assert(appJs.includes("accountPasswordForm.hidden = signedIn"), "Signed-in account state should hide the email/password form.");
  assert(appJs.includes("accountDetailsPanel.hidden = !signedIn && !pending"), "Signed-out account state should hide active account details.");
  assert(appJs.includes("async function switchAnxOsAccount"), "Switch Account should intentionally return to account-selection state.");

  await security.setupAdmin({ username: "owner", password: "correct horse battery staple", passwordConfirm: "correct horse battery staple", staySignedIn: true });
  const dashboard = security.getSecurityDashboard();
  assert(dashboard.overview, "Security dashboard should return overview data.");
  assert(dashboard.accountProtection, "Security dashboard should return account-protection data.");
  assert(Array.isArray(dashboard.permissions), "Security dashboard should return permission boundary data.");
  assert(Array.isArray(dashboard.sessions), "Security dashboard should return sessions.");
  assert(Array.isArray(dashboard.trustedDevices), "Security dashboard should return trusted devices.");
  assert(Array.isArray(dashboard.recommendations), "Security dashboard should return recommendations.");
  assert(Array.isArray(dashboard.events), "Security dashboard should return events.");
  assert(dashboard.agentToken && !JSON.stringify(dashboard.agentToken).includes("correct horse"), "Dashboard must not expose passwords.");
  assert(dashboard.permissions.some((permission) => permission.id === "security"), "Permission summary should explain security control enforcement.");

  const rotated = security.rotateAgentToken();
  assert(rotated.fingerprint && !rotated.token, "Token rotation should return a fingerprint but no raw token.");
  const afterRotation = security.getSecurityDashboard();
  assert.strictEqual(afterRotation.overview.agentTokenStatus, "Configured", "Token overview should show configured after token rotation.");
  assert(afterRotation.agentToken.fingerprint, "Token dashboard should expose only a fingerprint.");
  assert(!afterRotation.recommendations.some((item) => item.id === "agent-token-missing"), "Configured token should clear missing-token recommendation.");
  const serializedDashboard = JSON.stringify(afterRotation);
  assert(!/agentToken"\s*:\s*"[A-Za-z0-9_-]{24,}"/.test(serializedDashboard), "Dashboard should not expose raw agent tokens.");

  const session = afterRotation.sessions.find((entry) => !entry.runtimeOnly && !entry.current);
  if (session) {
    const next = security.revokePersistentSession(session.id);
    assert(!next.sessions.some((entry) => entry.id === session.id), "Session revocation should remove the selected session.");
  }

  const currentDevice = afterRotation.trustedDevices.find((device) => device.current);
  assert(currentDevice, "Current trusted device should be present.");
  const renamed = security.renameTrustedDevice(currentDevice.id, "Security Smoke Device");
  assert(renamed.trustedDevices.some((device) => device.name === "Security Smoke Device"), "Trusted device rename should persist.");
  const removed = security.removeTrustedDevice(currentDevice.id);
  assert(removed.trustedDevices.some((device) => device.id === currentDevice.id && device.trusted === false), "Trusted device removal should persist.");

  const settings = security.updateSessionSecuritySettings({
    inactiveSessionExpirationMs: 604800000,
    lockOwnerWorkspaceAfterInactivity: true,
    requireReauthForSensitiveActions: true,
  });
  assert.strictEqual(settings.authentication.sessionTimeoutMs, 604800000, "Session timeout setting should persist.");

  assert.throws(
    () => security.emergencySecurityAction("remove-trusted-devices", "wrong"),
    /SECURE ANXOS/,
    "Emergency actions should require typed confirmation.",
  );

  const emergency = security.emergencySecurityAction("remove-trusted-devices", "SECURE ANXOS");
  assert(emergency.trustedDevices.every((device) => device.trusted === false), "Emergency trusted-device removal should be enforced.");

  security.logout();
  assert.throws(
    () => security.getSecurityDashboard(),
    /Sign in to continue|Owner access is required/,
    "Security dashboard should reject unauthenticated IPC/service reads after security setup.",
  );
  assert.throws(
    () => security.revokeAgentToken(),
    /Sign in to continue/,
    "Signed-out users should be denied privileged token actions.",
  );

  console.log("Security page smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
