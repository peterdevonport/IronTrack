import { auth, db, collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, serverTimestamp, orderBy, limit, Timestamp, getDocs } from './firebase.js';
import { state, EPLEY_CONSTANT, entriesPerPage, HAPTIC } from './state.js';
import { estimate1RM, estimateWeightForReps, getEffectiveLoad, computeEffectiveLoad } from './math.js';
import { escapeHtml, haptic } from './dom.js';
import { getExerciseInfo, EXERCISE_CATALOG, LOAD_FACTORS } from './exercise-data.js';
import { formatMovementLoad, formatCardDate, formatWorkoutType, formatMovementWeight } from './formatting.js';
import { buildWorkoutDescription, formatScore_ROUNDS_AND_REPS, formatScore_COMPLETED_MINUTES, formatScore_TIME_SECONDS, getRepsPerRound } from './analytics.js';
import { renderEmptyState, showFeedback, showToast, showPlanNameModal, updatePagination, updatePaginationControls, clearChildren, changeGenericPage, saveExpandedCardIds, restoreExpandedCardIds } from './ui.js';
import { renderWorkoutCard, renderStructuredWorkoutCard, renderPlanCard, buildExerciseOptionsHtml, renderSharedPlanCard } from './rendering.js';
import { renderSharedPlansUI } from './social.js';

let unsubscribeStructured = null;
let unsubscribePlans = null;
let isSubmittingWorkout = false;
const WORKOUT_TYPE_TO_RESULT_ID = { AMRAP: 'amrap', EMOM: 'emom', FOR_TIME: 'fortime', INTERVAL: 'interval' };

async function writeStructuredLogEntry({ workoutId, movement, sets, totalReps, extraFields = {} }) {
  const bw = state.user.userBiometrics.bodyweight || 0;
  const loadFactor = LOAD_FACTORS[movement.exerciseId];
  let estimatedLoad = 0;
  let weight = 0;

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
      estimatedLoad = Math.round(oneRM * movement.pct / 100);
      weight = estimatedLoad;
    }
  } else if (movement.weightMode === 'rpe' && movement.rpe) {
    const oneRM = state.cache.activeRecords[movement.exerciseId] || 0;
    if (oneRM > 0) {
      const rir = 10 - movement.rpe;
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

    await writeStructuredLogEntry({
      workoutId, movement,
      sets: result.sets,
      totalReps: result.totalReps,
      extraFields: result.extraFields || {}
    });
  }
}

async function generateAmrapContributions(workoutId, movements, roundsCompleted, additionalReps) {
  await generateContributionsBase(workoutId, movements, (movement) => {
    const totalReps = roundsCompleted * movement.reps + additionalReps;
    return { totalReps, sets: roundsCompleted, extraFields: { additionalReps } };
  });
}

// ─── EMOM Functions ───────────────────────────────────────────────────────

