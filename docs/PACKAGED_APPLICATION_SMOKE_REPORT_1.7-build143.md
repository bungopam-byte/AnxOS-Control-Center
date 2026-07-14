# Packaged Application Smoke Report - AnxOS Control Center 1.7-build143

Generated on: 2026-07-14

Artifacts under test:

- `dist/AnxOS-Control-Center-Setup-1.7-build143.exe`
- `dist/AnxOS-Control-Center-1.7-build143-portable.exe`
- `dist/AnxOS-Control-Center-1.7-build143.AppImage`
- `dist/AnxOS-Control-Center-1.7-build143.deb`

Packaged content checks:

- `npm run packaging:smoke`: passed.
- Windows and Linux `app.asar` archives contain:
  - `main.js`
  - `preload.js`
  - renderer files
  - release metadata
  - Agent source
  - public account configuration
- Runtime/user configuration files are absent from packaged archives.
- Both packaged archives include the Files page layout and target-state fixes from `b620271`.

Headless launch result:

- `dist/linux-unpacked/anxos-control-center --version` reached Electron platform initialization but exited because this shell has no X server or `DISPLAY`.
- `xvfb-run` is not installed in this environment.
- Real graphical Linux launch remains pending on a desktop-capable Debian/Ubuntu machine.
- Real Windows installer and portable launch remain pending on Windows 11.

Smoke suites run:

| Command | Result |
|---|---|
| `npm run packaging:smoke` | Passed |
| packaged Files regression assertion against Windows and Linux `app.asar` | Passed |
| `npm run account:smoke` | Passed |
| `npm run owner:smoke` | Passed |
| `npm run settings:permissions:smoke` | Passed |
| `npm run agent-control:smoke` | Passed |
| `npm run diagnostics:smoke` | Passed |
| `npm run node:switch:smoke` | Passed |
| `npm run node-health:smoke` | Passed |
| `npm run marketplace:smoke` | Passed |
| `npm run dependencies:smoke` | Passed |
| `npm run docker:smoke` | Passed |
| `npm run files:smoke` | Passed |
| `npm run agent:files-root:smoke` | Passed |
| `npm run instances:runtime:smoke` | Passed |
| `npm run agent:instances:smoke` | Passed |
| `npm run instances:deletion:smoke` | Passed |
| `npm run public-access:smoke` | Passed |
| `npm run onboarding:smoke` | Passed |
| `npm run ui:polish:smoke` | Passed |
| `npm run renderer-safety:smoke` | Passed |
| `npm run website:smoke` | Passed |
| `npm run security:page:smoke` | Passed |
| `npm run device-activation:smoke` | Passed |
| `npm run maintenance:smoke` | Passed |
| `npm run global-search:smoke` | Passed |
| `npm run command-palette:smoke` | Passed |
| `npm run notifications:smoke` | Passed |
| `npm run settings:preferences:smoke` | Passed |
| `npm run local-owner-auth:smoke` | Passed |
| `npm run windows-runtime:smoke` | Passed |

Not completed in this environment:

- Windows installer install/uninstall validation.
- Windows portable graphical launch validation.
- Linux AppImage graphical launch validation.
- Linux `.deb` install/uninstall validation.
- Real packaged UI navigation across every sidebar page.

Release-blocking issues found:

- None in static packaged content or smoke suites.
- Real-machine packaged launch and installer behavior still require validation.

