#!/usr/bin/env bash
set -e

PROJECT="$HOME/Projects/AnxOS-Control-Center"

clear

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    🚀 AnxPush Utility                     ║"
echo "║                  AnxHub Git Deployment                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo

# Verify project
if [[ ! -d "$PROJECT/.git" ]]; then
    echo "❌ Git repository not found."
    echo "📂 Expected: $PROJECT"
    exit 1
fi

cd "$PROJECT"

BRANCH="$(git branch --show-current)"

echo "📂 Project"
echo "   $PROJECT"
echo

echo "🌿 Branch"
echo "   $BRANCH"
echo

echo "📋 Current Changes"
git status --short
echo

# Nothing changed?
if git diff --quiet && git diff --cached --quiet; then
    echo "✅ Nothing to commit."
    exit 0
fi

echo "🤖 Generating commit message..."
echo

FILES=$(git diff --name-only)

COUNT=$(echo "$FILES" | wc -l)

if [[ $COUNT -eq 1 ]]; then
    DEFAULT_MESSAGE="update: $(basename "$FILES")"
elif [[ $COUNT -le 3 ]]; then
    DEFAULT_MESSAGE="update: $(echo "$FILES" | paste -sd ', ' -)"
else
    DEFAULT_MESSAGE="update: ${COUNT} files"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Suggested Commit"
echo
echo "   $DEFAULT_MESSAGE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

read -rp "📝 Commit Message (Press Enter to accept): " MESSAGE
MESSAGE="${MESSAGE:-$DEFAULT_MESSAGE}"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Staging files..."
git add .

echo "💾 Creating commit..."
git commit -m "$MESSAGE"

echo "☁️  Pushing to GitHub..."
git push

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Successfully pushed to GitHub!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
