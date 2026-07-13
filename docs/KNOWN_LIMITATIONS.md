# Known Limitations

These limitations are acceptable for Private Alpha if they are clearly communicated to testers. They should not be hidden or treated as successful behavior.

## Release Channel

- AnxOS Control Center is Private Alpha.
- Do not present it as public beta, stable, or v1.0-ready.
- No version bump, tag, or GitHub Release should be created for readiness-only documentation changes.

## Desktop

- Development mode via `npm start` is the primary validation path.
- Packaged builds may require separate signing and installer validation.
- Some Windows service registration actions require Administrator elevation and should be blocked or explained when not elevated.

## Agent

- Desktop and Agent code must stay compatible.
- New desktop features may require updating and restarting the Agent.
- Linux package availability depends on distribution repositories and host permissions.
- Do not run the Agent as root just to bypass file, Docker, or provider permissions.

## Marketplace

- Marketplace installs depend on external networks, provider APIs, disk space, and runtime dependencies.
- SteamCMD installs can be large and slow.
- Some templates may be smoke-tested but not fully live-validated on every supported node type.
- A failed install may leave partial files for diagnostics and retry; do not assume partial data is safe to delete manually without reviewing it.

## Files

- Agent filesystem access is restricted to the configured authorized root.
- Paths outside the authorized root are intentionally rejected.
- Local Windows paths and Linux Agent paths are isolated per profile.
- If Agent filesystem configuration changes, restart the Agent when required.

## Docker

- Docker features require Docker or compatible tooling on the selected node.
- The UI must not fake empty Docker data when Docker is missing or the daemon is unavailable.
- Docker cleanup actions are destructive and should be previewed before execution.

## Public Access

- Provider capabilities vary.
- Playit tunnel metadata may require socket permissions in addition to service detection.
- Unsupported provider actions must remain disabled with a reason.
- Public reachability should be verified from outside the local network before claiming external access works.

## Account and Security

- Owner-only operations require owner access.
- Account services depend on the configured online backend.
- Password reset, device login, and profile flows require live backend validation before broad tester rollout.
- Logs, diagnostics, screenshots, and bug reports must remain redacted.

## Diagnostics and Operations

- Historical failed operations are useful context but should not automatically imply current node failure.
- Some diagnostics are intentionally technical.
- Unknown, Not Tested, Unavailable, Warning, and Degraded have different meanings and should not be collapsed into one status.

## Website Downloads

- The website download page uses a public release-only GitHub repository for release assets.
- If no published release asset exists, the page should show unavailable download metadata.
- Do not expose private source repository links or GitHub tokens in browser code.
