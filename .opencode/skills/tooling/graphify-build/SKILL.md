---
name: graphify-build
description: "Use when graphify-out is missing, stale, or codebase structure has significantly changed. Not for simple lookups or queries."
---

# Graphify Build

Maintain the code intelligence index at `graphify-out/`.

## When to Rebuild

- `graphify-out/` does not exist
- Major file moves or renames
- Dependency structure changed
- Architecture questions produce stale or incorrect results

## Workflow

```bash
graphify . --code-only --update   # Incremental: re-parses changed files only
```

Then verify:
- `graphify-out/graph.json` exists
- `graphify-out/GRAPH_REPORT.md` generated
- Timestamp reflects current build

For a full rebuild from scratch:
```bash
graphify .
```

## Do Not

- Manually edit graph output files
- Rebuild for simple code searches or queries
- Rebuild unnecessarily — the existing graph handles most questions