function handleWorkoutTypeChange() {
  const type = document.getElementById('workout-type')?.value;
  const desc = document.getElementById('workout-type-desc');
  if (!desc) return;

  // Clear movements on type switch
  state.builder.workoutMovements = [];
  const movementsList = document.getElementById('plan-movements-list');
  if (movementsList) renderEmptyState(movementsList, 'Add movements above.');
  const slots = document.getElementById('emom-minute-slots');
  if (slots) renderEmptyState(slots, 'Add a movement to create the first slot.');

  // Hide all metadata sections
  ['amrap-fields', 'emom-fields', 'fortime-fields', 'interval-fields'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  const movementsSection = document.getElementById('plan-movements-section');
  const emomSlotsArea = document.getElementById('emom-minute-slots-area');

  if (type === 'EMOM') {
    document.getElementById('emom-fields').classList.remove('hidden');
    desc.textContent = 'Record an EMOM (Every Minute On the Minute) workout.';
    if (movementsSection) movementsSection.classList.add('hidden');
    if (emomSlotsArea) emomSlotsArea.classList.remove('hidden');
    switchEmomMode(state.builder.emomMode);
    updateEmomSummary(); updateEmomDurationDisplay();
  } else if (type === 'FOR_TIME') {
    document.getElementById('fortime-fields').classList.remove('hidden');
    desc.textContent = 'Record a For Time workout — complete the rounds as fast as possible.';
    if (movementsSection) movementsSection.classList.remove('hidden');
    if (emomSlotsArea) emomSlotsArea.classList.add('hidden');
  } else if (type === 'INTERVAL') {
    document.getElementById('interval-fields').classList.remove('hidden');
    desc.textContent = 'Record an Interval workout — work/rest rounds.';
    if (movementsSection) movementsSection.classList.remove('hidden');
    if (emomSlotsArea) emomSlotsArea.classList.add('hidden');
  } else {
    document.getElementById('amrap-fields').classList.remove('hidden');
    desc.textContent = 'Record a structured AMRAP workout.';
    if (movementsSection) movementsSection.classList.remove('hidden');
    if (emomSlotsArea) emomSlotsArea.classList.add('hidden');
  }
  populateMovementDropdowns();
  // Also populate the plan exercise dropdown
  const planExercise = document.getElementById('plan-exercise');
  if (planExercise) {
    const currentVal = planExercise.value;
    const groups = ['barbell', 'dumbbell', 'kettlebell', 'cardio', 'bodyweight'];
    planExercise.innerHTML = buildExerciseOptionsHtml(groups, '<option value="">Select exercise...</option>');
    if (currentVal && Array.from(planExercise.options).some(o => o.value === currentVal)) {
      planExercise.value = currentVal;
    }
  }
}

function switchEmomMode(mode) {
  state.builder.emomMode = mode;
  const btnSeq = document.getElementById('emom-mode-seq');
  const btnByRound = document.getElementById('emom-mode-by-round');
  const heading = document.getElementById('emom-slot-heading');
  const roundsField = document.getElementById('emom-rounds-field');
  const roundsInput = document.getElementById('emom-rounds');
  if (btnSeq && btnByRound) {
    if (mode === 'sequence') {
      btnSeq.className = 'btn-core is-primary btn-size-row';
      btnByRound.className = 'btn-core is-ghost btn-size-row';
    } else {
      btnSeq.className = 'btn-core is-ghost btn-size-row';
      btnByRound.className = 'btn-core is-primary btn-size-row';
    }
  }
  if (heading) heading.textContent = mode === 'sequence' ? 'Sequence' : 'Round Schedule';
  if (roundsField) roundsField.classList.toggle('hidden', mode === 'by_round');
  if (roundsInput) roundsInput.required = mode !== 'by_round';
  document.querySelectorAll('#emom-minute-slots .minute-label').forEach((el, i) => {
    el.textContent = mode === 'sequence' ? `#${i + 1}` : `Round ${i + 1}`;
  });
  updateEmomSummary();
  updateEmomDurationDisplay();
  updateEmomScorePreview();
}

function addPlanMinuteSlot(data) {
  const container = document.getElementById('emom-minute-slots');
  if (!container) return;
  if (!container.dataset.planBootstrapped) {
    clearChildren(container);
    container.dataset.planBootstrapped = 'true';
  }
  const count = container.children.length + 1;
  const label = state.builder.emomMode === 'sequence' ? `#${count}` : `Round ${count}`;
  const row = document.createElement('div');
  row.className = 'minute-row flex gap-2 items-center py-1.5 px-2 rounded-lg hover:bg-slate-800/40';

  if (data) {
    const oneRM = state.cache.activeRecords[data.exerciseId] || 0;
    let weightDisplay = data.weight;
    let source;
    if (data.weightMode === 'pct' && data.pct) {
      weightDisplay = oneRM > 0 ? Math.round(oneRM * data.pct / 100) : data.weight;
      source = `${data.exerciseId} \u00D7 ${data.reps} @ ${weightDisplay} kg (${data.pct}%)`;
    } else if (data.weightMode === 'rpe' && data.rpe) {
      const rir = 10 - data.rpe;
      const totalRepsPossible = data.reps + rir;
      weightDisplay = oneRM > 0 ? Math.round(estimateWeightForReps(oneRM, totalRepsPossible)) : data.weight;
      source = `${data.exerciseId} \u00D7 ${data.reps} @ ${weightDisplay} kg (RPE ${data.rpe})`;
    } else {
      source = `${data.exerciseId} \u00D7 ${data.reps} @ ${data.weight} kg`;
    }

    row.innerHTML = renderMinuteSlotInner(label, source);
    row.dataset.exerciseId = data.exerciseId;
    row.dataset.reps = data.reps;
    row.dataset.weight = data.weight;
    row.dataset.weightMode = data.weightMode;
    if (data.pct) row.dataset.pct = data.pct;
    if (data.rpe) row.dataset.rpe = data.rpe;
  } else {
    row.innerHTML = renderMinuteSlotInner(label, '<span class="text-slate-500 font-mono text-sm italic">(empty)</span>');
  }

  container.appendChild(row);
  updateEmomSummary();
  updateEmomDurationDisplay();
  updateEmomScorePreview();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── Unified Plan Functions ─────────────────────────────────────────────────

function refreshPlanForm() {
  const exercise = document.getElementById('plan-exercise')?.value;
  const schemaKey = exercise ? getSchemaKey(exercise) : 'standard';
  const schema = FORM_SCHEMAS.planWorkout[schemaKey] || FORM_SCHEMAS.planWorkout.standard;
  const result = renderFormFields('plan-movement-fields', schema, {
    initialValues: { 'plan-bodyweight': state.user.userBiometrics.bodyweight || 0 },
    onFieldChange: (values) => {
      const total = document.getElementById('plan-total-load');
      if (total && exercise) total.textContent = computeTotalLoad(values, exercise, 'plan');
      updatePlanCalcPreview();
    }
  });
  if (result && result.fields['plan-bodyweight']) {
    result.fields['plan-bodyweight'].value = state.user.userBiometrics.bodyweight || '';
  }
  if (result && result.fields['plan-total-load'] && exercise) {
    const initValues = { ...result.fieldValues, 'plan-bodyweight': state.user.userBiometrics.bodyweight || 0 };
    result.fields['plan-total-load'].textContent = computeTotalLoad(initValues, exercise, 'plan');
  }
  updatePlanCalcPreview();
}

function handlePlanExerciseChange() {
  const exercise = document.getElementById('plan-exercise')?.value;
  const oneRmDisplay = document.getElementById('plan-one-rm-display');
  const oneRM = exercise ? (state.cache.activeRecords[exercise] || 0) : 0;
  if (oneRmDisplay) oneRmDisplay.textContent = oneRM > 0 ? `${Math.round(oneRM)} kg` : '\u2014';
  refreshPlanForm();
}

function togglePlanWms(el) {
  const pill = document.getElementById('plan-wms-pill');
  if (!pill) return;
  const mode = el.dataset.mode;
  pill.dataset.mode = mode;
  updatePillActive(pill, mode);

  const weightInput = document.getElementById('plan-weight');
  if (weightInput) {
    weightInput.placeholder = mode === 'pct' ? '%' : (mode === 'rpe' ? 'RPE' : 'Load');
    if (mode === 'rpe') {
      weightInput.min = 1; weightInput.max = 10; weightInput.step = 0.5;
    } else {
      weightInput.min = 0; weightInput.step = 'any'; weightInput.removeAttribute('max');
    }
  }

  const calcSpan = document.getElementById('plan-calc-weight');
  if (calcSpan) {
    if (mode === 'pct' || mode === 'rpe') {
      calcSpan.classList.remove('hidden');
    } else {
      calcSpan.classList.add('hidden');
    }
    updatePlanCalcPreview();
  }
}

function previewPctMode(pct, oneRM, calcSpan, addBtn) {
  if (!isNaN(pct) && pct > 0) {
    const calculated = Math.round(oneRM * pct / 100);
    calcSpan.textContent = '\u2192 ' + calculated + ' kg';
    calcSpan.className = 'text-emerald-400 font-mono text-xs';
    return true;
  }
  calcSpan.textContent = '\u2192';
  calcSpan.className = 'text-emerald-400 font-mono text-xs';
  return false;
}

function previewRpeMode(rpe, reps, oneRM, calcSpan) {
  if (!isNaN(rpe) && rpe >= 1 && rpe <= 10 && reps && reps >= 1) {
    const rir = 10 - rpe;
    const totalRepsPossible = reps + rir;
    const targetWeight = Math.round(estimateWeightForReps(oneRM, totalRepsPossible));
    calcSpan.textContent = '\u2192 ' + targetWeight + ' kg';
    calcSpan.className = 'text-emerald-400 font-mono text-xs';
    return true;
  }
  calcSpan.textContent = '\u2192';
  calcSpan.className = 'text-emerald-400 font-mono text-xs';
  return false;
}

function previewAbsoluteMode(kg, calcSpan) {
  if (kg > 0) {
    calcSpan.textContent = '\u2192 ' + kg + ' kg';
    calcSpan.className = 'text-emerald-400 font-mono text-xs';
    return true;
  }
  calcSpan.textContent = '\u2192';
  calcSpan.className = 'text-emerald-400 font-mono text-xs';
  return false;
}

function updatePlanCalcPreview() {
  const exercise = document.getElementById('plan-exercise')?.value;
  const reps = parseInt(document.getElementById('plan-reps')?.value, 10);
  const addBtn = document.getElementById('plan-add-btn');
  if (!addBtn) return;

  // Bodyweight/weighted: just need reps
  if (exercise) {
    const schemaKey = getSchemaKey(exercise);
    if (schemaKey !== 'standard') {
      addBtn.disabled = !(reps > 0);
      return;
    }
  }

  const weightInput = document.getElementById('plan-weight');
  const calcSpan = document.getElementById('plan-calc-weight');
  const pill = document.getElementById('plan-wms-pill');
  if (!weightInput || !calcSpan || !pill) return;

  const mode = pill.dataset.mode;
  const oneRM = exercise ? (state.cache.activeRecords[exercise] || 0) : 0;

  if (!exercise || oneRM <= 0) {
    calcSpan.textContent = oneRM > 0 ? '\u2192' : 'No 1RM';
    calcSpan.className = 'font-mono text-xs ' + (oneRM > 0 ? 'text-emerald-400' : 'text-rose-400');
    addBtn.disabled = true;
    return;
  }

  let valid = false;
  if (mode === 'pct') {
    valid = previewPctMode(parseFloat(weightInput.value), oneRM, calcSpan, addBtn);
  } else if (mode === 'rpe') {
    valid = previewRpeMode(parseFloat(weightInput.value), reps, oneRM, calcSpan);
  } else {
    valid = previewAbsoluteMode(parseFloat(weightInput.value), calcSpan);
  }

  addBtn.disabled = !valid;
}

function handlePlanAdd() {
  const exercise = document.getElementById('plan-exercise')?.value;
  const reps = parseInt(document.getElementById('plan-reps')?.value, 10);
  if (!exercise || !reps || reps < 1) return;

  const schemaKey = getSchemaKey(exercise);
  let weight = 0, weightMode = 'absolute', pct = null, rpe = null;

  if (schemaKey === 'bodyweight') {
    weight = parseFloat(document.getElementById('plan-bodyweight')?.value) || state.user.userBiometrics.bodyweight || 0;
  } else if (schemaKey === 'weighted') {
    weight = parseFloat(document.getElementById('plan-bodyweight')?.value) || state.user.userBiometrics.bodyweight || 0;
    weight += parseFloat(document.getElementById('plan-ext-load')?.value) || 0;
  } else {
    const weightInput = document.getElementById('plan-weight');
    const pill = document.getElementById('plan-wms-pill');
    if (!weightInput || !pill) return;
    weightMode = pill.dataset.mode;
    const rawWeight = parseFloat(weightInput.value) || 0;
    if (weightMode === 'pct') {
      pct = rawWeight;
    } else if (weightMode === 'rpe') {
      rpe = rawWeight;
      if (rpe < 1 || rpe > 10) return;
    } else if (rawWeight <= 0) {
      return;
    }
    weight = rawWeight;
  }

  const movement = { exerciseId: exercise, reps, weight, weightMode, pct, rpe };
  const type = document.getElementById('workout-type')?.value;

  if (type === 'EMOM') {
    addPlanMinuteSlot(movement);
  } else {
    state.builder.workoutMovements.push(movement);
    renderPlanMovements();
  }

  haptic(HAPTIC.confirm);
}

function removePlanMovement(index) {
  if (index < 0 || index >= state.builder.workoutMovements.length) return;
  state.builder.workoutMovements.splice(index, 1);
  renderPlanMovements();
  haptic(HAPTIC.tap);
}

function populatePlanMovements(movements) {
  state.builder.workoutMovements = (movements || []).map(m => ({
    exerciseId: m.exerciseId || m.movement,
    reps: parseInt(m.reps, 10) || 0,
    weight: parseFloat(m.kg || m.weight) || 0,
    weightMode: m.weightMode || 'absolute',
    pct: m.pct || null,
    rpe: m.rpe || null
  }));
  renderPlanMovements();
}

async function formatIntervalLabel(intervalMin, intervalSec) {
  const intervalSeconds = intervalMin * 60 + intervalSec;
  if (intervalSeconds === 60) return 'EMOM';
  if (intervalSeconds === 120) return 'E2MOM';
  if (intervalSeconds === 180) return 'E3MOM';
  if (intervalMin > 0 && intervalSec === 0) return `E${intervalMin}MOM`;
  if (intervalMin > 0) return `Every ${intervalMin}:${String(intervalSec).padStart(2, '0')}`;
  return `Every :${String(intervalSec).padStart(2, '0')}`;
}

function validatePlanInputs(type) {
  if (!auth.currentUser) { alert('Please sign in first.'); return false; }
  if (!type) { showFeedback('Select a workout type first.', 'rose', 'planFeedback'); return false; }

  if (type === 'AMRAP') {
    const durationMin = parseInt(document.getElementById('amrap-duration')?.value, 10);
    if (!durationMin || durationMin < 1) { showFeedback('Enter a valid duration.', 'rose', 'planFeedback'); return false; }
  } else if (type === 'EMOM') {
    const intervalMin = parseInt(document.getElementById('emom-interval-min')?.value, 10) || 0;
    const intervalSec = parseInt(document.getElementById('emom-interval-sec')?.value, 10) || 0;
    const intervalSeconds = intervalMin * 60 + intervalSec;
    const rounds = parseInt(document.getElementById('emom-rounds')?.value, 10) || 0;
    if (intervalSeconds < 1) { showFeedback('Enter a valid interval.', 'rose', 'planFeedback'); return false; }
    if (rounds < 1) { showFeedback('Enter a valid number of rounds.', 'rose', 'planFeedback'); return false; }
  } else if (type === 'FOR_TIME') {
    const rounds = parseInt(document.getElementById('fortime-rounds')?.value, 10);
    if (!rounds || rounds < 1) { showFeedback('Enter a valid round count.', 'rose', 'planFeedback'); return false; }
  } else if (type === 'INTERVAL') {
    const rounds = parseInt(document.getElementById('interval-rounds')?.value, 10);
    if (!rounds || rounds < 1) { showFeedback('Enter a valid round count.', 'rose', 'planFeedback'); return false; }
  }
  return true;
}

function generateAutoPlanName(type) {
  if (type === 'AMRAP') {
    const d = parseInt(document.getElementById('amrap-duration')?.value, 10) || 0;
    return `${d} Min AMRAP`;
  }
  if (type === 'EMOM') {
    const intervalMin = parseInt(document.getElementById('emom-interval-min')?.value, 10) || 0;
    const intervalSec = parseInt(document.getElementById('emom-interval-sec')?.value, 10) || 0;
    const intervalSeconds = intervalMin * 60 + intervalSec;
    const rounds = state.builder.emomMode === 'by_round' ? (document.querySelectorAll('#emom-minute-slots .minute-row').length) : (parseInt(document.getElementById('emom-rounds')?.value, 10) || 0);
    const durationSeconds = rounds * intervalSeconds;
    const intervalLabel = formatIntervalLabel(intervalMin, intervalSec);
    const prefix = durationSeconds % 60 === 0 ? `${durationSeconds / 60} Min ` : '';
    return `${prefix}${intervalLabel} \u00D7 ${rounds} rounds`;
  }
  if (type === 'FOR_TIME') {
    const timeCap = parseInt(document.getElementById('fortime-cap')?.value, 10) || 0;
    return timeCap ? `${timeCap} Min For Time` : 'For Time';
  }
  return 'Interval Workout';
}

function buildPlanDocument(userId, name, type, structure) {
  return {
    userId,
    name,
    type,
    structure,
    status: 'active',
    createdAt: serverTimestamp()
  };
}

async function savePlan() {
  if (!auth.currentUser) return alert('Please sign in first.');
  const type = document.getElementById('workout-type')?.value;
  if (!type) return showFeedback('Select a workout type first.', 'rose', 'planFeedback');

  let structure;
  try {
    structure = capturePlanStructure(type);
  } catch (err) {
    return showFeedback(err.message, 'rose', 'planFeedback');
  }

  if (!validatePlanInputs(type)) return;

  const autoName = generateAutoPlanName(type);
  const name = await showPlanNameModal(autoName);
  if (!name) return;

  const planDoc = buildPlanDocument(auth.currentUser.uid, name.trim() || autoName, type, structure);

  addDoc(collection(db, "workout_plans"), planDoc).then(() => {
    showFeedback('Plan saved!', 'emerald', 'planFeedback');
    haptic(HAPTIC.confirm);
  }).catch(err => {
    console.error('Save plan failed', err.code, err.message);
    showFeedback('Failed to save plan: ' + err.message, 'rose', 'planFeedback');
  });
}

function removeMinuteSlot(btn) {
  const row = btn.closest('.minute-row');
  if (row) row.remove();
  const container = document.getElementById('emom-minute-slots');
  if (container) {
    container.querySelectorAll('.minute-row').forEach((r, i) => {
      const label = r.querySelector('.minute-label');
      if (label) label.textContent = state.builder.emomMode === 'sequence' ? `#${i + 1}` : `Round ${i + 1}`;
    });
  }
  updateEmomSummary();
  updateEmomDurationDisplay();
  updateEmomScorePreview();
}

function updateEmomDurationDisplay() {
  const roundsInput = document.getElementById('emom-rounds');
  const intervalMin = parseInt(document.getElementById('emom-interval-min')?.value, 10) || 0;
  const intervalSec = parseInt(document.getElementById('emom-interval-sec')?.value, 10) || 0;
  const display = document.getElementById('emom-duration-display');
  const container = document.getElementById('emom-minute-slots');
  const slots = container ? container.querySelectorAll('.minute-row').length : 0;
  const rounds = state.builder.emomMode === 'by_round' ? slots : parseInt(roundsInput?.value, 10);
  if (!display) return;
  if (!rounds || rounds <= 0 || (intervalMin === 0 && intervalSec === 0)) {
    display.textContent = '\u2014';
    return;
  }
  const totalSec = rounds * (intervalMin * 60 + intervalSec);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  display.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
}

function updateEmomSummary() {
  const roundsInput = document.getElementById('emom-rounds');
  const intervalMin = parseInt(document.getElementById('emom-interval-min')?.value, 10) || 1;
  const intervalSec = parseInt(document.getElementById('emom-interval-sec')?.value, 10) || 0;
  const intervalSeconds = intervalMin * 60 + intervalSec;
  const container = document.getElementById('emom-minute-slots');
  const summaryEl = document.getElementById('emom-summary');
  const textEl = document.getElementById('emom-summary-text');
  if (!container || !summaryEl || !textEl) return;
  const slots = container.querySelectorAll('.minute-row').length;
  const rounds = state.builder.emomMode === 'by_round' ? slots : parseInt(roundsInput?.value, 10);
  if (rounds > 0 && slots > 0 && intervalSeconds > 0) {
    const totalSec = rounds * intervalSeconds;
    const intervalLabel = formatIntervalLabel(intervalMin, intervalSec);
    const prefix = totalSec % 60 === 0 ? `${totalSec / 60} Min ` : '';
    const name = `${prefix}${intervalLabel}`;
    if (state.builder.emomMode === 'sequence') {
      const exerciseLabel = slots === 1 ? 'exercise' : 'exercises';
      textEl.textContent = `${name} \u00D7 ${rounds} rounds \u00B7 ${slots}-${exerciseLabel} sequence`;
    } else {
      textEl.textContent = `${name} \u00B7 ${slots} round slots`;
    }
    summaryEl.classList.remove('hidden');
  } else {
    summaryEl.classList.add('hidden');
  }
}

function getEmomMovementData() {
  const minutes = [];
  let error = null;
  document.querySelectorAll('#emom-minute-slots .minute-row').forEach(row => {
    const exercise = row.dataset.exerciseId;
    const reps = parseInt(row.dataset.reps, 10);
    const weight = parseFloat(row.dataset.weight) || 0;
    const weightMode = row.dataset.weightMode || 'absolute';
    const pct = row.dataset.pct ? parseFloat(row.dataset.pct) : null;
    const rpe = row.dataset.rpe ? parseFloat(row.dataset.rpe) : null;

    if (!exercise || exercise === 'undefined') { error = 'Select an exercise for all intervals.'; return; }
    if (!reps || reps < 1) { error = 'Enter reps for all intervals.'; return; }

    const movement = { exerciseId: exercise, reps, weight, weightMode };
    if (pct !== null) movement.pct = pct;
    if (rpe !== null) movement.rpe = rpe;
    minutes.push({ movements: [movement] });
  });
  if (error) throw new Error(error);
  return minutes;
}

function updateEmomScorePreview() {
  const roundsCompleted = parseInt(document.getElementById('emom-rounds-completed')?.value, 10);
  const roundsInput = document.getElementById('emom-rounds');
  const container = document.getElementById('emom-minute-slots');
  const slots = container ? container.querySelectorAll('.minute-row').length : 0;
  const rounds = state.builder.emomMode === 'by_round' ? slots : parseInt(roundsInput?.value, 10);
  const preview = document.getElementById('emom-score-preview');
  if (!preview) return;
  if (rounds > 0) {
    preview.textContent = formatScore_COMPLETED_MINUTES(roundsCompleted || 0, rounds);
  } else {
    preview.textContent = '—';
  }
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

    await writeStructuredLogEntry({
      workoutId, movement,
      sets: performedTimes,
      totalReps: totalRepsPerMovement,
      extraFields: { minuteIndex: i }
    });
  }
}

// ─── FOR_TIME Functions ────────────────────────────────────────────────────

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

// ─── INTERVAL Functions ───────────────────────────────────────────────────

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

function listenToStructuredWorkouts(uid) {
  const q = query(
    collection(db, "structured_workouts"),
    where("userId", "==", uid),
    orderBy("timestamp", "desc"),
    limit(500)
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
    // Show a visible hint so users know a composite index may be needed
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
  const container = document.getElementById('structured-workout-list');
  const pagination = document.getElementById('structured-pagination');
  if (!container) return;

  const expandedIds = saveExpandedCardIds();

  const workouts = state.data.lastStructuredWorkouts;

  if (!workouts.length) {
    renderEmptyState(container, 'No structured workouts logged yet.');
    if (pagination) pagination.classList.add('hidden');
    return;
  }

  const perPage = 3;
  const totalPages = Math.max(1, Math.ceil(workouts.length / perPage));
  state.pagination.structured = Math.min(state.pagination.structured, totalPages);
  const start = (state.pagination.structured - 1) * perPage;
  const pageItems = workouts.slice(start, start + perPage);

  container.innerHTML = pageItems.map(renderStructuredWorkoutCard).join('');
  restoreExpandedCardIds(expandedIds);
  if (typeof lucide !== 'undefined') lucide.createIcons();

  updatePagination('structured', state.pagination.structured, totalPages);
}

function changeStructuredPage(direction) {
  changeGenericPage('structured', state.data.lastStructuredWorkouts, 3, renderStructuredWorkoutHistory, direction);
}

// ==========================================
// END STRUCTURED WORKOUT SYSTEM
// ==========================================

// ==========================================
// WORKOUT PLAN SYSTEM
// ==========================================

function listenToPlans(uid) {
  const q = query(
    collection(db, "workout_plans"),
    where("userId", "==", uid)
  );
  unsubscribePlans = onSnapshot(q, (snapshot) => {
    const plans = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status !== 'active') return;
      const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt;
      plans.push({ id: doc.id, ...data, createdAt });
    });
    plans.sort((a, b) => b.createdAt - a.createdAt);
    state.data.lastWorkoutPlans = plans;
    if (state.ui.plansFilter === 'mine') renderPlansUI();
    if (state.ui.plansFilter === 'favorites') renderSharedPlansUI();
  }, (error) => {
    console.error('Plans stream error', error.code, error.message);
  });
}

