#!/usr/bin/env bash
set -e

START_TIME=$(date +%s)

PROJECT_DIR="$HOME/Projects/AnxOS-Control-Center"
PROJECT_NAME="AnxOS-Control-Center"
USER_NAME="anx"
HOST_NAME="AnxLab"
REMOTE_NAME="origin"
REMOTE_DISPLAY="github.com/bungopam-byte"

BAR="██████████████████████"
LINE="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

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

echo "🔍 [$BAR] Checking Repository..."
git rev-parse --is-inside-work-tree >/dev/null
echo "✅ Repository Ready"
echo

echo "📋 [$BAR] Checking Changes..."

if [[ -z "$(git status --porcelain)" ]]; then
  echo "✅ Working Tree Clean"
else
  echo "📝 Changes detected"
  echo

  git status --short
  echo

  DEFAULT_MESSAGE="chore: update AnxHub"
  echo "🤖 Suggested Commit"
  echo "$LINE"
  echo "$DEFAULT_MESSAGE"
  echo "$LINE"
  echo

  read -rp "📝 Commit Message (Press Enter to use suggested): " MESSAGE
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
echo "🔑 [$BAR] Authenticating..."
echo "ℹ️  SSH may ask for your passphrase."
echo "✅ SSH Ready"
echo

echo "🌐 [$BAR] Connecting to GitHub..."
git ls-remote "$REMOTE_NAME" >/dev/null
echo "✅ Connection Established"
echo

echo "📤 [$BAR] Pushing to Origin..."
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
