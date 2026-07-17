# Upstream Graphify Pipeline Reference

The full Graphify build pipeline is documented in the upstream skill at:

```
~/.config/opencode/skills/graphify/SKILL.md
```

## When to Load This Reference

Load this reference only when:
- You need to understand the internals of extraction (AST, semantic)
- Debugging a failed build
- Running advanced flags (--neo4j, --falkordb, --mcp)

## Quick Reference

Core pipeline (9 steps):
1. Ensure Python interpreter
2. Detect files (corpus summary)
3. Extract entities (AST + semantic subagents)
4. Build graph + cluster + analyse
5. Label communities
6. Generate HTML + optional Obsidian
7. Optional exports (Neo4j, FalkorDB, SVG, GraphML, MCP)
8. (reserved)
9. Save manifest, update cost tracker, clean up

## Most Common Flags

| Flag | Purpose |
|------|---------|
| `--code-only` | Skip semantic extraction (code-only corpus) |
| `--update` | Incremental: re-parses only changed files |
| `--mode deep` | More aggressive INFERRED edge extraction |
| `--no-viz` | Skip HTML generation |
