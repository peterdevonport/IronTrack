// Test module - exports functions for testing
// This extracts the pure functions from app.js for testing

export function processWorkoutSnapshot(docs, getEffectiveLoad, estimate1RM) {
  const workouts = [];
  const activeRecords = {};
  const cachedMaxLoadByExercise = {};
  const cachedMax1RMByExercise = {};
  const cachedMaxRepsByExercise = {};

  docs.forEach(doc => {
    const data = doc.data();
    const timestamp = data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp;
    const workout = { id: doc.id, ...data, timestamp };
    workouts.push(workout);

    if (data.source === 'structured') return;

    const effectiveWeight = getEffectiveLoad(workout);
    const reps = parseInt(data.reps, 10);
    const calculated1RM = estimate1RM(effectiveWeight, reps);

    if (!activeRecords[data.exercise] || calculated1RM > activeRecords[data.exercise]) {
      activeRecords[data.exercise] = calculated1RM;
    }

    if (!cachedMaxLoadByExercise[data.exercise] || effectiveWeight > cachedMaxLoadByExercise[data.exercise]) {
      cachedMaxLoadByExercise[data.exercise] = effectiveWeight;
    }
    if (!cachedMax1RMByExercise[data.exercise] || calculated1RM > cachedMax1RMByExercise[data.exercise]) {
      cachedMax1RMByExercise[data.exercise] = calculated1RM;
    }

    if (!cachedMaxRepsByExercise[data.exercise] || reps > cachedMaxRepsByExercise[data.exercise]) {
      cachedMaxRepsByExercise[data.exercise] = reps;
    }
  });

  return { workouts, activeRecords, cachedMaxLoadByExercise, cachedMax1RMByExercise, cachedMaxRepsByExercise };
}

export function updateCaches(processed, globals) {
  globals.activeRecords = processed.activeRecords;
  globals.cachedMaxLoadByExercise = processed.cachedMaxLoadByExercise;
  globals.cachedMax1RMByExercise = processed.cachedMax1RMByExercise;
  globals.cachedMaxRepsByExercise = processed.cachedMaxRepsByExercise;
  
  globals.lastWorkouts = processed.workouts;
  globals.window.__lastWorkouts = processed.workouts;
  globals.window.__irontrackWorkoutCount = processed.workouts.length;
  
  if (processed.workouts.length > 0) {
    const earliestTs = Math.min(...processed.workouts.map(w => w.timestamp));
    if (earliestTs > 0 && earliestTs < globals.userSignupTs) {
      globals.userSignupTs = earliestTs;
    }
  }
}

export function renderFromWorkouts(workouts, functions) {
  try {
    const uniqueExercises = Array.from(new Set(workouts.map(w => w.exercise)));
    functions.populateWorkoutFilter(uniqueExercises);
    functions.populateVolumeFilter(uniqueExercises);
  } catch (e) {
    // ignore if populate not available
  }
  
  functions.update1RMRegistryUI();
  functions.updateCalcCard();
  functions.processAnalytics();
  functions.renderLogs(workouts);
  functions.renderVolumeHistory();
  functions.debouncedSyncActivity();
}
