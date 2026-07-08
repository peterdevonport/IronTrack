import { state, HAPTIC, FORM_SCHEMAS, entriesPerPage, workoutFilter, pbLogExercise, RECORDS_PER_PAGE, PERCENT_DIVISOR } from './state.js';
import { formatDotsScore } from './formatting.js';
import { estimate1RM, estimateWeightForReps, getEffectiveLoad, computeEffectiveLoad, rpeToRir } from './math.js';
import { escapeHtml, haptic } from './dom.js';
import { getExerciseInfo, EXERCISE_CATALOG, LOAD_FACTORS } from './exercise-data.js';
import { renderEmptyState, showFeedback, updatePagination, updatePaginationControls, changeGenericPage, buildExerciseOptionsHtml, setActiveTab, setInactiveTab } from './ui.js';
import { renderFormFields } from './forms.js';
import { getSchemaKey, computeTotalLoad } from './auth.js';
import { getRankingTier } from './analytics.js';
import { renderRegistryRow, renderCalcEntries } from './rendering.js';
import { renderLogs } from './volume.js';

let currentCalcMode = 'pct';

function update1RMRegistryUI() {
    const tableBody = document.getElementById('registry-table-body');
    if (!tableBody) return;

    const manualWorkouts = state.data.lastWorkouts.filter(w => w.source !== 'structured');

    const uniqueExercises = Array.from(new Set(manualWorkouts.map(w => w.exercise))).filter(Boolean).sort();

    if (uniqueExercises.length === 0) {
        renderEmptyState(tableBody, 'No logs recorded yet.', 'col-span-3');
        const pagination = document.getElementById('records-pagination');
        if (pagination) pagination.classList.add('hidden');
        return;
    }

    const totalPages = Math.max(1, Math.ceil(uniqueExercises.length / RECORDS_PER_PAGE));
    state.pagination.records = Math.min(state.pagination.records, totalPages);
    const start = (state.pagination.records - 1) * RECORDS_PER_PAGE;
    const pageExercises = uniqueExercises.slice(start, start + RECORDS_PER_PAGE);

    let html = '';
    pageExercises.forEach(exercise => {
        const info = getExerciseInfo(exercise);
        const isBodyweight = info.type === 'bodyweight';
        if (isBodyweight) {
            const maxReps = state.cache.cachedMaxRepsByExercise[exercise] || 0;
            html += renderRegistryRow(exercise, true, maxReps, 0, 0);
        } else {
            const maxEstimated1RM = state.cache.cachedMax1RMByExercise[exercise] || 0;
            const absolutePB = state.cache.cachedMaxLoadByExercise[exercise] || 0;
            html += renderRegistryRow(exercise, false, 0, maxEstimated1RM, absolutePB);
        }
    });

    tableBody.innerHTML = html;

    updatePagination('records', state.pagination.records, totalPages);
}

function updateCalcCard() {
    const select = document.getElementById('calc-lift-select');
    const oneRmDisplay = document.getElementById('calc-one-rm-display');
    if (!select) return;

    const exercise = select.value;
    if (!exercise) {
        if (oneRmDisplay) oneRmDisplay.textContent = '—';
        renderCalcEntries();
        return;
    }

    const oneRM = state.cache.activeRecords[exercise] || 0;
    if (oneRmDisplay) {
        oneRmDisplay.textContent = oneRM > 0 ? `${Math.round(oneRM)} kg` : '—';
    }

    renderCalcEntries();
    updateCalcPreview();
}

function switchCalcMode(mode) {
    currentCalcMode = mode;
    const pctInputs = document.getElementById('calc-pct-inputs');
    const rpeInputs = document.getElementById('calc-rpe-inputs');
    const pctTab = document.getElementById('calc-mode-pct');
    const rpeTab = document.getElementById('calc-mode-rpe');
    if (!pctInputs || !rpeInputs || !pctTab || !rpeTab) return;

    if (mode === 'pct') {
        pctInputs.classList.remove('hidden');
        rpeInputs.classList.add('hidden');
        setActiveTab(pctTab);
        setInactiveTab(rpeTab);
    } else {
        pctInputs.classList.add('hidden');
        rpeInputs.classList.remove('hidden');
        setInactiveTab(pctTab);
        setActiveTab(rpeTab);
    }
    updateCalcPreview();
}

