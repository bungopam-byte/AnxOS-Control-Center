# Private Alpha Readiness Audit

Date: 2026-07-13
Branch: `dev`
Release channel: Private Alpha
Scope: Desktop application, website, Agent, Marketplace, Nodes, Public Access, Files, Docker, Security, Diagnostics, Operations, and documentation.

This audit is for a limited Private Alpha with trusted testers. It is not a public beta or v1.0 release review. The goal is to identify consistency, polish, documentation, and workflow gaps without proposing major new architecture.

## Executive Summary

AnxOS Control Center is close enough for controlled real-machine validation, but not ready for broad public testing. The core workflows now have substantial smoke coverage and recent live validation for Anxlab Agent files, node health, and Palworld Marketplace installation. The remaining Private Alpha work is mostly onboarding, wording consistency, documentation clarity, and making unsupported or not-yet-tested states obvious.

The main release-readiness risk is not a single known critical defect. It is tester confusion: many workspaces can technically fail safely, but the first-time path does not always explain what to do next, what requires a remote Agent, what is local-only, or which capabilities are intentionally unavailable in Private Alpha.

## Critical Findings

No unresolved critical blocker was found during this source-level audit.

Critical issues would include token leakage, broken app startup, impossible Agent connection, impossible Marketplace install, or destructive instance/file behavior. Recent smoke tests and live validation reduce risk in those areas, but final release gating still needs Windows desktop runtime verification.

## High Priority Findings

### First-Time User Experience

- Several workspaces have empty states, but they vary in quality and specificity. Some tell the user that nothing is available without explaining the next action.
- New users can land in advanced pages such as Docker, Public Access, Files, or Diagnostics without enough context about whether they need a local Agent, remote Agent, dependency install, or node selection.
- The relationship between Local Application Host, Local Agent service, and remote Agent nodes is technically represented, but it needs clearer onboarding copy.
- Dependency guidance exists, but the expected order is not always obvious: connect node, check dependencies, prepare node, install Marketplace template, then start instance.

### Status and Health Wording

- The application uses many related state words: `Unavailable`, `Unknown`, `Not Tested`, `Warning`, `Degraded`, `Offline`, `Stopped`, and `Starting`.
- Node health has a shared engine, but some surrounding UI copy still risks implying a failure where the result is only not tested or unsupported.
- Agent Control and Diagnostics sometimes expose implementation terms such as preload bridge, IPC bridge, or endpoint availability. This is useful for debugging but can confuse Private Alpha testers unless paired with plain recovery guidance.

### Marketplace Expectations

- Marketplace install coverage is now stronger, including Palworld SteamCMD, but tester instructions need to state that first installs may take several minutes and can be network or disk-space bound.
- Some provider and dependency failures are recoverable, but the expected recovery path is split between Marketplace progress, Download Manager logs, Dependencies, and Diagnostics.
- Private Alpha testers need explicit guidance that not every template is equally production-ready.

### Public Access Clarity

- Public Access has provider/service actions and diagnostics, but testers need clearer expectations about supported providers, local endpoint requirements, and what "public reachability" means.
- Unsupported provider capabilities must remain visible as unsupported, not as dead controls.

### Website Release Discovery

- The download page is production-safe and uses a public release repository, but it depends on published release assets existing there. If no release exists or assets are missing, the page correctly shows unavailable states.
- Documentation must clearly distinguish source repository, public release repository, and the Private Alpha distribution process.

## Medium Priority Findings

### UI Consistency

- Button classes and visual patterns are generally consistent, but older areas still mix labels such as `Logs`, `View logs`, `View installer logs`, `Refresh`, and `Reload`.
- Empty states exist across many workspaces, but visual density and action placement differ.
- Some pages use diagnostic-style wording in user-facing copy; Private Alpha copy should be calmer and action-oriented.
- Disabled states often exist, but not every disabled control explains the reason inline.

### Documentation Gaps

- `README.md` still contains older wording such as static/manual dashboard card notes that may no longer describe current behavior.
- Agent setup, dependency setup, Marketplace install, Public Access, troubleshooting, known limitations, and Private Alpha tester expectations should be centralized.
- Real-machine validation docs exist, but tester-facing setup instructions need to be shorter and safer.
- Documentation should explicitly warn testers not to paste tokens or secrets into bug reports.

### Operations and Diagnostics

- Operations are useful for current and historical activity, but the distinction between current blockers and historical failures should be repeated in docs and UI copy.
- Diagnostics can capture/export bundles, but tester instructions should say when to use it and what is redacted.
- Agent and desktop logs are technical by design. Private Alpha documentation should explain which logs are useful for bug reports.

### Docker

