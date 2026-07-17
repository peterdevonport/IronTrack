# Firebase Data Flow

## Auth Flow

```javascript
onAuthStateChanged(auth, (user) => {
  if (user) handleSignedIn(user);
  else renderSignedOut();
});
```

## Data Pipeline

```
Firestore onSnapshot (listeners attached in app.js)
  ↓
processWorkoutSnapshot() / processStructuredSnapshot() / processPlansSnapshot()
  ↓
updateCaches() — updates state.cache with derived values
  ↓
renderFromWorkouts() — triggers all render functions that depend on workout data
```

## Listener Setup (in `app.js`)

After `handleSignedIn()`:
1. `pullProfileMetrics()` — fetch user profile
2. `initSocialProfile()` — initialise social features
3. `attachListeners()` — start Firestore onSnapshot listeners
4. `processAnalytics()` — compute DOTS/Sinclair scores

## Key Modules

| Module | Role in flow |
|--------|--------------|
| `firebase.js` | Provides `db`, `auth`, `firestore` exports |
| `app.js` | Wires auth + listeners + dispatches |
| `data.js` | onSnapshot callbacks, data processing |
| `auth.js` | Auth state handling, profile loading |
