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
domains wrap failures with stable codes and sanitized details. Expected Agent
HTTP and transport failures omit raw stacks from local logs, renderer output,
and Agent API responses; stable codes and cause-code metadata remain available.

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
Security IPC uses the shared model for authentication, session, trusted-device,
remote-access, token, and emergency-action failures. Its boundary logs use only
the normalized, redacted fields.
Account authentication IPC retains its existing `{ok:false,error}` failure
shape and now fills the complete shared contract for device login, password
login, refresh, logout, and device-management failures.
Owner Workspace IPC uses the shared model for authorization, page/content,
feature-flag, API console, command, and log-viewer failures.
Marketplace IPC retains its existing `{ok:false,error}` failure shape and adds
the shared contract around provider-specific UI details. Boundary logs contain
only redacted normalized fields, never raw responses, payloads, or stacks.
Dependency IPC retains its existing `{ok:false,error}` shape and uses the shared
contract for detection, planning, install, capability, and verification errors.
Public Access IPC retains its existing `{ok:false,error}` read and mutation
failure envelopes while adding the shared friendly, technical, retry, status,
provider, and redacted diagnostic fields. Unexpected read failures reject as a
shared IPC error rather than exposing their original object.
