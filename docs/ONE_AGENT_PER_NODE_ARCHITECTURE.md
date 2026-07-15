# One Agent Per Node Architecture Map

Phase 1 audit document. This file maps the current implementation before behavior changes.

## Target Architecture

One node equals one independently running AnxOS Agent.

- One machine, VM, VPS, or server runs one AnxOS Agent.
- The desktop app connects directly to the selected node's agent URL and token.
- An agent manages only its own host.
- Agents do not manage other agents, contain child nodes, or act as multi-node controllers.
- Resource identity is node-scoped. Identical instance IDs, backup IDs, file names, container names, or public-access service IDs on different nodes must not collide.

## Current Node Registry Structure

The current node registry is implemented in `src/services/nodeService.js`.

- Persistent file: `nodes.json` under `ANXHUB_CONFIG_DIR` or Electron `userData/config`.
- Schema version: `NODE_SCHEMA_VERSION = 2`.
- State shape: `{ schemaVersion, selectedNodeId, nodes }`.
- The application host is virtual and supplied by `src/services/applicationHostService.js` as `application-host`.
- Agent nodes are normalized by `normalizeAgentNode()`.
- Existing agent node shape includes:
  - `id`
  - `kind: "agent"`
  - `displayName`
  - `agentUrl`
  - `agentToken`
  - `agentIdentity`
  - `docker`
  - `ownerMachine`
  - `localAgent`
  - `local`
  - `modeLabel`
  - `profile`
  - `capabilities`
  - transient `connection`
  - `createdAt`
  - `updatedAt`
  - `executionTarget`
- `writeNodeState()` strips transient `connection`, but persists `agentToken` inside normal node metadata.
- `publicNode()` masks the token before IPC returns nodes to the renderer by setting `agentToken` to `[configured]` and adding `hasToken`.

Important current mismatch with the target architecture: the registry already has node-specific URLs and tokens, but tokens are still stored in the same JSON document as safe node metadata.

## Legacy Global Agent URL And Token Storage

Legacy single-agent configuration is implemented in `src/services/agentClient.js` and `src/shared/agentTokenStore.js`.

- Persistent file: `agent.json` under the same config directory.
- Default shape: `{ backendMode, agentUrl, agentToken }`.
- Default URL: `http://127.0.0.1:47131`.
- `getEffectiveAgentSettings()` merges:
  - `agent.json`
  - environment `BACKEND_MODE` / `ANXHUB_BACKEND_MODE`
  - environment `AGENT_URL`
  - shared token resolution from `resolveSharedAgentToken()`
- `resolveSharedAgentToken()` can generate and write a token into `agent.json`.
- `saveAgentSettings()` writes normalized global `agentUrl` and `agentToken`.
- `rotateAgentSettingsToken()` rotates the shared global token.
- Settings IPC still exposes and saves the legacy global agent config through:
  - `settings:getAgentConfig`
  - `settings:saveAgentConfig`
  - `settings:testAgentConnection`
  - `settings:pairAgent`

Compatibility risk: several services still call `agentClient.getEffectiveAgentSettings()` or `agentClient.getAgentConfig()` directly, which can silently resolve the legacy global URL/token instead of an explicit node.

## Selected-Node State

Main-process selected-node state is persisted in `nodes.json` as `selectedNodeId`.

- `getSelectedNodeId()` reads the persisted registry.
- `selectNode(nodeId)` validates the node and updates `selectedNodeId`.
- `getExecutionTarget(nodeId)` resolves either:
  - `{ type: "agent", nodeId, deviceId, localAgent, capabilities, config }`
  - `{ type: "application-host", nodeId: "application-host", hostId, capabilities }`
- Renderer state is held in `app.js`:
  - `nodesState = { selectedNodeId, nodes, applicationHost }`
  - `selectedNodeContextVersion`
  - helpers including `getSelectedNodeId()`, `getSelectedNode()`, `createSelectedNodeRequestContext()`, and `isSelectedNodeRequestCurrent()`
- Some renderer flows already use selected-node request contexts to avoid stale writes.

Current fallback risk: `serviceRouter.getOptionalNodeConfig(options)` uses `options.nodeId || getSelectedNodeId()`. That is convenient for single-node behavior, but for strict node routing every agent-backed action should bind to an explicit node snapshot at the UI/API boundary.

