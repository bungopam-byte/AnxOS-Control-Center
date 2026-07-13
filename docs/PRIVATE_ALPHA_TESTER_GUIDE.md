# Private Alpha Tester Guide

This guide is for trusted testers validating AnxOS Control Center before any public beta. It assumes a Windows 11 desktop app and, when available, a Debian Agent node such as Anxlab.

Do not share secrets in reports. Never paste Agent tokens, pairing codes, Supabase tokens, passwords, private URLs, config files, or unredacted logs.

## What Private Alpha Means

- The current release channel is Private Alpha.
- The goal is real-machine feedback, not public marketing.
- Features may be incomplete, unavailable, or intentionally limited.
- Report exact behavior and logs; do not assume a failure is user error.
- Do not use AnxOS Control Center as the only copy of important server data.

## Recommended Test Order

1. Start the desktop app.
2. Confirm the local Windows desktop appears as a managed application host.
3. Connect or select the Debian Agent node.
4. Open Diagnostics and run a snapshot.
5. Open Nodes and Node Details.
6. Run dependency checks for the selected node.
7. Install one Marketplace template.
8. Start, stop, restart, and remove the test instance.
9. Open Files and verify local and remote profiles stay separate.
10. Open Public Access and verify provider status.
11. Open Operations and confirm recent actions are recorded.
12. Export diagnostics only if a bug needs logs.

## Windows Desktop Setup

Install dependencies once:

```powershell
npm install
```

Start the app in development mode:

```powershell
npm start
```

Expected first-run behavior:

- Local Application Host appears even when no Agent is connected.
- Empty pages explain why they are empty and how to begin.
- Protected owner-only actions require owner access.
- Unsupported features show unavailable states instead of fake data.

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

- Confirm the Agent process is running.
- Confirm the Agent URL and port.
- Repair pairing if authentication fails.
- Restart the Agent after config changes.

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
