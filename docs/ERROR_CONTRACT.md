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
