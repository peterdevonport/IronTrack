import { auth, db, collection, query, where, onSnapshot, doc, addDoc, deleteDoc, updateDoc, serverTimestamp, orderBy, limit, Timestamp, getDocs } from './firebase.js';
import { state, EPLEY_CONSTANT, HAPTIC, SECONDS_PER_MINUTE, PERCENT_DIVISOR, FIRESTORE_STRUCTURED_LIMIT, DEBOUNCE_DELAY_SYNC_ACTIVITY } from './state.js';
import { estimate1RM, estimateWeightForReps, getEffectiveLoad, computeEffectiveLoad, rpeToRir } from './math.js';
import { escapeHtml, haptic, debounce } from './dom.js';
import { LOAD_FACTORS, getExerciseInfo } from './exercise-data.js';
import { formatWorkoutType, formatMovementWeight } from './formatting.js';
import { buildWorkoutDescription, formatScore_ROUNDS_AND_REPS, formatScore_COMPLETED_MINUTES, formatScore_TIME_SECONDS, getRepsPerRound } from './analytics.js';
import { PERMISSION_ERROR_MAP, clearChildren, showFeedback, showToast, updatePagination, updatePaginationControls, paginateAndRender, switchTab, renderEmptyState, changeGenericPage, isPermissionDenied } from './ui.js';
import { renderStructuredWorkoutCard } from './rendering.js';
import { renderSharedPlansUI } from './social.js';
import { computeAndSyncDailyActivity } from './calendar.js';
import { capturePlanStructure } from './plans.js';
import { requireAuth } from './auth.js';

let unsubscribeStructured = null;
let isSubmittingWorkout = false;
const WORKOUT_TYPE_TO_RESULT_ID = { AMRAP: 'amrap', EMOM: 'emom', FOR_TIME: 'fortime', INTERVAL: 'interval' };

const debouncedSyncActivity = debounce(() => {
    computeAndSyncDailyActivity();
}, DEBOUNCE_DELAY_SYNC_ACTIVITY);

function listenToStructuredWorkouts(uid) {
  const q = query(
    collection(db, "structured_workouts"),
    where("userId", "==", uid),
    orderBy("timestamp", "desc"),
    limit(FIRESTORE_STRUCTURED_LIMIT)
  );
  unsubscribeStructured = onSnapshot(q, (snapshot) => {
    const workouts = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const timestamp = data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp;
      workouts.push({ id: doc.id, ...data, timestamp });
    });
    state.data.lastStructuredWorkouts = workouts;
    renderStructuredWorkoutHistory();
    debouncedSyncActivity();
  }, (error) => {
    console.error('Structured workouts stream error', error.code, error.message);
    const container = document.getElementById('structured-workout-list');
    if (container && !container.querySelector('.index-hint')) {
      const hint = document.createElement('p');
      hint.className = 'index-hint text-xs text-yellow-400 italic py-2 text-center';
      hint.textContent = 'Structured workouts unavailable — check browser console for index link.';
      container.prepend(hint);
    }
  });
}

function renderStructuredWorkoutHistory() {
  paginateAndRender({
    stateKey: 'structured',
    list: state.data.lastStructuredWorkouts,
    containerId: 'structured-workout-list',
    renderItems: (items) => items.map(renderStructuredWorkoutCard).join(''),
    emptyMessage: 'No structured workouts logged yet.'
  });
}

function changeStructuredPage(direction) {
  changeGenericPage('structured', state.data.lastStructuredWorkouts, 3, renderStructuredWorkoutHistory, direction);
}