function renderPlansUI() {
  const container = document.getElementById('saved-plans-inline');
  const pagination = document.getElementById('plans-pagination');
  if (!container) return;

  const expandedIds = saveExpandedCardIds();

  if (!state.data.lastWorkoutPlans.length) {
    renderEmptyState(container, 'No saved plans yet.');
    if (pagination) pagination.classList.add('hidden');
    return;
  }

  const perPage = 3;
  const totalPages = Math.max(1, Math.ceil(state.data.lastWorkoutPlans.length / perPage));
  state.pagination.plans = Math.min(state.pagination.plans, totalPages);
  const start = (state.pagination.plans - 1) * perPage;
  const pageItems = state.data.lastWorkoutPlans.slice(start, start + perPage);

  container.innerHTML = pageItems.map(plan => renderPlanCard(plan)).join('');
  restoreExpandedCardIds(expandedIds);
  if (typeof lucide !== 'undefined') lucide.createIcons();

  updatePagination('plans', state.pagination.plans, totalPages);
}

function switchPlansFilter(filter) {
  state.ui.plansFilter = filter;
  const btnMine = document.getElementById('plans-filter-mine');
  const btnShared = document.getElementById('plans-filter-shared');
  const btnFavs = document.getElementById('plans-filter-favorites');
  const plansSection = document.getElementById('saved-plans-inline');
  const plansPagination = document.getElementById('plans-pagination');
  const sharedSection = document.getElementById('shared-plans-inline');
  const sharedPagination = document.getElementById('shared-plans-pagination');

  const setActive = (btn) => btn.className = 'btn-core is-primary btn-size-row';
  const setInactive = (btn) => btn.className = 'btn-core is-ghost btn-size-row';

  if (filter === 'mine') {
    setActive(btnMine); setInactive(btnShared); setInactive(btnFavs);
    if (plansSection) plansSection.classList.remove('hidden');
    if (plansPagination) plansPagination.classList.remove('hidden');
    if (sharedSection) sharedSection.classList.add('hidden');
    if (sharedPagination) sharedPagination.classList.add('hidden');
    renderPlansUI();
  } else {
    setInactive(btnMine);
    if (filter === 'shared') { setActive(btnShared); setInactive(btnFavs); }
    else { setActive(btnFavs); setInactive(btnShared); }
    if (plansSection) plansSection.classList.add('hidden');
    if (plansPagination) plansPagination.classList.add('hidden');
    if (sharedSection) sharedSection.classList.remove('hidden');
    if (sharedPagination) sharedPagination.classList.remove('hidden');
    renderSharedPlansUI();
  }
}

