import { state, paginationControls, currentPageDisplay, totalPagesDisplay, prevPageBtn, nextPageBtn, profileModal, tabContents, navTabs } from './state.js';
import { escapeHtml } from './dom.js';
import { EXERCISE_CATALOG } from './exercise-data.js';

const NOTIFICATION_COLORS = {
  emerald: 'text-emerald-400',
  red: 'text-red-400',
  yellow: 'text-yellow-400',
  slate: 'text-slate-400'
};

const BTN_ACTIVE_CLASS = 'btn-core is-primary btn-size-row';
const BTN_INACTIVE_CLASS = 'btn-core is-ghost btn-size-row';

function setActiveTab(btn) { btn.className = BTN_ACTIVE_CLASS; }
function setInactiveTab(btn) { btn.className = BTN_INACTIVE_CLASS; }

function clearChildren(el) {
  if (el) el.textContent = '';
}

function renderEmptyState(container, message, extraClass = '') {
  if (!container) return;
  container.innerHTML = `<p class="text-xs text-slate-500 italic py-2 text-center${extraClass ? ' ' + extraClass : ''}">${escapeHtml(message)}</p>`;
}

function renderMessage(container, message, color = 'red', size = 'xs') {
  if (!container) return;
  container.innerHTML = `<div class="bg-slate-800 border border-slate-700 rounded-xl p-4 text-${color}-${size} text-center">${escapeHtml(message)}</div>`;
}

function updatePagination(name, page, totalPages) {
  const pagination = document.getElementById(`${name}-pagination`);
  if (!pagination) return;
  const currentEl = document.getElementById(`current-${name}-page`);
  const totalEl = document.getElementById(`total-${name}-pages`);
  const prevBtn = document.getElementById(`prev-${name}-page-btn`);
  const nextBtn = document.getElementById(`next-${name}-page-btn`);
  if (currentEl) currentEl.textContent = page;
  if (totalEl) totalEl.textContent = totalPages;
  if (prevBtn) prevBtn.disabled = page <= 1;
  if (nextBtn) nextBtn.disabled = page >= totalPages;
  pagination.classList.toggle('hidden', totalPages <= 1);
}

function updatePaginationControls(totalPages) {
    if (!paginationControls || !currentPageDisplay || !totalPagesDisplay || !prevPageBtn || !nextPageBtn) return;
    const isVisible = totalPages > 1;
    paginationControls.classList.toggle('hidden', !isVisible);
    currentPageDisplay.innerText = state.pagination.workouts;
    totalPagesDisplay.innerText = totalPages;
    prevPageBtn.disabled = state.pagination.workouts <= 1;
    nextPageBtn.disabled = state.pagination.workouts >= totalPages;
}

function updatePillActive(pill, mode) {
  pill.querySelectorAll('.wms-pill-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.mode === mode);
  });
}

function setChallengeCard(idPrefix, current, target, pct, completed) {
    const progressEl = document.getElementById(`${idPrefix}-progress`);
    const barEl = document.getElementById(`${idPrefix}-bar`);
    const cardEl = document.getElementById(idPrefix);
    if (!progressEl || !barEl) return;
    progressEl.textContent = completed ? `${current} / ${target} \u{1F3C6}` : `${current} / ${target}`;
    barEl.style.width = `${pct}%`;
    barEl.setAttribute('aria-valuenow', Math.round(pct));
}

function updateCalTodayBtnState() {
    const btn = document.getElementById('cal-today');
    if (!btn) return;
    const now = new Date();
    let isCurrent;
    if (state.calendar.compact) {
        isCurrent = state.calendar.weekOffset === 0;
    } else {
        isCurrent = state.calendar.month.getFullYear() === now.getFullYear() && state.calendar.month.getMonth() === now.getMonth();
    }
    if (isCurrent) {
        btn.className = 'btn-core is-ghost btn-size-row';
        btn.disabled = true;
    } else {
        btn.className = 'btn-core is-primary-ghost btn-size-row';
        btn.disabled = false;
    }
}