function doWorkout() {
  const type = document.getElementById('workout-type').value;
  if (!type) { showFeedback('Select a workout type first', 'red', 'planFeedback'); return; }

  const resultId = WORKOUT_TYPE_TO_RESULT_ID[type];
  if (!resultId) { showFeedback('Unknown workout type.', 'red', 'planFeedback'); return; }

  let structure;
  try {
    structure = capturePlanStructure(type);
  } catch (err) {
    console.error('capturePlanStructure error:', err);
    showFeedback(err.message, 'red', 'log-workout-feedback');
    return;
  }

  const hasMovements = type === 'EMOM'
    ? (structure.minutes && structure.minutes.length > 0)
    : (structure.movements && structure.movements.length > 0);
  if (!hasMovements) {
    showFeedback('Add at least one movement before starting the workout.', 'red', 'planFeedback');
    return;
  }

  switchTab('training');
  setupTrainingTab({
    id: 'pending_' + Date.now(),
    type: type,
    name: type === 'FOR_TIME' ? 'For Time' : type + ' Workout',
    timestamp: new Date().toISOString(),
    structure
  });
}

function doStructuredWorkout(workoutId) {
  const sw = state.data.lastStructuredWorkouts.find(w => w.id === workoutId);
  if (!sw) return;
  switchTab('training');
  setupTrainingTab({
    id: 'pending_' + Date.now(),
    type: sw.type,
    name: sw.name || (sw.type === 'FOR_TIME' ? 'For Time' : sw.type + ' Workout'),
    timestamp: new Date().toISOString(),
    structure: sw.structure || {}
  });
}

function doPlanWorkout(planId) {
  const plan = state.data.lastWorkoutPlans.find(p => p.id === planId);
  if (!plan) return;
  switchTab('training');
  setupTrainingTab({
    id: 'pending_' + Date.now(),
    type: plan.type,
    name: plan.name || (plan.type === 'FOR_TIME' ? 'For Time' : plan.type + ' Workout'),
    timestamp: new Date().toISOString(),
    structure: plan.structure || {}
  });
}

function doSharedPlan(shareId) {
  const share = state.data.lastSharedPlans.find(s => s.id === shareId);
  if (!share || !share.content) return;
  const plan = share.content;
  switchTab('training');
  setupTrainingTab({
    id: 'pending_' + Date.now(),
    type: plan.type,
    name: plan.name || (plan.type === 'FOR_TIME' ? 'For Time' : plan.type + ' Workout'),
    timestamp: new Date().toISOString(),
    structure: plan.structure || {}
  });
}

/**
 * Set up the training tab from a stored workout plan
 */
function setupTrainingTab(w) {
  const type = w.type;
  state.builder.pendingPlannedWorkout = w;

  const placeholder = document.getElementById('log-workout-placeholder');
  if (placeholder) placeholder.classList.add('hidden');

  const badge = document.getElementById('log-workout-type-badge');
  if (badge) {
    badge.textContent = formatWorkoutType(type);
    badge.className = 'workout-type-badge self-start ' + type.toLowerCase();
    badge.style.display = '';
  }

  const desc = document.getElementById('workout-description');
  if (desc) {
    desc.classList.remove('hidden');
    desc.innerHTML = buildWorkoutDescription(w);
  }

  document.querySelectorAll('[id^="log-result-"]').forEach(el => el.classList.add('hidden'));
  document.getElementById('log-result')?.classList.remove('hidden');
  const fortimeEl = document.getElementById('log-result-fortime');
  if (fortimeEl) fortimeEl.classList.toggle('hidden', type !== 'FOR_TIME');
  if (type === 'FOR_TIME') {
    const fortimeDnf = document.getElementById('fortime-dnf');
    if (fortimeDnf) fortimeDnf.checked = false;
    document.getElementById('fortime-cap-reps-container')?.classList.add('hidden');
    document.getElementById('fortime-minutes')?.toggleAttribute('required', true);
    document.getElementById('fortime-seconds')?.toggleAttribute('required', true);
  }

  const logRounds = document.getElementById('log-rounds');
  const logPartial = document.getElementById('log-partial-reps');
  if (logRounds) logRounds.value = '';
  if (logPartial) logPartial.value = '';
  recalcForTimeRemaining();
  updateLogScorePreview();
  updateLogWorkoutButtonState();

  const btn = document.getElementById('log-workout-btn');
  if (btn) { btn.disabled = false; }

  const fb = document.getElementById('log-workout-feedback');
  if (fb) fb.textContent = '';
  haptic(HAPTIC.tap);
}

