# AnxOS Control Center Version 1.7 Build 156

## Who it is for

Private Alpha administrators managing dedicated servers with AnxOS Agents.

## New installations

Install the signed Windows package and complete first-run Agent pairing.

## Existing remote Agent users

Existing node registrations and remote Agent configuration are preserved.

## Maintenance fixes

- Security dashboard sections now show a clear unavailable state when the backend does not support them.
- SSH shell startup now times out with a structured error instead of remaining in Connecting forever.
- Large CurseForge server-pack downloads receive a scoped long-running download timeout.

## Upgrade guidance

Install Build 156 over Build 155. Existing nodes, pairing, instances, and configuration are preserved.

## Repair guidance

Use Agent Control repair or pairing recovery if a node reports stale credentials.

real-machine Windows installation should be completed before broad distribution.

## Validation

The accepted maintenance fixes were manually verified before release preparation. Complete real-machine Build 156 acceptance after installation.

Windows-only limitation: the packaged desktop release targets Windows for the local application host.
macOS Local Agent support is not documented or claimed.