function updateTodayBtnState() {
  const btn = document.getElementById('vh-today');
  if (!btn) return;
  if (state.volume.offset === 0) {
    btn.className = 'btn-core is-ghost btn-size-row';
    btn.disabled = true;
  } else {
    btn.className = 'btn-core is-primary-ghost btn-size-row';
    btn.disabled = false;
  }
}

function toggleWorkoutCard(headerEl) {
    const card = headerEl.closest('.structured-card');
    const movements = card.querySelector('.structured-movements');
    const showMore = card.querySelector('.show-more-text');
    if (!movements || !showMore) return;
    movements.classList.toggle('hidden');
    showMore.textContent = movements.classList.contains('hidden') ? 'Show more' : 'Show less';
}

function updateStarIcon(id, isFav) {
  const btn = document.querySelector(`[data-fav-id="${id}"]`);
  if (!btn) return;
  btn.textContent = isFav ? '\u2605' : '\u2606';
  btn.className = `${isFav ? 'text-amber-400' : 'text-slate-500'} hover:scale-110 transition-transform btn-fav-star`;
}

function toggleSelectAllFriends() {
  const selectAll = document.getElementById('share-select-all');
  const checked = selectAll?.checked ?? false;
  document.querySelectorAll('.share-friend-checkbox').forEach(cb => { cb.checked = checked; });
}

function buildExerciseOptionsHtml(categories, placeholder) {
  const labels = { barbell: 'Barbell', dumbbell: 'Dumbbell', kettlebell: 'Kettlebell', cardio: 'Cardio', bodyweight: 'Bodyweight' };
  const sortByName = (a, b) => a.name.localeCompare(b.name);
  let html = placeholder;
  categories.forEach(cat => {
    const items = EXERCISE_CATALOG.filter(ex => ex.category === cat).sort(sortByName);
    if (items.length) {
      html += `<optgroup label="─ ${labels[cat]} ─">`;
      items.forEach(ex => { if (ex.hidden) return; html += `<option value="${ex.name}">${ex.name}</option>`; });
      html += `</optgroup>`;
    }
  });
  return html;
}

function saveExpandedCardIds() {
  const ids = [];
  document.querySelectorAll('.structured-card').forEach(card => {
    const id = card.getAttribute('data-workout-id');
    if (!id) return;
    const movements = card.querySelector('.structured-movements');
    if (movements && !movements.classList.contains('hidden')) {
      ids.push(id);
    }
  });
  return ids;
}

function restoreExpandedCardIds(ids) {
  if (!ids || !ids.length) return;
  ids.forEach(id => {
    const card = document.querySelector(`[data-workout-id="${id}"]`);
    if (!card) return;
    const movements = card.querySelector('.structured-movements');
    const showMore = card.querySelector('.show-more-text');
    if (movements) movements.classList.remove('hidden');
    if (showMore) showMore.textContent = 'Show less';
  });
}

function showFeedback(msg, color, targetId = 'socialFeedback', delay = 2000, extraClass = '') {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerText = msg;
  el.className = `${extraClass} text-xs font-medium transition-all duration-500 opacity-100 ${NOTIFICATION_COLORS[color] || 'text-slate-400'}`;
  if (delay) {
    if (el.dataset.timeoutId) {
      clearTimeout(Number(el.dataset.timeoutId));
    }
    const timeoutId = setTimeout(() => {
      el.classList.replace('opacity-100', 'opacity-0');
      setTimeout(() => {
        el.innerText = '\u00A0';
      }, 500);
    }, delay);
    el.dataset.timeoutId = timeoutId.toString();
  }
}

function showToast(msg, color) {
  showFeedback(msg, color, 'toast-notification-inner', 3000, 'px-4 py-2 rounded-lg bg-slate-800/90 backdrop-blur-sm border border-slate-700 shadow-xl');
}

