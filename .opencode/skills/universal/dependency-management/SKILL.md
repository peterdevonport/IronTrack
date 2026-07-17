---
name: dependency-management
description: "Use when installing, updating, or removing npm packages, or when lockfile issues arise."
---

# Dependency Management

## Version Pinning
- Pin exact versions in devDependencies (no `^` carets) to prevent lockfile drift
- Direct dependencies: use `^` unless there's a specific reason not to

## After Any Install
- Always run `npm ci` locally to verify lockfile consistency before pushing
- If `npm ci` fails with `Invalid: lock file's <pkg> does not satisfy <pkg>`:
  1. Run `npm install` (no args) to sync the lockfile
  2. Commit the updated `package-lock.json`

## Before Major Updates
- Run `npm audit` to check for known vulnerabilities
- Update one major version at a time
- Test thoroughly after any major version bump
