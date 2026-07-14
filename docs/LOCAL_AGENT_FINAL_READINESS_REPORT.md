# Local Agent Final Readiness Report

Date: 2026-07-14
Branch: `dev`
Commit evaluated: `c944c8d`

Additional production-artifact gate rerun: 2026-07-14 against `origin/dev` at `3ec595e`.

## Release Recommendation

Do not tag or publish a stable production release.

The Local Agent implementation and website/release source work have broad smoke-test coverage, but the final readiness gate is blocked by missing build 146 release assets and missing real Windows machine validation.

The exact production website download links currently resolve to build 145 artifacts. Those are not the Local Agent build 146 release candidate and their published `update-manifest.json` does not include the build 146 Local Agent runtime metadata contract.

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
- Production website download endpoints resolve to `v1.7-build145`, not build 146.
- Published build 145 `update-manifest.json` lacks the build 146 Local Agent runtime metadata.
- Full unfiltered packaging smoke was not passed for build 146 because matching local Linux build 146 AppImage and deb artifacts were not rebuilt in this pass.
- Production site deployment of the source correction from build 146 website metadata to build 145 was not confirmed after the commit.

## Blockers

- Build 146 Windows and Linux release assets are not published in `AnxOS-Control-Center-Releases`.
- Exact production Windows artifacts are build 145 and cannot be used to validate the build 146 Local Agent release.
- No real clean Windows environment is available from this Debian host. Wine is installed but was not used as a substitute for the required clean Windows validation.
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
- The production build 145 update manifest is internally consistent for build 145 but does not prove Local Agent release readiness.
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
- Production route probes for `/`, `www`, `/download`, `/release-notes`, `/windows-installation`, `/faq`, and `/system-requirements`
- Production stable download redirect probes for Windows setup, Windows portable, Linux AppImage, and Linux deb
- Published build 145 manifest/checksum fetches for `SHA256SUMS`, `latest.yml`, `latest-linux.yml`, and `update-manifest.json`

## Command That Confirmed A Blocker

- `curl -sSfL https://api.github.com/repos/bungopam-byte/AnxOS-Control-Center-Releases/releases/tags/v1.7-build146`

Result: GitHub returned `404`; build 146 is not published.

## Production Artifact Gate Result

Production website routes are reachable and download endpoints redirect to real build 145 files:

- `AnxOS-Control-Center-Setup-1.7-build145.exe`
- `AnxOS-Control-Center-1.7-build145-portable.exe`
- `AnxOS-Control-Center-1.7-build145.AppImage`
- `AnxOS-Control-Center-1.7-build145.deb`

This is not sufficient for the Local Agent release gate because build 145 is not the requested build 146 Local Agent release candidate.
