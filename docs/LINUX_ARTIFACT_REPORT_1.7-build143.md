# Linux Artifact Report - AnxOS Control Center 1.7-build143

Generated on: 2026-07-14

Build command:

```bash
npm run dist:linux -- --no-increment-build
```

Release metadata:

- Version: 1.7
- Build: 143
- Channel: Private Alpha
- Release repository: bungopam-byte/AnxOS-Control-Center-Releases
- Target architecture: x64 / amd64

Artifacts:

| File | Type | Size | SHA-256 |
|---|---:|---:|---|
| `AnxOS-Control-Center-1.7-build143.AppImage` | Linux AppImage | 143 MiB | `0bde1be7c31597efbe7f3feb04f8b2cafd5217d6d2c1075cc596f8f45b5c732c` |
| `AnxOS-Control-Center-1.7-build143.deb` | Debian package | 112 MiB | `f749ad627c64b69c3fa8f0fbc215fe26622052e59cc8b77a546a361c3dd5cdae` |
| `latest-linux.yml` | Linux updater metadata | 575 bytes | `39d0f1321d49fe690d8a951d5d566533d4c579b31f1e6a75f2769b343701f18d` |

Package metadata:

- Debian package name: `anxos-control-center`
- Debian package version: `1.0.48`
- Display name: `AnxOS Control Center`
- Desktop entry: `/usr/share/applications/anxos-control-center.desktop`
- Executable: `/opt/AnxOS Control Center/anxos-control-center`
- Required libraries declared by the package include GTK, NSS, XSS, XTST, AT-SPI, UUID, libsecret, and xdg-utils.

Packaging fix applied during validation:

- The first Linux package build emitted some generated package files with owner-only permissions because the build process inherited a restrictive umask.
- The packaging wrapper now sets umask `022`.
- A Linux `afterPack` hook normalizes packaged output permissions.
- `npm run packaging:smoke` now asserts readable Linux resource and `.deb` permissions.

Permission validation:

- `dist/linux-unpacked/resources/app.asar`: `rw-r--r--`
- `dist/linux-unpacked/resources/app.asar.unpacked`: `drwxr-xr-x`
- `.deb` desktop entry: `rw-r--r--`
- `.deb` app.asar: `rw-r--r--`
- `.deb` unpacked resources: `drwxr-xr-x`

Launch validation:

- AppImage self-help executed successfully with `--appimage-help`.
- A graphical launch from `dist/linux-unpacked/anxos-control-center --version` could not complete in this shell because no X server or `DISPLAY` is available.
- Real Debian desktop launch remains pending on a graphical Linux machine.