function logRound() {
  const input = document.getElementById('log-rounds');
  if (!input) return;
  input.value = (parseInt(input.value, 10) || 0) + 1;
  const partial = document.getElementById('log-partial-reps');
  if (partial) partial.value = 0;
  updateLogScorePreview();
  updateLogWorkoutButtonState();
  recalcForTimeRemaining();
  haptic(HAPTIC.tap);
}

function logRep() {
  const type = state.builder.pendingPlannedWorkout?.type;
  const structure = state.builder.pendingPlannedWorkout?.structure;
  const repsPerRound = getRepsPerRound(type, structure);
  const partial = document.getElementById('log-partial-reps');
  if (!partial) return;
  const current = parseInt(partial.value, 10) || 0;
  if (repsPerRound > 0 && current + 1 >= repsPerRound) {
    partial.value = 0;
    const roundInput = document.getElementById('log-rounds');
    if (roundInput) roundInput.value = (parseInt(roundInput.value, 10) || 0) + 1;
    updateLogWorkoutButtonState();
  } else {
    partial.value = current + 1;
  }
  updateLogScorePreview();
  recalcForTimeRemaining();
  haptic(HAPTIC.tap);
}

function updateLogScorePreview() {
  const rounds = parseInt(document.getElementById('log-rounds')?.value, 10) || 0;
  const partial = parseInt(document.getElementById('log-partial-reps')?.value, 10) || 0;
  const type = state.builder.pendingPlannedWorkout?.type;
  const structure = state.builder.pendingPlannedWorkout?.structure;
  const preview = document.getElementById('log-score-preview');
  if (!preview) return;
  if (type === 'FOR_TIME') {
    const capVal = parseInt(document.getElementById('fortime-cap-reps')?.value, 10);
    preview.textContent = `Cap ${capVal >= 0 ? capVal : 0}`;
  } else if (type === 'EMOM') {
    const total = structure?.rounds || 0;
    if (rounds > 0 || partial > 0 || total > 0) {
      preview.textContent = `${formatScore_ROUNDS_AND_REPS(rounds, partial)} / ${total}`;
    } else {
      preview.textContent = '—';
    }
  } else if (rounds > 0 || partial > 0) {
    preview.textContent = formatScore_ROUNDS_AND_REPS(rounds, partial);
  } else {
    preview.textContent = '—';
  }
}

function updateLogWorkoutButtonState() {
  const rounds = parseInt(document.getElementById('log-rounds')?.value, 10) || 0;
  const partial = parseInt(document.getElementById('log-partial-reps')?.value, 10) || 0;
  const hasActivity = rounds > 0 || partial > 0;
  const btn = document.getElementById('log-workout-btn');
  if (btn) {
    if (hasActivity) {
      btn.classList.remove('is-ghost');
      btn.classList.add('is-primary-ghost');
      btn.removeAttribute('disabled');
    } else {
      btn.classList.remove('is-primary-ghost');
      btn.classList.add('is-ghost');
      btn.setAttribute('disabled', 'disabled');
    }
  }
}

async function submitStructuredWorkout(name, structure, now, config) {
  const { type, buildResult, scoreDisplay, scoreType, scoreValue, generateContributions } = config;
  const result = buildResult();
  const workoutDoc = {
    userId: auth.currentUser.uid, name, type, structure, result,
    scoreDisplay: scoreDisplay(result),
    scoreType,
    scoreValue: scoreValue(result),
    timestamp: now
  };
  try {
    const docRef = await addDoc(collection(db, "structured_workouts"), workoutDoc);
    await generateContributions(docRef.id, structure, result);
  } catch (err) {
    console.error('submitStructuredWorkout failed', err.code, err.message);
    throw err;
  }
}

