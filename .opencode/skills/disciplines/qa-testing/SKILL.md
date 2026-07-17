---
name: qa-testing
description: "Use for generic testing patterns: test structure, coverage strategy, mocking principles, and vitest commands. Not project-specific."
---

# QA Testing

## Test Structure
- One test file per module: `module.test.js`
- Group related tests with `describe` blocks
- Each test (`it`) should verify one behaviour
- Test descriptions should read as specifications: "returns X when given Y"

## Test Coverage
- Test happy paths, error paths, and edge cases
- Edge cases: empty data, null values, boundary conditions, unexpected input types
- Mock external services (Firebase, API calls) — never depend on real services

## Mocking
- Mock at the module boundary
- Prefer dependency injection over global mock setup
- Reset mocks between tests to avoid state leakage
- Mock only what the test needs — not everything

## Test Isolation
- Tests should not depend on each other
- Reset state between tests (setup/teardown)
- Avoid shared mutable state across test files

## Running Tests
```bash
npx vitest run           # Run all tests
npx vitest run <file>    # Run a specific test file
npx vitest               # Watch mode
```
