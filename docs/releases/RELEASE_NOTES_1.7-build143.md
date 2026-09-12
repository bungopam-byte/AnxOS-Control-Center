# AnxOS Control Center 1.7-build143 - Private Alpha

Release channel: Private Alpha

This is private-alpha software for trusted testers. Keep backups, avoid irreplaceable production data, and report unexpected behavior with diagnostics when possible. Features and configuration formats may change before public alpha or beta.

## Highlights

- Dashboard and system monitoring for local and remote systems.
- First-launch welcome flow, guided setup, contextual help, and beginner-friendly empty states.
- Multi-node Agent management with local desktop identity, local Agent state, and remote Agent support.
- Node Health, Node Details navigation, readiness summaries, and Diagnostics improvements.
- Marketplace server installation with Minecraft, game-server, SteamCMD, archive, Modrinth, and CurseForge flows.
- Palworld SteamCMD install handling, structured installer errors, runtime process reconciliation, and port validation.
- FiveM setup-required lifecycle so missing license keys no longer block instance creation.
- In-app dependency management for supported node requirements.
- Instance management for start, stop, restart, delete, files, console, backups, and operations.
- Docker workspace endpoint compatibility and smoke coverage.
- Files workspace profile isolation for Windows local paths and Linux Agent paths.
- SSH and Console tooling for connected systems.
- Public Access foundation and provider workflows for Playit, Tailscale, and Cloudflare Tunnel, with AnxOS Relay reserved for a future build.
- Backup system and Operations history.
- Security Center, Owner authentication, Owner Workspace, and owner-gated Settings.
- Website authentication, device login, profile/account pages, password recovery, and production download page.
- Auto-updater metadata targeting the public release-only repository.
- Windows and Linux packaging artifacts for private-alpha validation.

## Packaging

Generated artifacts for validation:

- `AnxOS-Control-Center-Setup-1.7-build143.exe`
- `AnxOS-Control-Center-1.7-build143-portable.exe`
- `AnxOS-Control-Center-1.7-build143.AppImage`
- `AnxOS-Control-Center-1.7-build143.deb`

Linux packaging now normalizes readable resource permissions so installed desktop entries, icons, `app.asar`, and unpacked resources are usable by normal users.

## Important Fixes

- Fixed Files page onboarding introduction overlap.
- Fixed Files mixed-target rendering where a Windows path could remain visible while Linux Agent rows were loaded.
- Hardened production account/device-login URLs so packaged builds reject localhost account URLs.
- Hardened updater metadata overrides so packaged builds ignore local or non-HTTPS update metadata sources.
- Added packaged metadata with build date, Git commit, release channel, supported OSes, and public release repository.
- Added packaged artifact reports and smoke validation for Windows and Linux outputs.

## Validation Summary

Passed automated and static validation includes:

- Package artifact smoke.
- Packaged asar content verification.
- Account, Owner Workspace, Settings permissions, and local-owner smoke tests.
- Agent Control, Diagnostics, Node switching, and Node Health smoke tests.
- Marketplace and dependency smoke tests.
- Docker, Files, Agent filesystem-root, instance runtime, instance records, and deletion smoke tests.
- Public Access, onboarding, UI polish, renderer safety, website, security page, device activation, maintenance, global search, command palette, notification, and Windows runtime smoke tests.

## Known Limitations

- Windows installer install/uninstall, Start Menu shortcut, and portable graphical launch still require real Windows 11 validation.
- Linux AppImage and `.deb` graphical launch still require validation on a desktop-capable Debian or Ubuntu machine.
- The current shell used for packaging has no X server or `DISPLAY`, so packaged GUI launch could not be completed there.
- Public Access provider reachability should be tested from an external network before relying on it.
- Marketplace installs depend on external services, network reliability, disk space, runtime dependencies, and selected node permissions.
- SteamCMD installs can be large and slow.
- Account and device-login flows require the live account backend to be available.
- This release is not public beta or stable software.

## Tester Guidance

Start with `PRIVATE_ALPHA_INSTALL_GUIDE.md`, then use Diagnostics to export a redacted bundle when reporting bugs. Do not share Agent tokens, pairing codes, passwords, provider credentials, private keys, Supabase tokens, or unredacted configuration files.

