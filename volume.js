import { state, entriesPerPage, paginationControls, workoutFilter } from './state.js';
import { getEffectiveLoad, estimate1RM } from './math.js';
import { escapeHtml } from './dom.js';
import { EXERCISE_CATALOG } from './exercise-data.js';
import { toLocalDateKey } from './date.js';
import { workoutToLogHtml, renderVolumeBar } from './rendering.js';
import { updatePagination, updatePaginationControls, updateTodayBtnState, showFeedback, renderMessage, renderEmptyState } from './ui.js';

// ==========================================
// END WORKOUT PLAN SYSTEM
// ==========================================

function renderLogs(workouts) {
    const logContainer = document.getElementById('workout-list');
    if (!logContainer) return;

    if (!workouts.length) {
        renderMessage(logContainer, 'No workout logs yet. Add a set to start tracking your training history.', 'slate', 'sm');
        if (paginationControls) paginationControls.classList.add('hidden');
        return;
    }

    state.data.paginatedWorkouts = workouts;
    const selected = workoutFilter ? workoutFilter.value : 'All';

    state.data.paginatedWorkouts.forEach(workout => {
        if (workout.source === 'structured' || workout.source === 'onboarding' || workout.source === 'pb-log') return;
        const load = getEffectiveLoad(workout);
        workout._isPB = load >= (state.cache.cachedMaxLoadByExercise[workout.exercise] || 0) && load > 0;
        const reps = parseInt(workout.reps, 10) || 1;
        const oneRM = Math.round(estimate1RM(load, reps));
        workout._isMax1RM = oneRM >= (state.cache.cachedMax1RMByExercise[workout.exercise] || 0) && oneRM > 0;
    });

    let displayList = (selected === 'All') ? state.data.paginatedWorkouts : state.data.paginatedWorkouts.filter(w => w.exercise === selected);

    const chipPBActive = document.getElementById('chip-pb')?.dataset?.active === 'true';
    const chip1RMActive = document.getElementById('chip-1rm')?.dataset?.active === 'true';
    if (chipPBActive || chip1RMActive) {
      displayList = displayList.filter(w => (chipPBActive && w._isPB) || (chip1RMActive && w._isMax1RM));
    }

    try { window.__lastRenderInfo = { chipPBActive, chip1RMActive, displayListLength: displayList.length, totalWorkouts: state.data.paginatedWorkouts.length }; } catch (e) {}

    const totalPages = Math.max(1, Math.ceil(displayList.length / entriesPerPage));
    state.pagination.workouts = Math.min(state.pagination.workouts, totalPages);
    let startIndex = (state.pagination.workouts - 1) * entriesPerPage;
    let pageItems = displayList.slice(startIndex, startIndex + entriesPerPage);

    if (!pageItems.length && displayList.length) {
      state.pagination.workouts = 1;
      startIndex = 0;
      pageItems = displayList.slice(0, entriesPerPage);
    }

    updatePaginationControls(totalPages);

    logContainer.innerHTML = pageItems.map(workout =>
      workoutToLogHtml(workout, chipPBActive, chip1RMActive)
    ).join('');
}

