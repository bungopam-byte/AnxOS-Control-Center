# Website and Windows Release Validation

Date: 2026-07-14
Phase: 30, Website and Release Validation

This validation checked the website source, live public routes, release repository metadata, and locally rebuilt Windows artifacts. No production release was published.

## Passed Checks

- `npm run website:smoke`
- `node scripts/validate-release-artifacts.js --fixture`
- `node scripts/packaging-artifact-smoke.js --platform=win`
- `node scripts/versioning-smoke.js`
- Live route probes returned `200` for:
  - `https://anxoscontrolcenter.org/`
  - `https://www.anxoscontrolcenter.org/`
  - `https://anxoscontrolcenter.org/download`
  - `https://anxoscontrolcenter.org/release-notes`
  - `https://anxoscontrolcenter.org/windows-installation`
  - `https://anxoscontrolcenter.org/faq`
  - `https://anxoscontrolcenter.org/system-requirements`
- Stable download endpoints redirect to real build 145 release assets:
  - `/api/download/latest/windows`
  - `/api/download/latest/windows-portable`
  - `/api/download/latest/linux-appimage`
  - `/api/download/latest/linux-deb`
- Release repository tag `v1.7-build145` exists and includes Windows setup, portable executable, blockmap, Linux AppImage, Linux deb, updater metadata, checksums, and update manifest assets.
- The locally rebuilt Windows build 146 package includes:
  - `resources/local-agent-runtime/agent/package.json`
  - `resources/local-agent-runtime/agent/src/server.js`
  - `resources/local-agent-runtime/config/agent.example.json`
  - `resources/local-agent-runtime/config/marketplace-templates.json`
  - `resources/local-agent-runtime/local-agent-runtime.json`
  - shared runtime modules including redaction support
- The rebuilt Windows `app.asar` reports Version `1.7`, Build `146`, Channel `Private Alpha`.
- The Local Agent runtime resource scan found no `.env`, `.git`, source map, runtime identity, node registry, owner account, or agent log files.
- Source scan found no plaintext API keys, Agent tokens, CurseForge keys, Supabase service secrets, private home paths, or localhost-only release links in shipped website/release validation files.

## Fixed During Validation

- `scripts/packaging-artifact-smoke.js` now validates the Local Agent runtime under `resources/local-agent-runtime` instead of requiring Agent files and Agent config templates to remain inside `app.asar`.
- `scripts/versioning-smoke.js` now allows the public website metadata to advertise the latest published release while the application repository contains a newer unreleased build.
- `website/config.js` and `website/release-notes.json` now advertise `v1.7-build145`, the latest release tag that actually exists in `AnxOS-Control-Center-Releases`.
- `RELEASE_NOTES_1.7-build146.md` now keeps the unreleased Local Agent release notes in the source repository without making the website point at a missing build 146 release.

## Failed Or Not Completed

- `https://api.github.com/repos/bungopam-byte/AnxOS-Control-Center-Releases/releases/tags/v1.7-build146` returned `404`; build 146 has not been published to the release repository.
- Before the source fix, live `https://anxoscontrolcenter.org/config.js` advertised build 146 even though that release tag did not exist. The source has been corrected to build 145, but the production site must be redeployed before this is resolved live.
- Matching Linux build 146 artifacts were not rebuilt in this pass; the full unfiltered `node scripts/packaging-artifact-smoke.js` still requires both Windows and Linux artifacts to exist locally.
- Real Windows installer execution, SmartScreen behavior, Windows service registration, reboot recovery, and antivirus behavior were not validated.

## Release Recommendation

Do not publish a stable production release from build 146 yet. The release repository does not contain build 146 assets, and real Windows machine validation remains incomplete.