## Agent Request Helpers

The central low-level HTTP client is `src/services/agentClient.js`.

Reusable pieces:

- `normalizeAgentSettings()`
- `getAgentConfig(configOverride)`
- `buildAgentUrl(pathname, configOverride)`
- `requestJson(pathname, options, configOverride)`
- `downloadFile()`
- `AgentClientError`
- timeout handling with `AbortController`
- request failure throttling in `logAgentRequestFailure()`
- existing endpoint helpers for health, system stats, instances, Docker, files, backups, dependencies, public access, diagnostics, and actions.

Current architecture issue: `agentClient` accepts optional config overrides, but it is not node-aware by itself. Missing overrides fall back to the legacy global agent config. A future `agentClient.forNode(nodeId)` or equivalent should reject missing/disabled nodes and avoid fallback.

## Pages And Services That Communicate With The Agent

Agent-backed surfaces found in the current implementation:

- Dashboard and system metrics: `src/services/systemService.js`, renderer `renderSnapshot()` and dashboard refresh flows.
- Nodes and node health: `src/services/nodeService.js`, `src/ipc/nodesIpc.js`, renderer node page and health model.
- Agent Control: `src/services/agentControlService.js`, `src/ipc/agentControlIpc.js`.
- Instances: `src/services/serviceRouter.js`, `src/ipc/instancesIpc.js`, renderer instance list/actions/logs/console/file flows.
- Marketplace installs: `src/services/marketplaceService.js`, `src/services/marketplaceInstallService.js`, `src/ipc/marketplaceIpc.js`.
- Dependencies: `src/services/serviceRouter.js`, `src/ipc/dependenciesIpc.js`.
- Public Access: `src/services/publicAccessProviderService.js`, `src/ipc/publicAccessIpc.js`.
- Docker: `src/services/serviceRouter.js`, `src/ipc/dockerIpc.js`.
- Files: `src/services/fileService.js`, `src/ipc/filesIpc.js`.
- Backups: `src/services/serviceRouter.js`, `src/ipc/backupsIpc.js`.
- Console/actions: `src/services/actionRouter.js`, `src/services/actionClient.js`, `src/ipc/actionIpc.js`.
- SSH profiles have node association, but SSH is not itself an Agent API path.
- Security and owner workspace still read or display legacy agent connection state in selected places.

## Direct Or Legacy Global Agent Usage Hotspots

Targeted searches found these compatibility hotspots:

- `src/services/agentClient.js`
  - Owns legacy `agent.json`, default URL, shared token, and fallback behavior.
- `src/services/agentControlService.js`
  - Uses `getEffectiveAgentSettings()` for configured-agent status and global connection summaries.
  - Uses node configs for remote diagnostics and remote node list status in some paths.
- `src/services/nodeService.js`
  - Migrates effective global agent settings into nodes when `backendMode === "agent"`.
  - Discovers local agents using the effective shared token.
- `src/services/marketplaceService.js`
  - `resolveMarketplaceAgentConfig()` currently resolves an execution target but also reads `getEffectiveAgentSettings()`.
- `src/services/systemService.js`
  - Accepts node options but still has config fallback behavior through `agentClient`.
- `src/services/ownerWorkspaceService.js`
  - Imports `getAgentConfigPath`, `readAgentSettings`, and `testConnection`.
- `src/ipc/settingsIpc.js`
  - Still exposes global agent settings UI/API.
- `app.js`
  - Reads and displays `latestAgentSettingsPayload`.
  - Some UI helpers use `selectedNode?.agentUrl || latestAgentSettingsPayload... || DEFAULT_AGENT_SETTINGS.agentUrl`.

The final migration must remove unsafe direct global-agent fallback from agent-backed feature paths, while retaining legacy settings only for migration compatibility.

## Node Selectors Currently Present

Current node selection appears in several places:

- Sidebar footer node picker.
- Nodes workspace.
- Node health details.
- Dashboard selected-system text.
- Files workspace node-backed connection profiles.
- Docker, Dependencies, Marketplace, Instances, Backups, Public Access, and Console flows pass or infer `nodeId` from the selected node.
- Owner overview and global search can open node details or select nodes.

Recommendation: keep one authoritative selected-node state and reuse the existing node picker behavior rather than adding page-specific selectors.

## Authentication And Credential Storage

