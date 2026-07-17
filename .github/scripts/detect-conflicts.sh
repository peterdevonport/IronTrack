#!/bin/bash
#
# detect-conflicts.sh — OpenCode Conflict Detector
#
# Evaluates all open PRs in the repository and dispatches the conflict
# resolver workflow for any PR that is conflicting and ready to process.
#
# Environment:
#   GH_TOKEN   GitHub token with privileges to read PRs and dispatch workflows
#
set -euo pipefail

# Fetch all open PRs with their conflict status and latest CI test conclusion
PR_LIST=$(gh pr list --state open --json number,headRefName,mergeable,statusCheckRollup \
  --jq '.[] | {number, branch: .headRefName, mergeable, conclusion: (.statusCheckRollup[-1].conclusion // null), status: (.statusCheckRollup[-1].status // null)} | @base64')

if [ -z "$PR_LIST" ]; then
  echo "✅ No open PRs found in the system."
  exit 0
fi

# Decode a single base64-encoded JSON row
__decode() {
  echo "$1" | base64 --decode
}

# Evaluate the board sequentially (lowest PR number runs first)
# shellcheck disable=SC2086 # intentional word-splitting on $PR_LIST
for row in $PR_LIST; do
  PR_NUM=$(__decode "$row" | jq -r '.number')
  BRANCH=$(__decode "$row" | jq -r '.branch')
  MERGEABLE=$(__decode "$row" | jq -r '.mergeable')
  CONCLUSION=$(__decode "$row" | jq -r '.conclusion')
  STATUS=$(__decode "$row" | jq -r '.status')

  echo "Checking status of PR #$PR_NUM ($BRANCH)..."

  # RULE 1: If this PR is currently running tests, skip it and check the next one.
  if [ "$STATUS" = "IN_PROGRESS" ]; then
    echo "⏳ PR #$PR_NUM is currently executing CI checks. Skipping for now..."
    continue
  fi

  # RULE 2: If the AI already tried to fix this PR but it failed your test suite, skip it.
  if [ "$CONCLUSION" = "FAILURE" ]; then
    echo "❌ PR #$PR_NUM has failed CI checks. Skipping to avoid stalling the queue."
    continue
  fi

  # RULE 3: If the PR is conflicting and ready to merge, deploy the worker to fix it.
  if [ "$MERGEABLE" = "CONFLICTING" ]; then
    echo "🚨 PR #$PR_NUM is blocked by conflicts. Spawning dedicated Resolver..."

    gh workflow run opencode-conflict-resolver.yml \
      -f pr_number="$PR_NUM" \
      -f branch_name="$BRANCH"

    continue
  fi
done

echo "✅ All open PRs are either perfectly healthy or already merged."
