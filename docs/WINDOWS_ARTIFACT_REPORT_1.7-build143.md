# Windows Artifact Report - AnxOS Control Center 1.7-build143

Generated on: 2026-07-14

Build command:

```bash
npm run dist:win -- --no-increment-build
```

Release metadata:

- Version: 1.7
- Build: 143
- Channel: Private Alpha
- Build commit embedded in artifacts: 6417f7a
- Release repository: bungopam-byte/AnxOS-Control-Center-Releases
- Target architecture: x64

Artifacts:

| File | Type | Size | SHA-256 |
|---|---:|---:|---|
| `AnxOS-Control-Center-Setup-1.7-build143.exe` | Windows NSIS installer | 114 MiB | `19b92c158ee1b2cf4198e94f47fa98d63020b12a1298ce54c723eade5bb71a5a` |
| `AnxOS-Control-Center-1.7-build143-portable.exe` | Windows portable executable | 113 MiB | `9941b201b4bd63a2aa2a530b52107fc5cb3009d52c20b552a0a26df2cd7a8f67` |
| `AnxOS-Control-Center-Setup-1.7-build143.exe.blockmap` | Windows updater block map | 123 KiB | `e286ed27537e1bbb577175f6e6e09e301adbccccaa28768e9a0985206bca9528` |

Packaged-content validation:

- `dist/win-unpacked/resources/app.asar` exists.
- `dist/win-unpacked/resources/app.asar.unpacked` exists.
- Required entries were verified in `app.asar`:
  - `main.js`
  - `preload.js`
  - `app.js`
  - `index.html`
  - `release.json`
  - `release-build.json`
  - icon assets
  - agent source entrypoint
  - public account configuration
- Runtime/user configuration files were verified absent from `app.asar`:
  - Agent `.env`
  - Agent device identity
  - local Agent config
  - application host identity
  - device identity
  - node registry
  - owner accounts

Real-machine validation status:

- Windows installer generation: passed.
- Windows portable generation: passed.
- Windows install, uninstall, shortcut, Start Menu, and launch validation: pending real Windows 11 execution.