function openProfileModal() {
  profileModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeProfileModal() {
  profileModal.classList.add('hidden');
  document.body.style.overflow = '';
}

let planNameResolve = null;

function showPlanNameModal(defaultName) {
  return new Promise((resolve) => {
    planNameResolve = resolve;
    const modal = document.getElementById('plan-name-modal');
    const input = document.getElementById('plan-name-input');
    const feedback = document.getElementById('plan-name-feedback');
    const saveBtn = document.getElementById('plan-name-save');
    const cancelBtn = document.getElementById('plan-name-cancel');
    if (!modal || !input) { resolve(null); return; }
    input.value = defaultName || '';
    feedback.textContent = '';
    modal.classList.remove('hidden');
    setTimeout(() => input.focus(), 100);
    function cleanup() {
      modal.classList.add('hidden');
      saveBtn.removeEventListener('click', onSave);
      cancelBtn.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onKey);
    }
    function onSave() {
      const val = input.value.trim();
      if (!val) {
        feedback.textContent = 'Enter a plan name.';
        feedback.className = 'text-xs text-rose-400 font-medium text-center h-4';
        input.focus();
        return;
      }
      cleanup();
      planNameResolve(val);
      planNameResolve = null;
    }
    function onCancel() {
      cleanup();
      planNameResolve(null);
      planNameResolve = null;
    }
    function onKey(e) {
      if (e.key === 'Enter') onSave();
      if (e.key === 'Escape') onCancel();
    }
    saveBtn.addEventListener('click', onSave);
    cancelBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown', onKey);
  });
}

function enableSwipe(container, { onSwipeLeft, onSwipeRight, threshold = 50 }) {
  if (!container) return;
  let startX = 0, startY = 0, startTime = 0;
  container.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
  }, { passive: true });
  container.addEventListener('touchmove', function(e) {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      e.preventDefault();
    }
  }, { passive: false });
  container.addEventListener('touchend', function(e) {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    const elapsed = Date.now() - startTime;
    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5 && elapsed < 500) {
      if (dx < 0) onSwipeLeft?.(); else onSwipeRight?.();
    }
  }, { passive: true });
}

function paginateAndRender({ stateKey, list, perPage = 3, containerId, renderItems, emptyMessage }) {
  const container = document.getElementById(containerId);
  const pagination = document.getElementById(`${stateKey}-pagination`);
  if (!container) return;

  const expandedIds = saveExpandedCardIds();

  if (!list.length) {
    renderEmptyState(container, emptyMessage);
    if (pagination) pagination.classList.add('hidden');
    restoreExpandedCardIds(expandedIds);
    return;
  }

  const totalPages = Math.max(1, Math.ceil(list.length / perPage));
  state.pagination[stateKey] = Math.min(state.pagination[stateKey], totalPages);
  const start = (state.pagination[stateKey] - 1) * perPage;
  const pageItems = list.slice(start, start + perPage);

  container.innerHTML = renderItems(pageItems);
  restoreExpandedCardIds(expandedIds);
  if (typeof lucide !== 'undefined') lucide.createIcons();

  updatePagination(stateKey, state.pagination[stateKey], totalPages);
}

function changeGenericPage(paginationKey, list, perPage, renderFn, direction) {
  const totalPages = Math.max(1, Math.ceil(list.length / perPage));
  const page = state.pagination[paginationKey];
  if (direction === 'prev' && page > 1) {
    state.pagination[paginationKey] = page - 1;
  } else if (direction === 'next' && page < totalPages) {
    state.pagination[paginationKey] = page + 1;
  }
  renderFn();
}

function switchTab(tabName) {
  if (tabName === 'profile') {
    openProfileModal();
    return;
  }
  tabContents.forEach(el => el.classList.remove('active'));
  const target = document.getElementById('tab-' + tabName);
  if (target) target.classList.add('active');
  navTabs.forEach(el => el.classList.remove('active'));
  const btn = document.querySelector('.nav-tab[data-tab="' + tabName + '"]');
  if (btn) btn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  state.ui.currentTab = tabName;
}

export { clearChildren, renderEmptyState, renderMessage, updatePagination, updatePaginationControls, updatePillActive, setChallengeCard, updateCalTodayBtnState, updateTodayBtnState, toggleWorkoutCard, updateStarIcon, toggleSelectAllFriends, buildExerciseOptionsHtml, saveExpandedCardIds, restoreExpandedCardIds, showFeedback, showToast, openProfileModal, closeProfileModal, showPlanNameModal, enableSwipe, paginateAndRender, changeGenericPage, switchTab, BTN_ACTIVE_CLASS, BTN_INACTIVE_CLASS, setActiveTab, setInactiveTab };
