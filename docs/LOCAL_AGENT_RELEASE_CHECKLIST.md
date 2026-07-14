# Local Agent Release Checklist

Do not publish a stable production release until every required gate is complete or explicitly marked blocked.

## Source and Packaging

- Local Agent runtime packaged under `resources/local-agent-runtime`.
- Runtime manifest present.
- Agent source and shared runtime files present.
- Config templates present.
- Development files, `.env`, logs, runtime identity, node registry, owner accounts, and source maps excluded.
- Windows installer, portable executable, blockmap, updater metadata, checksums, and update manifest exist in the release repository.
- Website download metadata points only at release tags with real assets.

## Application

- Fresh Windows install.
- Existing Windows upgrade.
- Local Agent install, repair, update, and uninstall.
- Windows service starts after reboot.
- Automatic local pairing without token copying.
- Credential rotation and repair.
- Dependency scan and supported dependency install.
- Marketplace install for at least one supported server.
- Instance start, stop, restart, console, files, logs, backup, restore, and delete.
- Public Access provider detection and firewall consent.
- Local and remote node switching.
- Existing remote Debian Agent compatibility.
- Owner-only controls hidden from regular users.

## Website

- Root and `www` routes.
- `/download`, release notes, installation guide, FAQ, system requirements, security/privacy.
- Windows installer link, portable link, checksum link, and release manifest.
- Missing asset handling.
- Mobile layout, keyboard navigation, focus states, contrast, and touch targets.
- No secrets, private paths, localhost-only release links, or nonexistent advertised versions.

## Documentation

- Architecture, setup, security, troubleshooting, release checklist, website validation, real-machine validation, known limitations, and tester guide updated.
- Known limitations are honest and current.
- Validation evidence states which tests were real hardware and which were static or smoke tests.

## Release Decision

Stable release is blocked until build assets exist in the release repository and real Windows machine validation passes.
