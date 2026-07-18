# Settings Permission Audit

Phase 1 audit for the Settings permission-gating work.

## Current Architecture

- Settings page markup is defined in `index.html` inside the `settings-workspace`.
- Renderer state, category activation, search, command navigation, and preference loading are handled in `app.js`.
- Persisted Settings definitions and validation live in `src/services/settingsPreferenceService.js`.
- Settings IPC is registered in `src/ipc/settingsIpc.js`.
- Existing authorization is centralized in `src/services/securityService.js`.
- Settings writes, Agent config writes, Agent pairing, and Marketplace config writes already use `requirePermission("settings:write", ...)` in IPC.
- Settings reads, category visibility, card visibility, search, command palette navigation, and persisted category restore are not yet filtered by Settings-specific capabilities.

## Exposure Surfaces

Settings entries are currently reachable through these surfaces:

- Sidebar category buttons using `data-settings-category-target`.
- Category sections using `data-settings-category`.
- Settings search from `data-settings-search` and `getSettingSearchEntries()`.
- Command palette commands that open Settings or security subsections.
- Buttons that deep-link to categories, including About -> Updates.
- Renderer session storage key `anxos-settings-category`.
- Local fallback preferences stored under `anxos.settings.v1`.
- Main-process persisted preferences in `preferences.json`.
- IPC methods exposed through preload:
  - `settings:getPreferences`
  - `settings:savePreferences`
  - `settings:resetPreferences`
  - `settings:getAgentConfig`
  - `settings:saveAgentConfig`
  - `settings:testAgentConnection`
  - `settings:pairAgent`
  - `settings:getMarketplaceConfig`
  - `settings:saveMarketplaceConfig`

## Classification Rules

- `PUBLIC USER`: Safe and useful for ordinary users to view and use.
- `OWNER ONLY`: Administrative, sensitive, internal, developer, infrastructure, diagnostic, or secret-bearing.
- `SHARED READ-ONLY`: Useful for ordinary users to view, but modification belongs to Owner-only controls.

## Category Classification

| Current category | Target user-facing category | Classification | Notes |
|---|---|---|---|
| General | General | PUBLIC USER | Safe personal preferences. Review default page choices so Owner-only pages cannot be selected by regular users. |
| Appearance | Appearance | PUBLIC USER | Safe visual preferences. |
| Startup | Startup | PUBLIC USER with future SHARED READ-ONLY controls | Splash, sound, restore window state are safe. OS login startup and Agent reconnect controls may need Owner gating once enabled because they affect host behavior. |
| Notifications | Notifications | PUBLIC USER | Safe notification preferences. |
| Security | Security / Owner-only Security | Mixed | Personal sign-in/session information can be visible to users. Owner management, Agent token rotation, audit logs, role/session administration, and remote security policy are OWNER ONLY. |
| Network | Network | Mixed | Basic connection status can be SHARED READ-ONLY. Agent URLs, proxy configuration, retry policies, service ports, trust, pairing, and raw infrastructure controls are OWNER ONLY. |
| Performance | Performance | PUBLIC USER with Owner-only future controls | Most current controls are disabled preferences. Hardware acceleration, log retention, polling, and background operation limits are administrative if enabled. |
| Storage | Storage | PUBLIC USER with Owner-only diagnostics | Maintenance navigation is safe. Opening raw logs or diagnostic folders is OWNER ONLY unless presented through a sanitized public view. |
| Backups | Backups | Mixed | Ordinary backup status/preferences are safe. Including nodes/integrations, import/restore, and configuration backup contents are OWNER ONLY when enabled. |
| Integrations | Connections | Mixed | Rename user-facing category to Connections. AMP/Minecraft/Public Access display can be public or shared read-only. Marketplace administration and provider credentials are OWNER ONLY. |
| Updates | Updates | Mixed | Installed version, public update checks, and release notes are public. Internal channels, developer Git updates, private feeds, source overrides, and forced metadata refresh are OWNER ONLY. |
| Developer | Developer | OWNER ONLY | Debug mode, diagnostics, raw logs, experimental toggles, and reset controls are internal. |
| About | About | PUBLIC USER | Runtime version information is safe. Git commit may remain public unless release policy changes. |
| Routing Diagnostics | Diagnostics | OWNER ONLY | Hidden development diagnostics expose routing and selected-node internals. |

## Control Classification

### General

