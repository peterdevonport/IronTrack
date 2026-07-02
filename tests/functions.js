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

// Workout submission functions - testable versions
export async function submitAmrapWorkout(name, structure, now, deps) {
  const { document, currentUser, addDoc, collection, db, formatScore_ROUNDS_AND_REPS, generateAmrapContributions, showFeedback } = deps;
  
  const roundsCompleted = parseInt(document.getElementById('log-rounds').value, 10);
  const additionalReps = parseInt(document.getElementById('log-partial-reps').value, 10) || 0;
  if (roundsCompleted < 0) {
    showFeedback('Enter rounds completed.', 'rose', 'log-workout-feedback');
    return;
  }

  const workoutDoc = {
    userId: currentUser.uid,
    name,
    type: 'AMRAP',
    structure,
    result: { roundsCompleted, additionalReps },
    scoreDisplay: formatScore_ROUNDS_AND_REPS(roundsCompleted, additionalReps),
    scoreType: 'ROUNDS_AND_REPS',
    scoreValue: roundsCompleted * 1000 + additionalReps,
    timestamp: now
  };
  const docRef = await addDoc(collection(db, "structured_workouts"), workoutDoc);
  await generateAmrapContributions(docRef.id, structure.movements, roundsCompleted, additionalReps);
}

export async function submitEmomWorkout(name, structure, now, deps) {
  const { document, currentUser, addDoc, collection, db, formatScore_COMPLETED_MINUTES, generateEmomContributions, showFeedback } = deps;
  
  const roundsCompleted = parseInt(document.getElementById('log-rounds').value, 10);
  if (roundsCompleted < 0) {
    showFeedback('Enter rounds completed.', 'rose', 'log-workout-feedback');
    return;
  }

  const workoutDoc = {
    userId: currentUser.uid,
    name,
    type: 'EMOM',
    structure,
    result: { roundsCompleted },
    scoreDisplay: formatScore_COMPLETED_MINUTES(roundsCompleted, structure.rounds),
    scoreType: 'COMPLETED_MINUTES',
    scoreValue: roundsCompleted,
    timestamp: now
  };
  const docRef = await addDoc(collection(db, "structured_workouts"), workoutDoc);
  await generateEmomContributions(docRef.id, structure.minutes, roundsCompleted, structure.mode);
}

export async function submitForTimeWorkout(name, structure, now, deps) {
  const { document, currentUser, addDoc, collection, db, formatScore_TIME_SECONDS, generateForTimeContributions, showFeedback } = deps;
  
  const dnf = document.getElementById('fortime-dnf').checked;
  const remainingReps = dnf ? (parseInt(document.getElementById('fortime-cap-reps').value, 10) || 0) : 0;
  const resultMins = dnf ? 0 : (parseInt(document.getElementById('fortime-minutes').value, 10) || 0);
  const resultSecs = dnf ? 0 : (parseInt(document.getElementById('fortime-seconds').value, 10) || 0);
  const timeSeconds = dnf ? 0 : resultMins * 60 + resultSecs;
  if (resultSecs > 59) {
    showFeedback('Seconds must be 0–59.', 'rose', 'log-workout-feedback');
    return;
  }

  const workoutDoc = {
    userId: currentUser.uid,
    name,
    type: 'FOR_TIME',
    structure,
    result: { timeSeconds, completed: !dnf, ...(dnf && { remainingReps }) },
    scoreDisplay: dnf ? `Cap ${remainingReps}` : formatScore_TIME_SECONDS(timeSeconds),
    scoreType: 'TIME_SECONDS',
    scoreValue: dnf ? remainingReps : timeSeconds,
    timestamp: now
  };
  const docRef = await addDoc(collection(db, "structured_workouts"), workoutDoc);
  await generateForTimeContributions(docRef.id, structure.movements, structure.rounds, remainingReps);
}

export async function submitIntervalWorkout(name, structure, now, deps) {
  const { document, currentUser, addDoc, collection, db, formatScore_ROUNDS_AND_REPS, generateIntervalContributions, showFeedback } = deps;
  
  const roundsCompleted = parseInt(document.getElementById('log-rounds').value, 10);
  const partialReps = parseInt(document.getElementById('log-partial-reps').value, 10) || 0;
  if (roundsCompleted < 0) {
    showFeedback('Enter rounds completed.', 'rose', 'log-workout-feedback');
    return;
  }

  const workoutDoc = {
    userId: currentUser.uid,
    name,
    type: 'INTERVAL',
    structure,
    result: { roundsCompleted, partialReps, completed: roundsCompleted >= structure.rounds },
    scoreDisplay: formatScore_ROUNDS_AND_REPS(roundsCompleted, partialReps),
    scoreType: 'ROUNDS_AND_REPS',
    scoreValue: roundsCompleted * 1000 + partialReps,
    timestamp: now
  };
  const docRef = await addDoc(collection(db, "structured_workouts"), workoutDoc);
  await generateIntervalContributions(docRef.id, structure.movements, roundsCompleted, partialReps);
}

export function resetTrainingTab(deps) {
  const { document, globals } = deps;
  
  globals.pendingPlannedWorkout = null;
  const pwBadge = document.getElementById('log-workout-type-badge');
  if (pwBadge) { pwBadge.textContent = ''; pwBadge.style.display = 'none'; }
  const pwPlaceholder = document.getElementById('log-workout-placeholder');
  if (pwPlaceholder) pwPlaceholder.classList.remove('hidden');
  const pwDesc = document.getElementById('workout-description');
  if (pwDesc) { pwDesc.classList.add('hidden'); pwDesc.innerHTML = ''; }
  document.querySelectorAll('[id^="log-result-"]').forEach(el => el.classList.add('hidden'));
  const logRoundsReset = document.getElementById('log-rounds');
  const logPartialReset = document.getElementById('log-partial-reps');
  if (logRoundsReset) logRoundsReset.value = '';
  if (logPartialReset) logPartialReset.value = '';
  const roundBtn = document.getElementById('log-round-btn');
  const repBtn = document.getElementById('log-rep-btn');
  if (roundBtn) { roundBtn.classList.remove('is-secondary'); roundBtn.classList.add('is-primary'); }
  if (repBtn) { repBtn.classList.remove('is-secondary'); repBtn.classList.add('is-primary-ghost'); }
  const scorePreview = document.getElementById('log-score-preview');
  if (scorePreview) scorePreview.textContent = '—';
  const ftDnf = document.getElementById('fortime-dnf');
  if (ftDnf) ftDnf.checked = false;
  const ftMins = document.getElementById('fortime-minutes');
  const ftSecs = document.getElementById('fortime-seconds');
  const ftCap = document.getElementById('fortime-cap-reps');
  if (ftMins) { ftMins.value = ''; ftMins.toggleAttribute('required', true); }
  if (ftSecs) { ftSecs.value = ''; ftSecs.toggleAttribute('required', true); }
  if (ftCap) ftCap.value = '';
  const ftTimeInputs = document.getElementById('fortime-time-inputs');
  const ftCapContainer = document.getElementById('fortime-cap-reps-container');
  if (ftTimeInputs) ftTimeInputs.classList.remove('hidden');
  if (ftCapContainer) ftCapContainer.classList.add('hidden');
  const ftScore = document.getElementById('fortime-score-preview');
  if (ftScore) ftScore.textContent = '—';
  const pwBtn = document.getElementById('log-workout-btn');
  if (pwBtn) { pwBtn.disabled = true; pwBtn.classList.remove('is-primary'); pwBtn.classList.add('is-ghost'); }
}
