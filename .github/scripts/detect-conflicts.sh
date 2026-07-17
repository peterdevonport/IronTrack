#!/usr/bin/env bash
#
# detect-conflicts.sh
#
# Evaluates all open PRs in the repository and dispatches the conflict resolver
# workflow for any PR that is merge-conflicted and has passing CI.
#
# Environment variables:
#   GH_TOKEN            — GitHub PAT with repo scope (required)
#   GITHUB_REPOSITORY   — Set automatically by GitHub Actions (owner/repo)
#
# Usage (from GitHub Actions workflow):
#   - name: Evaluate PR Pool Status
#     env:
#       GH_TOKEN: ${{ secrets.AUTO_MERGE_PAT }}
#     run: .github/scripts/detect-conflicts.sh
#

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# GitHub CLI hard limit for --limit — values above 1000 are silently capped.
# If the repo ever exceeds this many open PRs, the remainder are not fetched
# and will be skipped during conflict evaluation.
PR_FETCH_LIMIT=1000

# Retry configuration for dispatching the conflict resolver
RETRY_MAX=3
BACKOFF_BASE_SECONDS=5

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log()   { printf "%s\n" "$*"; }
ok()    { log "✅ $*"; }
warn()  { log "⚠️  $*"; }
fail()  { log "❌ $*"; }

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  # Fetch total open PR count to detect silent truncation
  TOTAL_OPEN=$(gh api "search/issues?q=is:pr+is:open+repo:${GITHUB_REPOSITORY}&per_page=1" --jq '.total_count' 2>/dev/null || echo "0")

  # Fetch all open PRs with their conflict status and latest CI test conclusion
  PR_LIST=$(gh pr list \
    --limit "$PR_FETCH_LIMIT" \
    --state open \
    --json number,headRefName,mergeable,statusCheckRollup \
    --jq '.[] | {number, branch: .headRefName, mergeable, conclusion: (.statusCheckRollup[-1].conclusion // null), status: (.statusCheckRollup[-1].status // null)} | @base64')

  if [ -z "$PR_LIST" ]; then
    ok "No open PRs found in the system."
    return 0
  fi

  # Track dispatch failures across all PRs for accurate exit code propagation
  DISPATCH_FAILURES=0

  # Warn if the fetched count is less than the total — indicates possible truncation
  PR_COUNT=$(echo "$PR_LIST" | wc -l)
  if [ -n "$TOTAL_OPEN" ] && [ "$TOTAL_OPEN" -ne 0 ] && [ "$PR_COUNT" -lt "$TOTAL_OPEN" ] 2>/dev/null; then
    warn "Fetched $PR_COUNT of $TOTAL_OPEN open PRs. Results may be truncated."
  fi

  # Evaluate the board sequentially (lowest PR number runs first)
  for row in $PR_LIST; do
    # Decode the base64 row once, then extract all fields from the decoded JSON
    decoded=$(echo "$row" | base64 --decode)
    PR_NUM=$(echo "$decoded" | jq -r '.number')
    BRANCH=$(echo "$decoded" | jq -r '.branch')
    MERGEABLE=$(echo "$decoded" | jq -r '.mergeable')
    CONCLUSION=$(echo "$decoded" | jq -r '.conclusion')
    STATUS=$(echo "$decoded" | jq -r '.status')

    log "Checking status of PR #${PR_NUM} (${BRANCH})..."

    # RULE 1: If this PR is currently running tests, skip it and check the next one.
    if [ "$STATUS" = "IN_PROGRESS" ]; then
      log "⏳ PR #${PR_NUM} is currently executing CI checks. Skipping for now..."
      continue
    fi

    # RULE 2: If the AI already tried to fix this PR but it failed your test suite, skip it.
    if [ "$CONCLUSION" = "FAILURE" ]; then
      fail "PR #${PR_NUM} has failed CI checks. Skipping to avoid stalling the queue."
      continue
    fi

    # RULE 3: If the PR is conflicting and ready to merge, deploy the worker to fix it.
    if [ "$MERGEABLE" = "CONFLICTING" ]; then
      log "🚨 PR #${PR_NUM} is blocked by conflicts. Spawning dedicated Resolver..."

      # Dispatch the resolver with retry logic for transient API errors
      __dispatch_ok=false
      for attempt in $(seq 1 "$RETRY_MAX"); do
        if gh workflow run opencode-conflict-resolver.yml \
          -f pr_number="$PR_NUM" \
          -f branch_name="$BRANCH"; then
          __dispatch_ok=true
          break
        fi
        if [ "$attempt" -lt "$RETRY_MAX" ]; then
          sleep "$(( attempt * BACKOFF_BASE_SECONDS ))"
        fi
      done

      if [ "$__dispatch_ok" = false ]; then
        fail "Failed to dispatch resolver for PR #${PR_NUM} after ${RETRY_MAX} attempts"
        DISPATCH_FAILURES=$((DISPATCH_FAILURES + 1))
      fi

      continue
    fi
  done

  if [ "$DISPATCH_FAILURES" -gt 0 ]; then
    fail "${DISPATCH_FAILURES} dispatch(s) failed — check logs for details"
    return 1
  fi

  ok "All open PRs are either perfectly healthy or already merged."
}

main "$@"