function updateCalcPreview() {
    const previewWeight = document.getElementById('calc-preview-weight');
    const previewDetail = document.getElementById('calc-preview-detail');
    const addBtn = document.getElementById('calc-add-btn');
    if (!previewWeight || !previewDetail) return;

    const select = document.getElementById('calc-lift-select');
    if (!select) return;
    const exercise = select.value;
    const oneRM = state.cache.activeRecords[exercise] || 0;

    if (!exercise || oneRM <= 0) {
        previewWeight.textContent = '—';
        previewDetail.textContent = 'Select a lift with 1RM data to see recommended weight.';
        if (addBtn) addBtn.disabled = true;
        return;
    }

    let weight;
    let detail;

    if (currentCalcMode === 'pct') {
        const pctInput = document.getElementById('calc-pct-input');
        const pct = parseFloat(pctInput?.value);
        if (isNaN(pct) || pct <= 0) {
            previewWeight.textContent = '—';
            previewDetail.textContent = 'Enter a percentage to calculate working weight.';
            if (addBtn) addBtn.disabled = true;
            return;
        }
        weight = oneRM * pct / PERCENT_DIVISOR;
        detail = `${pct}% of ${Math.round(oneRM)} kg`;
    } else {
        const repsInput = document.getElementById('calc-rpe-reps');
        const rpeSelect = document.getElementById('calc-rpe-select');
        const reps = parseInt(repsInput?.value, 10);
        const rpe = parseFloat(rpeSelect?.value);

        if (!reps || reps < 1 || isNaN(rpe) || rpe < 1 || rpe > 10) {
            previewWeight.textContent = '—';
            previewDetail.textContent = 'Enter reps and RPE (1–10) to calculate working weight.';
            if (addBtn) addBtn.disabled = true;
            return;
        }

        const rir = rpeToRir(rpe);
        const totalRepsPossible = reps + rir;
        weight = estimateWeightForReps(oneRM, totalRepsPossible);
        detail = `${reps} reps @ RPE ${rpe}  ·  ${rir} RIR  ·  Based on est. 1RM: ${Math.round(oneRM)} kg`;
    }

    previewWeight.textContent = weight > 0 ? `${weight.toFixed(1)} kg` : '—';
    previewDetail.textContent = detail;
    if (addBtn) addBtn.disabled = weight <= 0;
}

function handleCalcAdd() {
    const select = document.getElementById('calc-lift-select');
    if (!select) return;
    const exercise = select.value;
    const oneRM = state.cache.activeRecords[exercise] || 0;
    if (!exercise || oneRM <= 0) return;

    if (!state.data.calcEntriesByLift[exercise]) {
        state.data.calcEntriesByLift[exercise] = [];
    }

    if (currentCalcMode === 'pct') {
        const pctInput = document.getElementById('calc-pct-input');
        const pct = parseFloat(pctInput?.value);
        if (isNaN(pct) || pct <= 0) return;
        state.data.calcEntriesByLift[exercise].push({ type: 'pct', pct });
        pctInput.value = '';
    } else {
        const repsInput = document.getElementById('calc-rpe-reps');
        const rpeSelect = document.getElementById('calc-rpe-select');
        const reps = parseInt(repsInput?.value, 10);
        const rpe = parseFloat(rpeSelect?.value);
        if (!reps || reps < 1 || isNaN(rpe)) return;
        state.data.calcEntriesByLift[exercise].push({ type: 'rpe', reps, rpe });
        repsInput.value = '';
        rpeSelect.value = '';
    }

    renderCalcEntries();
    updateCalcPreview();
    haptic(HAPTIC.confirm);
}

function handleCalcRemove(btnEl) {
    if (!btnEl) return;
    const exercise = btnEl.dataset.exercise;
    const idx = parseInt(btnEl.dataset.index, 10);
    if (!state.data.calcEntriesByLift[exercise] || isNaN(idx) || idx < 0 || idx >= state.data.calcEntriesByLift[exercise].length) return;
    state.data.calcEntriesByLift[exercise].splice(idx, 1);
    renderCalcEntries();
}

function handleCalcClear() {
    state.data.calcEntriesByLift = {};
    renderCalcEntries();
}

