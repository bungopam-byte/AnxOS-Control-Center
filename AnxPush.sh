#!/usr/bin/env bash
set -e

START_TIME=$(date +%s)

PROJECT_DIR="$HOME/Projects/AnxOS-Control-Center"
PROJECT_NAME="AnxOS-Control-Center"
USER_NAME="anx"
HOST_NAME="AnxLab"
REMOTE_NAME="origin"
REMOTE_DISPLAY="github.com/bungopam-byte"

BAR_WIDTH=20
LINE="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

make_bar() {
  local filled="$1"
  local bar=""
  local i

  for ((i = 0; i < BAR_WIDTH; i++)); do
    if ((i < filled)); then
      bar+="█"
    else
      bar+="░"
    fi
  done

  printf "%s" "$bar"
}

animate_progress() {
  local icon="$1"
  local label="$2"
  local filled
  local bar

  if [[ ! -t 1 ]]; then
    printf "%s [%s] %s...\n" "$icon" "$(make_bar "$BAR_WIDTH")" "$label"
    return
  fi

  for filled in 0 4 8 12 16 "$BAR_WIDTH"; do
    bar="$(make_bar "$filled")"
    printf "\r%s [%s] %s..." "$icon" "$bar" "$label"
    sleep 0.06
  done

  printf "\n"
}

cd "$PROJECT_DIR"

BRANCH=$(git branch --show-current)
COMMIT_SHORT=$(git rev-parse --short HEAD)

clear

echo "🚀 AnxPush Deployment"
echo "$LINE"
echo
echo "👤 User       $USER_NAME"
echo "🖥️  Host       $HOST_NAME"
echo "📂 Project    $PROJECT_NAME"
echo "🌿 Branch     $BRANCH"
echo "🔗 Remote     $REMOTE_DISPLAY"
echo
echo "$LINE"
echo

animate_progress "🔍" "Checking Repository"
git rev-parse --is-inside-work-tree >/dev/null
echo "✅ Repository Ready"
echo

animate_progress "📋" "Checking Changes"

if [[ -z "$(git status --porcelain)" ]]; then
  echo "✅ Working Tree Clean"
else
  echo "📝 Changes detected"
  echo

  git status --short
  echo

  DEFAULT_MESSAGE="chore: update AnxOS"
  echo "🤖 Suggested Commit"
  echo "$LINE"
  echo "$DEFAULT_MESSAGE"
  echo "$LINE"
  echo

  if [[ $# -gt 0 ]]; then
    MESSAGE="$*"
    echo "📝 Commit Message: $MESSAGE"
  elif [[ -t 0 ]]; then
    read -rp "📝 Commit Message (Press Enter to use suggested): " MESSAGE
  else
    MESSAGE="$DEFAULT_MESSAGE"
    echo "📝 Commit Message: $MESSAGE"
  fi
  MESSAGE="${MESSAGE:-$DEFAULT_MESSAGE}"

  echo
  echo "📦 Staging files..."
  git add .

  echo "📝 Creating commit..."
  git commit -m "$MESSAGE"

  COMMIT_SHORT=$(git rev-parse --short HEAD)
  echo "✅ Commit Created: $COMMIT_SHORT"
fi

echo
animate_progress "🔑" "Authenticating"
echo "ℹ️  SSH may ask for your passphrase."
echo "✅ SSH Ready"
echo

animate_progress "🌐" "Connecting to GitHub"
git ls-remote "$REMOTE_NAME" >/dev/null
echo "✅ Connection Established"
echo

animate_progress "📤" "Pushing to Origin"
git push "$REMOTE_NAME" "$BRANCH"
echo "✅ Deployment Successful"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
COMMIT_SHORT=$(git rev-parse --short HEAD)

echo
echo "$LINE"
echo
echo "             🚀 PUSH COMPLETE"
echo
echo " 🌿 Branch     $BRANCH"
echo " 📝 Commit     $COMMIT_SHORT"
echo " 🔗 Remote     $REMOTE_NAME"
echo " ⏱ Duration    ${DURATION}s"
echo
echo "$LINE"
echo
echo "💚 Your code is now live on GitHub."
