# Local Agent and Website Architecture Audit

Phase: 1  
Date: 2026-07-14  
Scope: AnxOS Control Center desktop app, bundled Agent, website download flow, and release metadata plumbing.

## Current Architecture

AnxOS Control Center is an Electron desktop application with a trusted main process, a context-isolated renderer, and IPC APIs exposed through `preload.js`. Most privileged behavior is implemented in `src/services/*` and registered through `src/ipc/*`.

The application currently supports three execution concepts:

- Application host: the computer running the desktop app, represented by `application-host` from `src/services/applicationHostService.js`.
- Agent node: a remote or local HTTP Agent registered in `nodes.json` and routed through `src/services/nodeService.js`.
- Legacy local backend: `backendMode: "local"` paths that call desktop-local services such as `localInstanceService`, local Docker, and local filesystem code.

The bundled Agent is a Node HTTP server in `agent/src/server.js`. It exposes health, system, Docker, dependencies, files, instances, backups, public access, console, actions, and diagnostics routes under `/api/v1/*`. Authentication uses a shared bearer token from `src/shared/agentTokenStore.js` and `agent/src/auth.js`, with `/api/v1/health` intentionally public.

The desktop can start the Agent from the packaged app using Electron as Node (`ELECTRON_RUN_AS_NODE=1`) through `src/services/agentControlService.js`. The Agent script path resolves to `agent/src/server.js` inside the packaged app. Runtime config is stored as `agent-runtime.json`; shared token config is stored as `agent.json`; device identity is stored separately.

The node registry stores Agent nodes by stable Agent device identity when health can be read. It merges duplicate device IDs, exposes redacted token state to the renderer, and keeps `application-host` separate from Agent nodes.

The website is bundled in `website/`. `/download` uses `website/release-download-service.js` to query the configured GitHub release repository, classify assets, and show only assets whose download URLs belong to the approved release repository. `scripts/sync-website-release.js` writes `website/config.js` and updates `website/release-notes.json` from `release.json`.

Packaging is driven by `electron-builder` through `scripts/run-electron-builder.js`. Current build config includes `agent/package.json`, `agent/src/**/*`, app `node_modules/**/*`, and selected config files. Windows targets are NSIS setup and portable x64 builds.

## Reusable Services

- `src/services/agentClient.js`: shared HTTP client, token handling, Agent route wrappers, timeout handling, and redacted diagnostics.
- `src/services/nodeService.js`: node identity migration, selected-node persistence, duplicate Agent identity merge, remote health checks, and node testing.
- `src/services/serviceRouter.js`: routes Docker, instances, files, dependencies, backups, public access, and other operations to either application-host services or Agent APIs.
- `src/services/agentControlService.js`: local Agent lifecycle, runtime config, local health probing, remote Agent status, service/startup registration checks, and diagnostics.
- `src/shared/agentTokenStore.js`: strong token generation, fingerprinting, rotation, pairing-code parsing, and weak-token replacement.
- `src/shared/instances/instanceServiceCore.js`: shared instance lifecycle used by the Agent.
- `agent/src/services/fileService.js`: platform-aware Agent filesystem root validation and path containment.
- `agent/src/services/dependencyService.js`: dependency catalog checks, job tracking, sanitized output, and Linux package-manager installation flow.
- `src/shared/redaction.js` and diagnostics services: reusable secret sanitization and support bundle foundations.
- `website/release-download-service.js`: release asset classification and missing-asset tolerant rendering foundation.

## Missing Functionality

### Local Agent Discovery

There is no dedicated automatic discovery service for both `127.0.0.1` and `localhost`. `agentControlService` probes `127.0.0.1` only, and `nodeService` registers nodes only after explicit save or migration from effective Agent settings.

The local Agent is not automatically represented as a dedicated `This PC` Agent node. The current local identity split is:

- `application-host`: desktop host, display name `Windows Desktop` on Windows.
- configured Agent: effective `agent.json` backend target.
- local Agent control status: lifecycle status from `agentControlService`.

This makes it possible for Dashboard, Agent Control, Settings, Marketplace, Instances, and Files to show different labels or status interpretations for the same machine.

### Runtime Bundling and Installation

The packaged app includes Agent source files and app dependencies, but there is no separate production Local Agent runtime bundle with manifest, integrity metadata, migrations, managed install directory, log directory, backup directory, temp download directory, and production dependency pruning.

The app can start the Agent from the packaged Electron runtime, but there is no complete installer flow for a missing or corrupted Local Agent installation. Current controls start/stop/restart and install startup registration; they do not perform integrity verification, partial-install recovery, outdated-install migration, antivirus handling, disk-space checks, or installer rollback.

### Windows Service Support

Windows background startup is implemented as a scheduled task named `AnxOSAgent`, not as a proper Windows service. It uses `schtasks.exe /Create /SC ONLOGON /RL LIMITED`, so it starts on logon rather than at Windows boot and is tied to the user session. There is no Service Control Manager integration, service recovery configuration, crash restart policy at the Windows service level, or service log redirection contract.