function updateLogSetButtonState() {
  const btn = document.getElementById('log-set-btn');
  const exercise = document.getElementById('exercise')?.value;
  if (!btn) return;

  if (!exercise) {
    btn.disabled = true;
    btn.className = 'btn-core is-ghost btn-size-input';
    return;
  }

  const schemaKey = getSchemaKey(exercise);
  const sets = parseInt(document.getElementById('log-set-sets')?.value, 10);
  const reps = parseInt(document.getElementById('log-set-reps')?.value, 10);

  let valid = sets > 0 && reps > 0;

  if (schemaKey === 'standard') {
    const weight = parseFloat(document.getElementById('log-set-weight')?.value);
    valid = valid && weight > 0;
  }

  if (valid) {
    btn.disabled = false;
    btn.className = 'btn-core is-primary btn-size-input';
  } else {
    btn.disabled = true;
    btn.className = 'btn-core is-ghost btn-size-input';
  }
}

function refreshLogSetForm() {
  const exercise = document.getElementById('exercise')?.value;
  if (!exercise) { renderFormFields('log-set-fields', FORM_SCHEMAS.logSet.standard); updateLogSetButtonState(); return; }
  const schemaKey = getSchemaKey(exercise);
  const schema = FORM_SCHEMAS.logSet[schemaKey];
  if (!schema) return;

  const result = renderFormFields('log-set-fields', schema, {
    initialValues: { 'log-set-bodyweight': state.user.userBiometrics.bodyweight || 0 },
    onFieldChange: (values) => {
      const total = document.getElementById('log-set-total-load');
      if (total) total.textContent = computeTotalLoad(values, exercise, 'log-set');
      updateLogSetButtonState();
    }
  });

  if (result && result.fields['log-set-bodyweight']) {
    result.fields['log-set-bodyweight'].value = state.user.userBiometrics.bodyweight || '';
  }
  if (result && result.fields['log-set-total-load']) {
    const initValues = { ...result.fieldValues, 'log-set-bodyweight': state.user.userBiometrics.bodyweight || 0 };
    result.fields['log-set-total-load'].textContent = computeTotalLoad(initValues, exercise, 'log-set');
  }

  const disclaimer = document.getElementById('lf-disclaimer');
  if (disclaimer) {
    const lf = LOAD_FACTORS[exercise];
    disclaimer.classList.toggle('hidden', lf === undefined);
  }

  updateLogSetButtonState();
}

function populateLiftSelectors() {
    const groups = ['barbell', 'dumbbell', 'kettlebell'];
    const html = buildExerciseOptionsHtml(groups, '<option value="" disabled selected>Select lift...</option>');
    const calcSelect = document.getElementById('calc-lift-select');
    if (calcSelect) calcSelect.innerHTML = html;
}

function populateExerciseDropdown() {
  const groups = ['barbell', 'dumbbell', 'kettlebell', 'cardio', 'bodyweight'];
  const html = buildExerciseOptionsHtml(groups, '<option value="" disabled selected>Select exercise...</option>');

  const select = document.getElementById('exercise');
  if (select) {
    const currentVal = select.value;
    select.innerHTML = html;
    if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
      select.value = currentVal;
    }
  }

  // Populate PB Log dropdown
  if (pbLogExercise) {
    pbLogExercise.innerHTML = buildExerciseOptionsHtml(groups, '<option value="" disabled selected>Select exercise...</option>');
  }
}

function populateWorkoutFilter(exercises) {
  if (!workoutFilter) return;
  const prev = workoutFilter.value || 'All';
  const unique = Array.from(new Set(exercises)).filter(Boolean).sort();
  let html = `<option value="All">All Exercises</option>`;
  unique.forEach(ex => {
    html += `<option value="${ex}">${ex}</option>`;
  });
  workoutFilter.innerHTML = html;
  // restore previous selection if still valid
  if (prev && Array.from(workoutFilter.options).some(o => o.value === prev)) {
    workoutFilter.value = prev;
  } else {
    workoutFilter.value = 'All';
  }
}

function changePage(direction) {
  changeGenericPage('workouts', state.data.paginatedWorkouts, entriesPerPage, () => renderLogs(state.data.lastWorkouts), direction);
}

function changeRecordsPage(direction) {
  const manualWorkouts = state.data.lastWorkouts.filter(w => w.source !== 'structured');
  const uniqueExercises = Array.from(new Set(manualWorkouts.map(w => w.exercise))).filter(Boolean).sort();
  changeGenericPage('records', uniqueExercises, RECORDS_PER_PAGE, update1RMRegistryUI, direction);
}


export { update1RMRegistryUI, updateCalcCard, switchCalcMode, updateCalcPreview, handleCalcAdd, handleCalcRemove, handleCalcClear, updateLogSetButtonState, refreshLogSetForm, populateLiftSelectors, populateExerciseDropdown, populateWorkoutFilter, changePage, changeRecordsPage, currentCalcMode };
