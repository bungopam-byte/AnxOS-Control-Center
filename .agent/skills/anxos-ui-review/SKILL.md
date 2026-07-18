---
name: anxos-ui-review
description: "Review AnxOS UI changes for visual consistency and usability."
---

# AnxOS UI Review

Use this skill when reviewing screenshots, renderer changes, CSS, HTML, window layouts, or UI behavior.

## Checklist

- Preserve the current AnxOS dark purple desktop aesthetic.
- Do not redesign a page unless the task explicitly asks for redesign.
- Check for excessive empty space, awkward stretching, clipped content, off-screen modals, duplicate scrollbars, and overflow.
- Check alignment, spacing, padding, border radius, typography, visual hierarchy, and button/control sizing.
- Verify layouts at small desktop, 1080p, 1440p, and ultrawide sizes when practical.
- Confirm loading, empty, error, disabled, hover/focus, selected, success, and destructive states.
- Confirm keyboard accessibility where applicable, especially dialogs, lists, file browsers, and navigation.
- Treat renderer-only hiding as presentation. Security-sensitive UI must also be protected by trusted IPC or backend checks.
- Prefer existing classes, tokens, components, and interaction patterns.

## Reporting

Report concrete findings with file references and state what was validated. Do not claim screenshots or viewport checks were performed unless they actually ran.
