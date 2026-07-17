---
name: pr-workflow
description: "Use when creating pull requests, naming branches, or writing PR descriptions. Invoked only when the user explicitly requests PR creation."
---

# PR Workflow

## Branch Naming
- `feature/ISSUE-NUMBER-short-description`
- `bugfix/ISSUE-NUMBER-short-description`
- GitHub auto-links branches containing issue numbers

## Pre-Push Checklist
- [ ] `git status` — no untracked secrets or accidental files
- [ ] Tests pass (`npx vitest run`)
- [ ] No debug logging, commented code, or TODO stubs
- [ ] Lockfile is consistent (`npm ci` passes)

## PR Description Template
```
## What
Brief description of the change.

## Why
Problem being solved or feature being added.

## Testing
How this was verified.

## Notes
Anything reviewers should know.
```

## Commit Messages
- Conventional Commits: `type(scope): description`
- Reference issues with #N (e.g., `feat(auth): add validation #23`)
- Never use `closes #N` or `fixes #N` interactively — let merge workflows handle it

## After PR Creation
- Push branch to remote
- Provide branch name so the user can open the PR on GitHub
- Do not attempt to merge via CLI

## Do Not
- Write PR descriptions to temp files — compose in memory and pass via `gh pr create --body`
- Create any files outside the project without explicit user permission
- Push without running the pre-push checklist first
