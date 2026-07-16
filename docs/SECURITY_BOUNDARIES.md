# Security Boundaries

## Renderer and preload

The renderer is untrusted presentation code. Electron context isolation and
sandboxing are enabled; Node integration is disabled. `preload.js` exposes a
bounded API. Visibility, disabled controls, and developer-mode UI are not
authorization controls.

## Desktop main process

IPC handlers validate payloads and call `securityService.requirePermission`
for privileged mutations. Node-aware handlers require explicit target context.
Owner workspace, node deletion, token rotation, restore, command execution,
instance creation/configuration, instance file mutation, log deletion, and
tunnel operations are enforced in trusted code. SSH profile/session control,
Docker network attachment, transfer cancellation, and connection tests also
authorize in the main process before reaching their service.

Diagnostics capture, log reads, clipboard summaries, folder access, and bundle
export require `settings:write`. Single-device mode receives the trusted local
grant; configured deployments require an authorized Admin or Owner. Renderer
error ingestion remains available and is sanitized before persistence.

The generic Agent action bridge uses an explicit action-to-permission map.
Docker and AMP lifecycle, backup create/restore, and file mutations authorize
before reaching the Agent; unknown action IDs fail closed.

Backup archive import and export authorize before reading archive bytes,
contacting an Agent, or opening a desktop file picker.

Marketplace manual-download handoff, file import, resume, cancellation, and
retry remain inside the original `marketplace:install` authorization boundary.

File listing, identity, connection metadata, reads, downloads, and disconnects
require `files:read`; storage connection tests require `settings:write` before
any outbound connection is attempted. Admin and User roles retain file-read
access, while signed-out configured deployments fail closed.

Unsaved node connection probes require `settings:write` before accepting an
arbitrary Agent URL or attempting outbound authentication.

Instance listing, status, metrics, logs, files, and game-configuration reads
require `instance:read`. Admin and User roles retain read access; configured
signed-out sessions cannot query local or remote instance data.

Docker inventory, inspection, logs, stats, Compose reads, and cleanup previews
require `docker:read`. Admin and User roles retain read access; configured
signed-out sessions cannot use the main process as a Docker data proxy.

Backup inventory and schedule reads require `backups:read`. Admin and User
roles retain read access; archive import/export and all mutations keep their
stronger write/restore permissions.

System metrics, dependency catalog/check/plan data, AMP snapshots, and public
access/Playit state require explicit read grants and node context. Admin and
User roles retain these operational reads; configured signed-out sessions do
not.

Marketplace catalog, provider search/details, import capability, and download
state require `marketplace:read`. Admin and User roles retain browse access;
install and continuation actions keep `marketplace:install`.

Node registry, selected-target restoration/selection, health, connection tests,
and credential status require `nodes:read`. Admin and User roles retain node
visibility; node mutation and credential repair keep `settings:write`.

SSH profile visibility and live session events require `ssh:read`. Session
creation, input, disconnect, and resize remain protected by `instance:write`;
profile changes require `settings:write`.

Renderer and preload diagnostic writes require `system:read`, are rate-limited,
bounded, and pass through shared structured-log redaction. Diagnostic capture,
reading, export, clipboard, and folder access require `settings:write`.

Global preference reads require `settings:read`; preference saves and scoped
resets require `settings:preferences:write`. Owner-only keys and categories
also pass the existing Owner capability checks. The public permission-discovery
handler exposes only effective role/capability metadata and remains available
to render signed-out states.

Production update state, checks, and release-page access require `system:read`.
Downloading, installing, skipping, or launching an update download require
`settings:write`. Developer update handlers additionally require the trusted
developer-settings capability. Both domains normalize and redact failures
through the shared IPC error contract before returning them to the renderer.

The Add Storage workflow is bound to concrete BrowserWindow identities. Only
the main application window can open it, after `settings:write` authorization,
and only the created child window can close it or report a saved connection.
Sender checks occur again for every invocation.

Owner Workspace lock status is intentionally readable for navigation, but it
does not expose workspace contents or local storage paths until trusted Owner
authorization succeeds. Every workspace operation rechecks Owner access in the
main-process service.

## Agent

Desktop Agent Control list, status, diagnostics, configuration, lifecycle,
pairing, repair, update, service registration, and filesystem-opening IPC
handlers require the trusted Owner boundary before invoking their services.
This requirement still permits the established unconfigured trusted-local
first-run mode; once local security is configured, a signed-out renderer
cannot inspect or mutate Agent state.

The Agent authenticates requests before routing. Pairing endpoints are
rate-limited and issue permanent credentials through the pairing workflow.
Action and route permissions are checked server-side. Filesystem paths are
canonicalized against configured roots; target symlinks are rejected and file
writes are atomic. Recursive Agent copies validate every source entry, reject symbolic links and
special files, stage into a temporary sibling, and become visible through a
rename. Existing files require an explicit replacement decision; existing
directories are not replaced because that operation cannot currently provide
atomic rollback.

Authenticated Agent HTTP requests also pass an API-capability permission map
before routing. `AGENT_API_PERMISSIONS` accepts exact permissions and category
wildcards; omitted configuration defaults to `*` for backward compatibility.
Restricted credentials can independently allow system, Files, Console,
Instances, Backups, Docker, Dependencies, Marketplace, Public Access,
diagnostics, and generic-action surfaces. Pairing remains a separate
local/one-time-code boundary.

Instance file paths are confined to the instance `data/` root. Write
preparation resolves the nearest existing ancestor before creating directories,
then revalidates the resulting parent; paths through symlinks cannot create
outside-root side effects. Listings use link metadata without following link
targets, and editor writes use atomic sibling-file replacement.

## Secrets and diagnostics

Node tokens and Marketplace provider keys are stored in encrypted, versioned
payloads separately from public metadata. Authorization headers, passwords,
tokens, API keys, session values, large base64 payloads, and URL credentials
pass through shared redaction before persistence or diagnostics. Agent error
responses omit stack traces and raw upstream bodies.
