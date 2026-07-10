#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "AnxOS Agent"
echo "-----------"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run the AnxOS agent." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to run the AnxOS agent." >&2
  exit 1
fi

export ANXHUB_CONFIG_DIR="${ANXHUB_CONFIG_DIR:-$SCRIPT_DIR/config}"

if [[ -n "${AGENT_TOKEN:-}" ]]; then
  echo "Ignoring shell AGENT_TOKEN; the agent will use the shared token in $ANXHUB_CONFIG_DIR/agent.json."
  unset AGENT_TOKEN
fi

node scripts/agent-token-status.js

if [[ ! -d agent/node_modules ]]; then
  echo "Installing agent dependencies..."
  npm --prefix agent install
fi

echo "Starting AnxOS agent from $SCRIPT_DIR/agent"
exec npm --prefix agent start