function submitAmrapWorkout(name, structure, now) {
  const roundsCompleted = parseInt(document.getElementById('log-rounds').value, 10);
  const additionalReps = parseInt(document.getElementById('log-partial-reps').value, 10) || 0;
  if (roundsCompleted < 0) {
    showFeedback('Enter rounds completed.', 'red', 'log-workout-feedback');
    return;
  }
  return submitStructuredWorkout(name, structure, now, {
    type: 'AMRAP',
    buildResult: () => ({ roundsCompleted, additionalReps }),
    scoreDisplay: r => formatScore_ROUNDS_AND_REPS(r.roundsCompleted, r.additionalReps),
    scoreType: 'ROUNDS_AND_REPS',
    scoreValue: r => r.roundsCompleted * 1000 + r.additionalReps,
    generateContributions: (docId, struct, r) => generateAmrapContributions(docId, struct.movements, r.roundsCompleted, r.additionalReps)
  });
}

function submitEmomWorkout(name, structure, now) {
  const roundsCompleted = parseInt(document.getElementById('log-rounds').value, 10);
  if (roundsCompleted < 0) {
    showFeedback('Enter rounds completed.', 'red', 'log-workout-feedback');
    return;
  }
  return submitStructuredWorkout(name, structure, now, {
    type: 'EMOM',
    buildResult: () => ({ roundsCompleted }),
    scoreDisplay: r => formatScore_COMPLETED_MINUTES(r.roundsCompleted, structure.rounds),
    scoreType: 'COMPLETED_MINUTES',
    scoreValue: r => r.roundsCompleted,
    generateContributions: (docId, struct, r) => generateEmomContributions(docId, struct.minutes, r.roundsCompleted, struct.mode)
  });
}

function submitForTimeWorkout(name, structure, now) {
  const dnf = document.getElementById('fortime-dnf').checked;
  const remainingReps = dnf ? (parseInt(document.getElementById('fortime-cap-reps').value, 10) || 0) : 0;
  const resultMins = dnf ? 0 : (parseInt(document.getElementById('fortime-minutes').value, 10) || 0);
  const resultSecs = dnf ? 0 : (parseInt(document.getElementById('fortime-seconds').value, 10) || 0);
  const timeSeconds = dnf ? 0 : resultMins * SECONDS_PER_MINUTE + resultSecs;
  if (resultSecs > 59) {
    showFeedback('Seconds must be 0–59.', 'red', 'log-workout-feedback');
    return;
  }
  return submitStructuredWorkout(name, structure, now, {
    type: 'FOR_TIME',
    buildResult: () => ({ timeSeconds, completed: !dnf, ...(dnf && { remainingReps }) }),
    scoreDisplay: r => dnf ? `Cap ${remainingReps}` : formatScore_TIME_SECONDS(r.timeSeconds),
    scoreType: 'TIME_SECONDS',
    scoreValue: r => dnf ? r.remainingReps : r.timeSeconds,
    generateContributions: (docId, struct, r) => generateForTimeContributions(docId, struct.movements, struct.rounds, r.remainingReps || 0)
  });
}

function submitIntervalWorkout(name, structure, now) {
  const roundsCompleted = parseInt(document.getElementById('log-rounds').value, 10);
  const partialReps = parseInt(document.getElementById('log-partial-reps').value, 10) || 0;
  if (roundsCompleted < 0) {
    showFeedback('Enter rounds completed.', 'red', 'log-workout-feedback');
    return;
  }
  return submitStructuredWorkout(name, structure, now, {
    type: 'INTERVAL',
    buildResult: () => ({ roundsCompleted, partialReps, completed: roundsCompleted >= structure.rounds }),
    scoreDisplay: r => formatScore_ROUNDS_AND_REPS(r.roundsCompleted, r.partialReps),
    scoreType: 'ROUNDS_AND_REPS',
    scoreValue: r => r.roundsCompleted * 1000 + r.partialReps,
    generateContributions: (docId, struct, r) => generateIntervalContributions(docId, struct.movements, r.roundsCompleted, r.partialReps)
  });
}

