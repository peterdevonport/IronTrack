# Work Summary

## What was done

### AGENTS.md (this file)
Created a persistent work session summary so state is never lost.

### Bug fix — `redoWorkout()` feedback target (issue: `app.js`)
- Fixed `showFeedback` call to reference `'planFeedback'` instead of dynamically computed `${sw.type.toLowerCase()}Feedback` (line 3591)

### Bug fix — `loadPlan()` feedback target (issue: `app.js`)
- Fixed `showFeedback` call to reference `'planFeedback'` instead of dynamically computed `${plan.type.toLowerCase()}Feedback` (line 3566)

### Bug fix — `loadSharedPlan()` feedback target (issue: `app.js`)
- Fixed `showFeedback` call to reference `'planFeedback'` instead of dynamically computed `${plan.type.toLowerCase()}Feedback` (line 4355)

### Missing `onclick` handler — `#plan-add-btn` (issue: `index.html`)
- Added `onclick="handlePlanAdd()"` to the button element (line 814)

### Dead initialization code (issue: `app.js`)
- Replaced `addMovementRow('fortime-movement-list')` with comment (line ~4909)
- Replaced `addMovementRow('interval-movement-list')` with comment
- Replaced `addMinuteSlot()` with comment (line ~4941)
- Replaced `addMovementRow()` inside `#movement-list` check with comment (line ~5004)
- Replaced old per-type event listeners for `.movement-weight` with unified `#plan-weight` / `#plan-reps` listener

### Dead window exports (issue: `app.js`)
- Removed `window.addMovementRow` / `window.removeMovementRow`
- Removed `window.addMinuteSlot` / `window.handleMovementExerciseChange`
- Removed `window.saveAmrapPlan`, `saveEmomPlan`, `saveForTimePlan`, `saveIntervalPlan`
- Added `window.handlePlanExerciseChange`, `window.addPlanMinuteSlot`, `window.handlePlanAdd`, `window.togglePlanWms`, `window.savePlan`

### `togglePlanWms()` fix (issue: `app.js`)
- Now always calls `updatePlanCalcPreview()` after mode change, even when switching to absolute (kg) mode (line ~1925)
- Fixes stale button disabled state when switching modes

## Files changed
- `app.js` — cleanup of dead initialization code, window exports, feedback targets
- `index.html` — added `onclick="handlePlanAdd()"` to `#plan-add-btn`
- `AGENTS.md` — created this file for persistent state

## Remaining dead code — OK to leave
`submitAmrapWorkout`, `submitEmomWorkout`, `submitForTimeWorkout`, `submitIntervalWorkout` — still reference `addMinuteSlot`, `getMovementData`, `addMovementRow`, and per-type feedback elements. No callers anywhere. Harmless dead code.

### Debugging — empty `workoutMovements` on "Do Workout"
- User confirmed no docs from today in Firestore `workouts` collection. `writeStructuredLogEntry` was never reached.
- `structure.movements` was empty when captured, so `generateForTimeContributions` loop had 0 iterations.
- Most likely cause: `handleWorkoutTypeChange()` (on `#workout-type` `onchange`) clears `workoutMovements` between adding movements and clicking "Do Workout".

#### Fixes applied (`app.js`)
1. **`doWorkout()`** — added validation after `capturePlanStructure()`: checks movements/minutes non-empty. Shows feedback and returns without switching tab if empty. `switchTab('training')` moved after this check.
2. **All 4 generators** — added `console.log` with `[contrib]` prefix showing `workoutId`, counts, key params.
3. **`writeStructuredLogEntry()`** — added `console.log` with `[contrib]` showing exercise, sets, reps, `estimatedLoad`, `totalVolume`.
4. **`submitPendingWorkout()`** — added `console.log` with `[submitPending]` prefix before each generator call showing movements/minutes length.

### Debugging — `writeStructuredLogEntry` confirm write
- User confirmed `[contrib] writeStructuredLogEntry` logs appear but no docs in Firestore `workouts` collection.
- `window.__lastWorkouts` exposed at line 963 for console inspection.
- **Fix applied:** `writeStructuredLogEntry` now wraps `addDoc` in try-catch with `[contrib] addDoc SUCCESS/FAILED` log, re-throws on failure.

### Bug fix — timestamp type mismatch (root cause)
- Discovered existing `workouts` docs have Firestore **Timestamp** objects while new structured contributions used plain **number** (`Date.now()`).
- Firestore sorts numbers **before** timestamps in ascending order, so in DESC order all Timestamp entries sort above number entries. The `limit(100)` query returned only Timestamp-type (old) entries, hiding all new structured contributions from `lastWorkouts` → volume chart appeared blank.
- **Fix:** Added `Timestamp` to Firebase import. Changed `writeStructuredLogEntry`, manual log form, PB log, and onboarding entry to use `Timestamp.now()` instead of `Date.now()`. Removed unused `now` param from `writeStructuredLogEntry` and cleaned up all generator call sites.