// ==========================================
// VOLUME HISTORY (Issue #38)
// ==========================================

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(date) {
  const d = getWeekStart(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function computeDailyBuckets(workouts, now, filterExercise) {
  const buckets = {};
  const ref = new Date(now);
  ref.setDate(ref.getDate() + state.volume.offset * 7);
  const weekStart = getWeekStart(ref);
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = toLocalDateKey(d);
    const periodStart = new Date(d);
    const periodEnd = new Date(d);
    periodEnd.setHours(23, 59, 59, 999);
    const periodEndMs = periodEnd.getTime();
    buckets[key] = { label: periodEndMs < state.user.userSignupTs ? '' : d.toLocaleDateString('en-US', { weekday: 'short' }), volume: 0, periodStart: periodStart.getTime(), periodEnd: periodEndMs };
  }
  const weekEnd = getWeekEnd(ref);
  workouts.forEach(w => {
    const d = new Date(w.timestamp);
    if (isNaN(d.getTime())) return;
    if (d < weekStart || d > weekEnd) return;
    if (filterExercise !== 'All' && w.exercise !== filterExercise) return;
    const volume = parseFloat(w.totalVolume) || 0;
    if (volume <= 0) return;
    const key = toLocalDateKey(d);
    if (buckets[key] !== undefined) buckets[key].volume += volume;
  });
  return Object.values(buckets);
}

function computeWeeklyBuckets(workouts, now, filterExercise) {
  const buckets = {};
  const monthRef = new Date(now.getFullYear(), now.getMonth() + state.volume.offset, 1);
  const monthEnd = new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 0, 23, 59, 59, 999);
  const firstWeekStart = getWeekStart(monthRef);
  const lastWeekStart = getWeekStart(monthEnd);
  let cursor = new Date(firstWeekStart);
  while (cursor <= lastWeekStart) {
    const weekEnd = getWeekEnd(cursor);
    const key = toLocalDateKey(cursor);
    const weekEndMs = weekEnd.getTime();
    const label = weekEndMs < state.user.userSignupTs ? '' : cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    buckets[key] = { label, volume: 0, weekStart: new Date(cursor), weekEnd: new Date(weekEnd), periodStart: cursor.getTime(), periodEnd: weekEndMs };
    cursor.setDate(cursor.getDate() + 7);
  }
  workouts.forEach(w => {
    const d = new Date(w.timestamp);
    if (isNaN(d.getTime()) || d < monthRef || d > monthEnd) return;
    if (filterExercise !== 'All' && w.exercise !== filterExercise) return;
    const volume = parseFloat(w.totalVolume) || 0;
    if (volume <= 0) return;
    for (const key in buckets) {
      if (d >= buckets[key].weekStart && d <= buckets[key].weekEnd) {
        buckets[key].volume += volume;
        break;
      }
    }
  });
  return Object.values(buckets);
}

function computeMonthlyBuckets(workouts, now, filterExercise) {
  const buckets = {};
  const year = now.getFullYear() + state.volume.offset;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let i = 0; i < 12; i++) {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    const monthEnd = new Date(year, i + 1, 0, 23, 59, 59, 999);
    const monthStart = new Date(year, i, 1);
    const monthEndMs = monthEnd.getTime();
    buckets[key] = { label: monthEndMs < state.user.userSignupTs ? '' : monthNames[i], volume: 0, periodStart: monthStart.getTime(), periodEnd: monthEndMs };
  }
  workouts.forEach(w => {
    const d = new Date(w.timestamp);
    if (isNaN(d.getTime()) || d.getFullYear() !== year) return;
    if (filterExercise !== 'All' && w.exercise !== filterExercise) return;
    const volume = parseFloat(w.totalVolume) || 0;
    if (volume <= 0) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (buckets[key] !== undefined) buckets[key].volume += volume;
  });
  return Object.values(buckets);
}

function computeYearlyBuckets(workouts, now, filterExercise) {
  const buckets = {};
  const baseYear = now.getFullYear() + state.volume.offset * 5;
  const startYear = baseYear - 4;
  for (let i = 0; i < 5; i++) {
    const yr = startYear + i;
    const key = String(yr);
    const yearEnd = new Date(yr + 1, 0, 0, 23, 59, 59, 999);
    const yearStart = new Date(yr, 0, 1);
    const yearEndMs = yearEnd.getTime();
    buckets[key] = { label: yearEndMs < state.user.userSignupTs ? '' : String(yr), volume: 0, periodStart: yearStart.getTime(), periodEnd: yearEndMs };
  }
  workouts.forEach(w => {
    const d = new Date(w.timestamp);
    if (isNaN(d.getTime())) return;
    if (d.getFullYear() < startYear || d.getFullYear() > baseYear) return;
    if (filterExercise !== 'All' && w.exercise !== filterExercise) return;
    const volume = parseFloat(w.totalVolume) || 0;
    if (volume <= 0) return;
    const key = String(d.getFullYear());
    if (buckets[key] !== undefined) buckets[key].volume += volume;
  });
  return Object.values(buckets);
}

function computeVolumeHistory(workouts, period, filterExercise) {
  const now = new Date();
  switch (period) {
    case 'daily': return computeDailyBuckets(workouts, now, filterExercise);
    case 'weekly': return computeWeeklyBuckets(workouts, now, filterExercise);
    case 'monthly': return computeMonthlyBuckets(workouts, now, filterExercise);
    default: return computeYearlyBuckets(workouts, now, filterExercise);
  }
}

