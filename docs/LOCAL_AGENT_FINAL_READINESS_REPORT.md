# Local Agent Final Readiness Report

Date: 2026-07-14
Branch: `dev`
Commit evaluated: `c944c8d`

## Release Recommendation

Do not tag or publish a stable production release.

The Local Agent implementation and website/release source work have broad smoke-test coverage, but the final readiness gate is blocked by missing build 146 release assets and missing real Windows machine validation.

## Passed Checks

- Local Agent runtime packaging smoke passed.
- Local Agent discovery smoke passed.
- Local Agent installer smoke passed.
- Local Agent pairing smoke passed.
- Agent Control smoke passed.
- Onboarding smoke passed.
- Dependency smoke passed.
- Node switching smoke passed.
- Files pipeline smoke passed.
- Backup/security smoke passed.
- Public Access smoke passed.
- Marketplace smoke passed.
- Website production, download, accessibility, and responsive smokes passed.
- Versioning smoke passed.
- Windows packaging artifact smoke passed for build 146.
- The rebuilt Windows package contains `resources/local-agent-runtime`.
- Stable website download endpoints redirect to real build 145 release assets.
- Documentation set for architecture, setup, security, troubleshooting, release checklist, website validation, real-machine validation, limitations, and tester guidance is present.

## Failed Checks

- Public release repository lookup for `v1.7-build146` returned `404`.
- Full unfiltered packaging smoke was not passed for build 146 because matching local Linux build 146 AppImage and deb artifacts were not rebuilt in this pass.
- Production site deployment of the source correction from build 146 website metadata to build 145 was not confirmed after the commit.

## Blockers

- Build 146 Windows and Linux release assets are not published in `AnxOS-Control-Center-Releases`.
- Real Windows installer validation is incomplete.
- Windows service install/start/stop/restart/repair/remove and startup-after-reboot validation is incomplete.
- Automatic pairing, credential rotation, and repair after reinstall have not been validated on a real Windows install.
- Real dependency installation for Java, Docker Desktop, SteamCMD, .NET, PowerShell, FFmpeg, Tailscale, Cloudflared, Playit, and Visual C++ runtime is incomplete.
- Real Marketplace install/start/stop for a supported game server on `This PC` is incomplete.
- Real Files, Backups, Public Access, Windows Firewall, SmartScreen, antivirus, and reboot behavior are incomplete.
- Existing remote Debian Agent compatibility was smoke-tested but not revalidated against a live Debian host during the final gate.

## Warnings

- Source `release.json` remains build 146 while the public website metadata intentionally advertises build 145 because build 146 is not published.
- The local Windows build 146 artifact was inspected statically and through package structure checks, not executed on Windows.
- CurseForge coverage remains smoke/mocked; production API-key and live provider behavior were not validated.
- Stable release should wait until website production deployment is confirmed after source changes.

## Real-Machine Tests Completed

None in this final gate. The final gate used repository smoke tests, local package inspection, live website route probes, and GitHub release metadata checks.

## Tests Not Completed

- Fresh Windows installation.
- Existing Windows upgrade.
- Local Agent service lifecycle on Windows.
- Service recovery after reboot.
- SmartScreen and unsigned installer guidance.
- Antivirus quarantine behavior.
- Real dependency installs.
- Real Minecraft or supported game server install on `This PC`.
- Instance lifecycle against a real Windows service-managed Agent.
- Files and backups against real Windows user folders.
- Public Access provider sign-in and tunnel connectivity.
- Windows Firewall managed-rule creation.
- Real remote Debian Agent regression.
- Production deployment verification after the build 145 metadata correction.

## Commands That Passed

- `node scripts/versioning-smoke.js`
- `node scripts/packaging-artifact-smoke.js --platform=win`
- `npm run website:smoke`
- `node scripts/local-agent-runtime-smoke.js`
- `node scripts/local-agent-discovery-smoke.js`
- `node scripts/local-agent-installer-smoke.js`
- `node scripts/local-agent-pairing-smoke.js`
- `node scripts/agent-control-smoke.js`
- `node scripts/onboarding-smoke.js`
- `node scripts/dependency-smoke.js`
- `node scripts/node-switch-smoke.js`
- `node scripts/files-pipeline-smoke.js`
- `node scripts/security-backup-smoke.js`
- `node scripts/public-access-smoke.js`
- `node scripts/marketplace-smoke.js`

## Command That Confirmed A Blocker

- `curl -sSfL https://api.github.com/repos/bungopam-byte/AnxOS-Control-Center-Releases/releases/tags/v1.7-build146`

Result: GitHub returned `404`; build 146 is not published.
