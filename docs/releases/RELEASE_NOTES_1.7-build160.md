# AnxOS Control Center Version 1.7 Build 160

## Who it is for

Private Alpha administrators updating from Build 159 to a maintenance release focused exclusively on updater reliability.

## New installations

Install the signed Windows x64 installer or a provided Debian x64 package, then complete the guided first-run setup.

## Updater reliability

Build 160 fixes compatibility with GitHub prerelease SHA-256 digest metadata. The updater now accepts GitHub API `sha256:<digest>` values while continuing to normalize accepted SHA-256 digests to lowercase.

When required checksum metadata is unavailable, the updater now fails before starting the download. Existing post-download SHA-256 verification and install-time SHA-256 re-verification remain unchanged.

## Upgrade guidance

Existing Build 159 installations can use the updater metadata or download the signed installer from the release page. The updater preserves SHA-256 enforcement before installer handoff.

## Platform support

Windows x64 installer and portable packages are Authenticode signed. Debian x64 packages are provided for Linux. macOS is not a supported release target.

## Repair guidance

If an update cannot proceed, use the release page to download the signed installer and verify the installer signature before installation.

## Existing remote Agent users

Existing nodes and pairings should remain available after the maintenance update. Verify the selected node after installation.

## Windows-only limitation

Windows packaging and Authenticode signing are provided for x64 systems.

## macOS Local Agent support is not documented or claimed

macOS is not a supported release target.

## real-machine Windows installation

Validate the installer signature before installation and keep the Agent paired during upgrade.
