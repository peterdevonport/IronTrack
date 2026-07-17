---
name: irontrack-frontend
description: "Use when creating or modifying UI components, styling, layout, templates, or user interactions in IronTrack. Not for architecture or data flow changes."
---

# IronTrack Frontend

UI conventions for IronTrack's browser-native interface.

## Core Patterns

- **Template literals.** All HTML is generated via template literal functions in `rendering.js`.
- **escapeHtml()** on all user-supplied values.
- **MSG constants** from `messages.js` for all user-facing text.
- **showFeedback()** for transient notifications. **haptic()** for mobile vibration.
- **Pagination pattern.** Every list (workouts, plans, friends) uses prev/next with page tracking in `state.pagination`.

## Before Creating New UI

Look at existing components first. Follow the same patterns.
