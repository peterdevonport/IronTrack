#!/usr/bin/env bash
#
# detect-conflicts.sh — Evaluates all open PRs and dispatches the conflict
#                       resolver for any PR blocked by merge conflicts.
#
# Designed to run in a GitHub Actions workflow. Requires:
#   - GH_TOKEN          — GitHub PAT with repo + workflow scopes
#   - GITHUB_REPOSITORY — Set automatically by GitHub Actions (owner/repo)
#
# Usage (from workflow):
#   - name: Evaluate PR Pool Status
#     env:
#       GH_TOKEN: ${{ secrets.AUTO_MERGE_PAT }}
#     run: .github/scripts/detect-conflicts.sh
#
# shellcheck disable=SC2086  # Intentionally unquoted $PR_LIST for word-splitting
#                             # Values are base64-encoded (no spaces) so safe.

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

# Rate-limit guard: cap dispatch to avoid exhausting GitHub Action runner quota
MAX_DISPATCH=3

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
  local total_open
  total_open=$(gh api "search/issues?q=is:pr+is:open+repo:${GITHUB_REPOSITORY}&per_page=1" --jq '.total_count' 2>/dev/null || echo "0")

  # Fetch all open PRs with their conflict status and latest CI test conclusion
  local pr_list
  pr_list=$(gh pr list \
    --limit "$PR_FETCH_LIMIT" \
    --state open \
    --json number,headRefName,mergeable,statusCheckRollup \
    --jq '. | sort_by(.number) | .[] | {number, branch: .headRefName, mergeable, conclusion: (.statusCheckRollup[-1].conclusion // null), status: (.statusCheckRollup[-1].status // null)} | @base64')

  if [ -z "$pr_list" ]; then
    ok "No open PRs found in the system."
    exit 0
  fi

  # Track dispatch failures and count across all PRs
  local dispatch_failures=0
  local dispatch_count=0

  # Warn if the fetched count is less than the total — indicates possible truncation
  local pr_count
  pr_count=$(printf "%s\n" "$pr_list" | wc -l)
  if [ -n "$total_open" ] && [ "$total_open" -ne 0 ] && [ "$pr_count" -lt "$total_open" ] 2>/dev/null; then
    warn "Fetched $pr_count of $total_open open PRs. Results may be truncated."
  fi

  # Evaluate the board sequentially (lowest PR number runs first)
  local row decoded pr_num branch mergeable conclusion status
  for row in $pr_list; do
    # Decode the base64 row once, with error handling for malformed input
    if ! decoded=$(printf "%s\n" "$row" | base64 --decode 2>/dev/null); then
      warn "Failed to decode base64 row, skipping..."
      continue
    fi

    # Validate decoded JSON before extracting fields
    if ! printf "%s\n" "$decoded" | jq empty 2>/dev/null; then
      warn "Decoded row is not valid JSON, skipping..."
      continue
    fi

    # Extract all 5 fields with a single jq invocation (avoids 5 subshell+jq spawns)
    { read -r pr_num; read -r branch; read -r mergeable; read -r conclusion; read -r status; } < <(printf "%s\n" "$decoded" | jq -r '.number, .branch, .mergeable, .conclusion, .status')

    log "Checking status of PR #${pr_num} (${branch})..."

    # RULE 1: If this PR is currently running tests, skip it and check the next one.
    if [ "$status" = "IN_PROGRESS" ]; then
      log "⏳ PR #${pr_num} is currently executing CI checks. Skipping for now..."
      continue
    fi

    # RULE 2: If the AI already tried to fix this PR but it failed your test suite, skip it.
    if [ "$conclusion" = "FAILURE" ]; then
      fail "PR #${pr_num} has failed CI checks. Skipping to avoid stalling the queue."
      continue
    fi

    # RULE 3: If the PR is conflicting and ready to merge, deploy the worker to fix it.
    if [ "$mergeable" = "CONFLICTING" ]; then
      # Rate-limit: stop dispatching after MAX_DISPATCH to avoid flooding the runner pool
      if [ "$dispatch_count" -ge "$MAX_DISPATCH" ]; then
        log "⏳ Dispatch limit ($MAX_DISPATCH) reached. Remaining conflicting PRs will be resolved on the next cycle."
        break
      fi

      log "🚨 PR #${pr_num} is blocked by conflicts. Spawning dedicated Resolver (dispatch $((dispatch_count + 1)) of $MAX_DISPATCH)..."

      # Dispatch the resolver with retry logic for transient API errors
      local dispatch_ok=false
      local attempt
      for attempt in $(seq 1 "$RETRY_MAX"); do
        if gh workflow run opencode-conflict-resolver.yml \
          -f pr_number="$pr_num" \
          -f branch_name="$branch"; then
          dispatch_ok=true
          dispatch_count=$((dispatch_count + 1))
          break
        fi
        if [ "$attempt" -lt "$RETRY_MAX" ]; then
          sleep "$(( attempt * BACKOFF_BASE_SECONDS ))"
        fi
      done

      if [ "$dispatch_ok" = false ]; then
        fail "Failed to dispatch resolver for PR #${pr_num} after ${RETRY_MAX} attempts"
        dispatch_failures=$((dispatch_failures + 1))
      fi

      continue
    fi
  done

  if [ "$dispatch_failures" -gt 0 ]; then
    fail "${dispatch_failures} dispatch(es) failed — check logs for details"
    exit 1
  fi

  ok "All open PRs are either perfectly healthy or already merged."
}

main "$@"