| Control | Classification | Reason |
|---|---|---|
| App name / display name | PUBLIC USER | Personal display preference. |
| Default page on launch | PUBLIC USER with filtered options | Safe only when restricted destinations are omitted for non-Owner users. |
| Restore previous page on launch | PUBLIC USER with restricted-page fallback | Must not reopen Owner-only pages after permission loss. |
| Confirm before destructive actions | PUBLIC USER | Safe preference. |
| Language | PUBLIC USER | Disabled; safe. |
| External links | PUBLIC USER | Safe current single-option preference. |
| Reset General | PUBLIC USER | Safe category reset. |

### Appearance

All current Appearance controls are `PUBLIC USER`: accent color, theme, density, sidebar density, font scaling, animations, reduced motion, transparency, and accent swatches.

### Startup

| Control | Classification | Reason |
|---|---|---|
| Startup splash, minimum duration, sound, sound volume, restore window state | PUBLIC USER | Personal local app behavior. |
| Launch application on OS login | OWNER ONLY when enabled | Host startup registration affects the machine. Currently disabled. |
| Start minimized | PUBLIC USER when implemented | Personal UI preference. Currently disabled. |
| Automatically reconnect to last active Agent | OWNER ONLY when enabled | Can affect infrastructure connection behavior. Currently disabled in UI. |

### Notifications

All current enabled notification controls are `PUBLIC USER`: toast notifications and Notification Center history. Disabled sound and quiet-hours controls remain public preferences when implemented.

### Security

| Control | Classification | Reason |
|---|---|---|
| Require Owner authentication before sensitive actions | OWNER ONLY | Authorization policy. Currently disabled. |
| Lock application after inactivity | SHARED READ-ONLY or OWNER ONLY | Security policy. User may view; Owner should manage shared policy. Currently disabled. |
| Inactivity timeout | OWNER ONLY | Security policy. Currently disabled. |
| Mask secrets by default | OWNER ONLY | Secret-handling policy. Currently disabled. |
| Reveal-secret timeout | OWNER ONLY | Secret-handling policy. Currently disabled. |
| Sign out all sessions | OWNER ONLY | Session administration. |
| Rotate Agent Token | OWNER ONLY | Infrastructure credential rotation. |
| Open audit log | OWNER ONLY | Diagnostic/security log access. |
| Reset Security Preferences | OWNER ONLY | Security policy reset. |

The separate Security workspace contains account, session, trusted-device, remote-access, token, event, and danger-zone controls. Those are outside Settings markup but are command-palette/deep-link reachable and must remain protected by the existing security service.

### Network

| Control | Classification | Reason |
|---|---|---|
| Agent request timeout, retry attempts, retry backoff, heartbeat interval | OWNER ONLY when enabled | Infrastructure policy. Currently disabled. |
| Automatic reconnect | OWNER ONLY when enabled | Infrastructure connection policy. Currently disabled. |
| IP preference | OWNER ONLY when enabled | Network policy. Currently disabled. |
| Proxy mode, manual proxy URL, proxy bypass list | OWNER ONLY when enabled | Can contain infrastructure details or secrets. Currently disabled. |
| Test connection | SHARED READ-ONLY or OWNER ONLY depending target | Safe for selected status checks, but raw Agent testing must not expose or modify secret config. |

### Performance

| Control | Classification | Reason |
|---|---|---|
| Hardware acceleration | OWNER ONLY when enabled | Startup/runtime behavior requiring restart. Currently disabled. |
| Background refresh interval and pause polling | PUBLIC USER or SHARED READ-ONLY when implemented | Safe if scoped to local UI; administrative if it affects node load globally. |
| Log retention and maximum log size | OWNER ONLY | Diagnostics/logging policy. Currently disabled. |
| Concurrent background operations | OWNER ONLY | System-wide operation policy. Currently disabled. |

### Storage

| Control | Classification | Reason |
|---|---|---|
| Open Maintenance | PUBLIC USER | Navigates to normal Maintenance workspace. |
| Open logs folder | OWNER ONLY | Exposes local filesystem paths and raw diagnostic logs. |

### Backups

| Control | Classification | Reason |
|---|---|---|
| Automatic configuration backups, frequency, retention | OWNER ONLY when enabled | Configuration backup policy. Currently disabled. |
| Include application preferences | OWNER ONLY when enabled | Configuration export scope. Currently disabled. |
| Include node configuration | OWNER ONLY when enabled | May expose infrastructure configuration. Currently disabled. |
| Include integration configuration without secrets | OWNER ONLY when enabled | Provider/integration metadata may reveal infrastructure. Currently disabled. |
| Create backup now / Restore backup | OWNER ONLY when enabled | Backup export/restore can affect app state and infrastructure. Currently disabled. |