function formatRangeLabel(period, offset) {
  const now = new Date();
  if (period === 'daily') {
    const ref = new Date(now);
    ref.setDate(ref.getDate() + offset * 7);
    const start = getWeekStart(ref);
    const end = getWeekEnd(ref);
    const opts = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`;
  }
  if (period === 'weekly') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (period === 'monthly') {
    return String(now.getFullYear() + offset);
  }
  const baseYear = now.getFullYear() + offset * 5;
  return `${baseYear - 4} - ${baseYear}`;
}

function renderVolumeHistory() {
  const inner = document.getElementById('vh-bars-inner');
  const totalEl = document.getElementById('vh-total');
  const rangeLabel = document.getElementById('vh-range-label');
  if (!inner) return;

  if (!state.data.lastWorkouts || state.data.lastWorkouts.length === 0) {
    renderEmptyState(inner, 'Log some workouts to see your volume history.', 'py-8 w-full');
    if (totalEl) totalEl.textContent = '';
    if (rangeLabel) rangeLabel.textContent = '';
    updateTodayBtnState();
    return;
  }

  if (rangeLabel) {
    rangeLabel.textContent = formatRangeLabel(state.volume.period, state.volume.offset);
  }

  const buckets = computeVolumeHistory(state.data.lastWorkouts, state.volume.period, state.volume.filter);

  const maxVolume = Math.max(...buckets.map(b => b.volume), 1);
  const totalVolume = buckets.reduce((sum, b) => sum + b.volume, 0);

  if (totalEl) {
    totalEl.textContent = `Total Volume: ${Math.round(totalVolume).toLocaleString()} kg`;
  }

  const avgEl = document.getElementById('vh-avg');
  const activeCount = buckets.filter(b => b.volume > 0).length;
  const avgVolume = activeCount >= 2 ? totalVolume / activeCount : 0;
  if (avgEl) {
    avgEl.textContent = avgVolume > 0 ? `Average Training Day Vol: ${Math.round(avgVolume).toLocaleString()} kg` : '';
  }

  const chartHeight = 104;
  const avgHeight = maxVolume > 0 ? (avgVolume / maxVolume) * chartHeight : 0;

  let barsHtml = buckets.map(b => renderVolumeBar(b, maxVolume, chartHeight)).join('');

  let avgLineHtml = '';
  if (avgVolume > 0 && avgHeight > 0) {
    avgLineHtml = `<div class="vh-avg-line" style="bottom: ${avgHeight}px"></div>`;
  }

  inner.innerHTML = barsHtml + avgLineHtml;
  updateTodayBtnState();
}

function switchVolumePeriod(period) {
  state.volume.period = period;
  state.volume.offset = 0;

  ['daily', 'weekly', 'monthly', 'yearly'].forEach(p => {
    const btn = document.getElementById(`vh-period-${p}`);
    if (btn) {
      btn.className = p === period ? 'btn-core is-primary btn-size-row' : 'btn-core is-ghost btn-size-row';
    }
  });

  renderVolumeHistory();
}

function shiftVolumePeriod(delta) {
  const inner = document.getElementById('vh-bars-inner');
  if (!inner) {
    state.volume.offset += delta;
    renderVolumeHistory();
    return;
  }
  const outClass = delta > 0 ? 'slide-out-left' : 'slide-out-right';
  const inClass = delta > 0 ? 'slide-in-left' : 'slide-in-right';
  inner.classList.add(outClass);
  inner.addEventListener('animationend', function handlerOut() {
    inner.removeEventListener('animationend', handlerOut);
    inner.classList.remove(outClass);
    state.volume.offset += delta;
    renderVolumeHistory();
    inner.classList.add(inClass);
    inner.addEventListener('animationend', function handlerIn() {
      inner.removeEventListener('animationend', handlerIn);
      inner.classList.remove(inClass);
    }, { once: true });
  }, { once: true });
}

function goToCurrentPeriod() {
  state.volume.offset = 0;
  renderVolumeHistory();
}

function populateVolumeFilter(exercises) {
  const select = document.getElementById('vh-filter');
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="All">All Exercises</option>';
  exercises.sort().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
  if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
    select.value = currentVal;
    state.volume.filter = currentVal;
  } else {
    select.value = 'All';
    state.volume.filter = 'All';
  }
}

function onVolumeFilterChange() {
  const select = document.getElementById('vh-filter');
  state.volume.filter = select ? select.value : 'All';
  renderVolumeHistory();
}


export { renderLogs, getWeekStart, getWeekEnd, computeDailyBuckets, computeWeeklyBuckets, computeMonthlyBuckets, computeYearlyBuckets, computeVolumeHistory, formatRangeLabel, renderVolumeHistory, switchVolumePeriod, shiftVolumePeriod, goToCurrentPeriod, populateVolumeFilter, onVolumeFilterChange };
