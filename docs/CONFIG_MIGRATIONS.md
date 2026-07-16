# Configuration Migrations

Persisted formats with explicit schema versions include the node registry,
node credential store, settings preferences, forgotten-instance state, public
access registry, and long-operation records.

`nodes.json` currently uses schema version 3. Reading an older schema:

1. Preserves `nodes.json.schema-v<version>.backup` once.
2. Normalizes legacy node shape and selection.
3. Moves Agent tokens to the protected credential store.
4. Atomically writes schema version 3.

Repeated reads are idempotent. A future schema returns
`NODE_SCHEMA_UNSUPPORTED` without changing the file. Invalid JSON is preserved
as `nodes.json.corrupt.backup` and returns `NODE_CONFIG_CORRUPT`.

`node-agent-credentials.json` uses schema version 2. Legacy plaintext tokens
are migrated to an encrypted payload using the shared secure-storage
implementation; the one-time migration safety copy is independently encrypted
so it does not leave plaintext secrets at rest. Future schemas return
`NODE_CREDENTIAL_SCHEMA_UNSUPPORTED` without changing the file. Invalid JSON is
preserved in a timestamped copy; payloads that cannot be decrypted fail with
`NODE_CREDENTIAL_DECRYPT_FAILED` rather than silently dropping credentials.

Long-operation state uses schema version 1 and atomic writes. Active records
recover as `interrupted`; runtime handlers are not persisted. Corrupt input is
preserved in a timestamped diagnostic copy and returns
`OPERATION_STATE_CORRUPT`. Future schemas return
`OPERATION_SCHEMA_UNSUPPORTED` without changing the file. Other stores must not
be described as migration-safe until their readers implement equivalent
future-version rejection and backup behavior.
