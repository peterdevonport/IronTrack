import { auth, db, collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, serverTimestamp, orderBy, limit, Timestamp, getDocs } from './firebase.js';
import { state, EPLEY_CONSTANT, entriesPerPage, HAPTIC, FORM_SCHEMAS, SECONDS_PER_MINUTE, PERCENT_DIVISOR } from './state.js';
import { estimateWeightForReps, getEffectiveLoad, computeDisplayWeight, rpeToRir } from './math.js';
import { escapeHtml, haptic } from './dom.js';
import { getExerciseInfo, EXERCISE_CATALOG, LOAD_FACTORS } from './exercise-data.js';
import { formatMovementLoad, formatCardDate, formatWorkoutType } from './formatting.js';
import { buildWorkoutDescription, formatScore_ROUNDS_AND_REPS, formatScore_COMPLETED_MINUTES, formatScore_TIME_SECONDS, getRepsPerRound } from './analytics.js';
import { renderEmptyState, showFeedback, showToast, showPlanNameModal, updatePagination, updatePaginationControls, clearChildren, changeGenericPage, paginateAndRender, buildExerciseOptionsHtml, updatePillActive, switchTab, setActiveTab, setInactiveTab } from './ui.js';
import { renderWorkoutCard, renderPlanCard, renderSharedPlanCard, renderPlanMovements, renderMinuteSlotInner } from './rendering.js';
import { renderFormFields } from './forms.js';
import { renderSharedPlansUI } from './social.js';
import { getSchemaKey, computeTotalLoad, requireAuth } from './auth.js';
import { toggleForTimeDnf, cleanupStructuredSubscriptions } from './workouts.js';

let unsubscribePlans = null;

