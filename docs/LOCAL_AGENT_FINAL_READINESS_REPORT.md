# Local Agent Final Readiness Report

Date: 2026-07-14
Branch: `dev`
Commit evaluated: `37a0a64`

Additional production-artifact gate rerun: 2026-07-14 against `origin/dev` at `3ec595e`.

## Release Classification

Private Alpha

This milestone is approved for invited Private Alpha testers only with accepted validation risk. It is not stable, production-ready, fully validated, generally available, or recommended for irreplaceable production data.

Feature implementation is complete for this milestone. Static Windows packaging validation passed, website and release-route validation passed, versioning and artifact smoke tests passed, and the Local Agent runtime metadata is prepared for build 146. Additional clean Windows real-machine validation was not completed. Users should expect bugs and report issues.

## Release Recommendation

Approved for invited Private Alpha testers only. Not recommended for stable or public production release.

The Local Agent implementation and website/release source work have broad smoke-test coverage. The missing clean Windows validation is accepted only for this controlled Private Alpha release.

The exact production website download links currently resolve to build 145 artifacts. Publishing build 146 must replace those links with build 146 assets and matching update metadata.

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
- `npm run website:smoke` passed.
- `node scripts/versioning-smoke.js` passed.
- `node scripts/packaging-artifact-smoke.js --platform=win` passed for build 146.
- The rebuilt Windows package contains `resources/local-agent-runtime`.
- Static package inspection confirmed the required build structure.
- Local Agent runtime metadata is prepared for build 146.
- Secret and development-configuration exclusions passed where currently covered.
- Stable website download endpoints redirect to real build 145 release assets.
- Documentation set for architecture, setup, security, troubleshooting, release checklist, website validation, real-machine validation, limitations, and tester guidance is present.

## Failed Checks

- Public release repository lookup for `v1.7-build146` returned `404`.
- Production website download endpoints resolve to `v1.7-build145`, not build 146.
- Published build 145 `update-manifest.json` lacks the build 146 Local Agent runtime metadata.
- Full unfiltered packaging smoke was not passed for build 146 because matching local Linux build 146 AppImage and deb artifacts were not rebuilt in this pass.
- Production site deployment of the source correction from build 146 website metadata to build 145 was not confirmed after the commit.

## Accepted Risks

- No additional clean Windows installation test was completed.
- Windows service lifecycle was not validated on a fresh Windows installation.
- Reboot persistence was not validated.
- Automatic pairing was not validated on a clean Windows machine.
- Dependency installation was not fully validated on a clean Windows machine.
- Marketplace, CurseForge, Files, Backups, and Public Access were not fully exercised from the final production artifact on a clean Windows machine.
- Tester-discovered bugs are expected.
- No real clean Windows environment is available from this Debian host. Wine is installed but was not used as a substitute for the required clean Windows validation.
- Existing remote Debian Agent compatibility was smoke-tested but not revalidated against a live Debian host during the final gate.

## Warnings

- Source `release.json` remains build 146 while the public website metadata intentionally advertises build 145 because build 146 is not published.
- The local Windows build 146 artifact was inspected statically and through package structure checks, not executed on Windows.
- The production build 145 update manifest is internally consistent for build 145 but does not prove Local Agent release readiness.
- CurseForge coverage remains smoke/mocked; production API-key and live provider behavior were not validated.
- Stable release should wait until real Windows validation and broader tester feedback are complete.

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
