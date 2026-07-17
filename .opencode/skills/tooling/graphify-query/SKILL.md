---
name: graphify-query
description: "Use when exploring codebase architecture, module relationships, data flow, change impact analysis, or answering 'how does X work' questions. Not for isolated local changes where you already know the target file."
---

# Graphify Query

Codebase intelligence via the pre-built knowledge graph at `graphify-out/`.

## When to Use

**Use for:**
- Architecture questions ("How does auth work?")
- Relationship tracing ("What calls state.js?")
- Change impact ("What breaks if I change this?")
- Dependency analysis ("Which modules depend on X?")
- Symbol inspection ("What is this function connected to?")

**Do not use for:**
- Isolated new files with no existing dependencies
- Obvious local changes you already understand
- Editing a file you've already identified

**Rule of thumb:** If you're about to read/grep source files to understand relationships, use graphify-query first. If you already know exactly which file needs editing, skip it.

## Checking the Graph

If `graphify-out/graph.json` does not exist, tell the user to rebuild:
> "The knowledge graph hasn't been built yet. Run `graphify .` to build it."

## Querying

```bash
graphify query "<question>"               # BFS traversal (broad context)
graphify query "<question>" --dfs          # DFS (trace a specific chain)
graphify query "<question>" --budget 1500  # Cap output at N tokens
graphify path "NodeA" "NodeB"              # Shortest path between two symbols
graphify explain "NodeName"                # Symbol + neighbours
graphify affected "NodeName"               # Reverse traversal for change impact
```

## Context from the Report

Read `graphify-out/GRAPH_REPORT.md` for:
- God nodes (most-connected symbols)
- Surprising connections (cross-boundary edges)
- Community structure (module groupings)
- Suggested questions the graph can answer

## Do Not

- Read or grep source files for relationship questions — the graph answers those at ~2k tokens instead of ~10k+
- Manually edit graph output
- Rebuild for simple lookup queries
