---
name: irontrack-architecture
description: "Use when modifying core modules, adding features that touch multiple files, debugging cross-module issues, or understanding the system design. Not for isolated UI changes or single-file edits."
---

# IronTrack Architecture

Browser-native ES module application. No framework, no build pipeline.

## Core Principles

- **Flat file structure.** All source modules at project root. No src/ directory.
- **Single mutable state owner.** `state.js` is the authoritative source. Avoid parallel state objects.
- **Rendering separated from calculations.** `rendering.js` owns HTML templates. Math modules (`math.js`, `calc.js`) are pure functions.
- **Firebase streams data.** Real-time listeners in `app.js` feed into processing functions via callbacks.
- **Event delegation.** `data-action` attributes on elements dispatched through `initActionDispatcher()` in `app.js`.

## Before Modifying Architecture

Consult the references below, especially `module-map.md` to understand which modules share responsibility boundaries.
