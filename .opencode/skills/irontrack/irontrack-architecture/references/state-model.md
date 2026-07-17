# State Model

## State Tree

`state.js` exports a single mutable object:

```javascript
const state = {
  user: { theme, userBiometrics, userChallengeStreaks, userSignupTs },
  cache: { activeRecords, cachedMaxLoadByExercise, cachedMax1RMByExercise },
  data: { lastWorkouts, lastStructuredWorkouts, lastWorkoutPlans, calcEntriesByLift },
  pagination: { workouts, structured, plans, sharedPlans, records, friends },
  calendar: { month, selectedDate, compact, weekOffset },
  volume: { period, offset, filter },
  builder: { workoutMovements, pendingPlannedWorkout, emomMode },
  social: { currentScope, currentFormula, userFriendsList, leaderboardCache },
  share: { sharePlanId, shareIsWorkout, shareMode },
  ui: { plansFilter, currentTab }
};
```

## Mutation Pattern

- **Direct mutation.** Modules import `state` by reference and mutate directly. No reactive system.
- **Mutation triggers render.** After mutating state, call the relevant render function.
- **Cache pattern.** Derived/computed values cached in `state.cache`. Invalidate on relevant data changes.

## Key Rules

- Never create parallel state objects. State is the single source of truth.
- Never mutate state inside rendering functions.
- Invalidate cache entries when source data changes, not on every render.
