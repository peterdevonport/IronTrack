# Graph Report - IronTrack  (2026-07-17)

## Corpus Check
- 82 files · ~69,277 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 689 nodes · 2089 edges · 44 communities (43 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6678fe1f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- plans.js
- app.js
- sharing.js
- workouts.js
- calc.js
- rendering.js
- calendar.js
- volume.js
- state.js
- devDependencies
- ui.js
- theme.js
- manifest.json
- opencode.json
- onboarding.js
- saveOnboarding
- graphify.js
- sw.js
- OpenCode System Instructions & Guardrails
- Frontend Development
- PR Workflow
- Module Map
- IronTrack Testing
- Code Review
- QA Testing
- Interaction Patterns
- Graphify Query
- Firebase Data Flow
- Component Patterns
- forms.js
- State Model
- Styling
- Upstream Graphify Pipeline Reference
- Graphify Build
- Dependency Management
- Git Workflow
- IronTrack Architecture
- IronTrack Frontend

## God Nodes (most connected - your core abstractions)
1. `showFeedback()` - 41 edges
2. `haptic()` - 32 edges
3. `initCSPHandlers()` - 30 edges
4. `escapeHtml()` - 26 edges
5. `renderEmptyState()` - 22 edges
6. `state` - 19 edges
7. `getEffectiveLoad()` - 17 edges
8. `toLocalDateKey()` - 16 edges
9. `estimate1RM()` - 15 edges
10. `getProfileDocRef()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `processUrlParams()` --indirect_call--> `switchPlansFilter()`  [INFERRED]
  app.js → plans.js
- `extractWorkoutFormValues()` --calls--> `showFeedback()`  [EXTRACTED]
  app.js → ui.js
- `initCSPHandlers()` --indirect_call--> `closeCalendarDayDetail()`  [INFERRED]
  app.js → calendar.js
- `initCSPHandlers()` --indirect_call--> `goToCalendarToday()`  [INFERRED]
  app.js → calendar.js
- `initCSPHandlers()` --indirect_call--> `toggleCalendarView()`  [INFERRED]
  app.js → calendar.js

## Import Cycles
- 3-file cycle: `auth.js -> forms.js -> plans.js -> auth.js`
- 4-file cycle: `auth.js -> forms.js -> plans.js -> workouts.js -> auth.js`

## Communities (44 total, 1 thin omitted)

### Community 0 - "plans.js"
Cohesion: 0.10
Nodes (42): addPlanMinuteSlot(), buildPlanDocument(), capturePlanStructure(), changePlansPage(), cleanupWorkoutSubscriptions(), deletePlan(), deleteStructuredWorkout(), formatIntervalLabel() (+34 more)

### Community 1 - "app.js"
Cohesion: 0.03
Nodes (66): actionHandlers, amrapAdditional, amrapRounds, authFormContainer, calcAddBtn, calcClearBtn, calcLiftSelect, calcPctInput (+58 more)

### Community 2 - "sharing.js"
Cohesion: 0.09
Nodes (66): attachListeners(), handleSignedIn(), handleSignedOut(), processUrlParams(), pullProfileMetrics(), haptic(), getDisplayName(), app (+58 more)

### Community 3 - "workouts.js"
Cohesion: 0.07
Nodes (62): buildWorkoutDescription(), computeDotsScore(), computeSinclairScore(), describeAmrap(), describeEmom(), describeForTime(), describeInterval(), DOTS_COEFF_FEMALE (+54 more)

### Community 4 - "calc.js"
Cohesion: 0.10
Nodes (47): buildWorkoutLog(), computeTotalLoad(), getSchemaKey(), logPB(), processWorkoutSnapshot(), refreshPBForm(), updateCaches(), changePage() (+39 more)

### Community 5 - "rendering.js"
Cohesion: 0.18
Nodes (27): buildWorkoutSummaryLine(), debounce(), escapeHtml(), formatCardDate(), formatDotsScore(), formatMovementDisplay(), formatMovementLoad(), formatWeightSuffix() (+19 more)

### Community 6 - "calendar.js"
Cohesion: 0.16
Nodes (28): applyCalendarNav(), autoSelectFirstActiveDay(), calculateChallengeProgress(), calculateStreakFromPeriods(), changeCalendarNav(), closeCalendarDayDetail(), computeAndSyncDailyActivity(), getPreviousPeriodId() (+20 more)

### Community 7 - "volume.js"
Cohesion: 0.19
Nodes (25): initActionDispatcher(), initCSPHandlers(), switchCalcMode(), switchLeaderboardFormula(), switchLeaderboardScope(), handlePlanExerciseChange(), switchPlansFilter(), workoutFilter (+17 more)

### Community 8 - "state.js"
Cohesion: 0.08
Nodes (23): authBtn, emailInput, exerciseSelect, loginBtn, loginView, onboardingAddBtn, onboardingDaysLifetime, onboardingDaysMonthly (+15 more)

### Community 9 - "devDependencies"
Cohesion: 0.09
Nodes (22): eslint, @eslint/js, globals, jsdom, devDependencies, eslint, @eslint/js, globals (+14 more)

### Community 10 - "ui.js"
Cohesion: 0.12
Nodes (14): currentPageDisplay, navBar, nextPageBtn, paginationControls, prevPageBtn, profileModal, tabContents, totalPagesDisplay (+6 more)

### Community 11 - "theme.js"
Cohesion: 0.58
Nodes (8): applyThemeClass(), initAutoListener(), initTheme(), persistTheme(), setTheme(), updateMetaThemeColor(), updateToggleUI(), wireThemeToggle()

### Community 12 - "manifest.json"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, name, scope, screenshots, short_name (+2 more)

### Community 13 - "opencode.json"
Cohesion: 0.18
Nodes (10): agent, build, plan, model, model, enabled, model, provider (+2 more)

### Community 14 - "onboarding.js"
Cohesion: 0.24
Nodes (10): addOnboarding1RM(), showOnboarding(), renderOnboarding1RMList(), appView, bottomNav, onboardingExerciseSelect, onboardingRepsInput, onboardingView (+2 more)

### Community 15 - "saveOnboarding"
Cohesion: 0.40
Nodes (5): buildOnboardingLogEntry(), buildOnboardingProfileData(), collectOnboardingFormValues(), saveOnboarding(), hideOnboarding()

### Community 16 - "graphify.js"
Cohesion: 0.05
Nodes (36): agent, build, frontend-specialist, graph-explorer, plan, pr-specialist, qa-specialist, review-specialist (+28 more)

### Community 22 - "OpenCode System Instructions & Guardrails"
Cohesion: 0.33
Nodes (5): Codebase Intelligence, Commits, Git Workflow, OpenCode System Instructions, Safety

### Community 25 - "Frontend Development"
Cohesion: 0.25
Nodes (7): Accessibility, Component Patterns, CSS Architecture, Event Handling, Frontend Development, Responsive Design, Security

### Community 26 - "PR Workflow"
Cohesion: 0.25
Nodes (7): After PR Creation, Branch Naming, Commit Messages, Do Not, PR Description Template, PR Workflow, Pre-Push Checklist

### Community 27 - "Module Map"
Cohesion: 0.25
Nodes (7): Business Logic, Configuration, Core Infrastructure, Data & Storage, Feature Modules, Module Map, UI

### Community 28 - "IronTrack Testing"
Cohesion: 0.25
Nodes (7): Common Regression Areas, Firebase Testing, IronTrack Testing, State Testing, Test Command, Test Framework, What to Mock

### Community 29 - "Code Review"
Cohesion: 0.29
Nodes (6): Architecture Compliance, Code Review, Maintainability, Review Cadence, Security, Unnecessary Complexity

### Community 30 - "QA Testing"
Cohesion: 0.29
Nodes (6): Mocking, QA Testing, Running Tests, Test Coverage, Test Isolation, Test Structure

### Community 31 - "Interaction Patterns"
Cohesion: 0.29
Nodes (6): CSP-Safe Handlers, Event Delegation, Feedback System, Haptic Feedback, Interaction Patterns, Swipe Gestures

### Community 32 - "Graphify Query"
Cohesion: 0.29
Nodes (6): Checking the Graph, Context from the Report, Do Not, Graphify Query, Querying, When to Use

### Community 33 - "Firebase Data Flow"
Cohesion: 0.33
Nodes (5): Auth Flow, Data Pipeline, Firebase Data Flow, Key Modules, Listener Setup (in `app.js`)

### Community 34 - "Component Patterns"
Cohesion: 0.33
Nodes (5): Action Buttons, Component Patterns, Pagination, Rendering Functions, Tab Navigation

### Community 35 - "forms.js"
Cohesion: 0.50
Nodes (4): applyFieldAttributes(), buildWmsField(), togglePlanWms(), updatePillActive()

### Community 36 - "State Model"
Cohesion: 0.40
Nodes (4): Key Rules, Mutation Pattern, State Model, State Tree

### Community 37 - "Styling"
Cohesion: 0.40
Nodes (4): Brand Color, Styling, Theme Modes, Three-Layer System

### Community 38 - "Upstream Graphify Pipeline Reference"
Cohesion: 0.40
Nodes (4): Most Common Flags, Quick Reference, Upstream Graphify Pipeline Reference, When to Load This Reference

### Community 39 - "Graphify Build"
Cohesion: 0.40
Nodes (4): Do Not, Graphify Build, When to Rebuild, Workflow

### Community 40 - "Dependency Management"
Cohesion: 0.40
Nodes (4): After Any Install, Before Major Updates, Dependency Management, Version Pinning

### Community 41 - "Git Workflow"
Cohesion: 0.40
Nodes (4): Branch Naming, Branch Strategy, Commits, Git Workflow

### Community 42 - "IronTrack Architecture"
Cohesion: 0.50
Nodes (3): Before Modifying Architecture, Core Principles, IronTrack Architecture

### Community 43 - "IronTrack Frontend"
Cohesion: 0.50
Nodes (3): Before Creating New UI, Core Patterns, IronTrack Frontend

## Knowledge Gaps
- **220 isolated node(s):** `$schema`, `.opencode/skills`, `model`, `model`, `description` (+215 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `initTheme()` connect `theme.js` to `app.js`, `sharing.js`, `calc.js`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `showFeedback()` connect `sharing.js` to `plans.js`, `app.js`, `workouts.js`, `calc.js`, `volume.js`, `ui.js`, `theme.js`, `onboarding.js`, `saveOnboarding`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `haptic()` connect `sharing.js` to `plans.js`, `app.js`, `workouts.js`, `calc.js`, `rendering.js`, `calendar.js`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `initCSPHandlers()` (e.g. with `app.js` and `closeCalendarDayDetail()`) actually correct?**
  _`initCSPHandlers()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `.opencode/skills`, `model` to the rest of the system?**
  _220 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `plans.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09966777408637874 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.027777777777777776 - nodes in this community are weakly interconnected._