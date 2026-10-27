# IronTrack

IronTrack is an installable progressive web app for tracking weightlifting and
functional-fitness training. It is a vanilla JavaScript application with no
build step. Firebase Authentication and Cloud Firestore provide account and
data storage; the static application is deployed to GitHub Pages.

![IronTrack desktop view](screenshot-wide.png)

## Features

The application is organized into five tabs:

- **Dash** — consistency calendar, challenge streaks, saved/shared plans,
  scores, friends, leaderboard, and personal-record logging.
- **Plan** — one-rep-max calculator, percentage/RPE working weights, and
  personal-record tables.
- **Train** — manual set logging and structured AMRAP, EMOM, For Time, and
  Interval workouts. Plans can be saved and shared with friends or by QR code.
- **Perf.** — DOTS and Sinclair scores, leaderboard views, and personal-record
  history.
- **History** — volume charts, exercise filters, workout history, and
  structured-workout history.

The app supports email/password authentication, onboarding, light/dark/auto
themes, friend links, QR/deep-link sharing, and offline shell caching through a
service worker.

## Repository layout

The application is intentionally flat and loads ES modules directly from the
repository root. Important modules include:

| File | Responsibility |
| --- | --- |
| `app.js` | Application entry point, authentication state, navigation, and event wiring |
| `state.js` | Shared mutable state and DOM references |
| `firebase.js` | Firebase initialization and SDK exports |
| `auth.js`, `data.js` | Profile/workout loading and Firestore data streams |
| `workouts.js` | Structured workout creation and contribution logging |
| `plans.js` | Plan builder, plan library, and plan execution |
| `sharing.js`, `friends.js`, `leaderboard.js` | Social features and sharing |
| `calc.js`, `analytics.js`, `math.js`, `volume.js` | Calculations and performance analytics |
| `calendar.js` | Consistency calendar and streaks |
| `rendering.js`, `ui.js`, `forms.js` | Rendering and reusable UI behavior |
| `theme.js` | Theme persistence and synchronization |
| `index.html`, `style.css`, `manifest.json`, `sw.js` | Application shell, styling, PWA metadata, and caching |

The Firestore document model is documented in
[`docs/firebase-schema.md`](docs/firebase-schema.md).

## Requirements and local development

The repository specifies Node.js 20 in [`.nvmrc`](.nvmrc). Install the
development dependencies with:

```sh
npm ci
```

There is no local build command or development server in the repository. Run a
static HTTP server from the project root, for example:

```sh
npx serve .
```

Then open the URL printed by the server. HTTP(S) is recommended because ES
modules and service workers are restricted when loaded directly from
`file://`.

The Firebase web configuration is in [`firebase.js`](firebase.js). It points
at the project used by the deployed application; Firebase Authentication still
requires a signed-in user before application data can be written.

## Tests and linting

```sh
npm test                 # Run Vitest in watch mode
npm run test:coverage   # Run tests with V8 coverage
npm run lint            # Run ESLint
npm run lint:fix        # Apply ESLint fixes
```

Tests use Vitest with a jsdom environment. They cover workout submission,
calculation, date/formatting helpers, rendering, calendar behavior, volume
aggregation, and selected Firestore stream logic. Some application-wide flows
(including much of `app.js`, sharing, and social features) remain lightly
covered.

## Deployment

The GitHub Actions deployment workflow runs on pushes to `master`. It stamps a
date and short commit SHA into the service worker and page metadata, then
publishes the repository root to GitHub Pages. Pull requests are checked by the
test workflow with `npm ci`, ESLint, and Vitest.

For the local version-stamping helper, see [`deploy.ps1`](deploy.ps1). Review
the generated diff before committing. Firestore rules and indexes are checked
into [`firestore.rules`](firestore.rules) and
[`firestore.indexes.json`](firestore.indexes.json), but this repository does
not include `firebase.json` and the Pages workflow does not deploy them; treat
rules deployment as a separate operational step.

## Test data

[`seed.html`](seed.html) is a development utility for creating representative
Firestore data. Use it only against an appropriate test account/project.

## Contributor guidance

- Follow [`AGENTS.md`](AGENTS.md) for branch and commit rules.
- Project-specific engineering guidance is under
  [`.opencode/skills/`](.opencode/skills/).
- Keep Firestore field changes synchronized with
  [`docs/firebase-schema.md`](docs/firebase-schema.md), security rules, and
  tests.
