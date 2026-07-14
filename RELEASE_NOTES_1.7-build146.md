# AnxOS Version 1.7 Build 146 Private Alpha

This private-alpha update prepares AnxOS Control Center for the Local Windows Agent release path. It is for users who want to run servers from their own Windows PC while preserving the existing remote Debian and Windows Agent workflows.

This does not publish a stable production release and does not claim completed real-machine Windows validation.

## Changed

- New installations are guided toward the Windows installer, onboarding, Use This PC, Local Agent installation, secure local pairing, dependency scanning, and Marketplace setup.
- Packaged Windows builds declare the bundled Local Agent runtime contract in updater metadata.
- Release uploads now require the NSIS installer, portable executable, blockmap, updater metadata, and SHA-256 checksum artifacts.
- Release artifact validation checks update manifests, checksums, rollback metadata, Local Agent runtime metadata, and secret/path redaction before upload.
- Website docs now cover Local Agent setup, Windows service behavior, automatic pairing, dependency scanning, installation help, system requirements, security and privacy, and FAQ entries.
- Existing remote Agent users do not need to change their Debian or remote Windows Agent setup for this metadata update.
- Stable and development channels remain separated by publishing private-alpha builds as prereleases.

## Known limitations

- Windows Local Agent support is the focus of this release path. macOS Local Agent support is not documented or claimed.
- Linux desktop packages remain available, but the beginner Local Agent flow is written for Windows.
- Real-machine Windows installation, service startup after reboot, Marketplace installs, backups, and Public Access still need final readiness-gate evidence before a stable production release.
- Production release tagging should wait until the final readiness gate passes.

## Upgrade guidance

- New Windows users should use the Windows installer from the website, choose Use This PC, and let onboarding install and pair the Local Agent.
- Existing remote Agent users can keep using their configured remote nodes and add This PC later.
- Existing private-alpha users should verify the website version, installer filename, checksums, and release notes before replacing an installed build.

## Repair guidance

- If the Local Agent is offline, use Agent diagnostics to start or repair the service.
- If pairing fails, use Repair Pairing instead of copying tokens manually.
- If dependencies are missing or unavailable, re-run the dependency scan after installation or restart.
- If a Local Agent update fails, preserve instances and backups, then use repair or rollback instructions from diagnostics.
