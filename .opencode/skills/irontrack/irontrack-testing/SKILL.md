---
name: irontrack-testing
description: "Use when writing tests for IronTrack, debugging test failures, or understanding what to mock and how to structure tests for this project's architecture."
---

# IronTrack Testing

Project-specific test knowledge for the IronTrack codebase.

## Test Framework

- **Vitest** with `jsdom` environment
- Test files in `tests/` directory, named `*.test.js`
- Standard `describe`/`it`/`expect` patterns

## What to Mock

| Module | Approach |
|--------|----------|
| `state.js` | Mock via `vi.mock()` — import the module path, provide mock state |
| Firebase (`firebase.js`) | Mock at module level — no real Firestore in tests |
| `dom.js` (escapeHtml, haptic) | Usually not needed — pure functions work in jsdom |
| `math.js` | Don't mock — pure functions, test them directly |

## Firebase Testing

Use `vi.mock()` to stub Firestore methods. Integration tests exist in `listenToDataStream.integration.test.js` for reference. Use factory functions to generate realistic workout/plan data structures.

## State Testing

- Directly set `state` properties before calling the function under test
- Verify expected state mutations after the call
- Test render function output by passing mock state

## Common Regression Areas

- **Calc logic.** 1RM estimation (Epley formula), RPE calculations, DOTS/Sinclair scores
- **Rendering.** Template output with various data shapes (empty, single, paginated)
- **Data processing.** Snapshot → state transformations, cache updates
- **Edge cases.** Empty workout lists, missing user profile, null values, boundary dates

## Test Command

```bash
npx vitest run           # Run all tests
npx vitest run <file>    # Run a specific test file
npx vitest               # Watch mode
```
