# Local Agent Application Validation

Date: 2026-07-14
Phase: 29, Application Regression Validation

This pass validated the Local Agent application workflows with repository smoke tests on the current Linux development machine. It did not complete real Windows installation, reboot, SmartScreen, antivirus, or Windows service validation.

## Passed Smoke Checks

- `node scripts/local-agent-runtime-smoke.js`
- `node scripts/local-agent-discovery-smoke.js`
- `node scripts/local-agent-installer-smoke.js`
- `node scripts/local-agent-pairing-smoke.js`
- `node scripts/agent-control-smoke.js`
- `node scripts/onboarding-smoke.js`
- `node scripts/dependency-smoke.js`
- `node scripts/node-switch-smoke.js`
- `node scripts/agent-files-root-smoke.js`
- `node scripts/files-pipeline-smoke.js`
- `node scripts/instance-runtime-smoke.js`
- `node scripts/agent-instance-record-smoke.js`
- `node scripts/instance-deletion-smoke.js`
- `node scripts/security-backup-smoke.js`
- `node scripts/public-access-smoke.js`
- `node scripts/marketplace-smoke.js`
- `node scripts/docker-smoke.js`
- `node scripts/owner-workspace-smoke.js`
- `node scripts/security-page-smoke.js`
- `node scripts/windows-runtime-smoke.js`
- `node scripts/renderer-safety-smoke.js`
- `node scripts/ui-polish-smoke.js`
- `node scripts/diagnostics-smoke.js`
- `node scripts/settings-permissions-smoke.js`
- `node scripts/settings-permissions-runtime-smoke.js`
- `node scripts/settings-preferences-smoke.js`
- `node scripts/command-palette-smoke.js`
- `node scripts/global-search-smoke.js`
- `node scripts/notification-center-smoke.js`
- `node scripts/device-activation-smoke.js`
- `node scripts/maintenance-smoke.js`
- `node scripts/account-system-smoke.js`
- `node scripts/bootstrap-owner-account-smoke.js`
- `node scripts/local-owner-auth-smoke.js`
- `node scripts/node-health-smoke.js`
- `node scripts/versioning-smoke.js`
- `node scripts/validate-release-artifacts.js --fixture`
- `npm run website:smoke`
- `node scripts/packaging-artifact-smoke.js --platform=win`
- `node scripts/device-architecture-smoke.js`
- `node scripts/agent-token-smoke.js`
- `node scripts/owner-account-smoke.js`

## Fixed During Validation

- Updated `scripts/files-pipeline-smoke.js` to validate the structured filesystem root entries now returned by the Local Agent file service.

## Not Completed In This Pass

- Fresh Windows installer run on a physical or virtual Windows machine.
- Windows service install, start after reboot, stop, repair, and uninstall on Windows.
- SmartScreen, unsigned installer warning, antivirus quarantine, and administrator elevation behavior.
- Real dependency installs for Java, Docker Desktop, SteamCMD, .NET, PowerShell, FFmpeg, Tailscale, Cloudflared, and Playit.
- Real Marketplace server downloads from external providers with live credentials or accounts.
- CurseForge validation with a production API key.
- Real public access provider sign-in and tunnel connectivity.
- Real remote Debian Agent integration against a live Debian host.

## Notes

- `node scripts/packaging-artifact-smoke.js` without a platform filter failed because `dist/` does not currently contain matching Linux `1.7-build146` AppImage and deb artifacts. The Windows target exists locally and passed with `--platform=win`.
- Smoke logs displayed only redacted token state, such as `token=set`, and did not print full Agent tokens.