- Docker capability detection and route compatibility have smoke coverage, but Docker remains environment-dependent.
- Docker controls should remain disabled with a reason when Docker is not installed, daemon is unavailable, or a node lacks capability manifest support.
- Tester docs should mark Docker as optional unless the tester explicitly has Docker installed on the selected node.

### Files

- Recent Files fixes addressed cross-platform path isolation and Agent root authorization. The current risk is configuration drift: stale profile state or changed Agent filesystem root can still confuse testers.
- Documentation should explain local Windows profile versus Anxlab Agent filesystem profile and where `/home/anx` comes from.

## Low Priority Findings

- Some developer-focused files and patch artifacts remain in the repository root. They are not necessarily shipped, but they make the repo feel less release-ready.
- Website account/profile pages have placeholder examples in form placeholder text. These are acceptable, but docs should avoid fake operational claims.
- Some code comments and diagnostic strings are implementation-heavy; this is acceptable for Private Alpha if the main UI gives plain guidance.

## Area-by-Area Notes

### Desktop Application

Strengths:

- Core Electron security boundaries are preserved through preload/IPC.
- Many workspace-level smoke tests exist.
- Local desktop identity is now treated as a managed node.

Risks:

- First launch can feel dense because many advanced workspaces are visible before setup is complete.
- Some disabled controls lack nearby recovery copy.
- Final validation must happen in Windows development mode with `npm start`.

### Website

Strengths:

- `/download` renders with progressive fallback.
- Release discovery uses the public release repository configuration and avoids browser tokens.
- Auth and download pages have smoke coverage.

Risks:

- If public release assets are absent, testers will see unavailable download metadata. This is correct but should be documented.
- Website docs must explain Private Alpha distribution versus public download availability.

### Agent

Strengths:

- Agent route and service coverage has improved.
- Files root identity and authorization now expose structured diagnostics.
- Docker, dependencies, files, backups, console, and instance routes have syntax validation.

Risks:

- Agent deployment must be kept in sync with desktop `dev` for features that call new endpoints.
- Linux package availability and permissions vary by host.

### Marketplace

Strengths:

- Shared installer pipeline is covered by smoke tests.
- Palworld SteamCMD path, artifact verification, retry, and log behavior were live validated.
- Numeric validation now returns field-specific errors.

Risks:

- External provider APIs and SteamCMD downloads are network-dependent.
- Some templates may need real-machine validation beyond smoke coverage.

### Nodes

Strengths:

- Local Windows desktop and remote Agents are represented separately.
- Node health aggregation is deterministic and shared.

Risks:

- Status wording still needs a final consistency pass so `Unknown`, `Not Tested`, and `Unavailable` are not interpreted as the same outcome.

### Public Access

Strengths:

- Provider details and capability-aware actions exist.

Risks:

- Private Alpha testers need clear setup guidance for local endpoint, public address, reachability, and provider diagnostics.

### Files

Strengths:

- Per-profile navigation isolation and Agent filesystem-root authorization have regression coverage.
- Linux Agent home/root behavior was live validated in the previous phase.

Risks:

- If Agent config changes without restart, testers may see root-related errors. This should be documented as a troubleshooting case.

### Docker

Strengths:

- Route compatibility and capability handling have smoke coverage.

Risks:

- Docker may be unavailable on many tester nodes; UI and docs should present it as optional.

### Security

Strengths:

- Owner-only operations remain protected in trusted processes.
- Redaction utilities are used for diagnostics and installer logs.
- Account/device workflows have smoke coverage.

Risks:

- Private Alpha docs must repeatedly tell testers not to share tokens, config files, or unredacted logs.

### Diagnostics

Strengths:

- Diagnostics runtime state bug was fixed.
- Snapshot, copy summary, and export bundle paths have coverage.

Risks:

- Diagnostic output is necessarily technical. Tester instructions should explain what to attach to bug reports.

### Operations

Strengths:

- Operations can show progress and failure evidence.
- Historical failures are separated from current health in the health model.

Risks:

- Users may still interpret old failed operations as current blockers unless docs and labels reinforce the distinction.

## Recommended Phase 12 Follow-Up

Phase 12B should focus on first-time empty states and setup guidance.

Phase 12C should unify labels, button wording, badges, and disabled-state explanations.

Phase 12D should produce tester-ready documentation:

- Private Alpha expectations
- Windows desktop setup
- Debian Agent setup
- Adding Anxlab or another Agent
- Marketplace install flow
- Public Access setup
- Troubleshooting
- Known limitations
- Safe bug-report checklist

Phase 12E should run the full smoke suite, document live validation that was actually performed, and honestly score readiness.
