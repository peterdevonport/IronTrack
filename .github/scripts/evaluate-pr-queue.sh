#!/usr/bin/env bash
#
# evaluate-pr-queue.sh — Evaluates all open PRs and dispatches conflict resolvers.
#
# This script is called by the "PR Conflict Detector" GitHub Actions workflow.
# It fetches all open PRs, evaluates their merge/CI status, and dispatches
# the opencode-conflict-resolver workflow for any PR blocked by conflicts.
#
# Environment variables (set by the workflow or GitHub Actions):
#   GH_TOKEN           — GitHub token with repo + workflow scopes
#   GITHUB_REPOSITORY  — <owner>/<repo> of the current repository
#
# shellcheck disable=SC2086  # Intentionally unquoted $PR_LIST for word-splitting
#                             # The values are base64-encoded (no spaces) so it's safe.

set -euo pipefail

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────

# GitHub CLI hard limit for --limit — values above 1000 are silently capped.
# If the repo ever exceeds this many open PRs, the remainder are not fetched
# and will be skipped during conflict evaluation.
PR_FETCH_LIMIT=1000

# Retry configuration for dispatching the conflict resolver
RETRY_MAX=3
BACKOFF_BASE_SECONDS=5

# Rate-limit guard: cap dispatch to avoid exhausting GitHub Action runner quota
MAX_DISPATCH=3

# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────

main() {
  # Fetch total open PR count to detect silent truncation
  local total_open
  total_open=$(gh api "search/issues?q=is:pr+is:open+repo:${GITHUB_REPOSITORY}&per_page=1" --jq '.total_count' 2>/dev/null || echo "0")

  # Fetch all open PRs with their conflict status and latest CI test conclusion
  local pr_list
  pr_list=$(gh pr list --limit "$PR_FETCH_LIMIT" --state open \
    --json number,headRefName,mergeable,statusCheckRollup \
    --jq '.[] | {number, branch: .headRefName, mergeable, conclusion: (.statusCheckRollup[-1].conclusion // null), status: (.statusCheckRollup[-1].status // null)} | @base64')

  if [ -z "$pr_list" ]; then
    echo "✅ No open PRs found in the system."
    exit 0
  fi

  # Track dispatch failures across all PRs for accurate exit code propagation
  local dispatch_failures=0
  local dispatch_count=0

  # Warn if the fetched count is less than the total — indicates possible truncation
  local pr_count
  pr_count=$(echo "$pr_list" | wc -l)
  if [ -n "$total_open" ] && [ "$total_open" -ne 0 ] && [ "$pr_count" -lt "$total_open" ] 2>/dev/null; then
    echo "⚠️ Warning: Fetched $pr_count of $total_open open PRs. Results may be truncated."
  fi

  # Evaluate the board sequentially (lowest PR number runs first)
  for row in $pr_list; do
    # Decode the base64 row once, then extract all fields from the decoded JSON
    local decoded pr_num branch mergeable conclusion status
    if ! decoded=$(echo "$row" | base64 --decode 2>/dev/null); then
      echo "⚠️ Failed to decode base64 row (first 80 chars: ${row:0:80}...), skipping..."
      continue
    fi
    if ! echo "$decoded" | jq empty 2>/dev/null; then
      echo "⚠️ Decoded row is not valid JSON, skipping..."
      continue
    fi
    pr_num=$(echo "$decoded" | jq -r '.number')
    branch=$(echo "$decoded" | jq -r '.branch')
    mergeable=$(echo "$decoded" | jq -r '.mergeable')
    conclusion=$(echo "$decoded" | jq -r '.conclusion')
    status=$(echo "$decoded" | jq -r '.status')

    echo "Checking status of PR #$pr_num ($branch)..."

    # RULE 1: If this PR is currently running tests, skip it and check the next one.
    if [ "$status" = "IN_PROGRESS" ]; then
      echo "⏳ PR #$pr_num is currently executing CI checks. Skipping for now..."
      continue
    fi

    # RULE 2: If the AI already tried to fix this PR but it failed your test suite, skip it.
    if [ "$conclusion" = "FAILURE" ]; then
      echo "❌ PR #$pr_num has failed CI checks. Skipping to avoid stalling the queue."
      continue
    fi

    # RULE 3: If the PR is conflicting and ready to merge, deploy the worker to fix it.
    if [ "$mergeable" = "CONFLICTING" ]; then
      # Rate-limit: stop dispatching after MAX_DISPATCH to avoid flooding the runner pool
      if [ "$dispatch_count" -ge "$MAX_DISPATCH" ]; then
        echo "⏳ Dispatch limit ($MAX_DISPATCH) reached. Remaining conflicting PRs will be resolved on the next cycle."
        break
      fi

      echo "🚨 PR #$pr_num is blocked by conflicts. Spawning dedicated Resolver (dispatch $((dispatch_count + 1)) of $MAX_DISPATCH)..."

      # Dispatch the resolver with retry logic for transient API errors
      local dispatch_ok=false
      for attempt in $(seq 1 $RETRY_MAX); do
        if gh workflow run opencode-conflict-resolver.yml \
          -f pr_number="$pr_num" \
          -f branch_name="$branch"; then
          dispatch_ok=true
          dispatch_count=$((dispatch_count + 1))
          break
        fi
        if [ "$attempt" -lt $RETRY_MAX ]; then
          sleep $(( attempt * BACKOFF_BASE_SECONDS ))
        fi
      done

      if [ "$dispatch_ok" = false ]; then
        echo "❌ Failed to dispatch resolver for PR #$pr_num after $RETRY_MAX attempts"
        dispatch_failures=$((dispatch_failures + 1))
      fi

      continue
    fi
  done

  if [ "$dispatch_failures" -gt 0 ]; then
    echo "❌ $dispatch_failures dispatch(es) failed — check logs for details"
    exit 1
  fi

  echo "✅ All open PRs are either perfectly healthy or already merged."
}

main "$@"