function resetTrainingTab() {
  state.builder.pendingPlannedWorkout = null;
  const pwBadge = document.getElementById('log-workout-type-badge');
  if (pwBadge) { pwBadge.textContent = ''; pwBadge.style.display = 'none'; }
  const pwPlaceholder = document.getElementById('log-workout-placeholder');
  if (pwPlaceholder) pwPlaceholder.classList.remove('hidden');
  const pwDesc = document.getElementById('workout-description');
  if (pwDesc) { pwDesc.classList.add('hidden'); clearChildren(pwDesc); }
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

async function submitPendingWorkout() {
  if (isSubmittingWorkout) return;
  if (!requireAuth('log-workout-feedback')) return;
  if (!state.builder.pendingPlannedWorkout) return showFeedback('No planned workout to log.', 'rose', 'log-workout-feedback');

  const btn = document.getElementById('log-workout-btn');
  if (btn) btn.disabled = true;
  isSubmittingWorkout = true;

  const { type, name, structure } = state.builder.pendingPlannedWorkout;
  const now = Timestamp.now();

  try {
    const handlers = {
      'AMRAP': submitAmrapWorkout,
      'EMOM': submitEmomWorkout,
      'FOR_TIME': submitForTimeWorkout,
      'INTERVAL': submitIntervalWorkout
    };

    if (!handlers[type]) {
      return showFeedback('Unknown workout type.', 'red', 'log-workout-feedback');
    }

    await handlers[type](name, structure, now);
    resetTrainingTab();
    showFeedback('Workout logged!', 'emerald', 'log-workout-feedback');
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('Log pending workout failed', err.code, err.message);
    if (isPermissionDenied(err)) {
      showFeedback(PERMISSION_ERROR_MAP.saveWorkout, 'rose', 'log-workout-feedback');
    } else {
      showFeedback('Failed to log workout: ' + err.message, 'red', 'log-workout-feedback');
    }
  } finally {
    if (btn) btn.disabled = false;
    isSubmittingWorkout = false;
  }
}

async function writeStructuredLogEntry({ workoutId, movement, sets, totalReps, extraFields = {} }) {
  const bw = state.user.userBiometrics.bodyweight || 0;
  const loadFactor = LOAD_FACTORS[movement.exerciseId];
  let estimatedLoad;
  let weight;

  if (loadFactor !== undefined) {
    estimatedLoad = computeEffectiveLoad(movement.exerciseId, bw, 0, bw);
    weight = bw;
  } else {
    estimatedLoad = computeEffectiveLoad(movement.exerciseId, movement.weight, 0, bw);
    weight = movement.weight || 0;
  }

  if (movement.weightMode === 'pct' && movement.pct) {
    const oneRM = state.cache.activeRecords[movement.exerciseId] || 0;
    if (oneRM > 0) {
      estimatedLoad = Math.round(oneRM * movement.pct / PERCENT_DIVISOR);
      weight = estimatedLoad;
    }
  } else if (movement.weightMode === 'rpe' && movement.rpe) {
    const oneRM = state.cache.activeRecords[movement.exerciseId] || 0;
    if (oneRM > 0) {
      const rir = rpeToRir(movement.rpe);
      const totalRepsPossible = movement.reps + rir;
      estimatedLoad = Math.round(estimateWeightForReps(oneRM, totalRepsPossible));
      weight = estimatedLoad;
    }
  }

  const totalVolume = estimatedLoad * totalReps;

  const logEntry = {
    userId: auth.currentUser.uid,
    exercise: movement.exerciseId,
    sets,
    reps: movement.reps,
    weight,
    externalLoad: 0,
    estimatedLoad,
    totalVolume,
    timestamp: Timestamp.now(),
    source: 'structured',
    workoutId,
    weightMode: movement.weightMode || 'absolute',
    pct: movement.pct || null,
    rpe: movement.rpe || null,
    ...extraFields,
    totalWorkReps: totalReps
  };

  try {
    const docRef = await addDoc(collection(db, "workouts"), logEntry);
  } catch (err) {
    console.error(`[contrib] addDoc FAILED: exercise=${movement.exerciseId}, code=${err.code}, message=${err.message}`);
    throw err;
  }
}

async function generateContributionsBase(workoutId, movements, processMovement) {
  for (let i = 0; i < movements.length; i++) {
    const movement = movements[i];
    if (getExerciseInfo(movement.exerciseId).category === 'cardio') continue;

    const result = processMovement(movement, i);
    if (!result || result.totalReps <= 0) continue;

    try {
      await writeStructuredLogEntry({
        workoutId, movement,
        sets: result.sets,
        totalReps: result.totalReps,
        extraFields: result.extraFields || {}
      });
    } catch (err) {
      console.error(`[contrib] Failed to log entry for ${movement.exerciseId}: ${err.message}`);
    }
  }
}

async function generateAmrapContributions(workoutId, movements, roundsCompleted, additionalReps) {
  await generateContributionsBase(workoutId, movements, (movement) => {
    const totalReps = roundsCompleted * movement.reps + additionalReps;
    return { totalReps, sets: roundsCompleted, extraFields: { additionalReps } };
  });
}

async function generateEmomContributions(workoutId, minutes, minutesCompleted, mode) {
  const numMinutes = minutes.length;
  const isByRound = mode === 'by_round';
  if (numMinutes === 0 || minutesCompleted <= 0) return;

  for (let i = 0; i < minutes.length; i++) {
    const slot = minutes[i];
    if (!slot.movements || slot.movements.length === 0) continue;
    const movement = slot.movements[0];
    if (getExerciseInfo(movement.exerciseId).category === 'cardio') continue;

    let performedTimes;
    if (isByRound) {
      performedTimes = i < minutesCompleted ? 1 : 0;
    } else {
      const fullRounds = Math.floor(minutesCompleted / numMinutes);
      const remainder = minutesCompleted % numMinutes;
      performedTimes = fullRounds + (i < remainder ? 1 : 0);
    }
    if (performedTimes <= 0) continue;

    const totalRepsPerMovement = movement.reps * performedTimes;

    try {
      await writeStructuredLogEntry({
        workoutId, movement,
        sets: performedTimes,
        totalReps: totalRepsPerMovement,
        extraFields: { minuteIndex: i }
      });
    } catch (err) {
      console.error(`[contrib] Failed to log EMOM entry for minute ${i}, exercise ${movement.exerciseId}: ${err.message}`);
    }
  }
}

function toggleForTimeDnf() {
  const dnf = document.getElementById('fortime-dnf')?.checked;
  const timeInputs = document.getElementById('fortime-time-inputs');
  const capRepsContainer = document.getElementById('fortime-cap-reps-container');
  if (!timeInputs || !capRepsContainer) return;
  timeInputs.classList.toggle('hidden', dnf);
  capRepsContainer.classList.toggle('hidden', !dnf);
  ['fortime-minutes', 'fortime-seconds'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.toggleAttribute('required', !dnf);
  });
  if (dnf) {
    recalcForTimeRemaining();
  }
  updateLogScorePreview();
  updateForTimeScorePreview();
}