### Local Pairing

The shared token system can generate and rotate strong tokens, and pairing-code parsing exists. Local automatic pairing is not yet a hardened local-only handshake. The current user-facing failure text still tells users to run `npm run agent:token:status` or `npm run agent:pair` on the Agent machine, which does not meet the no-terminal requirement.

Credentials are currently stored in JSON config files with `0600` mode where supported. The code does not yet use an OS secure credential store for Local Agent credentials.

### Onboarding

The onboarding UI exists in `index.html` and `app.js`, but it is not the requested Local Agent setup wizard. Current copy and flow still blend local desktop, remote Agent, and Debian Agent concepts. It does not provide the required setup-type choices, persisted Local Agent install progress, automatic pairing, dependency scanning, storage choice, and plain-English repair path.

### Dependency Management

The dependency registry covers Java, .NET runtime, SteamCMD, Docker, Docker Compose, Node.js, npm, Python, archive tools, Git, Bash, PowerShell, Tailscale, Cloudflared, Playit, and Wine. Detection is command/PATH based. Installation is Linux package-manager based for `apt` and `dnf`.

Windows-specific dependencies required by the goal are incomplete:

- No managed Windows installers for Java, Git, SteamCMD, .NET Runtime, .NET Desktop Runtime, FFmpeg, Tailscale, Cloudflared, Playit, Docker Desktop, or VC++ runtime.
- No private-runtime awareness beyond command detection.
- No checksum/signature verification model for Windows dependency installers.
- No reboot-required detection contract.

### Marketplace and Instances

Marketplace installation already routes to selected nodes and can install provider packs through Agent APIs. However, several templates and installer paths still assume Linux:

- Many templates use `bash`, `chmod`, `.sh`, Linux Steam paths, or Linux-only artifact resolvers.
- FiveM resolver targets Linux artifacts.
- SteamCMD templates expect Linux server binaries for Valheim, Rust, CS2, Palworld, and similar servers.
- Generic installer script generation writes `runtime/marketplace-install.sh` and executes `bash`.

The shared instance core has some Windows process support, but Local Windows Marketplace installs need platform-specific startup commands, Windows-safe archive handling, process tracking of real server processes, and template capability gating.

### Filesystem and Backups

Agent filesystem access has a good root-containment base, but the current Local Windows UX does not expose the requested safe shortcuts such as Desktop, Documents, Downloads, AppData, ProgramData, Steam libraries, managed instances, and managed backups.

Backups are routed through Agent APIs, but Phase 1 did not find a Windows-specific backup/restore contract that covers locked files, archive traversal validation evidence, required disk space display, restore safety snapshots, and retention UX for Local Windows.

### Public Access

Public Access has shared provider detection and supports Playit, Tailscale, Cloudflare Tunnel, and manual records at varying capability levels. It does not yet fully satisfy Local Windows requirements:

- Windows service/authentication state detection is incomplete for providers.
- Windows Firewall rule detection and consented rule creation are not implemented.
- Provider readiness can still be based mostly on binary or partial CLI evidence for some paths.

### Local Agent Updates

Desktop app updates exist through `src/services/updateManager.js`, release metadata, and website release assets. A separate safe Local Agent update mechanism is not present. There is no Local Agent package validation, stop/backup/replace/migrate/restart/health-verify/rollback flow.

### Diagnostics and Repair

Diagnostics are already a strong foundation, with sanitized logs, latest-error/runtime-state/live logs, remote diagnostic capture, and Agent Control repair actions. Missing Local Agent diagnostics include:

- Installation integrity checks.
- Token secure-store state.
- Port owner identification.
- Windows service details from SCM.
- Managed runtime/package version.
- Dependency summary with Windows installer state.
- Export specifically scoped for Local Agent support.

## Security Risks and Boundaries

- `/api/v1/health` is public and currently returns token configuration state, token fingerprint, and config path. Fingerprints are useful for diagnostics, but config paths and token-state details should be reviewed before normal-user Local Agent exposure.
- Several Agent/desktop error paths include stack traces and internal file paths in diagnostics details. Diagnostics are sanitized in exports, but normal-user UI should avoid raw details by default.
- Agent tokens live in JSON config files, not a platform secure store. File permissions are set where possible, but Windows ACL validation and secure storage are not implemented.
- Current auth failure copy instructs terminal token commands, which is both poor UX and risks users sharing tokens during support.
- Automatic local pairing needs a local-only takeover prevention design. A process listening on the expected port could currently be treated as an Agent if it answers compatible health routes and token state is later configured.
- Release packaging includes broad `node_modules/**/*`. A production Local Agent runtime should be pruned and audited separately to avoid unnecessary files and reduce secret/config leakage risk.
- CurseForge handling is routed through trusted backend/Agent proxy paths, but future release and website work must continue excluding private API keys from renderer, website, packages, logs, and diagnostics.

