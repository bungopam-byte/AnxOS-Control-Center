# Test Matrix

| Area | Primary commands |
| --- | --- |
| Shared operations | `npm run operations:framework:smoke` |
| Node selection/races | `npm run node:switch:smoke`, `npm run node:application-host-identity:smoke`, `npm run node:stale-response:smoke`, `npm run cross-page:selected-target:smoke` |
| Node migration | `npm run node:legacy-migration:smoke`, `npm run node:startup-selection:smoke` |
| Agent authentication | `npm run agent:token:smoke`, `npm run agent-errors:smoke`, `npm run node:agent-pairing:smoke` |
| Marketplace | `npm run marketplace:smoke`, `npm run marketplace:install-selected-node:smoke`, `npm run curseforge:server-pack-resolution:smoke` |
| Instances | `npm run instances:runtime:smoke`, `npm run instances:deletion:smoke` |
| Filesystem | `npm run agent:files-root:smoke`, `npm run files:smoke` |
| Backup/security | `node scripts/security-backup-smoke.js`, `npm run security:page:smoke` |
| Diagnostics authorization | `npm run diagnostics:ipc-authorization:smoke` |
| Renderer safety/UI | `npm run renderer-safety:smoke`, `npm run ui:polish:smoke` |
| Packaging/release | `npm run packaging:smoke`, `npm run release:artifacts:smoke`, `npm run versioning:smoke` |
| Full repository gate | `npm run agent:validate` |

Adversarial fixtures cover missing targets, delayed node responses, offline and
unauthorized Agents, incompatible versions, symlink escape, malformed archives,
concurrent backups, failed instance stop before restore, rollback recovery,
crash-loop backoff, pending restart cancellation, and clean Agent SIGTERM.
