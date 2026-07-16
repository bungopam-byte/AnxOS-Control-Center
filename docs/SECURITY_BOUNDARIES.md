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
