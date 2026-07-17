# Module Map

## Core Infrastructure
| Module | Role |
|--------|------|
| `app.js` | Entry point. Wires Firebase auth, attaches Firestore listeners, initialises UI, dispatches delegated events |
| `state.js` | Single mutable state object + DOM refs + constants + FORM_SCHEMAS |

## Data & Storage
| Module | Role |
|--------|------|
| `firebase.js` | Firebase app init + auth + Firestore re-exports |
| `data.js` | Firestore `onSnapshot` listeners, process snapshots into reducers |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker (cache-first strategy) |

## Business Logic
| Module | Role |
|--------|------|
| `math.js` | Pure functions: Epley 1RM, RPE calculations, tonnage |
| `calc.js` | Calculator UI logic: %1RM, RPE calculator, volume calculations |
| `analytics.js` | DOTS/Sinclair scores, workout analytics, consistency metrics |
| `exercise-data.js` | Static exercise catalog with load factors |
| `date.js` | Date utilities: week start, month ranges, formatting |
| `formatting.js` | Display formatting: numbers, dates, durations |

## UI
| Module | Role |
|--------|------|
| `rendering.js` | HTML template literal functions for all views |
| `ui.js` | Shared UI: pagination, feedback toasts, tab switching |
| `dom.js` | DOM utilities: debounce, escapeHtml, haptic feedback |
| `theme.js` | Dark/light/auto theme management |
| `messages.js` | Centralised user-facing string constants (MSG) |

## Feature Modules
| Module | Role |
|--------|------|
| `workouts.js` | Structured workout submission, scoring, rendering |
| `plans.js` | Workout plan builder, CRUD, plan navigation |
| `volume.js` | Volume history tracking, filtering, rendering |
| `calendar.js` | Training calendar: month view, day selection, activity display |
| `auth.js` | Auth UI, profile loading, cache refresh |
| `onboarding.js` | First-time user onboarding flow |
| `social.js` | Friends, leaderboard, sharing, QR codes |
| `forms.js` | Dynamic form field builders for log entries |

## Configuration
| Module | Role |
|--------|------|
| `index.html` | Single-page app shell (all HTML in one file) |
| `style.css` | Custom CSS: design tokens, component styles, theme overrides |
| `opencode.json` | OpenCode agent configuration |
| `AGENTS.md` | OpenCode system instructions |
