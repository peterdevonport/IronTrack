---
name: irontrack-frontend
description: "Use for any IronTrack UI change: components, styling, templates, pagination, event handling, and user interactions. Not for architecture or data flow changes. Also load frontend-dev for accessibility, responsive design, and CSS architecture methodology guidance."
---

# IronTrack Frontend

UI conventions for IronTrack's browser-native interface.

> **Also load `frontend-dev`** for cross-project methodology guidance on accessibility, responsive design, CSS architecture, and security best practices. This skill covers only IronTrack-specific patterns.

## Core Patterns

- **Template literals.** All HTML is generated via template literal functions in `rendering.js`.
- **escapeHtml()** on all user-supplied values.
- **MSG constants** from `messages.js` for all user-facing text.
- **showFeedback()** for transient notifications. **haptic()** for mobile vibration.
- **Pagination pattern.** Every list (workouts, plans, friends) uses prev/next with page tracking in `state.pagination`.

## Before Creating New UI

Look at existing components first. Follow the same patterns.
