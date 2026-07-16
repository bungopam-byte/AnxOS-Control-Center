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

## Agent

The Agent authenticates requests before routing. Pairing endpoints are
rate-limited and issue permanent credentials through the pairing workflow.
Action and route permissions are checked server-side. Filesystem paths are
canonicalized against configured roots; target symlinks are rejected and file
writes are atomic.

## Secrets and diagnostics

Node tokens and Marketplace provider keys are stored in encrypted, versioned
payloads separately from public metadata. Authorization headers, passwords,
tokens, API keys, session values, large base64 payloads, and URL credentials
pass through shared redaction before persistence or diagnostics. Agent error
responses omit stack traces and raw upstream bodies.
