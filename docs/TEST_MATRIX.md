# Test Matrix

| Area | Primary commands |
| --- | --- |
| Shared operations | `npm run operations:framework:smoke` |
| Node selection/races | `npm run node:switch:smoke`, `npm run node:application-host-identity:smoke`, `npm run node:stale-response:smoke`, `npm run cross-page:selected-target:smoke` |
| Node migration | `npm run node:legacy-migration:smoke`, `npm run node:startup-selection:smoke` |
| Agent authentication | `npm run agent:token:smoke`, `npm run agent-errors:smoke`, `npm run node:agent-pairing:smoke` |
| Agent API authorization | `npm run agent:api-authorization:smoke` |
| Marketplace | `npm run marketplace:smoke`, `npm run marketplace:install-selected-node:smoke`, `npm run curseforge:server-pack-resolution:smoke` |
| Instances | `npm run instances:runtime:smoke`, `npm run instances:deletion:smoke`, `npm run instances:file-security:smoke` |
| Instance metadata migration | `npm run instances:config-migration:smoke` |
| Instance shutdown ownership | `npm run instances:shutdown:smoke` |
| Renderer resource cleanup | `npm run renderer:resource-cleanup:smoke` |
| Dependency cancellation listener cleanup | `npm run dependencies:abort-listener:smoke` |
| Filesystem | `npm run agent:files-root:smoke`, `npm run files:smoke` |
| Files IPC authorization | `npm run files:ipc-authorization:smoke` |
| Files IPC error contract | `npm run files:ipc-error-contract:smoke` |
| SSH IPC error contract | `npm run ssh:ipc-error-contract:smoke` |
| Operational read authorization | `npm run operational-reads:ipc-authorization:smoke` |
| Public Access mutation authorization | `npm run public-access:ipc-authorization:smoke` |
| AMP/Playit IPC error contract | `npm run compatibility:ipc-error-contract:smoke` |
| Expected Agent read contract | `npm run agent:expected-error-contract:smoke` |
| Backup/security | `node scripts/security-backup-smoke.js`, `npm run backups:transfer-safety:smoke`, `npm run security:page:smoke` |
| Diagnostics authorization | `npm run diagnostics:ipc-authorization:smoke` |
| Diagnostics IPC error contract | `npm run diagnostics:ipc-error-contract:smoke` |
| Update IPC authorization/error contract | `npm run updates:ipc-authorization:smoke` |
| Storage child-window authorization | `npm run storage-window:ipc-authorization:smoke` |
| Maintenance IPC contract | `npm run maintenance:ipc-contract:smoke` |
| Settings IPC error contract | `npm run settings:ipc-error-contract:smoke` |
| Generic action authorization | `npm run action:ipc-authorization:smoke` |
| Generic action IPC error contract | `npm run action:ipc-error-contract:smoke` |
| Agent Control IPC error contract | `npm run agent-control:ipc-error-contract:smoke` |
| Backup IPC authorization | `npm run backups:ipc-authorization:smoke` |
| IPC error contract | `npm run ipc:error-contract:smoke` |
| Node IPC error contract | `npm run nodes:ipc-error-contract:smoke` |
| Node IPC authorization | `npm run nodes:ipc-authorization:smoke` |
| Instance IPC error contract | `npm run instances:ipc-error-contract:smoke` |
| Docker IPC error contract | `npm run docker:ipc-error-contract:smoke` |
| Docker IPC authorization | `npm run docker:ipc-authorization:smoke` |
| Security IPC error contract | `npm run security:ipc-error-contract:smoke` |
| Account IPC error contract | `npm run account:ipc-error-contract:smoke` |
| Owner Workspace IPC error contract | `npm run owner:ipc-error-contract:smoke` |
| Marketplace IPC error contract | `npm run marketplace:ipc-error-contract:smoke` |
| Marketplace IPC authorization | `npm run marketplace:ipc-authorization:smoke` |
| Dependency IPC error contract | `npm run dependencies:ipc-error-contract:smoke` |
| Renderer safety/UI | `npm run renderer-safety:smoke`, `npm run ui:polish:smoke` |
| Modal keyboard/focus behavior | `npm run ui:modal-behavior:smoke` |
| Packaging/release | `npm run packaging:smoke`, `npm run release:artifacts:smoke`, `npm run versioning:smoke`, `npm run updates:download-safety:smoke` |
| Full repository gate | `npm run agent:validate` |

Adversarial fixtures cover missing targets, delayed node responses, offline and
unauthorized Agents, incompatible versions, symlink escape, malformed archives,
concurrent backups, failed instance stop before restore, rollback recovery,
crash-loop backoff, pending restart cancellation, and clean Agent SIGTERM.