function handleWorkoutTypeChange() {
  const type = document.getElementById('workout-type')?.value;
  const desc = document.getElementById('workout-type-desc');
  if (!desc) return;
  state.builder.workoutMovements = [];
  const movementsList = document.getElementById('plan-movements-list');
  if (movementsList) renderEmptyState(movementsList, 'Add movements above.');
  const slots = document.getElementById('emom-minute-slots');
  if (slots) renderEmptyState(slots, 'Add a movement to create the first slot.');
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
      setActiveTab(btnSeq);
      setInactiveTab(btnByRound);
    } else {
      setInactiveTab(btnSeq);
      setActiveTab(btnByRound);
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
    const weightDisplay = computeDisplayWeight(data, oneRM);
    let source;
    if (data.weightMode === 'pct' && data.pct) {
      source = `${data.exerciseId} \u00D7 ${data.reps} @ ${weightDisplay} kg (${data.pct}%)`;
    } else if (data.weightMode === 'rpe' && data.rpe) {
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
    const calculated = Math.round(oneRM * pct / PERCENT_DIVISOR);
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
    const rir = rpeToRir(rpe);
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

  let valid;
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
  let weight = 0;
  let weightMode = 'absolute';
  let pct = null;
  let rpe = null;

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
  const intervalSeconds = intervalMin * SECONDS_PER_MINUTE + intervalSec;
  if (intervalSeconds === SECONDS_PER_MINUTE) return 'EMOM';
  if (intervalSeconds === 120) return 'E2MOM';
  if (intervalSeconds === 180) return 'E3MOM';
  if (intervalMin > 0 && intervalSec === 0) return `E${intervalMin}MOM`;
  if (intervalMin > 0) return `Every ${intervalMin}:${String(intervalSec).padStart(2, '0')}`;
  return `Every :${String(intervalSec).padStart(2, '0')}`;
}

function validatePlanInputs(type) {
  if (!requireAuth('planFeedback')) return false;
  if (!type) { showFeedback('Select a workout type first.', 'rose', 'planFeedback'); return false; }

  if (type === 'AMRAP') {
    const durationMin = parseInt(document.getElementById('amrap-duration')?.value, 10);
    if (!durationMin || durationMin < 1) { showFeedback('Enter a valid duration.', 'red', 'planFeedback'); return false; }
  } else if (type === 'EMOM') {
    const intervalMin = parseInt(document.getElementById('emom-interval-min')?.value, 10) || 0;
    const intervalSec = parseInt(document.getElementById('emom-interval-sec')?.value, 10) || 0;
    const intervalSeconds = intervalMin * SECONDS_PER_MINUTE + intervalSec;
    const rounds = parseInt(document.getElementById('emom-rounds')?.value, 10) || 0;
    if (intervalSeconds < 1) { showFeedback('Enter a valid interval.', 'red', 'planFeedback'); return false; }
    if (rounds < 1) { showFeedback('Enter a valid number of rounds.', 'red', 'planFeedback'); return false; }
  } else if (type === 'FOR_TIME') {
    const rounds = parseInt(document.getElementById('fortime-rounds')?.value, 10);
    if (!rounds || rounds < 1) { showFeedback('Enter a valid round count.', 'red', 'planFeedback'); return false; }
  } else if (type === 'INTERVAL') {
    const rounds = parseInt(document.getElementById('interval-rounds')?.value, 10);
    if (!rounds || rounds < 1) { showFeedback('Enter a valid round count.', 'red', 'planFeedback'); return false; }
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
    const intervalSeconds = intervalMin * SECONDS_PER_MINUTE + intervalSec;
    const rounds = state.builder.emomMode === 'by_round' ? (document.querySelectorAll('#emom-minute-slots .minute-row').length) : (parseInt(document.getElementById('emom-rounds')?.value, 10) || 0);
    const durationSeconds = rounds * intervalSeconds;
    const intervalLabel = formatIntervalLabel(intervalMin, intervalSec);
    const prefix = durationSeconds % SECONDS_PER_MINUTE === 0 ? `${durationSeconds / SECONDS_PER_MINUTE} Min ` : '';
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
  if (!requireAuth('planFeedback')) return;
  const type = document.getElementById('workout-type')?.value;
  if (!type) return showFeedback('Select a workout type first.', 'red', 'planFeedback');

  let structure;
  try {
    structure = capturePlanStructure(type);
  } catch (err) {
    return showFeedback(err.message, 'red', 'planFeedback');
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
    showFeedback('Failed to save plan: ' + err.message, 'red', 'planFeedback');
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
  const totalSec = rounds * (intervalMin * SECONDS_PER_MINUTE + intervalSec);
  const mins = Math.floor(totalSec / SECONDS_PER_MINUTE);
  const secs = totalSec % SECONDS_PER_MINUTE;
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
    const prefix = totalSec % SECONDS_PER_MINUTE === 0 ? `${totalSec / SECONDS_PER_MINUTE} Min ` : '';
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
  paginateAndRender({
    stateKey: 'plans',
    list: state.data.lastWorkoutPlans,
    containerId: 'saved-plans-inline',
    renderItems: (items) => items.map(plan => renderPlanCard(plan)).join(''),
    emptyMessage: 'No saved plans yet.'
  });
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

  if (filter === 'mine') {
    setActiveTab(btnMine); setInactiveTab(btnShared); setInactiveTab(btnFavs);
    if (plansSection) plansSection.classList.remove('hidden');
    if (plansPagination) plansPagination.classList.remove('hidden');
    if (sharedSection) sharedSection.classList.add('hidden');
    if (sharedPagination) sharedPagination.classList.add('hidden');
    renderPlansUI();
  } else {
    setInactiveTab(btnMine);
    if (filter === 'shared') { setActiveTab(btnShared); setInactiveTab(btnFavs); }
    else { setActiveTab(btnFavs); setInactiveTab(btnShared); }
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
      return { durationSeconds: durationMin * SECONDS_PER_MINUTE, movements };
    }
    case 'EMOM': {
      const intervalMin = parseInt(document.getElementById('emom-interval-min')?.value, 10) || 0;
      const intervalSec = parseInt(document.getElementById('emom-interval-sec')?.value, 10) || 0;
      const intervalSeconds = intervalMin * SECONDS_PER_MINUTE + intervalSec;
      let minutes;
      try { minutes = getEmomMovementData(); } catch (e) { console.error('EMOM movement data error:', e); minutes = []; }
      const rounds = state.builder.emomMode === 'by_round' ? minutes.length : parseInt(document.getElementById('emom-rounds')?.value, 10) || 0;
      const durationSeconds = rounds * intervalSeconds;
      return { mode: state.builder.emomMode, rounds, durationMinutes: Math.floor(durationSeconds / SECONDS_PER_MINUTE), intervalSeconds, minutes };
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
      return { rounds, workSeconds: workMin * SECONDS_PER_MINUTE, restSeconds: restMin * SECONDS_PER_MINUTE, movements };
    }
    default: return {};
  }
}

function populateAmrapForm(structure) {
  if (structure.durationSeconds) {
    document.getElementById('amrap-duration').value = Math.round(structure.durationSeconds / SECONDS_PER_MINUTE);
  }
  populatePlanMovements(structure.movements || []);
}

function populateEmomForm(structure) {
  if (structure.intervalSeconds) {
    const mins = Math.floor(structure.intervalSeconds / SECONDS_PER_MINUTE);
    const secs = structure.intervalSeconds % SECONDS_PER_MINUTE;
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
  const dnfCheck = document.getElementById('fortime-dnf');
  if (dnfCheck) { dnfCheck.checked = false; toggleForTimeDnf(); }
  populatePlanMovements(structure.movements || []);
}

function populateIntervalForm(structure) {
  if (structure.rounds) {
    document.getElementById('interval-rounds').value = structure.rounds;
  }
  if (structure.workSeconds) {
    document.getElementById('interval-work-min').value = Math.round(structure.workSeconds / SECONDS_PER_MINUTE);
  }
  if (structure.restSeconds) {
    document.getElementById('interval-rest-min').value = Math.round(structure.restSeconds / SECONDS_PER_MINUTE);
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

function cleanupWorkoutSubscriptions() {
  cleanupStructuredSubscriptions();
  if (unsubscribePlans) { unsubscribePlans(); unsubscribePlans = null; }
}

export { handleWorkoutTypeChange, switchEmomMode, addPlanMinuteSlot, refreshPlanForm, handlePlanExerciseChange, togglePlanWms, previewPctMode, previewRpeMode, previewAbsoluteMode, updatePlanCalcPreview, handlePlanAdd, removePlanMovement, populatePlanMovements, formatIntervalLabel, validatePlanInputs, generateAutoPlanName, buildPlanDocument, savePlan, removeMinuteSlot, updateEmomDurationDisplay, updateEmomSummary, getEmomMovementData, updateEmomScorePreview, listenToPlans, renderPlansUI, switchPlansFilter, changePlansPage, deletePlan, deleteStructuredWorkout, loadWorkoutIntoBuilder, loadPlan, redoWorkout, capturePlanStructure, populateAmrapForm, populateEmomForm, populateForTimeForm, populateIntervalForm, populateMovementDropdowns, cleanupWorkoutSubscriptions };
