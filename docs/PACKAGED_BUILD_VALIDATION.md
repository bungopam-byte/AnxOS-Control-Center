# Packaged Build Validation

## Phase 13A - Package Verification

Date: 2026-07-13

Source state:

- Branch: `dev`
- Release metadata: Version `1.7`, build `142`, channel `Private Alpha`
- Package metadata: `package.json` version `1.0.48`
- Build mode: local packaging validation only; no version bump, tag, release, or artifact publish

Generated artifacts:

- `dist/AnxOS-Control-Center-Setup-1.7-build142.exe`
- `dist/AnxOS-Control-Center-1.7-build142-portable.exe`
- `dist/AnxOS-Control-Center-1.7-build142.AppImage`
- `dist/AnxOS-Control-Center-1.7-build142.deb`

Verification performed:

- Windows NSIS installer build succeeded.
- Windows portable build succeeded.
- Linux AppImage build succeeded.
- Linux `.deb` build succeeded.
- Artifact names use the centralized release artifact version `1.7-build142`.
- Unpacked Windows executable exists at `dist/win-unpacked/AnxOS Control Center.exe`.
- Unpacked Linux executable exists at `dist/linux-unpacked/anxos-control-center`.
- `app.asar` exists for Windows and Linux unpacked builds.
- `app.asar.unpacked` exists for Windows and Linux native/unpacked dependencies.
- Required app entry points are present in both `app.asar` archives:
  - `main.js`
  - `preload.js`
  - `app.js`
  - `index.html`
  - `release.json`
- Required branding assets are present in both `app.asar` archives:
  - `assets/icon.ico`
  - `assets/icons/png/512x512.png`
- Required tracked configuration templates are present:
  - `config/agent.example.json`
  - `config/marketplace-templates.json`
  - `config/ssh-profiles.json`
- Required Agent source entry points are present:
  - `agent/package.json`
  - `agent/src/server.js`
- Linux `.deb` metadata was inspected with `dpkg-deb -I`.
- Linux `.deb` contents include the desktop entry, icon set, app resources, and executable path.

Packaged-only issue found and fixed:

- The previous package allowlist used broad `config/**/*` and `agent/**/*` globs.
- Those globs allowed ignored or untracked local runtime state to enter `app.asar`, including generated Agent/runtime config, `.env`, and log paths when present in the workspace.
- The package allowlist now includes only tracked templates and Agent source required by the packaged app.
- `npm run packaging:smoke` prevents these local runtime files from returning to packaged artifacts.
- A stale generated `dist/linux-unpacked/resources/app.asar` file was still tracked from older release commits.
- That generated binary is now removed from source control; fresh package output remains ignored under `dist/`.

Forbidden runtime files verified absent from both Windows and Linux `app.asar` archives:

- `agent/.env`
- `agent/agent.log`
- `agent/config/device-identity.json`
- `config/agent.json`
- `config/application-host.json`
- `config/device-identity.json`
- `config/marketplace.json`
- `config/nodes.json`
- `config/owner-accounts.json`

Notes:

- Generated package artifacts remain ignored under `dist/` and are not committed.
- Windows installer execution and Start Menu/uninstall validation are Phase 13B tasks and require a Windows environment.
- Linux AppImage and `.deb` runtime launch/install validation are Phase 13C tasks.
