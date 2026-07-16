# Error Contract

Agent HTTP errors use:

```json
{
  "error": {
    "code": "STABLE_CODE",
    "message": "User-safe message",
    "details": {}
  }
}
```

Details may contain field, expected value, suggestion, status, provider, node,
or cause-code metadata. Agent responses never contain raw stacks or nested raw
response bodies. Sensitive keys and secret-shaped strings are redacted.

Desktop `AgentClientError` preserves HTTP status, stable code, sanitized Agent
payload, and transport cause. Transport categories include unavailable,
timeout, authentication rejection, version incompatibility, and TLS
verification failure.

IPC domains retain their existing renderer-facing success shapes. Migrated
domains wrap failures with stable codes and sanitized details. Raw stacks are
for redacted local diagnostics only and are not renderer or Agent API output.

`src/shared/ipcError.js` is the desktop failure normalizer. Its contract
contains `code`, `friendlyMessage`, `technicalDetails`, `suggestion`,
`retryable`, status metadata, provider metadata, redacted diagnostics, and a
cause code. The trusted main process retains the original cause as a
non-enumerable property; renderer-visible messages contain the stable code but
never serialize the raw cause. Backup IPC is migrated to this model.
Node IPC also uses this model, preserving pairing, authorization, connectivity,
and credential-repair codes through the desktop boundary.
Instance IPC uses the same model for lifecycle, crash recovery, configuration,
and instance-filesystem failures.
Docker IPC uses the shared model for daemon, image, container, volume, network,
Compose, and cleanup failures.
