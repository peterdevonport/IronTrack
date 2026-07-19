#!/usr/bin/env bash
#
# resolve-conflicts.sh — Resolves merge conflicts on a PR branch using
#                        OpenCode CLI, then lints, tests, and pushes the
#                        resolved branch.
#
# Designed to run in a GitHub Actions workflow. Requires:
#   - GH_TOKEN           — GitHub PAT with repo scope
#   - OPENCODE_API_KEY   — OpenCode API key
#   - GITHUB_REPOSITORY  — Set automatically by GitHub Actions (owner/repo)
#
# Usage (from workflow):
#   - name: Resolve Conflicts
#     env:
#       GH_TOKEN: ${{ secrets.AUTO_MERGE_PAT }}
#       OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }}
#     run: .github/scripts/resolve-conflicts.sh \
#            ${{ github.event.inputs.pr_number }} \
#            ${{ github.event.inputs.branch_name }}

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# OpenCode CLI version to pin. Update when upgrading.
# Releases: https://github.com/anomalyco/opencode/releases
OPENCODE_VERSION="1.18.3"

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

PR_NUMBER="${1:?Usage: $0 <pr_number> <branch_name>}"
BRANCH_NAME="${2:?Usage: $0 <pr_number> <branch_name>}"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log()   { printf "%s\n" "$*"; }
ok()    { log "✅ $*"; }
warn()  { log "⚠️  $*"; }
fail()  { log "❌ $*"; }

# ---------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------

step_prepare_git() {
  log "--- Step: Prepare Git Environment & Merge Master ---"
  git config --global user.name "opencode-conflict-resolver[bot]"
  git config --global user.email "opencode-conflict-resolver[bot]@users.noreply.github.com"
  git fetch origin master
  git merge origin/master || true
}

step_install_opencode() {
  log "--- Step: Install OpenCode CLI ---"

  # Download install script to a temp file instead of piping curl to bash.
  # This eliminates the classic pipe-to-shell anti-pattern — if the download
  # is interrupted or the server returns unexpected content, bash never
  # executes it.
  #
  # Security model:
  #   - The script is downloaded from https://opencode.ai/install (TLS).
  #   - The CLI version is pinned via --version for reproducibility.
  #   - The install script fetches a signed GitHub release binary over TLS.
  #   - Upstream does not currently publish SHA256 checksums; if they do in
  #     the future, add a sha256sum verification step here.
  #   - In CI, the ~/.opencode/bin directory is cached between runs (see
  #     opencode-conflict-resolver.yml), reducing the need to re-download.
  local install_script
  install_script=$(mktemp)
  trap 'rm -f "$install_script"' EXIT
  curl -fsSL https://opencode.ai/install -o "$install_script"
  bash "$install_script" --version "${OPENCODE_VERSION}"
  rm -f "$install_script"

  echo "$HOME/.opencode/bin" >> "$GITHUB_PATH"
  export PATH="$HOME/.opencode/bin:$PATH"
}

step_resolve_conflicts() {
  log "--- Step: Resolve Conflicts with OpenCode ---"
  timeout 300 opencode run --auto --model opencode-go/deepseek-v4-flash \
    "Resolve git merge conflicts in this repository. \
    Find ALL files with conflict markers (<<<<<<<, =======, >>>>>>>). \
    For each file, merge both sides cleanly and remove all conflict markers. \
    PRESERVE the logic from both sides. \
    Do NOT create branches, do NOT create PRs, do NOT use git. \
    Only edit the conflicted files in place." || \
    { fail "OpenCode timed out after 5 minutes"; return 1; }
}

step_lint_test_fix_push() {
  log "--- Step: Lint, Test, Fix & Push ---"

  npm ci

  # Lint first — catches duplicate declarations, unused imports, etc.
  if ! npm run lint; then
    warn "Lint failed. Attempting auto-fix with OpenCode..."
    timeout 300 opencode run --auto --model opencode-go/deepseek-v4-flash \
      "The merge conflict resolution introduced lint errors. \
      Fix the SOURCE CODE to resolve all ESLint errors. \
      Do NOT modify test files or eslint config. \
      Do NOT create branches or PRs." || \
      { fail "OpenCode timed out after 5 minutes"; return 1; }
    npm run lint || { fail "Lint still failing after fix. Aborting."; return 1; }
  fi

  # Then run tests
  if ! npm test; then
    warn "Tests failed. Attempting auto-fix with OpenCode..."
    timeout 300 opencode run --auto --model opencode-go/deepseek-v4-flash \
      "The merge conflict resolution broke the source code causing test failures. \
      Fix the SOURCE CODE so the existing tests pass. \
      Do NOT modify test assertions or test files. \
      Do NOT create branches or PRs." || \
      { fail "OpenCode timed out after 5 minutes"; return 1; }
    npm test || { fail "Tests still failing after fix. Aborting."; return 1; }
  fi

  # Verify no conflict markers remain before committing
  if grep -rn -I -E '^(<<<<<<<|=======|>>>>>>>)' --exclude-dir=.git --exclude-dir=node_modules .; then
    fail "Conflict markers still present after AI resolution. Aborting commit."
    return 1
  fi

  ok "All checks pass. Committing and pushing..."
  git add -A
  if git diff --cached --quiet; then
    log "No changes to commit"
  else
    git commit -m "fix: resolve merge conflicts with master"
    git push origin "$BRANCH_NAME"
  fi
}

step_re_enable_automerge() {
  log "--- Step: Re-Enable Auto-Merge ---"
  log "Re-enabling auto-merge for PR #${PR_NUMBER}..."
  gh pr merge "$PR_NUMBER" --auto --merge
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  step_prepare_git
  step_install_opencode
  step_resolve_conflicts
  step_lint_test_fix_push
  step_re_enable_automerge
  ok "Conflict resolution complete for PR #${PR_NUMBER}."
}

main "$@"
