# Local Agent Troubleshooting

Use Agent Control diagnostics before asking users to edit files or run terminal commands.

## Agent Missing

Show `Install Local Agent`, `Learn More`, and `Use Remote Agent Instead`. Explain that the Local Agent lets AnxOS manage servers, files, backups, dependencies, and services on this computer.

## Agent Offline

Try:

- Start service.
- Restart Agent.
- Repair service.
- Check port availability.
- Reconnect desktop.

If the service cannot start, show recent sanitized logs and plain-English recovery guidance.

## Authentication Required

Use `Repair Pairing`. Do not ask the user to copy tokens or edit JSON. If credentials are corrupted, rotate and re-pair locally.

## Version Mismatch

Show `Local Agent Update Available` when the packaged desktop is newer and a compatible update path exists. If the Agent is newer than the desktop, prevent update loops and explain that the desktop may need an update.

## Repair Required

Use diagnostics to check runtime files, configuration, service registration, permissions, storage paths, logs, disk space, and update compatibility. Preserve instances and backups during repair.

## Port Conflict

Explain which port is in use and that AnxOS cannot start the Local Agent until the conflict is resolved. Do not silently switch to a different localhost port unless the node registry and desktop are updated safely.

## Dependency Problems

Re-scan dependencies after install or restart. Show whether a dependency is missing, installed but unavailable, unsupported, requires admin access, or requires restart.

## Marketplace Install Failure

Check selected node, disk space, dependency readiness, port conflicts, provider errors, and sanitized installer logs. Do not expose CurseForge keys or provider credentials.

## Files and Backups

For file errors, confirm the selected node and allowed root. For restore errors, validate archive integrity, disk space, locked files, traversal protection, and overwrite confirmation.

## Public Access

Provider installed is not the same as provider ready. Check sign-in state, tunnel state, local endpoint, firewall requirements, and provider-specific configuration.
