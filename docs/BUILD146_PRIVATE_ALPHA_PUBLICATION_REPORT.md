# Build 146 Private Alpha Publication Report

Date: 2026-07-14

## Release classification

Private Alpha. This release is for invited testers only. It is not stable, production-ready, fully validated, or generally available.

## Version and tag

- Version: `1.7`
- Build: `146`
- Source tag: `v1.7-build146` at `a8a9923`
- Release repository tag: `v1.7-build146` at `650d94a`
- Release URL: `https://github.com/bungopam-byte/AnxOS-Control-Center-Releases/releases/tag/v1.7-build146`

## Commit hashes

- Main repository release approval: `a8a9923`
- Main repository release notes: `a111067`, `3afd9a2`
- Main repository website download update: `cfed376`
- Main repository tester guide update: `cf357e4`
- Release repository metadata commit: `650d94a`

## Published artifacts

- `AnxOS-Control-Center-Setup-1.7-build146.exe`
- `AnxOS-Control-Center-Setup-1.7-build146.exe.blockmap`
- `AnxOS-Control-Center-1.7-build146-portable.exe`
- `AnxOS-Control-Center-1.7-build146.AppImage`
- `AnxOS-Control-Center-1.7-build146.deb`
- `latest.yml`
- `latest-linux.yml`
- `update-manifest.json`
- `SHA256SUMS`

## Website URLs validated

- `https://anxoscontrolcenter.org/`
- `https://www.anxoscontrolcenter.org/`
- `https://anxoscontrolcenter.org/download`
- `https://anxoscontrolcenter.org/release-notes`
- `https://anxoscontrolcenter.org/windows-installation`
- `https://anxoscontrolcenter.org/faq`
- `https://anxoscontrolcenter.org/system-requirements`
- `https://anxoscontrolcenter.org/api/download/latest/windows`
- `https://anxoscontrolcenter.org/api/download/latest/windows-portable`
- `https://anxoscontrolcenter.org/api/download/latest/linux-appimage`
- `https://anxoscontrolcenter.org/api/download/latest/linux-deb`

## Passed static checks

- `node scripts/validate-release-artifacts.js --directory release-artifacts`
- `node scripts/packaging-artifact-smoke.js`
- `npm run website:smoke`
- `node scripts/versioning-smoke.js`
- Production website routes returned successfully.
- Production download endpoints redirect to build 146 artifacts.
- Published `SHA256SUMS` and `update-manifest.json` match the locally validated metadata.
- Update metadata references build 146 and declares the bundled Local Agent runtime contract.
- Static package inspection confirmed `resources/local-agent-runtime` in packaged builds.
- Secret and local-configuration scans found no shipped `.env`, local node registry, device identity, owner account, private path, or credential files in release artifacts.

## Accepted risks

- No additional clean Windows installation test was completed.
- Windows service lifecycle was not validated on a fresh Windows installation.
- Reboot persistence was not validated.
- Automatic pairing was not validated on a clean Windows machine.
- Dependency installation was not fully validated on a clean Windows machine.
- Marketplace, CurseForge, Files, Backups, and Public Access were not fully exercised from the final production artifact on a clean Windows machine.
- Tester-discovered bugs are expected.

## Known limitations

- This release is not approved as stable or generally available.
- The beginner Local Agent flow is Windows-focused.
- macOS Local Agent support is not claimed.
- CurseForge coverage remains smoke/static for this gate.
- Real Windows SmartScreen, antivirus, service recovery, and dependency installer behavior must be reported by invited testers.

## Tester audience

- Invited friends.
- Private testers.
- Users comfortable reporting bugs with screenshots and sanitized diagnostics.
- Users who understand this is not a stable release and should not use it for irreplaceable production data.

## Rollback version

Rollback reference: `v1.7-build145`, the previous published Private Alpha release.

## Final recommendation

`v1.7-build146` has been released as a Private Alpha for invited testing. It is not approved as a stable public release.
