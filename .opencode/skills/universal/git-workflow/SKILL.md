---
name: git-workflow
description: "Use when creating branches, committing, pushing, or managing git history in this project."
---

# Git Workflow

## Branch Strategy
- Always run `git checkout master && git pull origin master` before starting work
- Create feature or bugfix branches from master: `feature/ISSUE-NUMBER-short-description`
- Never commit, modify, or push code directly to master
- Push completed branches to remote; do not merge via CLI

## Branch Naming
- `feature/42-add-user-auth`
- `bugfix/17-fix-login-error`
- GitHub auto-links branches containing issue numbers

## Commits
- Use Conventional Commits: `type(scope): short description`
- Allowed types: feat, fix, docs, style, refactor, test, chore
- Reference issues with #N (e.g., `feat(auth): add validation #23`)
- Never use `closes #N` or `fixes #N` interactively — let CI handle it
