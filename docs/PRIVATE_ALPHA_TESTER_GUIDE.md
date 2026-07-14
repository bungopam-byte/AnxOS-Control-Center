# Private Alpha Tester Guide

This guide is for trusted testers validating AnxOS Control Center before any public beta. It assumes a Windows 11 desktop app, the Local Agent path for `This PC`, and, when available, a Debian Agent node such as Anxlab.

Do not share secrets in reports. Never paste Agent tokens, pairing codes, Supabase tokens, passwords, private URLs, config files, or unredacted logs.

## What Private Alpha Means

- The current release channel is Private Alpha.
- The goal is real-machine feedback, not public marketing.
- Features may be incomplete, unavailable, or intentionally limited.
- Report exact behavior and logs; do not assume a failure is user error.
- Do not use AnxOS Control Center as the only copy of important server data.

## Recommended Test Order

1. Start the desktop app.
2. Choose `Use This PC` and install the Local Agent if it is missing.
3. Confirm `This PC` appears as the Local Agent node.
4. Run dependency checks for `This PC`.
5. Install one Marketplace template on `This PC`.
6. Start, stop, restart, back up, and remove the test instance.
7. Open Files and verify local shortcuts and allowed roots.
8. Open Public Access and verify provider status.
9. Connect or select the Debian Agent node if available.
10. Switch between local and remote nodes and confirm actions target the selected node.
11. Open Diagnostics and run a snapshot.
12. Open Operations and confirm recent actions are recorded.
13. Export diagnostics only if a bug needs logs.

## Windows Desktop Setup

Normal testers should use the Windows installer from the website. Do not ask normal testers to install Node.js, run terminal commands, edit JSON, configure localhost, or copy Agent tokens.

Developers may still use `npm install` and `npm start` for development-mode validation.

Expected first-run behavior:

- `This PC` appears after the Local Agent is installed and paired.
- Empty pages explain why they are empty and how to begin.
- Protected owner-only actions require owner access.
- Unsupported features show unavailable states instead of fake data.

## Local Agent Setup

Expected behavior:

- Missing Agent state explains what the Local Agent does.
- Install Local Agent uses the bundled runtime.
- Windows service installation requests administrator permission only when required.
- Pairing completes automatically without token copying.
- Dependency scan runs after pairing.
- Service repair and pairing repair are available from diagnostics.
- Uninstall or service removal does not delete instances or backups unless explicitly selected.

## Debian Agent Setup

Start the Agent using the repository launcher when possible:

```sh
./AnxAgent.sh
```

If using a service manager, restart the configured service after updating code or config:

```sh
systemctl --user restart anxos-agent.service
```

Confirm health locally:

```sh
curl -fsS http://127.0.0.1:47131/api/v1/health
```

Pair or repair the desktop connection using a fresh pairing code from the Agent machine:

```sh
npm run agent:pair
```

Treat the pairing code as a temporary secret.

## Marketplace

Before installing:

- Select the intended node.
- Run Check Dependencies.
- Install missing dependencies only after reviewing the plan.
- Confirm the target port is not already in use.

CurseForge behavior:

- Do not create, paste, screenshot, or share a CurseForge developer API key.
- CurseForge should load in packaged builds only when the AnxOS-hosted proxy or protected Agent configuration is available.
- If CurseForge is not configured for the build, it should show a friendly unavailable state with retry and diagnostics code `CF-CONFIG-MISSING`.
- Modrinth and other Marketplace providers should remain usable when CurseForge is unavailable.
- Report any visible raw key, signed secret data, or key-like value in DevTools, logs, diagnostics, settings exports, crash reports, or network responses.
- Server modpack installs should prefer official CurseForge server packs. A client-only pack must fail with a clear explanation instead of being installed as a server.

During install:

- Watch Operations and Download Manager.
- SteamCMD installs can take several minutes and may download multiple gigabytes.
- Use View installer logs for concise sanitized stdout/stderr.

After install:

- Confirm expected artifacts exist.
- Confirm runtime command is restored after installer completion.
- Start the instance and verify it stays running.
- Stop and delete test instances when finished.

## Dependencies

Dependency checks are node-specific.

- Windows may report Linux package-manager actions as unsupported.
- Debian package installation may require sudo or service permissions.
- Missing dependencies should produce a stable error and recovery suggestion.
- Do not store sudo passwords in reports or screenshots.

## Files

Expected behavior:

- Local Windows profiles use Windows paths such as `C:\Users\<user>`.
- Remote Linux Agent profiles use Agent-reported Linux paths such as `/home/anx`.
- A remembered path from one profile must not be reused by another profile.
- If the Agent filesystem root is invalid or unreadable, Files should show a structured root error.

## Public Access

Public Access is provider-dependent.

- Playit may report installed/running state even when tunnel metadata is unavailable.
- Public address, local endpoint, latency, reachability, and capabilities should be clear when available.
- Unsupported provider actions should explain why they are unsupported.
- Do not expose a service publicly unless you understand the local endpoint and port.

## Diagnostics and Bug Reports

Use Diagnostics when:

- A workspace shows an unexplained error.
- Agent connection changes from connected to unavailable.
- Marketplace install fails.
- Files root authorization fails.
- Node health changes unexpectedly.

Attach:

- Exact steps.
- Operation ID when available.
- Diagnostics summary or exported bundle.
- Final relevant installer logs for Marketplace failures.
- Screenshot only after checking that no token or private URL is visible.

## Troubleshooting Quick Checks

Agent unavailable:

- For `This PC`, use Start Service, Restart Agent, Repair Service, or Repair Pairing.
- For remote nodes, confirm the remote Agent process, URL, port, and token state.
- Do not edit Local Agent JSON or copy Local Agent tokens during normal testing.

Marketplace failure:

- Open Download Manager logs.
- Check dependency state.
- Confirm disk space and write permissions.
- Confirm the selected node is the intended target.

Files failure:

- Reopen Files to refresh profiles.
- Confirm the selected server and profile.
- Confirm the Agent filesystem root contains the requested path.
- Do not manually force a Windows path into a Linux profile.

Public Access failure:

- Refresh provider status.
- Confirm the local endpoint exists.
- Check provider diagnostics.
- Confirm no firewall or token issue is blocking the provider.

## Screenshots

Use screenshots when they help show layout, state, or copy issues. Do not include secrets, tokens, pairing codes, private URLs, or unredacted config. If a screenshot contains a secret, retake it after hiding the value.