Current behavior:

- Legacy global token is stored in `agent.json`.
- Node-specific tokens are stored in `nodes.json`.
- Renderer receives masked node tokens only through `publicNode()`.
- Settings form intentionally supports global token save/pair/rotation.
- Pairing payloads can contain raw tokens during import but return fingerprints afterward.

Security gap for the target architecture: per-node tokens should be separated from safe node metadata before expanding multi-node support. A future credential store should provide node-scoped secret read/write/delete primitives and expose only token presence/fingerprint to renderer and diagnostics.

## Health-Check Implementation

Current health behavior:

- `agentClient.getHealth(config)` calls the agent health endpoint with optional bearer auth.
- `nodeService.refreshIdentities()` loops over every persisted node and updates transient `connection`.
- `nodeService.discoverLocalAgentNode()` probes localhost agent URLs and builds local profile data.
- Renderer `refreshNodeHealth()` builds a UI health model from current node state and cached page data.
- `agentControlService.listAgents()` also evaluates local, configured, and remote agent status.

Current limitation: health state is partly stored as transient node connection data and partly derived in renderer health categories. There is no independent durable health service with non-overlapping checks per node, backoff, and stable states such as `authentication_failed` or `agent_incompatible`.

## Migration Behavior

Current migration exists in `nodeService.migrateState(parsed)`:

- Reads effective global agent settings.
- If global `backendMode === "agent"` and URL is not already represented, it pushes a legacy node `{ displayName: "Owner Machine", agentUrl, agentToken }`.
- Normalizes and merges nodes by device identity.
- Converts selected node `"default"` to either the first agent node or `application-host`.
- If selection is `application-host`, can select the local agent when global config points at localhost.
- Writes upgraded `nodes.json` if schema/content changes.

Risks:

- Migration can copy global token into `nodes.json`.
- Node ID is derived from agent device identity when possible or legacy URL hash otherwise.
- Repeated discovery/identity refresh can merge nodes by device identity, which is useful but could surprise users if two records refer to the same agent.
- Future migration must be idempotent and must not overwrite newer per-node URL/token values with legacy global values.

## Diagnostics And Token Redaction Behavior

Existing redaction:

- Shared redaction utility: `src/shared/redaction.js`.
- Renderer diagnostic secret pattern: `DIAGNOSTIC_SECRET_PATTERN` in `app.js`.
- Instance core redacts bearer tokens in `src/shared/instances/instanceServiceCore.js`.
- Public Access provider detection redacts token-like output.
- Diagnostics smoke tests check bearer/token/password redaction.
- `agentClient.logAgentSelection()` logs URL and token presence but not token value.
- `nodeService.publicNode()` masks tokens before IPC.

Risks:

- Full agent URLs are logged/displayed and must be treated as safe only when they contain no embedded credentials. URL normalization should reject or sanitize userinfo.
- `nodes.json` currently contains raw node tokens, so diagnostics/export/import code must never include it verbatim.
- Future node-aware diagnostics should include safe context: node ID, node name, endpoint path, operation, and error category.

## Current Tests And Smoke Scripts Related To Nodes

Relevant scripts in `package.json` and `scripts/`:

- `npm run node:switch:smoke` / `scripts/node-switch-smoke.js`
- `npm run node-health:smoke` / `scripts/node-health-smoke.js`
- `npm run agent-control:smoke` / `scripts/agent-control-smoke.js`
- `npm run windows-runtime:smoke` / `scripts/windows-runtime-smoke.js`
- `npm run agent:token:smoke` / `scripts/agent-token-smoke.js`
- `npm run agent:instances:smoke` / `scripts/agent-instance-record-smoke.js`
- `npm run instances:runtime:smoke` / `scripts/instance-runtime-smoke.js`
- `npm run device-architecture:smoke` / `scripts/device-architecture-smoke.js`
- `npm run dependencies:smoke` / `scripts/dependency-smoke.js`
- `npm run public-access:smoke` / `scripts/public-access-smoke.js`
- `npm run docker:smoke` / `scripts/docker-smoke.js`
- `npm run marketplace:smoke` / `scripts/marketplace-smoke.js`
- `npm run files:smoke` / `scripts/files-pipeline-smoke.js`
- `npm run agent:files-root:smoke` / `scripts/agent-files-root-smoke.js`
- `npm run diagnostics:smoke` / `scripts/diagnostics-smoke.js`

