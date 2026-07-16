# Recovery Model

## Operations

Active persisted operations become `interrupted` after restart, releasing
locks. Retry and cancellation are disabled until an owning service creates a
new executable attempt. Timeout-bounded locks prevent indefinite in-process
ownership.

## Agent connectivity

Authentication rejection, offline/unreachable, timeout, TLS failure, and
version incompatibility remain distinct states. Recovery actions use pairing,
credential repair/rotation, URL correction, service repair, or compatible
Agent update as appropriate.

Renderer recovery categories remain distinct for invalid Agent URL, TLS or
certificate failure, authentication rejection, unreachable/timeout, version
incompatibility, and duplicate registration. Each category exposes only safe
corrective actions; credential values and raw stacks are never recovery data.
Node registration preserves the original Agent status and stable failure code
when identity probing fails, instead of collapsing authentication, transport,
TLS, and timeout failures into a generic identity error.
Pairing completion is bounded to 15 seconds and aborts the underlying request.
Because a lost rotation response is ambiguous, timeout and transport failures
are not blindly retryable; recovery requires a fresh one-time pairing code.

## Instances

Runtime PID reconciliation detects live configured and detached processes.
Intentional stops do not auto-restart. Automatic restarts are bounded with
exponential backoff; exhaustion persists `CRASH_LOOP`. Manual lifecycle actions
cancel pending restart timers. Agent shutdown disposes scheduled restarts.

## Backup restore

Restore validates the archive, requires overwrite confirmation, verifies the
instance is stopped, checks free space on the snapshot and restore volumes, and
creates a full safety snapshot before mutation. Backup creation also checks the
destination volume before writing an archive. A partial restore failure restores
the safety snapshot. Rollback failure is reported separately as
`RESTORE_ROLLBACK_FAILED` and retains both cause codes.

## Shutdown

Desktop shutdown stops the updater and disposes Files and SSH services. Agent
shutdown stops scheduling, cancels pending restart timers, rejects new sockets,
drains existing sockets for up to five seconds, then exits.
