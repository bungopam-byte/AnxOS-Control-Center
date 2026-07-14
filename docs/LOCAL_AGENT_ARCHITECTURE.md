# Local Agent Architecture

The Local Agent path lets AnxOS Control Center manage the user's own Windows PC without requiring the developer Debian Agent. It reuses the existing Agent API, node registry, Marketplace, Files, Backups, Public Access, dependency, diagnostics, and Agent Control surfaces.

## Components

- Desktop app: Electron main process, preload bridge, renderer UI, secure storage, and node selection.
- Local Agent runtime: packaged under `resources/local-agent-runtime` in Windows builds and resolved by `src/services/localAgentRuntimeService.js`.
- Agent service control: implemented through `src/services/agentControlService.js`, including install, start, stop, restart, repair, update, diagnostics, and pairing actions.
- Node registry: `src/services/nodeService.js` discovers localhost, deduplicates `127.0.0.1` and `localhost`, and exposes the Local Agent as `This PC`.
- Shared capability model: local and remote nodes use a shared interface with capability flags for platform-specific behavior.
- Agent API: the same authenticated HTTP API serves local Windows, remote Windows, and remote Linux Agents.

## Discovery and Node Identity

The desktop probes both `127.0.0.1` and `localhost` using the configured Agent port. A healthy Local Agent is shown as a dedicated local node named `This PC`, with a stable local identity independent from the Windows hostname.

The Local Agent reports health, version, platform, operating system, architecture, hostname, uptime, CPU, RAM, disk, network interfaces, dependency readiness, service state, and instance count. It must not be rendered as a Linux node.

## Authentication

Local pairing is automatic and restricted to the local machine. Full tokens are never shown in the UI or logs. Diagnostics may show fingerprints only when needed for troubleshooting.

Remote Agent token workflows remain supported and separate from Local Agent pairing.

## Runtime Packaging

Windows builds package the Local Agent runtime outside `app.asar` under `resources/local-agent-runtime`. The package includes Agent files, shared runtime modules, configuration templates, Marketplace template metadata, and a runtime manifest. It excludes runtime config, logs, identity files, `.env`, repository metadata, and source maps.

Development builds use the repository tree. Packaged builds prefer `process.resourcesPath/local-agent-runtime`.

## Storage

The Local Agent keeps separate locations for program/runtime files, secure configuration, logs, instance data, backups, and temporary downloads. Instances and backups are not deleted by service repair or Agent updates.

## Updates and Repair

Local Agent updates are coordinated by the desktop: stop service, back up configuration and essential state, replace runtime files, run migrations where available, restart service, verify health, and reconnect. Diagnostics expose repair actions for service state, pairing, permissions, dependency scanning, reinstall, and update recovery.

## Compatibility

Remote Debian and remote Windows Agents remain first-class nodes. Local-only service controls are hidden for remote nodes, and unsupported actions are disabled with explanations.
