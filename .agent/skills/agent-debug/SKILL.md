---
name: agent-debug
description: "Debug AnxOS remote-agent connectivity and authentication issues."
---

# Agent Debug

Use this skill for remote-agent connectivity, configuration, authentication, API, token, node status, protected endpoint, and service issues.

## Process

- Inspect the desktop agent client, shared token store, agent config, agent auth middleware, and affected route.
- Keep local single-device mode and remote-agent mode compatible.
- Preserve the existing agent configuration format unless an intentional migration is implemented.
- Do not print or expose full agent tokens, pairing secrets, passwords, private keys, or credentials.
- Show only safe fingerprints or configured/unconfigured status.
- Continue supporting both `X-Agent-Token` and `Authorization: Bearer <token>` where applicable.
- Keep `/api/v1/health` public and protected routes authenticated.

## Validation

Run relevant checks such as:

```bash
npm run agent:token:status
npm run agent:token:smoke
npm --prefix agent run check
```

Report exact commands and outcomes.