function updateForTimeScorePreview() {
  const mins = parseInt(document.getElementById('fortime-minutes')?.value, 10);
  const secs = parseInt(document.getElementById('fortime-seconds')?.value, 10);
  const capReps = parseInt(document.getElementById('fortime-cap-reps')?.value, 10);
  const dnf = document.getElementById('fortime-dnf')?.checked;
  const preview = document.getElementById('fortime-score-preview');
  if (!preview) return;
  if (dnf) {
    preview.textContent = `Cap ${capReps || 0}`;
  } else if (mins > 0 || secs > 0) {
    preview.textContent = formatScore_TIME_SECONDS(mins * 60 + secs);
  } else {
    preview.textContent = '—';
  }
}

async function generateForTimeContributions(workoutId, movements, rounds, remainingReps = 0) {
  const repsPerRound = movements.reduce((sum, m) => sum + (m.reps || 0), 0);
  const totalPlanned = repsPerRound * rounds;
  const totalCompleted = Math.max(0, totalPlanned - remainingReps);
  const fullRounds = Math.floor(repsPerRound > 0 ? totalCompleted / repsPerRound : 0);
  let partialRoundReps = totalCompleted % (repsPerRound || 1);

  await generateContributionsBase(workoutId, movements, (movement) => {
    const movementPartialReps = Math.min(movement.reps, partialRoundReps);
    partialRoundReps = Math.max(0, partialRoundReps - movement.reps);
    const performedReps = movement.reps * fullRounds + movementPartialReps;
    if (performedReps <= 0) return null;
    const effectiveSets = fullRounds + (movementPartialReps === movement.reps ? 1 : 0);
    const displayPartialReps = movementPartialReps < movement.reps ? movementPartialReps : 0;
    const extraFields = {};
    if (displayPartialReps > 0) extraFields.partialReps = displayPartialReps;
    return { totalReps: performedReps, sets: effectiveSets, extraFields };
  });
}

