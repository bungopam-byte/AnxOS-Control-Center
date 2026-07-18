# Local Agent Security

The Local Agent runs on the user's own computer and accepts authenticated requests from AnxOS Control Center. It should only perform actions requested through AnxOS and only within the configured capability and filesystem boundaries.

## Authentication and Pairing

- Local pairing generates credentials automatically.
- Full tokens must never appear in UI, logs, diagnostics, website files, release assets, crash reports, or screenshots.
- Token fingerprints may appear only for diagnostics.
- Automatic pairing is local-machine only.
- Remote Agent pairing stays explicit and authenticated.
- Re-pairing and credential rotation are supported without manual token copying.

## Filesystem Boundaries

The Agent normalizes paths for the host platform and rejects traversal. Local file browsing is limited to allowed roots unless advanced access is explicitly enabled. System directories require clear warnings and should not be accidentally writable by normal users.

## Diagnostics and Logs

Diagnostics must use shared redaction. Exported bundles must not include full tokens, API keys, private environment variables, or unredacted credentials. Advanced raw details belong behind expandable sections.

## Website and Release Safety

The website must use the public release-only repository for downloadable assets. Browser code must not contain GitHub tokens, CurseForge credentials, Supabase service secrets, localhost-only release URLs, or private development paths.

Release packages must exclude `.env`, runtime identity files, local config, owner account files, logs, repository metadata, and unnecessary source maps.

## Public Access Warning

Installing game servers and enabling Public Access can expose ports or download third-party software depending on user choices. Playit, Tailscale, Cloudflare Tunnel, and router port forwarding remain optional and should be described honestly.

## Uninstall

Stopping or removing the service must not delete user instances or backups unless explicitly selected by the user.