### Connections / Integrations

| Card or control | Classification | Reason |
|---|---|---|
| Marketplace / CurseForge API key | OWNER ONLY | Provider credential and Marketplace administration. |
| Marketplace config source/path | OWNER ONLY | Exposes local config path and admin storage details. |
| AMP URL display | SHARED READ-ONLY for regular users | Useful connection status. Editing infrastructure URL should be Owner-only unless scoped as a personal display default. |
| AMP username | OWNER ONLY | Credential-related account identifier. |
| AMP credential storage note | OWNER ONLY / Developer diagnostics | Current text exposes `.env` technical details. |
| Minecraft default address | PUBLIC USER | Safe helper address. Must validate and normalize. |
| Public Access / Playit public address | SHARED READ-ONLY for regular users | Users can copy/view current address. Provider-level configuration is Owner-only. |

The main Marketplace workspace must remain available to regular users. Only Marketplace administration/configuration inside Settings is Owner-only.

### Updates

| Control | Classification | Reason |
|---|---|---|
| Current version, build, channel, latest version, last check, status | PUBLIC USER | Safe release information. |
| Check for Updates | PUBLIC USER for public update source | Safe public update check. |
| View Release Notes | PUBLIC USER | Safe external/read-only action. |
| Install downloaded update | SHARED READ-ONLY or OWNER ONLY depending updater policy | Installing application binaries may require Owner/admin control. |
| Internal channels, developer Git updates, source overrides | OWNER ONLY | Internal release infrastructure. |

### Developer

All Developer controls are `OWNER ONLY`: debug mode, disabled log buttons, export logs, and reset settings. Future raw IPC tools, renderer diagnostics, feature flags, experimental settings, internal analytics, verbose logging, service registration internals, and Agent debug configuration are Owner-only.

### About

About fields are `PUBLIC USER`: application name, version, build, channel, Git commit, Electron, Node, Chromium, release notes link, and Open Updates.

### Hidden Routing Diagnostics

Routing Diagnostics is `OWNER ONLY`. It exposes application host, selected node, selected Agent ID, node ID, execution target, filesystem provider, provider type, and routing target.

## Sensitive Items Found

- CurseForge API key input and Marketplace provider credential state.
- Marketplace config path text.
- AMP credential source text referencing `.env`.
- AMP username and URL.
- Agent token rotation action.
- Audit log access.
- Agent connection test and Agent config IPC paths.
- Agent pairing IPC path.
- Network proxy URL and future proxy bypass policy.
- Developer debug mode.
- Routing diagnostics.
- Raw log folder access.
- Update channel/internal Git update wording.
- Backup settings that include node and integration configuration.

## Required Permission Gates For Later Phases

The implementation phases should protect these layers together:

- Category buttons and category groups.
- Individual cards inside shared categories.
- Settings search results.
- Command palette commands and recents.
- Saved active category in `sessionStorage`.
- Local fallback preferences in `localStorage`.
- Direct Settings route/hash/query navigation.
- IPC reads that return sensitive config paths or provider status.
- IPC writes that modify credentials, Agent config, security policy, update source, or developer controls.
- Renderer memory after permission loss.

## Proposed Capability Mapping

These capabilities match the current architecture and should be implemented only where useful:

- `canManageMarketplaceSettings`: Marketplace provider credentials and configuration.
- `canManageDeveloperSettings`: Developer settings, debug flags, routing diagnostics, raw log tooling.
- `canManageInternalUpdates`: update channels, developer Git updates, private feeds, source overrides.
- `canManageAdvancedSecurity`: Owner/security policy, token rotation, audit logs, session administration.
- `canManageInfrastructure`: host startup, backups including node/provider config, operation limits.
- `canManageAgentConfiguration`: Agent URLs, pairing, tokens, service registration, reconnect policy.
- `canManageProviderCredentials`: AMP/provider credentials and secret-bearing integration settings.
- `canViewDiagnostics`: raw logs, diagnostic folders, routing diagnostics, exported debug bundles.
- `canManageAdvancedNetworking`: proxy, bind, retry, heartbeat, IP preference, tunnel/provider admin.

## Phase 1 Conclusion

The current Settings implementation treats Settings as one broad local-preferences surface. Some sensitive controls are disabled, and several write IPC paths already use centralized permission checks, but the renderer still exposes Owner-only categories and cards to every user. The largest immediate risk is the mixed `integrations` category: ordinary Connection settings and Marketplace provider administration share one category, so later phases must support card-level permission filtering while keeping the main Marketplace workspace available to regular users.