Several smoke tests already assert node IDs are preserved in dependency/public-access/backup flows. They do not yet prove strict two-agent routing with separate URLs, separate tokens, no fallback, independent health, stale-response protection, or credential isolation.

## Reusable Components

Reusable now:

- `nodeService.getExecutionTarget(nodeId)`
- `nodeService.getNodeAgentConfig(nodeId)`
- `nodeService.normalizeUrl()` concept, though it is currently private and permissive.
- `serviceRouter.getOptionalNodeConfig(options)`
- `agentClient.requestJson()` and endpoint helpers.
- Renderer selected-node context version helpers.
- `instanceForgetService` compound key pattern: `nodeId + instanceId`.
- Public Access snapshot context normalization.
- Existing diagnostics redaction.

Reusable after refactor:

- Shared node model validator/normalizer.
- Shared node URL normalizer.
- Node credential store with token presence/fingerprint public metadata.
- Central `agentClient.forNode(nodeId)` facade.
- Shared stale-response guard for renderer refreshes and polling.

## Required Migrations

Required later phases:

- Add canonical safe node metadata shape with `baseUrl`, `enabled`, `description`, `tags`, connection state, and timestamps.
- Move per-node tokens out of ordinary node metadata or replace raw token fields with protected credential references.
- Idempotently migrate legacy global `agent.json` into a default node without overwriting newer per-node values.
- Preserve existing node IDs and display names.
- Normalize `agentUrl` to `baseUrl`, preserving compatibility aliases during transition.
- Convert agent-backed request paths from optional config overrides to explicit node resolution.
- Make health state independent per node.
- Make renderer caches, operations, polling, and long-running progress node-owned.
- Keep single-node users on an automatic/simple path.

## Risky Compatibility Areas

- Legacy global agent settings are still user-visible and used by Agent Control and Settings.
- Local agent discovery depends on shared global token behavior.
- Node registry persistence currently stores raw tokens.
- Renderer and service-router fallbacks can implicitly use selected node or global settings.
- Marketplace and install progress are long-running and must retain initiating node ownership.
- Files and Instances can have identical resource IDs across nodes.
- Destructive actions must bind to the initiating node snapshot.
- Node deletion currently removes metadata only and selects `application-host`; it does not clean per-node caches or credentials because those are not separate yet.
- Public Access has local registry behavior for application host and remote-agent API behavior for agent nodes.
- Different agent versions/capabilities are not yet represented by a stable capability contract.

## Pages Requiring Node-Aware Routing

The following pages/workspaces require explicit selected-node routing and stale-response protection:

- Dashboard
- Nodes
- Node Health
- Agent Control remote diagnostics and configured-agent status
- Instances
- Marketplace
- Dependencies
- Public Access
- Docker
- Files
- Console/actions
- Backups
- Operations/download progress where the operation is agent-backed
- Owner overview summaries that display agent/node status
- Diagnostics when capturing or displaying remote agent diagnostics

## Recommended Central Request Architecture

Introduce a single node-aware request facade around the existing low-level `agentClient`.

Conceptual API:

```js
const nodeAgent = agentClient.forNode(nodeId);
await nodeAgent.get("/instances");
await nodeAgent.post("/actions", payload);
```

Responsibilities:

- Resolve node ID through the canonical node registry.
- Reject missing, deleted, disabled, or non-agent nodes clearly.
- Retrieve base URL and token from separate safe metadata/credential stores.
- Normalize HTTP and HTTPS URLs without downgrading or accepting malformed URLs.
- Attach bearer authentication without exposing raw tokens.
- Preserve current timeout and error normalization behavior.
- Include safe node context in errors and diagnostics.
- Never fall back to global agent settings when a node-specific request fails.
- Expose capability metadata and compatibility state when available.

The existing endpoint-specific helpers can be migrated gradually to use this facade internally. During migration, any helper that still accepts `configOverride` should be treated as compatibility code, not the long-term routing model.

## Phase 1 Validation Expectations

This phase changes documentation only. Validation should verify:

- The architecture document is present and internally consistent.
- Targeted source searches were performed for node state, legacy global agent settings, request helpers, IPC surfaces, diagnostics, and tests.
- No production behavior changes were introduced by the Phase 1 commit.
