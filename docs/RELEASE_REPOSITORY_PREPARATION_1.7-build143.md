# Release Repository Preparation - AnxOS Control Center 1.7-build143

Date: 2026-07-14

Release-only repository:

- Repository: `bungopam-byte/AnxOS-Control-Center-Releases`
- API URL: `https://api.github.com/repos/bungopam-byte/AnxOS-Control-Center-Releases`
- Visibility: public
- Private: false
- Default branch: `main`
- Current published releases returned by unauthenticated API: none

The release-only repository is the correct public source for website downloads and updater metadata. The private source repository should not be published there.

## Website Download Source

The website download implementation uses:

- `window.ANXOS_DOWNLOAD_CONFIG.releaseRepository.owner`: `bungopam-byte`
- `window.ANXOS_DOWNLOAD_CONFIG.releaseRepository.repo`: `AnxOS-Control-Center-Releases`
- GitHub API: `https://api.github.com/repos/bungopam-byte/AnxOS-Control-Center-Releases/releases?per_page=20`
- Stable redirect endpoints:
  - `/api/download/latest/windows`
  - `/api/download/latest/windows-portable`
  - `/api/download/latest/linux-appimage`
  - `/api/download/latest/linux-deb`

The browser release parser accepts only expected GitHub release asset URLs from the configured public release repository.

## Expected Release Assets

For tag `v1.7-build143`, the release should contain only public artifacts and metadata:

- `AnxOS-Control-Center-Setup-1.7-build143.exe`
- `AnxOS-Control-Center-Setup-1.7-build143.exe.blockmap`
- `AnxOS-Control-Center-1.7-build143-portable.exe`
- `AnxOS-Control-Center-1.7-build143.AppImage`
- `AnxOS-Control-Center-1.7-build143.deb`
- `latest.yml`
- `latest-linux.yml`
- `update-manifest.json`
- `SHA256SUMS`

Do not upload source code, `.env` files, private configuration, Agent tokens, Supabase secrets, Owner passwords, local device identity, node registry files, or test fixtures.

## Workflow Alignment

The tagged release workflow now:

- Builds Windows and Linux packages with `--no-increment-build`, preserving committed release metadata.
- Uploads Windows installer, portable executable, NSIS blockmap, and `latest.yml`.
- Uploads Linux AppImage, `.deb`, and `latest-linux.yml`.
- Generates `update-manifest.json` from the downloaded public artifacts.
- Generates `SHA256SUMS` for all release artifacts and metadata files.
- Publishes to `bungopam-byte/AnxOS-Control-Center-Releases` using only the `ANXOS_RELEASE_REPO_TOKEN` GitHub Actions secret.
- Marks the GitHub Release as a prerelease.
- Uses `RELEASE_NOTES_1.7-build143.md` when publishing tag `v1.7-build143`.

## Manual Owner Action Required

No release has been published yet. Before Phase 11 release execution, the repository owner must confirm:

1. `ANXOS_RELEASE_REPO_TOKEN` exists in the private source repository Actions secrets.
2. The token has minimum permissions to create or update releases in `bungopam-byte/AnxOS-Control-Center-Releases`.
3. Final Windows and Linux artifacts are regenerated from the final release commit.
4. The release is published as a prerelease, not a stable release.

