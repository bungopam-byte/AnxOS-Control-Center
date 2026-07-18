# AnxOS Control Center Architecture

## Runtime boundaries

- `main.js` owns Electron startup, privileged IPC registration, window policy,
  updater lifecycle, and shutdown disposal.
- `preload.js` is the context-isolated renderer bridge. Node integration is
  disabled and the renderer sandbox is enabled.
- `app.js` owns renderer state and presentation. It does not hold Agent tokens
  or authorize privileged actions.
- `src/services/` contains Desktop main-process services and node routing.
- `src/shared/` contains code used by both Desktop and the standalone Agent.
- `agent/src/server.js` is the authenticated Agent HTTP boundary. Agent routes
  delegate to services and permission checks.

## State ownership

- Node registry and selected node: `src/services/nodeService.js`.
- Protected per-node credentials: `src/services/nodeCredentialStore.js`.
- Canonical selection notifications: `src/services/activeNodeSelectionService.js`.
- Agent-backed feature routing: `src/services/serviceRouter.js`.
- Long-running backend records: `src/shared/longOperationService.js`.
- Renderer operation presentation is separate and is not execution ownership.

Services are composed in `main.js` and passed into domain IPC registrars. IPC
registrars own boundary validation and authorization; services own domain
state and side effects. The Agent uses the same separation in
`agent/src/server.js`: authentication and API-capability middleware execute
before routes, and routes delegate to shared or Agent-specific services.

Node-aware Desktop services receive an explicit node context. Local application
host execution, a registered Local Agent, and a remote Agent are separate
targets; routing does not infer one from another. The renderer mirrors the
canonical selected id only for presentation and stale-response guards.

## Persistence

Configuration is stored below the resolved AnxOS config directory. Sensitive
credentials use dedicated stores and are omitted from public node records.
Versioned stores write atomically, preserve a migration/corruption backup, and
refuse unknown future schemas. Store-specific versions and failure behavior are
listed in `CONFIG_MIGRATIONS.md`.

Startup loads configuration before accepting privileged work. The Desktop
registers local-instance recovery before IPC; the Agent repairs incomplete
Marketplace installs and backup artifacts before opening its HTTP listener.
Shutdown rejects new Desktop IPC, stops updater network activity, disposes
streams/listeners, and waits for owned instance processes. Agent shutdown
closes the listener and sockets before stopping owned instances.

## Packaging

Electron Builder includes `src/shared/**/*` in the Desktop package and copies
the same JavaScript modules to `local-agent-runtime/src/shared`. This keeps the
packaged Desktop and standalone Agent on one shared implementation. Packaging
smoke coverage resolves and requires shared modules from the packaged Agent's
actual resource depth, rather than checking file presence alone.

## Known boundaries

The renderer's operation list is presentation state, not a durable task engine.
Recovered backend operation records are marked interrupted; executable retry
and cancellation handlers are intentionally not serialized.
The Desktop updater is intentionally outside the shared operation registry. It
uses its own single-flight guards, cancellable HTTP/file handles, atomic
checksum-verified download commit, and no claimed installer rollback.
