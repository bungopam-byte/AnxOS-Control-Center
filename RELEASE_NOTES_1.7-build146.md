# AnxOS Version 1.7 Build 146 Private Alpha

This private-alpha metadata update prepares release artifacts for the Local Agent Windows experience. It does not publish a stable production release.

## Changed

- Added Local Agent support metadata to updater manifests so packaged Windows builds declare the bundled Agent runtime contract.
- Required NSIS installer, portable executable, blockmap, update metadata, and SHA-256 checksum artifacts before release upload.
- Added release artifact validation for update manifests, checksums, rollback metadata, Local Agent runtime metadata, and secret/path redaction.
- Updated website release metadata for Local Agent support, Windows service setup, automatic pairing, dependency scanning, and the Windows installation guide.
- Preserved private-alpha prerelease publishing so stable and development channels remain separate.

## Known limitations

- This release note describes metadata and artifact validation. It does not claim completed real-machine Windows validation.
- Production release tagging should wait until the final readiness gate passes.
