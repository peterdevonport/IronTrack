---
name: code-review
description: "Use when reviewing code changes for architecture compliance, maintainability, security, unnecessary complexity, or separation of concerns."
---

# Code Review

## Architecture Compliance
- Changes follow the project's established patterns
- State mutations respect the defined state model
- New code is placed in the correct module, not dumped in an existing one
- Cross-module dependencies are explicit, not hidden

## Maintainability
- Functions have a single responsibility
- Duplicate logic is extracted and shared, not copied
- Names are descriptive and consistent with the codebase style
- Complex logic has inline explanations of why, not just what

## Security
- No user input is rendered unsanitised
- No secrets committed (API keys, tokens, credentials)
- No direct eval or dynamic code execution
- Firebase query scope matches the intended data access

## Unnecessary Complexity
- No abstractions that solve problems the project doesn't have
- No premature performance optimisation
- No new dependencies when existing tools suffice
- No configuration when convention would work

## Review Cadence
- Read the diff first, then the full files if needed
- Ask "is this the right change?" before "does this work?"
- If a change is hard to review, it's probably too large