function changePlansPage(direction) {
  changeGenericPage('plans', state.data.lastWorkoutPlans, 3, renderPlansUI, direction);
}

async function deletePlan(planId) {
  if (!auth.currentUser) return;
  if (!confirm('Delete this saved plan?')) return;
  try {
    await updateDoc(doc(db, "workout_plans", planId), { status: 'deleted' });
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('Delete plan failed', err.code, err.message);
    alert('Failed to delete plan: ' + err.message);
  }
}

async function deleteStructuredWorkout(workoutId) {
  if (!auth.currentUser) return;
  if (!confirm('Delete this workout log?')) return;
  try {
    await deleteDoc(doc(db, "structured_workouts", workoutId));
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('Delete workout failed', err.code, err.message);
    alert('Failed to delete workout: ' + err.message);
  }
}

function loadWorkoutIntoBuilder(type, structure, feedbackMessage) {
  switchTab('calculator');

  const typeSelect = document.getElementById('workout-type');
  if (typeSelect) typeSelect.value = type;
  handleWorkoutTypeChange();

  const s = structure || {};

  switch (type) {
    case 'AMRAP': populateAmrapForm(s); break;
    case 'EMOM': populateEmomForm(s); break;
    case 'FOR_TIME': populateForTimeForm(s); break;
    case 'INTERVAL': populateIntervalForm(s); break;
  }

  const planCard = document.getElementById('plan-workout-card');
  if (planCard) planCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showFeedback(feedbackMessage, 'emerald', 'planFeedback');
  haptic(HAPTIC.tap);
}