## Windows-Specific Limitations

- Local Agent service management is not a real Windows service; it is scheduled-task based.
- The scheduled task starts on logon and does not guarantee operation when the Desktop app is closed before a user logs in.
- Elevation handling currently tells users to run the app as Administrator instead of requesting elevation only when needed.
- Dependency install support is Linux package-manager oriented.
- Network counters in Agent system stats are Linux-only.
- Marketplace templates often use Bash, Linux paths, Linux binaries, `chmod`, and `.sh` startup scripts.
- Default Agent instance root is `/srv/anxos/instances` unless overridden by the desktop runtime environment, so service/runtime install paths need explicit Windows defaults.
- Windows firewall and provider service readiness are not integrated.
- There is no Windows SCM repair/remove/preserve-data uninstall flow.

## Remote Debian Assumptions

- Product metadata still describes the app as a control center for a Debian server.
- Default SSH profiles are Debian-oriented.
- Marketplace UI copy says templates create instances through the existing Debian Agent API.
- Instances page copy describes services managed by the Debian Agent.
- Agent auth failure text tells users to run npm commands on the Debian Agent machine.
- Many Marketplace templates and installers assume Linux shell semantics and Linux server artifacts.
- Dependency installation assumes `apt` or `dnf`.
- Several help and onboarding strings frame remote Agent setup as the expected path.

## Desktop, Local Agent, and Remote Agent State Mixing

Current state is split across:

- Desktop runtime and application host identity.
- `agent.json` effective backend mode and configured Agent URL/token.
- `nodes.json` selected Agent node and remote nodes.
- Agent Control local status for the bundled localhost Agent.
- Renderer-level selected node state.

This creates ambiguous cases:

- The Desktop can be running while the Local Agent is not installed or not running.
- A remote Agent can be selected while local Agent controls still show local process/service state.
- `application-host` can appear as the local computer while a localhost Agent is separately shown as configured or remote Agent.
- Local health status can be `Running` while node registry still has no dedicated Local Agent node.
- Auth-required local Agent state is not consistently distinguished from offline/unreachable.
- Version mismatch and repair-required states do not have a shared status enum across Dashboard, Agent Control, Settings, and node selectors.

## Website and Release Repository Findings

The website currently has a download page that:

- Queries the configured release repository through the GitHub releases API.
- Classifies Windows setup, Windows portable, Windows MSI, Linux AppImage, Linux deb, and checksum assets.
- Avoids displaying assets from unapproved repositories.
- Handles loading and missing assets gracefully at a basic level.

Gaps for the requested Local Agent launch:

- The primary CTA is generic, not `Download AnxOS for Windows`.
- Installer versus portable is not explained for beginner users.
- Local Agent purpose, setup, service behavior, privacy, and uninstall behavior are not explained.
- System requirements are minimal and do not mention Local Agent installation, administrator permission, storage, server resource expectations, or public access requirements in enough detail.
- Installation guide is not the requested no-terminal Windows Local Agent flow.
- FAQ coverage for Local Agent is missing.
- Website config currently points at build 145 while `release.json` in the working tree is build 146, so metadata sync is stale.
- Release repository integration is referenced by config and website code, but this repository does not contain release artifacts. Publishing and artifact validation must be performed against the configured release repository before any production release claim.

## Implementation Notes for Later Phases

- Introduce a single Local Agent status model before changing UI pages. It should represent desktop running, local runtime installed, service installed, service state, process state, auth state, version compatibility, and repair/update requirements separately.
- Add a stable `This PC` Agent node identity that is independent from Windows hostname and distinct from `application-host`.
- Keep the shared node interface and route platform-specific behavior through capabilities rather than duplicating pages.
- Replace terminal-oriented token commands with local pairing and repair actions in trusted main-process code.
- Treat Windows service support as a new service-manager backend rather than extending scheduled-task semantics.
- Make Marketplace templates declare platform support and startup variants before enabling Windows Local Agent installs.
- Make release/website display consume an artifact manifest that is generated from actual uploaded files, not only static version metadata.

## Phase 2 Discovery Note

Local Agent discovery now lives in `src/services/nodeService.js` so localhost Agent detection feeds the same node registry used by remote Agents. The registry probes both `http://127.0.0.1:<configured-port>` and `http://localhost:<configured-port>`, names a discovered local Agent `This PC`, marks it with `localAgent: true`, and merges localhost entries by a temporary local identity until the Agent health endpoint returns a stable device ID.

The Phase 2 implementation distinguishes local desktop presence, local Agent reachability, authentication-required health, and remote-node availability in node connection metadata. It does not yet install the Agent, create a Windows service, perform secure automatic local pairing, or verify Desktop/Agent version compatibility; those remain later-phase work.
