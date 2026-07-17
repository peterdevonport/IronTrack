# Graph Report - IronTrack  (2026-07-17)

## Corpus Check
- 65 files · ~66,573 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 556 nodes · 1972 edges · 25 communities (24 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bbc04fbc`
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
- `extractWorkoutFormValues()` --calls--> `showFeedback()`  [EXTRACTED]
  app.js → ui.js
- `initCSPHandlers()` --indirect_call--> `closeCalendarDayDetail()`  [INFERRED]
  app.js → calendar.js
- `initCSPHandlers()` --indirect_call--> `goToCalendarToday()`  [INFERRED]
  app.js → calendar.js
- `initCSPHandlers()` --indirect_call--> `toggleCalendarView()`  [INFERRED]
  app.js → calendar.js
- `initCSPHandlers()` --indirect_call--> `handlePlanAdd()`  [INFERRED]
  app.js → plans.js

## Import Cycles
- 3-file cycle: `auth.js -> forms.js -> plans.js -> auth.js`
- 4-file cycle: `auth.js -> forms.js -> plans.js -> workouts.js -> auth.js`

## Communities (25 total, 1 thin omitted)

### Community 0 - "plans.js"
Cohesion: 0.09
Nodes (48): computeTotalLoad(), getSchemaKey(), logPB(), refreshPBForm(), requireAuth(), refreshLogSetForm(), updateLogSetButtonState(), applyFieldAttributes() (+40 more)

### Community 1 - "app.js"
Cohesion: 0.03
Nodes (66): actionHandlers, amrapAdditional, amrapRounds, authFormContainer, calcAddBtn, calcClearBtn, calcLiftSelect, calcPctInput (+58 more)

### Community 2 - "sharing.js"
Cohesion: 0.07
Nodes (80): attachListeners(), handleSignedIn(), handleSignedOut(), handleWorkoutError(), initActionDispatcher(), initCSPHandlers(), processUrlParams(), pullProfileMetrics() (+72 more)

### Community 3 - "workouts.js"
Cohesion: 0.07
Nodes (58): buildWorkoutDescription(), computeDotsScore(), computeSinclairScore(), describeAmrap(), describeEmom(), describeForTime(), describeInterval(), DOTS_COEFF_FEMALE (+50 more)

### Community 4 - "calc.js"
Cohesion: 0.10
Nodes (45): buildWorkoutLog(), processWorkoutSnapshot(), updateCaches(), changePage(), changeRecordsPage(), handleCalcAdd(), handleCalcClear(), handleCalcRemove() (+37 more)

### Community 5 - "rendering.js"
Cohesion: 0.21
Nodes (26): buildWorkoutSummaryLine(), escapeHtml(), formatCardDate(), formatDotsScore(), formatMovementDisplay(), formatMovementLoad(), formatWeightSuffix(), formatWorkoutType() (+18 more)

### Community 6 - "calendar.js"
Cohesion: 0.17
Nodes (27): applyCalendarNav(), autoSelectFirstActiveDay(), calculateChallengeProgress(), calculateStreakFromPeriods(), changeCalendarNav(), closeCalendarDayDetail(), computeAndSyncDailyActivity(), getPreviousPeriodId() (+19 more)

### Community 7 - "volume.js"
Cohesion: 0.33
Nodes (14): workoutFilter, updateTodayBtnState(), computeDailyBuckets(), computeMonthlyBuckets(), computeVolumeHistory(), computeWeeklyBuckets(), computeYearlyBuckets(), formatRangeLabel() (+6 more)

### Community 8 - "state.js"
Cohesion: 0.07
Nodes (25): activeDates, authBtn, CONSISTENCY_CONFIG, emailInput, exerciseSelect, loginBtn, loginView, onboardingAddBtn (+17 more)

### Community 9 - "devDependencies"
Cohesion: 0.09
Nodes (22): eslint, @eslint/js, globals, jsdom, devDependencies, eslint, @eslint/js, globals (+14 more)

### Community 10 - "ui.js"
Cohesion: 0.11
Nodes (16): currentPageDisplay, navBar, nextPageBtn, paginationControls, prevPageBtn, profileModal, tabContents, totalPagesDisplay (+8 more)

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
Cohesion: 0.24
Nodes (10): addOnboarding1RM(), showOnboarding(), renderOnboarding1RMList(), appView, bottomNav, onboardingExerciseSelect, onboardingRepsInput, onboardingView (+2 more)

### Community 15 - "saveOnboarding"
Cohesion: 0.40
Nodes (5): buildOnboardingLogEntry(), buildOnboardingProfileData(), collectOnboardingFormValues(), saveOnboarding(), hideOnboarding()

### Community 16 - "graphify.js"
Cohesion: 0.67
Nodes (3): GraphifyPlugin(), IMPORTANT: keep all reminder strings free of backticks and $(...) constructs., REMINDED_TOOLS

### Community 22 - "OpenCode System Instructions & Guardrails"
Cohesion: 0.18
Nodes (10): 1. Critical Git Workflow, 2. Development & Coding Standards, 3. Commit Message Guidelines, 4. Execution & Safety Guardrails, 5. Dependency Management, 6. Graphify Knowledge Graph, 7. Verification Checklist (Definition of Done), Mandatory graph-first rule (+2 more)

## Knowledge Gaps
- **126 isolated node(s):** `DOTS_COEFF_MALE`, `DOTS_COEFF_FEMALE`, `DOTS_TIER_CUTOFFS_MALE`, `DOTS_TIER_CUTOFFS_FEMALE`, `PASSWORD_ERROR_MAP` (+121 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `showFeedback()` connect `sharing.js` to `plans.js`, `app.js`, `workouts.js`, `calc.js`, `volume.js`, `ui.js`, `theme.js`, `onboarding.js`, `saveOnboarding`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `initTheme()` connect `theme.js` to `app.js`, `sharing.js`, `calc.js`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `haptic()` connect `sharing.js` to `plans.js`, `app.js`, `workouts.js`, `calc.js`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `initCSPHandlers()` (e.g. with `app.js` and `closeCalendarDayDetail()`) actually correct?**
  _`initCSPHandlers()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DOTS_COEFF_MALE`, `DOTS_COEFF_FEMALE`, `DOTS_TIER_CUTOFFS_MALE` to the rest of the system?**
  _126 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `plans.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09061224489795919 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.027777777777777776 - nodes in this community are weakly interconnected._