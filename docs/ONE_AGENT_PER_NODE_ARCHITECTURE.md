# One Agent Per Node Architecture Map

Phase 1 audit document. This file maps the current implementation before behavior changes.

## Target Architecture

One node equals one independently running AnxOS Agent.

- One machine, VM, VPS, or server runs one AnxOS Agent.
- The desktop app connects directly to the selected node's agent URL and token.
- An agent manages only its own host.
- Agents do not manage other agents, contain child nodes, or act as multi-node controllers.
- Resource identity is node-scoped. Identical instance IDs, backup IDs, file names, container names, or public-access service IDs on different nodes must not collide.

Example node registry entries:

| Node | Agent URL | Meaning |
| --- | --- | --- |
| Anxlab | `http://192.168.1.134:47131` | Agent installed on the Anxlab machine. |
| Windows PC | `http://192.168.1.xxx:47131` | Separate Agent installed on a Windows desktop or gaming PC. |
| VPS | `https://agent-vps.example.com` | Separate Agent installed on a cloud server or VPS. |

The Control Center connects directly to the selected Agent. Agents do not connect to each other and do not know about other nodes. Every Agent manages only its local host.

## Synchronized Node And Agent Selection

Active Node is the canonical application-wide selection. Active Agent is derived from the active Node.

- The persisted selection is a node ID, not an Agent URL, token, hostname, or display name.
- Selecting a Node updates the active Node and therefore activates that Node's assigned Agent.
- Selecting a registered Agent in Agent Control must resolve the owning Node and set that Node active.
- Agent Control must not persist or maintain an independent selected-Agent source of truth for registered Nodes.
- Selection state must not duplicate raw Agent credentials, Authorization headers, or credential storage keys.
- Offline, authentication-failed, or incompatible Agents do not cause automatic fallback to another Node after explicit selection.
- If the selected Node is permanently deleted, recovery may select the only remaining valid Node or show a Select Node state when multiple choices remain.

Proposed event flow:

1. A user selects a Node from any shared selector.
2. The active-node service validates and persists the immutable Node ID.
3. Subscribers receive one deduplicated active-node change event.
4. The renderer increments the node context generation, clears incompatible resource selections, cancels or invalidates previous-node work, and refreshes the visible node-aware page.
5. Agent Control derives its active Agent from the same active Node and refreshes its active-node/Agent context.
6. Connected Agents shown in Agent Control mark the Agent owned by the active Node as current.

Registered Agent selection flow:

1. A user selects a Connected Agent in Agent Control.
2. Agent Control resolves the registered Node by stable Agent installation identity, stored node association, stable Agent identity, or normalized URL fallback.
3. The same active-node selection path runs with that Node ID.
4. Shared selectors, Agent Control, and the active page refresh from the single active Node.

Compatibility requirements:

- The virtual `application-host` Node remains supported for local desktop/application-host workflows.
- Local Agent service state, Windows local Agent installation state, and configured legacy Agent state remain separate status surfaces; they are not alternate selected-Agent state.
- Legacy global `agent.json` remains only for migration, local Agent setup, and compatibility paths.
- Older Agents without stable identity metadata may use normalized URL matching as a fallback, but display name, hostname, platform, and IP address alone are not identity.
- Startup restores the active Node from persisted node selection and derives Agent context from that Node.

## Current Implementation Summary

The implementation now follows the one-agent-per-node routing model for agent-backed feature paths:

- Node metadata is normalized in `src/services/nodeService.js` with stable IDs, `baseUrl`, `enabled`, description, tags, health state, timestamps, and safe capability/version metadata.
- Per-node tokens are stored through `src/services/nodeCredentialStore.js`; `nodes.json` does not persist raw Agent tokens.
- Legacy global `agent.json` remains for migration, Agent Control, and local-agent compatibility, but feature paths must use explicit node context.
- `agentClient.forNode(nodeId)` resolves node URL/token, rejects missing/disabled/non-agent nodes, and avoids global fallback.
- `serviceRouter` blocks missing `nodeId` when the selected target is an Agent, preserving local application-host compatibility while preventing accidental selected-Agent fallback.
- Renderer node-scoped requests carry node ID, selected-node context version, and per-operation serials to reject stale responses.
- Health checks are independent per registered node and store states including `connecting`, `online`, `offline`, `authentication_failed`, `agent_incompatible`, and `unknown`.
- Long-running Marketplace/download/progress, dependency, Public Access, Docker, Files, Console, Backups, and Instances flows carry node context and guard stale results.

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
  - `baseUrl`
  - `agentUrl`
  - token presence metadata, with raw token loaded only from the node credential store
  - `enabled`
  - `description`
  - `tags`
  - `lastConnectionState`
  - `lastSuccessfulHealthCheck`
  - `agentIdentity`
  - version/API/platform/capability metadata when available
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
- `writeNodeState()` strips transient `connection` and raw `agentToken`, then writes tokens through `nodeCredentialStore`.
- `publicNode()` masks the token before IPC returns nodes to the renderer by setting `agentToken` to `[configured]` and adding `hasToken`.