function loadPlan(planId) {
  const plan = state.data.lastWorkoutPlans.find(p => p.id === planId);
  if (!plan) return;
  loadWorkoutIntoBuilder(plan.type, plan.structure, `Plan "${plan.name}" loaded!`);
}

function redoWorkout(workoutId) {
  const sw = state.data.lastStructuredWorkouts.find(w => w.id === workoutId);
  if (!sw) return;
  loadWorkoutIntoBuilder(sw.type, sw.structure, `Workout "${sw.name}" loaded for redo!`);
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
    document.getElementById('fortime-dnf') && (document.getElementById('fortime-dnf').checked = false);
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

function doWorkout() {
  const type = document.getElementById('workout-type').value;
  if (!type) { showFeedback('Select a workout type first', 'rose', 'planFeedback'); return; }

  const resultId = WORKOUT_TYPE_TO_RESULT_ID[type];
  if (!resultId) { showFeedback('Unknown workout type.', 'rose', 'planFeedback'); return; }

  let structure;
  try {
    structure = capturePlanStructure(type);
  } catch (err) {
    console.error('capturePlanStructure error:', err);
    showFeedback(err.message, 'rose', 'log-workout-feedback');
    return;
  }

  const hasMovements = type === 'EMOM'
    ? (structure.minutes && structure.minutes.length > 0)
    : (structure.movements && structure.movements.length > 0);
  if (!hasMovements) {
    showFeedback('Add at least one movement before starting the workout.', 'rose', 'planFeedback');
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
  const docRef = await addDoc(collection(db, "structured_workouts"), workoutDoc);
  await generateContributions(docRef.id, structure, result);
}

function submitAmrapWorkout(name, structure, now) {
  const roundsCompleted = parseInt(document.getElementById('log-rounds').value, 10);
  const additionalReps = parseInt(document.getElementById('log-partial-reps').value, 10) || 0;
  if (roundsCompleted < 0) {
    showFeedback('Enter rounds completed.', 'rose', 'log-workout-feedback');
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
    showFeedback('Enter rounds completed.', 'rose', 'log-workout-feedback');
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
  const timeSeconds = dnf ? 0 : resultMins * 60 + resultSecs;
  if (resultSecs > 59) {
    showFeedback('Seconds must be 0–59.', 'rose', 'log-workout-feedback');
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
    showFeedback('Enter rounds completed.', 'rose', 'log-workout-feedback');
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
  if (!auth.currentUser) return alert('Please sign in first.');
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
      return showFeedback('Unknown workout type.', 'rose', 'log-workout-feedback');
    }

    await handlers[type](name, structure, now);
    resetTrainingTab();
    showFeedback('Workout logged!', 'emerald', 'log-workout-feedback');
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('Log pending workout failed', err.code, err.message);
    if (err.code === 'permission-denied') {
      showFeedback('Save blocked by Firestore rules.', 'rose', 'log-workout-feedback');
    } else {
      showFeedback('Failed to log workout: ' + err.message, 'rose', 'log-workout-feedback');
    }
  } finally {
    if (btn) btn.disabled = false;
    isSubmittingWorkout = false;
  }
}

function capturePlanStructure(type) {
  const getMovementsFromWorkout = () => {
    return state.builder.workoutMovements.map(m => ({
      movement: m.exerciseId,
      reps: m.reps,
      kg: m.weight,
      weightMode: m.weightMode,
      pct: m.pct,
      rpe: m.rpe,
      exerciseId: m.exerciseId,
      weight: m.weight
    }));
  };

  switch (type) {
    case 'AMRAP': {
      const durationMin = parseInt(document.getElementById('amrap-duration')?.value, 10) || 0;
      const movements = getMovementsFromWorkout();
      return { durationSeconds: durationMin * 60, movements };
    }
    case 'EMOM': {
      const intervalMin = parseInt(document.getElementById('emom-interval-min')?.value, 10) || 0;
      const intervalSec = parseInt(document.getElementById('emom-interval-sec')?.value, 10) || 0;
      const intervalSeconds = intervalMin * 60 + intervalSec;
      let minutes;
      try { minutes = getEmomMovementData(); } catch (e) { console.error('EMOM movement data error:', e); minutes = []; }
      const rounds = state.builder.emomMode === 'by_round' ? minutes.length : parseInt(document.getElementById('emom-rounds')?.value, 10) || 0;
      const durationSeconds = rounds * intervalSeconds;
      return { mode: state.builder.emomMode, rounds, durationMinutes: Math.floor(durationSeconds / 60), intervalSeconds, minutes };
    }
    case 'FOR_TIME': {
      const timeCap = parseInt(document.getElementById('fortime-cap')?.value, 10) || 0;
      const rounds = parseInt(document.getElementById('fortime-rounds')?.value, 10) || 0;
      const movements = getMovementsFromWorkout();
      return { durationMinutes: timeCap || null, movements, rounds };
    }
    case 'INTERVAL': {
      const rounds = parseInt(document.getElementById('interval-rounds')?.value, 10) || 0;
      const workMin = parseInt(document.getElementById('interval-work-min')?.value, 10) || 0;
      const restMin = parseInt(document.getElementById('interval-rest-min')?.value, 10) || 0;
      const movements = getMovementsFromWorkout();
      return { rounds, workSeconds: workMin * 60, restSeconds: restMin * 60, movements };
    }
    default: return {};
  }
}

function populateAmrapForm(structure) {
  if (structure.durationSeconds) {
    document.getElementById('amrap-duration').value = Math.round(structure.durationSeconds / 60);
  }
  populatePlanMovements(structure.movements || []);
}

function populateEmomForm(structure) {
  if (structure.intervalSeconds) {
    const mins = Math.floor(structure.intervalSeconds / 60);
    const secs = structure.intervalSeconds % 60;
    document.getElementById('emom-interval-min').value = mins || '';
    document.getElementById('emom-interval-sec').value = secs || '';
  }
  const mode = structure.mode || 'sequence';
  switchEmomMode(mode);
  if (mode !== 'by_round' && structure.rounds) {
    document.getElementById('emom-rounds').value = structure.rounds;
  }
  const slots = document.getElementById('emom-minute-slots');
  if (slots) {
    clearChildren(slots);
    delete slots.dataset.planBootstrapped;
  }
  (structure.minutes || []).forEach(m => {
    const mov = m.movements?.[0];
    if (mov) {
      addPlanMinuteSlot({
        exerciseId: mov.exerciseId || mov.movement,
        reps: parseInt(mov.reps, 10) || 0,
        weight: parseFloat(mov.weight || mov.kg) || 0,
        weightMode: mov.weightMode || 'absolute',
        pct: mov.pct || null,
        rpe: mov.rpe || null
      });
    } else {
      addPlanMinuteSlot();
    }
  });
}

function populateForTimeForm(structure) {
  if (structure.durationMinutes) {
    document.getElementById('fortime-cap').value = structure.durationMinutes;
  }
  if (structure.rounds) {
    document.getElementById('fortime-rounds').value = structure.rounds;
  }
  // Reset DNF state
  const dnfCheck = document.getElementById('fortime-dnf');
  if (dnfCheck) { dnfCheck.checked = false; toggleForTimeDnf(); }
  populatePlanMovements(structure.movements || []);
}

function populateIntervalForm(structure) {
  if (structure.rounds) {
    document.getElementById('interval-rounds').value = structure.rounds;
  }
  if (structure.workSeconds) {
    document.getElementById('interval-work-min').value = Math.round(structure.workSeconds / 60);
  }
  if (structure.restSeconds) {
    document.getElementById('interval-rest-min').value = Math.round(structure.restSeconds / 60);
  }
  populatePlanMovements(structure.movements || []);
}

function populateMovementDropdowns() {
  document.querySelectorAll('.movement-exercise').forEach(sel => {
    if (sel.options.length > 1) return;
    const currentVal = sel.value;
    const groups = ['barbell', 'dumbbell', 'kettlebell', 'cardio', 'bodyweight'];
    sel.innerHTML = buildExerciseOptionsHtml(groups, '<option value="">Select exercise...</option>');
    if (currentVal && Array.from(sel.options).some(o => o.value === currentVal)) {
      sel.value = currentVal;
    }
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


function cleanupWorkoutSubscriptions() {
  if (unsubscribeStructured) { unsubscribeStructured(); unsubscribeStructured = null; }
  if (unsubscribePlans) { unsubscribePlans(); unsubscribePlans = null; }
}

export { writeStructuredLogEntry, generateContributionsBase, generateAmrapContributions, handleWorkoutTypeChange, switchEmomMode, addPlanMinuteSlot, refreshPlanForm, handlePlanExerciseChange, togglePlanWms, previewPctMode, previewRpeMode, previewAbsoluteMode, updatePlanCalcPreview, handlePlanAdd, removePlanMovement, populatePlanMovements, formatIntervalLabel, validatePlanInputs, generateAutoPlanName, buildPlanDocument, savePlan, removeMinuteSlot, updateEmomDurationDisplay, updateEmomSummary, getEmomMovementData, updateEmomScorePreview, generateEmomContributions, toggleForTimeDnf, updateForTimeScorePreview, generateForTimeContributions, updateIntervalScorePreview, recalcForTimeRemaining, logRound, logRep, updateLogScorePreview, updateLogWorkoutButtonState, generateIntervalContributions, listenToStructuredWorkouts, renderStructuredWorkoutHistory, changeStructuredPage, listenToPlans, renderPlansUI, switchPlansFilter, changePlansPage, deletePlan, deleteStructuredWorkout, loadWorkoutIntoBuilder, loadPlan, redoWorkout, setupTrainingTab, doWorkout, doStructuredWorkout, doPlanWorkout, doSharedPlan, submitStructuredWorkout, submitAmrapWorkout, submitEmomWorkout, submitForTimeWorkout, submitIntervalWorkout, resetTrainingTab, submitPendingWorkout, capturePlanStructure, populateAmrapForm, populateEmomForm, populateForTimeForm, populateIntervalForm, populateMovementDropdowns, updateAmrapScorePreview, cleanupWorkoutSubscriptions };
