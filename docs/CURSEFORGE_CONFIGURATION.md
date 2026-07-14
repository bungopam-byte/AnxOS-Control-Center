# CurseForge Configuration

CurseForge access must be configured in trusted code. Do not put the private CurseForge API key in renderer JavaScript, frontend bundles, public config, screenshots, logs, diagnostics, or tester instructions.

## Resolution Precedence

1. Hosted/proxy configuration:
   - `ANXOS_CURSEFORGE_PROXY_URL`
   - `ANXHUB_CURSEFORGE_PROXY_URL`
   - `CURSEFORGE_PROXY_URL`
2. Agent-held configuration:
   - Agent environment: `CURSEFORGE_API_KEY`, `CF_API_KEY`, or `ANXHUB_CURSEFORGE_API_KEY`
   - Agent key file: `CURSEFORGE_API_KEY_FILE`, `CF_API_KEY_FILE`, or `ANXHUB_CURSEFORGE_API_KEY_FILE`
3. Owner-only local development/private-alpha configuration:
   - Desktop user-data marketplace config
   - Local development `.env`
   - Local development key file
4. Unavailable.

Ordinary testers must not be asked to create or paste their own CurseForge developer API key.

## Packaged Private Alpha

For packaged builds, prefer one of these options:

- Configure a hosted AnxOS CurseForge proxy and set `ANXOS_CURSEFORGE_PROXY_URL` before launching the packaged app.
- Configure the AnxOS Agent with the CurseForge key in its protected runtime environment, then set the desktop backend mode to Agent.

The Agent exposes authenticated desktop-only routes under:

- `GET /api/v1/marketplace/curseforge/status`
- `GET /api/v1/marketplace/curseforge/api`
- `GET /api/v1/marketplace/curseforge/download`

Those routes return CurseForge data or file bytes, never the raw API key.

## Local Development

For local development only, the desktop still supports ignored local secret sources so the owner can test without a hosted proxy:

- `.env`
- `agent/.env`
- `config/marketplace.json`
- key-file environment variables

This compatibility path is temporary private-alpha support. It must remain owner-only, masked in UI/diagnostics, and excluded from release artifacts.

## Secret Handling

Diagnostics may report only:

- whether configuration exists
- source category
- non-reversible fingerprint
- proxy/Agent reachability
- request class that failed

Diagnostics must never include the API key, signed URLs, authorization headers, or full secret-bearing response data.

