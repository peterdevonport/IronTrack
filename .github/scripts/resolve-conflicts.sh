#!/bin/bash
#
# resolve-conflicts.sh — OpenCode Conflict Resolver
#
# Merges master into a feature branch, resolves any git merge conflicts
# using the OpenCode CLI, runs linting/testing, and pushes the result.
#
# Usage: resolve-conflicts.sh <pr_number> <branch_name>
#
# Environment:
#   GH_TOKEN           GitHub token for checkout, push, and auto-merge
#   OPENCODE_API_KEY   API key for the OpenCode AI service
#
set -euo pipefail

PR_NUMBER="${1:?Usage: $0 <pr_number> <branch_name>}"
BRANCH_NAME="${2:?Usage: $0 <pr_number> <branch_name>}"

# ----------------------------------------------------------------
# STEP: Prepare Git Environment & Merge Master
# ----------------------------------------------------------------
git config --global user.name "opencode-conflict-resolver[bot]"
git config --global user.email "opencode-conflict-resolver[bot]@users.noreply.github.com"
git fetch origin master
git merge origin/master || true

# ----------------------------------------------------------------
# STEP: Resolve Conflicts with OpenCode
# ----------------------------------------------------------------
echo "🧠 Invoking OpenCode to resolve merge conflicts..."
timeout 300 opencode run --auto --model opencode-go/deepseek-v4-flash \
  "Resolve git merge conflicts in this repository. \
  Find ALL files with conflict markers (<<<<<<<, =======, >>>>>>>). \
  For each file, merge both sides cleanly and remove all conflict markers. \
  PRESERVE the logic from both sides. \
  Do NOT create branches, do NOT create PRs, do NOT use git. \
  Only edit the conflicted files in place." || {
  echo "❌ OpenCode timed out after 5 minutes"
  exit 1
}

# ----------------------------------------------------------------
# STEP: Lint, Test, Fix & Push
# ----------------------------------------------------------------
echo "📦 Installing dependencies..."
npm ci

echo "🔍 Running linter..."
if ! npm run lint; then
  echo "❌ Lint failed. Attempting auto-fix with OpenCode..."
  timeout 300 opencode run --auto --model opencode-go/deepseek-v4-flash \
    "The merge conflict resolution introduced lint errors. \
    Fix the SOURCE CODE to resolve all ESLint errors. \
    Do NOT modify test files or eslint config. \
    Do NOT create branches or PRs." || {
    echo "❌ OpenCode timed out after 5 minutes"
    exit 1
  }
  npm run lint || {
    echo "❌ Lint still failing after fix. Aborting."
    exit 1
  }
fi

echo "🧪 Running tests..."
if ! npm test; then
  echo "❌ Tests failed. Attempting auto-fix with OpenCode..."
  timeout 300 opencode run --auto --model opencode-go/deepseek-v4-flash \
    "The merge conflict resolution broke the source code causing test failures. \
    Fix the SOURCE CODE so the existing tests pass. \
    Do NOT modify test assertions or test files. \
    Do NOT create branches or PRs." || {
    echo "❌ OpenCode timed out after 5 minutes"
    exit 1
  }
  npm test || {
    echo "❌ Tests still failing after fix. Aborting."
    exit 1
  }
fi

# Verify no conflict markers remain before committing
if grep -rn -I -E '^(<<<<<<<|=======|>>>>>>>)' --exclude-dir=.git --exclude-dir=node_modules .; then
  echo "❌ Conflict markers still present after AI resolution. Aborting commit."
  exit 1
fi

echo "✅ All checks pass. Committing and pushing..."
git add -A
git diff --cached --quiet && echo "No changes to commit" || \
  git commit -m "fix: resolve merge conflicts with master"
git push origin "$BRANCH_NAME"

# ----------------------------------------------------------------
# STEP: Re-Enable Auto-Merge
# ----------------------------------------------------------------
echo "Re-enabling auto-merge for PR #${PR_NUMBER}..."
gh pr merge "$PR_NUMBER" --auto --merge
