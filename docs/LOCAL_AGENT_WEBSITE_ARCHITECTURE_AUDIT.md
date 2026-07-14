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

Windows background startup was implemented as a scheduled task named `AnxOSAgent` during the Phase 1 audit. Phase 5 replaces the Windows path with Service Control Manager commands, but real Windows service validation still requires testing on Windows.

### Local Pairing

The shared token system can generate and rotate strong tokens, and pairing-code parsing exists. Phase 6 adds a dedicated Local Agent pairing path that only accepts loopback Agent URLs, writes Desktop-side local credentials through the existing encrypted secure-session store, stores only fingerprints in renderer-visible responses, and keeps manual pairing-code handling scoped to remote Agent setup.

The Agent process still needs access to the shared token through the managed Agent configuration file, so that file remains permission-restricted with `0600` mode where supported. Desktop-side Local Agent pairing state is mirrored in `local-agent-credentials.json` through Electron `safeStorage` or the existing AES-GCM local fallback. A stronger local takeover prevention handshake and migration away from any plaintext Agent-process credential remain later hardening work.

### Onboarding

The onboarding UI exists in `index.html` and `app.js`. Phase 7 reshapes it into the requested beginner flow: Welcome, Choose Setup Type, Prepare This PC, Install Local Agent, Pair Securely, Scan Dependencies, Choose Storage, and Finish Setup. Setup type is persisted as `Use This PC`, `Connect a Remote Server`, or `Configure Both`; remote-only mode explicitly skips Local Agent installation instead of forcing it.

The wizard now routes Local Agent install, repair, pairing, dependency scan, and storage review through existing Agent Control and Dependency Manager actions. It still needs real Windows validation of installer progress persistence across reboot and the later dependency-install phases before broad release.

### Dependency Management

The dependency registry covers Java, .NET runtime, .NET Desktop Runtime, SteamCMD, Docker, Docker Compose, Node.js, npm, Python, archive tools, Git, Bash, PowerShell, FFmpeg, Tailscale, Cloudflared, Playit, Visual C++ runtime, and Wine. Detection is command/PATH based on Linux and Windows-aware on Local Windows Agents, including Windows command extensions, alternative PowerShell commands, registry-backed Visual C++ runtime detection, and private AnxOS Node runtime awareness.

Windows-specific dependencies required by the goal are incomplete:

- No managed Windows installers for Java, Git, SteamCMD, .NET Runtime, .NET Desktop Runtime, FFmpeg, Tailscale, Cloudflared, Playit, Docker Desktop, or VC++ runtime yet.
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

- Local Agent Windows service management uses SCM commands after Phase 5, but real-machine validation is still required.
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

## Phase 3 Runtime Bundle Note

Packaged builds now include an unpacked `local-agent-runtime` resource through `electron-builder` `extraResources`. The bundle contains the Agent source, required shared runtime modules, the Agent config template, Marketplace template metadata, and a runtime manifest. It excludes logs, runtime config directories, `.env` files, source maps, package lockfiles, and dependency trees that are not required by the Agent runtime.

`src/services/localAgentRuntimeService.js` resolves the managed runtime path. Development builds continue to use the repository tree, while packaged builds prefer `process.resourcesPath/local-agent-runtime`. `agentControlService` starts the Agent with Electron's Node runtime (`ELECTRON_RUN_AS_NODE=1`) and sets production runtime environment variables, so the Local Agent does not depend on globally installed Node.js. Renderer-facing status only exposes non-sensitive runtime metadata.

## Phase 4 Installer Note

Agent Control now exposes an in-app `Install Local Agent` action. The trusted main process validates the bundled runtime, creates managed config/data/logs/instances/backups/temp directories, writes runtime configuration, rotates the shared local Agent credential without returning the raw token, attempts background-startup registration, starts the bundled Agent, verifies the local connection, refreshes nodes, and reports beginner-readable installer steps.

The installer handles missing runtime, busy operations, service elevation blocks, and failed verification with structured step states. Installer rollback, antivirus-specific recovery, disk-space preflight, and full interrupted-install resume remain later-phase work.

## Phase 5 Windows Service Note

Windows background startup now uses the Windows Service Control Manager path (`sc.exe`) instead of scheduled tasks. The service manager can query, create, start, stop, disable, delete, and validate the `AnxOSAgent` Windows service, configures automatic startup, writes service environment values under the service registry key, and configures restart-on-failure recovery actions. Linux systemd user service behavior is preserved.

This phase updates source-level validation and Linux smoke coverage. It does not claim real Windows SCM validation because these checks were run from the current Linux development environment.

## Phase 6 Local Pairing Note

Local Agent installation, setup repair, and token rotation now use `localAgentPairingService` rather than the remote pairing-code path. The service rejects non-loopback URLs, switches the Desktop to the localhost Agent backend, generates or rotates a strong shared token, writes an encrypted Desktop credential record, and returns only status, restart requirements, and token fingerprints to the renderer.

Remote Agent pairing remains available through `ANXOS-PAIR` codes in Settings. Local Agent pairing does not require a terminal, JSON edits, or token copying. The current implementation is source- and smoke-tested on Linux; real Windows validation of secure storage and service restart behavior is still required before a production release.

## Phase 7 Onboarding Note

The setup wizard is now Local Agent first for normal users while preserving an intentional remote-only choice. The `onboarding.setupType` preference is validated and persisted, the eight requested wizard steps render from one shared modal, and actions reuse existing Agent Control and dependency APIs rather than duplicating setup logic. Local install and pairing buttons avoid raw tokens and show plain-English status cards.

The implementation has source and smoke coverage only. Real Windows validation is still required for administrator prompts, service installation, progress recovery after restart, and dependency scan/install behavior.

## Phase 8 Dependency Scanner Note

The dependency scanner remains routed through the selected Agent and now has Windows-aware registry and PATH detection. Renderer labels map scanner states to beginner-readable statuses such as Ready, Not installed, Update available, Installed but unavailable, Unsupported, and Detection failed. Dependency rows include detected version, required version, installation source, package/source mapping, verification status, update status, and elevation requirement data where available.

This phase does not install Windows dependencies. Real Windows validation is still required for Docker Desktop, Visual C++ runtime registry detection, .NET Desktop Runtime detection, and provider-specific public-access tools.
