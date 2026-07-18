# Packaging Readiness Audit

Date: 2026-07-14

Branch: `dev`

## Release State

- Product name: `AnxOS Control Center`
- Electron package name: `anxos-control-center`
- Electron app ID: `com.anxos.controlcenter`
- Internal package version: `1.0.48`
- Public release metadata: `1.7-build142`
- Release channel: `Private Alpha`
- Official website: `https://anxoscontrolcenter.org`
- Source repository: `bungopam-byte/AnxOS-Control-Center`
- Public release repository: `bungopam-byte/AnxOS-Control-Center-Releases`

## Packaging Configuration

- Electron entry point is `main.js`.
- Preload bridge is `preload.js`.
- Windows targets are NSIS installer and portable x64 executable.
- Linux targets are x64 AppImage and Debian package.
- Artifact names use centralized release metadata through `ANXOS_RELEASE_ARTIFACT_VERSION`.
- Windows and Linux icons are configured from `assets/icon.ico` and `assets/icons/png`.
- The app package includes source required at runtime, Agent source, website design assets used by the app, marketplace templates, SSH profiles, and required `node_modules`.
- Runtime local configuration files are intentionally excluded from package validation.

## Release Repository and Website

- Website download configuration points to `bungopam-byte/AnxOS-Control-Center-Releases`.
- Cloudflare Pages download redirect helpers use the same public release repository by default.
- Release workflow publishes artifacts to the public release repository using `ANXOS_RELEASE_REPO_TOKEN`.
- The source repository is not intended to host public binaries.

## Security and Production Readiness

- Development owner fallback is guarded by trusted unpackaged development mode.
- Packaged production builds should not enable DevTools automatically unless explicit development flags are present.
- Diagnostics and security smoke coverage include redaction checks.
- Agent tokens and local runtime config are not expected to be bundled.
- Existing packaging smoke checks inspect `app.asar` for forbidden runtime config files.

## Release-Blocking Issue Fixed

The desktop updater still defaulted to the private source repository and included a hardcoded local-network update manifest fallback. This was not production-safe because public testers and the website release flow depend on `bungopam-byte/AnxOS-Control-Center-Releases`.

Fix:

- `src/services/updateManager.js` now defaults to `bungopam-byte/AnxOS-Control-Center-Releases`.
- The hardcoded `http://192.168.1.134:8766/update-manifest.json` fallback was removed.
- `ANXOS_UPDATE_REPOSITORY`, `ANXOS_UPDATE_MANIFEST_URL`, and legacy `ANXHUB_UPDATE_MANIFEST_URL` remain available for explicit development/testing overrides.
- `scripts/versioning-smoke.js` now guards against regressing to the private source repository or a hardcoded LAN updater URL.

## Remaining Phase 1 Notes

- `scripts/run-electron-builder.js` increments `release.json` by default. Release version/build changes are handled in Phase 2.
- Real Windows installer execution cannot be claimed from the current Linux environment.
- Existing local untracked config files remain untouched and are not release artifacts.
- Code signing secrets were not present or inspected locally; Windows signing remains a release-owner concern unless GitHub Actions secrets are configured.