Current compatibility note: node records still retain `agentUrl` as an alias beside `baseUrl` to support older persisted data and renderer code during migration.

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

Compatibility note: legacy global settings are still used by Agent Control, local-agent setup, migration, and developer tooling. Agent-backed product feature paths use explicit node context and should not fall back to the global URL/token.

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
  - helpers including `getSelectedNodeId()`, `getSelectedNode()`, `getNodeRequestContext()`, and `isNodeRequestCurrent()`
- Renderer flows use node request contexts with node ID, context version, and per-operation serials to avoid stale writes.

Compatibility cleanup: `serviceRouter.getOptionalNodeConfig(options)` now requires an explicit `nodeId` when the selected target is an Agent. Local application-host calls remain compatible for single-node/local workflows, but missing `nodeId` no longer silently routes an agent-backed request to the currently selected Agent.

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

Compatibility note: low-level `agentClient` still supports legacy global settings for migration, Agent Control, and local-agent compatibility. Agent-backed feature paths should use `agentClient.forNode(nodeId)` or pass a node-derived config; missing node IDs must fail clearly rather than falling back to legacy global settings.

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
- Security and owner workspace still read or display legacy/local Agent connection state in selected places.

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
  - Resolves Marketplace install/download operations from explicit execution targets and avoids legacy global fallback for selected application-host mode.
- `src/services/systemService.js`
  - Uses `agentClient.forNode(nodeId)` for selected Agent system snapshots.
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

Security behavior: per-node tokens are separated from safe node metadata through the node credential store. Renderer and diagnostics receive configured/missing metadata, not raw token values.

## Health-Check Implementation

Current health behavior:

- `agentClient.getHealth(config)` calls the agent health endpoint with optional bearer auth.
- `nodeService.checkNodeHealth(nodeId)` checks one node, deduplicates overlapping checks, classifies connection state, and writes safe health metadata.
- `nodeService.checkAllNodeHealth()` runs independent checks for every persisted Agent node.
- `nodeService.discoverLocalAgentNode()` probes localhost agent URLs and builds local profile data.
- Renderer `refreshNodeHealth()` builds a UI health model from current node state and cached page data.
- `agentControlService.listAgents()` also evaluates local, configured, and remote agent status.

Compatibility limitation: health compatibility metadata is backward compatible. Missing API-version metadata is treated as compatible, while explicit incompatible API metadata is surfaced as `agent_incompatible`.

## Migration Behavior

Current migration exists in `nodeService.migrateState(parsed)`:

- Reads effective global agent settings.
- If global `backendMode === "agent"` and URL is not already represented, it creates or updates a legacy node and writes the token through the node credential store.
- Normalizes and merges nodes by device identity.
- Converts selected node `"default"` to either the first agent node or `application-host`.
- If selection is `application-host`, can select the local agent when global config points at localhost.
- Writes upgraded `nodes.json` if schema/content changes.

Risks:

- Migration can import legacy global credentials into per-node credential storage.
- Node ID is derived from agent device identity when possible or legacy URL hash otherwise.
- Repeated discovery/identity refresh can merge nodes by device identity, which is useful but could surprise users if two records refer to the same agent.
- Migration is idempotent and must not overwrite newer per-node URL/token values with legacy global values.

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
- Diagnostics/export/import code should continue treating `nodes.json` as safe metadata and credentials as separate protected state.
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

Current smoke coverage includes two-node URL/token routing, strict no-fallback checks, independent health state, stale-response protection, node-scoped resources, legacy migration, connection workflow, and credential isolation from `nodes.json`.

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
- Node credential store with token presence public metadata.
- Central `agentClient.forNode(nodeId)` facade.
- Shared stale-response guard for renderer refreshes and polling.

## Required Migrations

Implemented migration requirements:

- Canonical safe node metadata shape with `baseUrl`, `enabled`, `description`, `tags`, connection state, and timestamps.
- Per-node tokens moved out of ordinary node metadata into the node credential store.
- Idempotent legacy global `agent.json` migration into node records without overwriting newer per-node values.
- Existing node IDs and display names preserved during migration.
- `agentUrl` normalized to `baseUrl`, preserving compatibility aliases during transition.
- Agent-backed feature request paths use explicit node resolution and no selected-Agent fallback.
- Health state independent per node.
- Renderer caches, operations, polling, and long-running progress carry node ownership where migrated.
- Single-node/local users retain application-host and local-agent compatibility paths.

## Risky Compatibility Areas

- Legacy global agent settings are still user-visible and used by Agent Control and Settings.
- Local agent discovery depends on shared global token behavior.
- Node registry persistence strips raw tokens from `nodes.json`; per-node Agent tokens are written through the node credential store and exposed to the renderer only as configured/missing metadata.
- Legacy global settings remain for migration and Agent Control, but service-router agent-backed calls block implicit selected-Agent fallback when `nodeId` is missing.
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
