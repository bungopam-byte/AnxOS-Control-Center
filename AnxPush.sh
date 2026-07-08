#!/usr/bin/env bash
set -euo pipefail

PROJECT="$HOME/Projects/AnxOS-Control-Center"
REMOTE="${REMOTE:-origin}"
TARGET_BRANCH="${TARGET_BRANCH:-dev}"

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
UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"

echo "📂 Project"
echo "   $PROJECT"
echo

echo "🌿 Branch"
echo "   $BRANCH"
if [[ -n "$UPSTREAM" ]]; then
    echo "   tracking $UPSTREAM"
fi
echo

if [[ "$BRANCH" != "$TARGET_BRANCH" ]]; then
    echo "⚠️  Current branch is '$BRANCH', but this script pushes to '$TARGET_BRANCH'."
    read -rp "Continue and push HEAD to $REMOTE/$TARGET_BRANCH? [y/N]: " CONTINUE
    case "${CONTINUE,,}" in
        y|yes) ;;
        *)
            echo "Cancelled."
            exit 1
            ;;
    esac
fi

echo "📋 Current Changes"
git status --short
echo

if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
    echo "✅ Nothing new to commit."
else
    echo "🤖 Generating commit message..."
    echo

    mapfile -t FILES < <(git status --short | sed 's/^...//')
    COUNT="${#FILES[@]}"

    if [[ "$COUNT" -eq 1 ]]; then
        DEFAULT_MESSAGE="update: $(basename "${FILES[0]}")"
    elif [[ "$COUNT" -le 3 ]]; then
        DEFAULT_MESSAGE="update: ${FILES[*]}"
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
    git add -A

    echo "💾 Creating commit..."
    git commit -m "$MESSAGE"
fi

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔎 Push Preview"
echo
git status --short --branch
echo

if git rev-parse --verify "$REMOTE/$TARGET_BRANCH" >/dev/null 2>&1; then
    echo "🧾 Commits to push"
    git log --oneline "$REMOTE/$TARGET_BRANCH..HEAD" || true
    echo
fi

echo "☁️  Pushing to GitHub"
echo "   git push $REMOTE HEAD:$TARGET_BRANCH"
echo
git push "$REMOTE" "HEAD:$TARGET_BRANCH"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Successfully pushed to GitHub!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
