# Private Alpha Final Release Report

Date: 2026-07-14

## Release Version

- Application: AnxOS Control Center
- Public version: 1.7
- Build: 143
- Channel: Private Alpha
- Tag planned: `v1.7-build143`
- Artifact source commit: `0aac5d0`
- Branch: `dev`
- Release repository: `bungopam-byte/AnxOS-Control-Center-Releases`

## Passed Checks

- Windows package generation completed.
- Linux package generation completed.
- `release-build.json` metadata was embedded in packaged Windows and Linux `app.asar` archives.
- Windows and Linux packaged archives embed commit `0aac5d0`.
- Package artifact smoke passed.
- Website production and download smoke passed.
- Versioning smoke passed.
- Account, Owner Workspace, Security Center, and device activation smoke passed.
- Agent validation passed.
- Marketplace smoke passed.
- Dependency smoke passed through Agent validation.
- Docker, Files, Agent filesystem-root, Public Access, onboarding, renderer safety, and UI polish smoke passed.
- Final generated artifacts include updater metadata and checksum data.
- Release-only repository API is public and accessible.

## Failed Checks

No automated release-gate command failed after fixes.

## Skipped Checks

- Windows installer install/uninstall on Windows 11.
- Windows portable graphical launch on Windows 11.
- Linux AppImage graphical launch in a desktop session.
- Linux `.deb` installation and graphical launch on Debian/Ubuntu.
- Website detection of build 143 from production GitHub Releases, because the release has not been published yet.
- Electron updater discovery of build 143 from GitHub Releases, because the release has not been published yet.

## Windows Artifacts

| File | Size | SHA-256 |
|---|---:|---|
| `AnxOS-Control-Center-Setup-1.7-build143.exe` | 118,646,892 bytes | `a5d1bbde489678e3084e43bc90c7f02ecad12c5585018796bcb4b8e4cd230c02` |
| `AnxOS-Control-Center-Setup-1.7-build143.exe.blockmap` | 125,613 bytes | `3e22a4d42a975207076c7324fce1397917460be8a3630d79b344647fdbb649ee` |
| `AnxOS-Control-Center-1.7-build143-portable.exe` | 118,105,571 bytes | `817bdd5a8bd3d74665233577a5a76dd0e4c0dbc3e655438424eee3be00eb6404` |

## Linux Artifacts

| File | Size | SHA-256 |
|---|---:|---|
| `AnxOS-Control-Center-1.7-build143.AppImage` | 149,255,131 bytes | `aaa10da0a26f5cdae40e80127644fd304453d812e5c255746404f21f3dcfbf94` |
| `AnxOS-Control-Center-1.7-build143.deb` | 117,244,656 bytes | `a0c0bd15e29ddfbfd6334993aad889bc6a44f3136069817a1976d2523f2d250e` |

## Metadata Artifacts

| File | Size | SHA-256 |
|---|---:|---|
| `latest.yml` | 384 bytes | `eb31f70e521ec8827fa39db8446efae7e24457144ad274221162b7622c7da984` |
| `latest-linux.yml` | 575 bytes | `c4e1c8a24105139b5a8a62f0d22563c0981c98b6212e44a17d7c05a142721c97` |
| `update-manifest.json` | 1,776 bytes | `f3ce526b3547f1466e3dfdaae3567a7e3c107c599b3ac46aa0fa9aee896f8323` |
| `SHA256SUMS` | 842 bytes | Generated locally in `dist/` |

## Known Limitations

- Packaged GUI launch was not completed in this shell because no X server or `DISPLAY` is available.
- Windows installer behavior and shortcuts still need real Windows 11 validation.
- Linux `.deb` install/uninstall still needs real Debian/Ubuntu validation.
- The release-only repository is public, but it currently has no published releases.
- Website `/download` and updater discovery cannot detect build 143 until the release is published.
- Windows code signing trust and SmartScreen reputation require owner-controlled signing/reputation handling.

## Manual Validation Still Required

Windows:

1. Install `AnxOS-Control-Center-Setup-1.7-build143.exe`.
2. Confirm Start Menu and desktop shortcuts.
3. Launch the app.
4. Walk Dashboard, Marketplace, Instances, Files, Docker, Public Access, Backups, Settings, Security Center, Agent Control, Owner Workspace, and Diagnostics.
5. Uninstall and confirm user-created server data is not silently deleted.

Linux:

1. Install `AnxOS-Control-Center-1.7-build143.deb`.
2. Confirm desktop entry and icon.
3. Launch from the application menu.
4. Run the AppImage with executable permission.
5. Confirm writable config and Agent connectivity.

Release repository:

1. Confirm `ANXOS_RELEASE_REPO_TOKEN` is configured in the private source repository.
2. Publish only the listed release artifacts and metadata to `bungopam-byte/AnxOS-Control-Center-Releases`.
3. Mark the GitHub Release as a prerelease.
4. Verify the unauthenticated GitHub Releases API returns the release.
5. Verify all assets download.

## Release Repository Status

- Repository exists: yes.
- Public API accessible: yes.
- Private: no.
- Published releases at validation time: none.
- Source code should not be uploaded to this repository.

## Website Download Readiness

- Website download code is configured for `bungopam-byte/AnxOS-Control-Center-Releases`.
- Stable redirect endpoints are configured.
- Browser release discovery is restricted to expected GitHub Release asset URLs.
- Current production download availability for build 143: pending release publication.

## Auto-Updater Readiness

- Desktop updater defaults to the public release-only repository.
- Production builds reject local/non-HTTPS update metadata overrides.
- Generated metadata exists:
  - `latest.yml`
  - `latest-linux.yml`
  - `update-manifest.json`
- Live updater discovery for build 143 is pending release publication.

## Final Release Recommendation

CONDITIONALLY READY FOR PRIVATE ALPHA

The source branch, generated artifacts, metadata, and automated smoke suite are in a good state for owner-supervised private-alpha installation testing. Do not publish broadly or call this fully ready until Windows and Linux packaged GUI installs have been validated on real machines and the public release repository publication is verified.

