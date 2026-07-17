# Graph Report - /home/peter/projects/IronTrack  (2026-07-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 542 nodes · 1960 edges · 22 communities (20 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e73d12e5`
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
- `initCSPHandlers()` --indirect_call--> `closeCalendarDayDetail()`  [INFERRED]
  app.js → calendar.js
- `initCSPHandlers()` --indirect_call--> `goToCalendarToday()`  [INFERRED]
  app.js → calendar.js
- `initCSPHandlers()` --indirect_call--> `toggleCalendarView()`  [INFERRED]
  app.js → calendar.js
- `initCSPHandlers()` --indirect_call--> `copyCyberTag()`  [INFERRED]
  app.js → friends.js

## Import Cycles
- 3-file cycle: `auth.js -> forms.js -> plans.js -> auth.js`
- 4-file cycle: `auth.js -> forms.js -> plans.js -> workouts.js -> auth.js`

## Communities (22 total, 2 thin omitted)

### Community 0 - "plans.js"
Cohesion: 0.07
Nodes (62): buildWorkoutLog(), handleSignedOut(), computeTotalLoad(), getSchemaKey(), logPB(), refreshPBForm(), requireAuth(), refreshLogSetForm() (+54 more)

### Community 1 - "app.js"
Cohesion: 0.03
Nodes (65): actionHandlers, amrapAdditional, amrapRounds, authFormContainer, calcAddBtn, calcClearBtn, calcLiftSelect, calcPctInput (+57 more)

### Community 2 - "sharing.js"
Cohesion: 0.09
Nodes (58): extractWorkoutFormValues(), handleSignedIn(), handleWorkoutError(), processUrlParams(), pullProfileMetrics(), debounce(), haptic(), addFriendFromLeaderboard() (+50 more)

### Community 3 - "workouts.js"
Cohesion: 0.08
Nodes (54): buildWorkoutDescription(), computeDotsScore(), computeSinclairScore(), describeAmrap(), describeEmom(), describeForTime(), describeInterval(), DOTS_COEFF_FEMALE (+46 more)

### Community 4 - "calc.js"
Cohesion: 0.10
Nodes (38): attachListeners(), processWorkoutSnapshot(), updateCaches(), changePage(), changeRecordsPage(), handleCalcAdd(), handleCalcClear(), handleCalcRemove() (+30 more)

### Community 5 - "rendering.js"
Cohesion: 0.17
Nodes (31): buildWorkoutSummaryLine(), escapeHtml(), getDisplayName(), formatCardDate(), formatDotsScore(), formatMovementDisplay(), formatMovementLoad(), formatWeightSuffix() (+23 more)

### Community 6 - "calendar.js"
Cohesion: 0.15
Nodes (29): applyCalendarNav(), autoSelectFirstActiveDay(), calculateChallengeProgress(), calculateStreakFromPeriods(), changeCalendarNav(), closeCalendarDayDetail(), computeAndSyncDailyActivity(), getPreviousPeriodId() (+21 more)

### Community 7 - "volume.js"
Cohesion: 0.15
Nodes (31): initActionDispatcher(), initCSPHandlers(), switchCalcMode(), switchLeaderboardFormula(), switchLeaderboardScope(), handleWorkoutTypeChange(), populateMovementDropdowns(), removeMinuteSlot() (+23 more)

### Community 8 - "state.js"
Cohesion: 0.08
Nodes (23): authBtn, emailInput, exerciseSelect, loginBtn, loginView, onboardingAddBtn, onboardingDaysLifetime, onboardingDaysMonthly (+15 more)

### Community 9 - "devDependencies"
Cohesion: 0.09
Nodes (22): eslint, @eslint/js, globals, jsdom, devDependencies, eslint, @eslint/js, globals (+14 more)

### Community 10 - "ui.js"
Cohesion: 0.12
Nodes (15): currentPageDisplay, navBar, nextPageBtn, paginationControls, prevPageBtn, profileModal, tabContents, totalPagesDisplay (+7 more)

### Community 11 - "theme.js"
Cohesion: 0.35
Nodes (12): applyThemeClass(), DARK_META, getDefaultMeta(), getMetaTag(), initAutoListener(), initTheme(), LIGHT_META, persistTheme() (+4 more)

### Community 12 - "manifest.json"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, name, scope, screenshots, short_name (+2 more)

### Community 13 - "opencode.json"
Cohesion: 0.18
Nodes (10): agent, build, plan, model, model, enabled, model, provider (+2 more)

### Community 14 - "onboarding.js"
Cohesion: 0.22
Nodes (9): addOnboarding1RM(), showOnboarding(), appView, bottomNav, onboardingExerciseSelect, onboardingRepsInput, onboardingView, onboardingWeightInput (+1 more)

### Community 15 - "saveOnboarding"
Cohesion: 0.40
Nodes (5): buildOnboardingLogEntry(), buildOnboardingProfileData(), collectOnboardingFormValues(), saveOnboarding(), hideOnboarding()

## Knowledge Gaps
- **118 isolated node(s):** `DOTS_COEFF_MALE`, `DOTS_COEFF_FEMALE`, `DOTS_TIER_CUTOFFS_MALE`, `DOTS_TIER_CUTOFFS_FEMALE`, `PASSWORD_ERROR_MAP` (+113 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `showFeedback()` connect `sharing.js` to `plans.js`, `app.js`, `workouts.js`, `calc.js`, `volume.js`, `ui.js`, `theme.js`, `onboarding.js`, `saveOnboarding`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `initTheme()` connect `theme.js` to `plans.js`, `app.js`, `sharing.js`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `haptic()` connect `sharing.js` to `plans.js`, `app.js`, `workouts.js`, `calc.js`, `calendar.js`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `initCSPHandlers()` (e.g. with `app.js` and `closeCalendarDayDetail()`) actually correct?**
  _`initCSPHandlers()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DOTS_COEFF_MALE`, `DOTS_COEFF_FEMALE`, `DOTS_TIER_CUTOFFS_MALE` to the rest of the system?**
  _118 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `plans.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06735159817351598 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.028169014084507043 - nodes in this community are weakly interconnected._