#!/usr/bin/env bash
set -u

APP_NAME="AnxOS Development Launcher"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
REPO_DIR="$SCRIPT_DIR"

print_header() {
  printf '\n'
  printf '========================================\n'
  printf '  %s\n' "$APP_NAME"
  printf '  Trusted source development mode\n'
  printf '========================================\n'
  printf '\n'
}

fail() {
  printf 'AnxOS error: %s\n' "$1" >&2
  exit "${2:-1}"
}

check_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but was not found in PATH."
}

prepare_repo() {
  cd "$REPO_DIR" || fail "Could not change into repository: $REPO_DIR"
  [ -f "package.json" ] || fail "package.json was not found in $REPO_DIR"
  check_command node
  check_command npm

  printf 'Repository: %s\n' "$REPO_DIR"
  printf 'Node: %s\n' "$(node --version)"
  printf 'npm: %s\n' "$(npm --version)"

  if [ ! -d "node_modules" ]; then
    printf '\nInstalling dependencies because node_modules is missing...\n'
    npm install || fail "Dependency installation failed."
  fi
}

run_script() {
  local script_name="$1"
  npm run "$script_name"
}

launch_anxos() {
  printf '\nLaunching AnxOS from source...\n'
  printf 'Development owner fallback is available only because this is an unpackaged Electron run.\n\n'
  NODE_ENV=development \
  ANXOS_TRUSTED_DEVELOPMENT_MODE=1 \
  npm run start
}

launch_anxos_devtools() {
  printf '\nLaunching AnxOS from source with DevTools...\n\n'
  NODE_ENV=development \
  ANXOS_TRUSTED_DEVELOPMENT_MODE=1 \
  ANXOS_OPEN_DEVTOOLS=1 \
  npm run start
}

show_menu() {
  printf '\nChoose an action:\n'
  printf '  1. Launch AnxOS Development\n'
  printf '  2. Launch with DevTools\n'
  printf '  3. Run owner workspace smoke test\n'
  printf '  4. Run marketplace smoke test\n'
  printf '  5. Exit\n'
  printf '\n'
}

main() {
  print_header
  prepare_repo

  if [ ! -t 0 ]; then
    launch_anxos
    exit $?
  fi

  while true; do
    show_menu
    read -r -p "AnxDev> " choice
    case "$choice" in
      1)
        launch_anxos
        exit $?
        ;;
      2)
        launch_anxos_devtools
        exit $?
        ;;
      3)
        run_script owner:smoke
        return_code=$?
        printf '\nOwner workspace smoke test exited with code %s.\n' "$return_code"
        ;;
      4)
        run_script marketplace:smoke
        return_code=$?
        printf '\nMarketplace smoke test exited with code %s.\n' "$return_code"
        ;;
      5|q|Q|exit)
        printf 'Exiting AnxDev.\n'
        exit 0
        ;;
      *)
        printf 'Unknown choice. Select 1, 2, 3, 4, or 5.\n'
        ;;
    esac
  done
}

main "$@"