function updateIntervalScorePreview() {
  const rounds = parseInt(document.getElementById('interval-rounds-completed')?.value, 10) || 0;
  const partial = parseInt(document.getElementById('interval-partial-reps')?.value, 10) || 0;
  const preview = document.getElementById('interval-score-preview');
  if (!preview) return;
  if (rounds > 0 || partial > 0) {
    preview.textContent = formatScore_ROUNDS_AND_REPS(rounds, partial);
  } else {
    preview.textContent = '—';
  }
}

function recalcForTimeRemaining() {
  const type = state.builder.pendingPlannedWorkout?.type;
  if (type !== 'FOR_TIME') return;
  const structure = state.builder.pendingPlannedWorkout?.structure;
  if (!structure) return;
  const roundsCompleted = parseInt(document.getElementById('log-rounds')?.value, 10) || 0;
  const partialReps = parseInt(document.getElementById('log-partial-reps')?.value, 10) || 0;
  const prescribed = structure.rounds || 0;
  const repsPerRound = getRepsPerRound(type, structure);
  const repsDone = roundsCompleted * repsPerRound + partialReps;
  const totalReps = prescribed * repsPerRound;
  const remaining = Math.max(0, totalReps - repsDone);
  const capReps = document.getElementById('fortime-cap-reps');
  if (capReps) capReps.value = remaining;
  updateLogScorePreview();
  updateForTimeScorePreview();
}

async function generateIntervalContributions(workoutId, movements, roundsCompleted, partialReps = 0) {
  let remainingPartial = partialReps;

  await generateContributionsBase(workoutId, movements, (movement) => {
    const movementPartialReps = Math.min(movement.reps, remainingPartial);
    remainingPartial = Math.max(0, remainingPartial - movement.reps);
    const totalReps = movement.reps * roundsCompleted + movementPartialReps;
    const effectiveSets = roundsCompleted + (movementPartialReps === movement.reps ? 1 : 0);
    const displayPartialReps = movementPartialReps < movement.reps ? movementPartialReps : 0;
    const extraFields = {};
    if (displayPartialReps > 0) extraFields.partialReps = displayPartialReps;
    return { totalReps, sets: effectiveSets, extraFields };
  });
}

function updateAmrapScorePreview() {
  const rounds = parseInt(document.getElementById('amrap-rounds')?.value, 10) || 0;
  const additional = parseInt(document.getElementById('amrap-additional-reps')?.value, 10) || 0;
  const preview = document.getElementById('amrap-score-preview');
  if (rounds > 0 || additional > 0) {
    preview.textContent = formatScore_ROUNDS_AND_REPS(rounds, additional);
  } else {
    preview.textContent = '—';
  }
}

function cleanupStructuredSubscriptions() {
  if (unsubscribeStructured) { unsubscribeStructured(); unsubscribeStructured = null; }
}

export { debouncedSyncActivity, cleanupStructuredSubscriptions, writeStructuredLogEntry, generateContributionsBase, generateAmrapContributions, listenToStructuredWorkouts, renderStructuredWorkoutHistory, changeStructuredPage, setupTrainingTab, doWorkout, doStructuredWorkout, doPlanWorkout, doSharedPlan, submitStructuredWorkout, submitAmrapWorkout, submitEmomWorkout, submitForTimeWorkout, submitIntervalWorkout, resetTrainingTab, submitPendingWorkout, toggleForTimeDnf, updateForTimeScorePreview, updateIntervalScorePreview, recalcForTimeRemaining, logRound, logRep, updateLogScorePreview, updateLogWorkoutButtonState, generateEmomContributions, generateForTimeContributions, generateIntervalContributions, updateAmrapScorePreview };
