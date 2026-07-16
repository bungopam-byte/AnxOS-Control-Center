# Node Targeting

`nodeService` is the canonical source of the selected management target.
`application-host`, a registered Local Agent, and a registered remote Agent are
distinct targets.

Agent identity is resolved in descending order from authenticated stable
identity fields (`agentInstallationId`, `agentIdentityId`, then `deviceId`). An
explicit node id is used only within the node registry, and normalized URL is a
legacy fallback when stable identity is unavailable. Hostname, display name,
IP address, and loopback transport are never sufficient identity. In
particular, `localhost` and `127.0.0.1` do not automatically make a registered
Agent the managed Local Agent; that role is assigned by verified Local Agent
discovery or an explicit migrated Local Agent record.

Node-aware renderer requests capture `nodeId` from the canonical selection.
`src/ipc/nodeContext.js` rejects missing node context for feature IPC. Node
selection, health, credential, and deletion IPC also require an explicit id and
never redirect malformed requests to `application-host`.

Renderer request contexts contain the selected node id, selection version, and
per-request serial. Delayed responses are applied only while all three remain
current. Navigation state for Files is additionally keyed by target/profile.

The selected node is persisted in `nodes.json`. Startup restores a valid
selection; missing nodes are recovered deliberately through
`activeNodeSelectionService`, not through page-local inference.

Renderer node-registry refreshes carry the same selection version and request
serial as feature requests. A delayed refresh is discarded after a switch.
Transient registry failures retain the prior selected id as stale/unavailable;
they never rewrite it to `application-host`. Only the explicit startup
contract may initialize an unavailable node API to the built-in host.

Destructive IPC carries the explicit target through authorization and service
routing. UI hiding is never used as target validation.

The Instances IPC domain rejects every request without an explicit `nodeId`
before authorization or service routing. Console command options are preserved
through preload so a command executes against the target captured when the user
submitted it, even if selection changes while the request is in flight.
The allowlisted generic action bridge applies the same explicit-target gate.
Marketplace installation and download-manager IPC also reject omitted targets;
catalog browsing remains intentionally node-independent.
Agent Control listing uses the same canonical `nodeId` payload; the legacy
`selectedNodeId` service option remains internal-only for compatibility.
Security Center requires `nodeId` because Agent-token and remote-access status
are computed for that selected execution target.

Dashboard metrics, Nodes/Agent Control, Marketplace installs, Instances,
Docker, Files, Console, Backups, Public Access, Settings connection actions,
Security Center, Owner Workspace node views, and developer diagnostics all
consume the canonical selection or an explicit target captured from it. Pages
may keep target-keyed presentation caches, but they do not choose an active
machine independently. Target-independent catalog/settings reads are marked by
their IPC contract and do not silently fall back to the application host.
