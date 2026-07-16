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
and tunnel operations are enforced in trusted code.

## Agent

The Agent authenticates requests before routing. Pairing endpoints are
rate-limited and issue permanent credentials through the pairing workflow.
Action and route permissions are checked server-side. Filesystem paths are
canonicalized against configured roots; target symlinks are rejected and file
writes are atomic.

## Secrets and diagnostics

Tokens are stored separately from public node metadata. Authorization headers,
passwords, tokens, API keys, session values, large base64 payloads, and URL
credentials pass through shared redaction before persistence or diagnostics.
Agent error responses omit stack traces and raw upstream bodies.
