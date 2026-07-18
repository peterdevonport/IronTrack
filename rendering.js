import { state, INPUT_CLASS, CALC_CLASS, onboardingList } from './state.js';
import { escapeHtml } from './dom.js';
import { estimate1RM, estimateWeightForReps, getEffectiveLoad, rpeToRir } from './math.js';
import { formatMovementLoad, formatCardDate, formatWorkoutType, formatDotsScore, formatMovementDisplay } from './formatting.js';
import { getDisplayName, EXERCISE_CATALOG } from './exercise-data.js';
import { buildWorkoutSummaryLine } from './analytics.js';
import { renderEmptyState } from './ui.js';

function renderOnboarding1RMItem(item, index) {
  const repLabel = item.reps > 1 ? ` @ ${item.reps} reps` : '';
  return `
            <div class="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2">
                <span class="text-sm text-slate-200 font-medium">${escapeHtml(item.exercise)}</span>
                <span class="text-sm text-emerald-400 font-mono font-bold">${item.weight} kg${repLabel}</span>
                <button type="button" class="text-rose-400 hover:text-rose-300 text-xs font-bold cursor-pointer bg-transparent border-none" data-index="${index}"><i data-lucide="circle-minus" size="18"></i></button>
            </div>`;
}

function renderOnboarding1RMList(pendingItems) {
    if (!onboardingList) return;
    if (pendingItems.length === 0) {
        renderEmptyState(onboardingList, 'No lifts added yet.');
        return;
    }
    let html = '';
    pendingItems.forEach((item, index) => {
        html += renderOnboarding1RMItem(item, index);
    });
    onboardingList.innerHTML = html;
    onboardingList.querySelectorAll('[data-index]').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index, 10);
            pendingItems.splice(idx, 1);
            renderOnboarding1RMList(pendingItems);
        });
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderCalcEntry(source, weight, exercise, idx) {
  return `
        <div class="flex justify-between items-center py-1.5 px-1 rounded-lg hover:bg-slate-800/40">
            <span class="text-slate-200 font-mono text-sm">${escapeHtml(source)}</span>
            <div class="flex items-center gap-2">
                <span class="text-slate-200 font-mono text-sm">${weight} kg</span>
                <button data-action="calc-remove" data-exercise="${escapeHtml(exercise)}" data-index="${idx}" class="text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"><i data-lucide="circle-minus" size="18"></i></button>
            </div>
        </div>`;
}

function renderCalcEntries() {
    const entriesList = document.getElementById('calc-entries-list');
    if (!entriesList) return;
    const allEntries = [];
    for (const [exercise, entries] of Object.entries(state.data.calcEntriesByLift)) {
        entries.forEach((entry, idx) => {
            allEntries.push({ ...entry, exercise, idx });
        });
    }
    if (allEntries.length === 0) {
        renderEmptyState(entriesList, 'Enter values above and click Add to save working weights.');
        return;
    }
    let html = '';
    allEntries.forEach(entry => {
        const oneRM = state.cache.activeRecords[entry.exercise] || 0;
        let source, weight;
        if (entry.type === 'pct') {
            weight = Math.round(oneRM * entry.pct / 100);
            source = `${entry.exercise} ${entry.pct}%`;
        } else {
            const rir = rpeToRir(entry.rpe);
            weight = Math.round(estimateWeightForReps(oneRM, entry.reps + rir));
            source = `${entry.exercise} ${entry.reps} reps @ RPE ${entry.rpe}`;
        }
        html += renderCalcEntry(source, weight, entry.exercise, entry.idx);
    });
    entriesList.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderPlanMovementItem(source, index) {
  return `
    <div class="flex justify-between items-center py-1.5 px-1 rounded-lg hover:bg-slate-800/40">
      <span class="text-slate-200 font-mono text-sm truncate">${escapeHtml(source)}</span>
      <button type="button" data-action="remove-plan-movement" data-index="${index}" class="plan-movement-remove shrink-0 hover:!text-rose-400 transition-colors" title="Remove">
        <i data-lucide="trash-2" size="18"></i>
      </button>
    </div>`;
}

function renderPlanMovements() {
  const list = document.getElementById('plan-movements-list');
  if (!list) return;
  if (state.builder.workoutMovements.length === 0) {
    renderEmptyState(list, 'Add movements above.');
    const addBtn = document.getElementById('plan-add-btn');
    if (addBtn) addBtn.disabled = true;
    return;
  }
  let html = '';
  state.builder.workoutMovements.forEach((m, i) => {
    const oneRM = state.cache.activeRecords[m.exerciseId] || 0;
    html += renderPlanMovementItem(formatMovementDisplay(m, oneRM), i);
  });
  list.innerHTML = html;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderMovementChips(movements) {
  if (!movements) return '';
  return movements.map(m =>
    `<span class="movement-chip">${escapeHtml(m.exerciseId)} \u00D7 ${m.reps}${formatMovementLoad(m)}</span>`
  ).join('');
}

function renderEmomChips(minutes, labelFn) {
  if (!minutes) return '';
  return minutes.map((m, idx) => {
    const mov = m.movements?.[0];
    if (!mov) return '';
    const label = labelFn ? labelFn(m, idx) : '';
    return `<span class="movement-chip">${label}${escapeHtml(mov.exerciseId)} \u00D7 ${mov.reps}${formatMovementLoad(mov)}</span>`;
  }).join('');
}

function renderCalendarWorkoutItem(item) {
  if (item.type) {
    const badgeClass = (item.type || '').toLowerCase();
    const descLine = buildWorkoutSummaryLine(item.type, item.structure || {});
    return `
<div class="card p-2.5">
    <div class="flex justify-between items-center">
        <span class="workout-type-badge ${badgeClass}">${escapeHtml(formatWorkoutType(item.type))}</span>
        <span class="text-emerald-400 font-bold font-mono text-xs">${escapeHtml(item.scoreDisplay || '—')}</span>
    </div>
    ${descLine ? `<p class="text-[10px] text-slate-400 font-mono mt-1">${escapeHtml(descLine)}</p>` : ''}
</div>`;
  }
  const load = getEffectiveLoad(item);
  const reps = parseInt(item.reps, 10) || 1;
  const sets = item.sets || 1;
  const oneRM = Math.round(estimate1RM(load, reps));
  const repDisplay = item.partialReps ? `${sets} \u00D7 ${reps} + ${item.partialReps} reps` : `${sets} \u00D7 ${reps}`;
  let loadDisplay;
  if (item.weightMode === 'pct' && item.pct) {
    loadDisplay = `${item.pct}% 1RM (${Math.round(load)}kg)`;
  } else if (item.weightMode === 'rpe' && item.rpe) {
    loadDisplay = `RPE ${item.rpe} (${Math.round(load)}kg)`;
  } else {
    loadDisplay = `${Math.round(load)}kg`;
  }
  return `
<div class="card p-2.5">
    <div class="flex justify-between items-center">
        <span class="text-emerald-300 font-bold text-xs uppercase tracking-wider">${escapeHtml(item.exercise)}</span>
        <span class="text-slate-200 font-mono text-xs">${repDisplay} @ ${loadDisplay}</span>
    </div>
    <p class="text-slate-500 text-[10px] font-mono mt-0.5">Est. 1RM: ${oneRM}kg</p>
</div>`;
}

function renderVolumeBar(bucket, maxVolume, chartHeight) {
  const volStr = Math.round(bucket.volume).toLocaleString();
  const hasVol = bucket.volume > 0;
  const h = hasVol ? Math.max(4, (bucket.volume / maxVolume) * chartHeight) : 0;
  return `
      <div class="vh-bar-wrap">
        ${hasVol ? `<div class="vh-bar" style="height: ${h}px"><div class="vh-bar-tooltip">${volStr} kg</div></div>` : '<div class="vh-bar is-zero"></div>'}
        <span class="vh-bar-label">${bucket.label || ''}</span>
      </div>`;
}

function renderMinuteSlotInner(label, contentHtml) {
  return `
      <span class="minute-label text-xs text-slate-500 font-mono w-12 shrink-0">${label}</span>
      <span class="text-slate-200 font-mono text-sm flex-1">${contentHtml}</span>
      <button data-action="remove-minute-slot" class="text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shrink-0"><i data-lucide="circle-minus" size="18"></i></button>`;
}

function renderShareFriendItem(fUid, name) {
  return `
      <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 cursor-pointer">
        <input type="checkbox" class="share-friend-checkbox" value="${fUid}" />
        <span class="text-sm text-slate-200">${escapeHtml(name)}</span>
      </label>`;
}

function renderRegistryRow(exercise, isBodyweight, maxReps, max1RM, maxLoad) {
  if (isBodyweight) {
    return `
                <span class="text-slate-400 font-medium truncate">${escapeHtml(exercise)}</span>
                <span class="text-slate-200 font-mono text-right">—</span>
                <span class="text-slate-200 font-mono text-right">${maxReps} reps</span>`;
  }
  return `
                <span class="text-slate-400 font-medium truncate">${escapeHtml(exercise)}</span>
                <span class="text-slate-200 font-mono text-right">${Math.round(max1RM)} kg</span>
                <span class="text-slate-200 font-mono text-right">${Math.round(maxLoad)} kg</span>`;
}

function renderLeaderboardEmptyRow() {
  return `<tr><td colspan="4" class="py-4 text-center text-xs text-slate-500 italic">No network entries visible in this grid scope.</td></tr>`;
}

function buildCalendarDayHtml(dateStr, day, isActive, isToday, isSelected, isThisMonth = true) {
  if (!isThisMonth) {
    return `<div class="cal-day cal-day-other-month">${day}</div>`;
  }
  let cls = 'cal-day';
  if (isActive) cls += ' cal-day-active';
  if (isToday) cls += ' cal-day-today';
  if (isSelected) cls += ' cal-day-selected';
  return `<div class="${cls}" data-action="select-calendar-day" data-date="${dateStr}">${day}</div>`;
}

function getBorderClass({ chipPBActive, chip1RMActive, isPB, is1RMOnly }) {
  if (chipPBActive && !chip1RMActive) return 'log-entry-pb';
  if (chip1RMActive && !chipPBActive) return 'log-entry-1rm';
  if (isPB) return 'log-entry-pb';
  if (is1RMOnly) return 'log-entry-1rm';
  return 'log-entry';
}

function workoutToLogHtml(workout, chipPBActive, chip1RMActive) {
  const load = getEffectiveLoad(workout);
  const reps = parseInt(workout.reps, 10) || 1;
  const sets = workout.sets || 1;
  const isPB = !!workout._isPB;
  const isMax1RM = !!workout._isMax1RM;
  const is1RMOnly = isMax1RM && !isPB;
  const oneRM = Math.round(estimate1RM(load, reps));
  const totalWorkReps = workout.totalWorkReps || (reps * sets);
  const totalVolume = Math.round(load * totalWorkReps);
  const borderClass = getBorderClass({ chipPBActive, chip1RMActive, isPB, is1RMOnly });
  const secondLine = `Est. 1RM: ${oneRM}kg  <span class="text-slate-600">|</span>  Vol: ${totalVolume.toLocaleString()}kg`;
  const repDisplay = workout.partialReps ? `${sets} × ${reps} + ${workout.partialReps} reps` : `${sets} × ${reps}`;
  return `
<div class="card ${borderClass} p-4 rounded-2xl mb-3 flex justify-between items-center transition-all duration-200">
    <div>
        <div class="flex items-center gap-2">
            <h4 class="text-emerald-300 font-bold uppercase tracking-wider text-sm">${escapeHtml(workout.exercise)}</h4>
            ${isPB ? '<span class="badge-pb text-[9px] px-1.5 rounded font-black">PB</span>' : ''}
            ${isMax1RM ? '<span class="badge-1rm text-[9px] px-1.5 rounded font-extrabold">1RM</span>' : ''}
        </div>
        <p class="text-slate-400 text-xs font-mono mt-0.5">
            ${new Date(workout.timestamp).toLocaleDateString()}
        </p>
    </div>
    <div class="text-right">
        <span class="text-white font-mono text-base font-semibold">
            ${repDisplay} 
            <span class="text-slate-500 text-xs">@</span> 
            ${Math.round(load)}kg
        </span>
        <p class="text-slate-400 text-xs font-mono mt-0.5">
            ${secondLine}
        </p>
    </div>
</div>`;
}

function renderWorkoutCard(id, name, type, badgeClass, descLine, metadataHtml, movementsHtml, actionsHtml, isFavorite, favCallback) {
  const isFav = isFavorite === true;
  const starIcon = isFav ? '\u2605' : '\u2606';
  const favColorClass = isFav ? 'text-amber-400' : 'text-slate-500';
  const hasMovements = movementsHtml.trim().length > 0;
  return `<div class="card card-interactive p-4 rounded-2xl mb-3 transition-all duration-200" data-workout-id="${id}">
    <div class="flex justify-between items-stretch gap-3 ${hasMovements ? 'structured-header-clickable cursor-pointer' : ''}"${hasMovements ? ` data-action="toggle-workout-card"` : ''}>
      <div class="flex flex-col justify-start gap-1.5 min-w-0 flex-1">
        <h4 class="text-emerald-300 font-bold uppercase tracking-wider text-sm truncate">${escapeHtml(name)}</h4>
        ${metadataHtml}
        <span class="workout-type-badge self-start ${badgeClass}">${escapeHtml(formatWorkoutType(type))}</span>
        ${descLine ? `<span class="text-xs text-slate-400 font-mono mt-0.5">${escapeHtml(descLine)}</span>` : ''}
      </div>
      <div class="flex flex-col justify-between items-end shrink-0">
        <button type="button" data-action="${favCallback}" data-id="${id}" class="${favColorClass} hover:scale-110 transition-transform btn-fav-star" title="Favorite">
          ${starIcon}
        </button>
      </div>
    </div>
    <div class="flex flex-wrap gap-1.5 mt-3 structured-movements${hasMovements ? ' hidden' : ''}">
      ${movementsHtml}
      ${hasMovements ? `<div class="flex gap-2 mt-3 w-full">${actionsHtml}</div>` : ''}
    </div>
    ${hasMovements ? `
    <div class="flex justify-end mt-3">
      <span class="text-xs text-slate-500 font-medium hover:text-slate-300 transition-colors cursor-pointer show-more-text" data-action="toggle-workout-card">Show more</span>
    </div>` : ''}
</div>`;
}

function renderStructuredWorkoutCard(sw) {
  const type = sw.type || 'AMRAP';
  const badgeClass = type.toLowerCase();
  const descLine = buildWorkoutSummaryLine(type, sw.structure || {});
  const structure = sw.structure || {};
  let movementsHtml;
  if (type === 'EMOM') {
    const isByRound = structure.mode === 'by_round';
    movementsHtml = renderEmomChips(structure.minutes, (m, idx) => isByRound ? `Round ${idx + 1}: ` : '');
  } else {
    movementsHtml = renderMovementChips(structure.movements);
  }
  if (movementsHtml.trim().length > 0) {
    movementsHtml = `<div class="w-full text-sm text-slate-300 border-t border-slate-800/60 pt-2">${movementsHtml}</div>`;
  }
  const metadataHtml = [
    sw.isShared ? `<div class="flex items-center gap-1.5 text-xs text-slate-300"><i data-lucide="share-2" class="w-3.5 h-3.5 shrink-0"></i><span class="truncate">${escapeHtml(sw.username || 'Shared User')}</span></div>` : '',
    sw.timestamp ? `<div class="flex items-center gap-1.5 text-xs text-slate-400"><i data-lucide="calendar" class="w-3.5 h-3.5 shrink-0"></i><span>${formatCardDate(sw.timestamp)}</span></div>` : ''
  ].filter(Boolean).join('\n');
  const actionsHtml = [
    `<button type="button" data-action="do-structured-workout" data-id="${sw.id}" class="flex-1 btn-core is-primary-ghost btn-card-action" title="Do Workout"><i data-lucide="dumbbell" size="18"></i><span>Train</span></button>`,
    `<button type="button" data-action="redo-workout" data-id="${sw.id}" class="flex-1 btn-core is-ghost btn-card-action" title="Load"><i data-lucide="clipboard-pen-line" size="18"></i><span>Plan</span></button>`,
    `<button type="button" data-action="open-share-modal-workout" data-id="${sw.id}" class="flex-1 btn-core is-ghost btn-card-action" title="Share"><i data-lucide="share-2" size="18"></i><span>Share</span></button>`,
    `<button type="button" data-action="delete-structured-workout" data-id="${sw.id}" class="flex-1 btn-core is-ghost btn-card-action hover:!text-rose-400 hover:!border-rose-400" title="Delete"><i data-lucide="trash-2" size="18"></i><span>Delete</span></button>`
  ].join('\n');
  return renderWorkoutCard(sw.id, sw.name, type, badgeClass, descLine, metadataHtml, movementsHtml, actionsHtml, sw.favorite, 'toggle-structured-favorite');
}

function renderPlanCard(plan) {
  const type = plan.type || 'AMRAP';
  const badgeClass = type.toLowerCase();
  const descLine = buildWorkoutSummaryLine(type, plan.structure || {});
  const structure = plan.structure || {};
  const movementsHtml = type === 'EMOM'
    ? renderEmomChips(structure.minutes, (m, idx) => `${idx + 1}: `)
    : renderMovementChips(structure.movements);
  const metadataHtml = plan.createdAt
    ? `<div class="flex items-center gap-1.5 text-xs text-slate-400"><i data-lucide="calendar" class="w-3.5 h-3.5 shrink-0"></i><span>${formatCardDate(plan.createdAt)}</span></div>`
    : '';
  const actionsHtml = [
    `<button type="button" data-action="do-plan-workout" data-id="${plan.id}" class="flex-1 btn-core is-primary-ghost btn-card-action"><i data-lucide="dumbbell" size="18"></i><span>Train</span></button>`,
    `<button type="button" data-action="load-plan" data-id="${plan.id}" class="flex-1 btn-core is-ghost btn-card-action"><i data-lucide="clipboard-pen-line" size="18"></i><span>Plan</span></button>`,
    `<button type="button" data-action="open-share-modal-plan" data-id="${plan.id}" class="flex-1 btn-core is-ghost btn-card-action"><i data-lucide="share-2" size="18"></i><span>Share</span></button>`,
    `<button type="button" data-action="delete-plan" data-id="${plan.id}" class="flex-1 btn-core is-ghost btn-card-action hover:!text-rose-400 hover:!border-rose-400"><i data-lucide="trash-2" size="18"></i><span>Delete</span></button>`
  ].join('\n');
  return renderWorkoutCard(plan.id, plan.name, type, badgeClass, descLine, metadataHtml, movementsHtml, actionsHtml, plan.favorite, 'toggle-plan-favorite');
}

function renderSharedPlanCard(share) {
  const type = share.content?.type || 'AMRAP';
  const badgeClass = type.toLowerCase();
  const structure = share.content?.structure || {};
  const descLine = buildWorkoutSummaryLine(type, structure);
  const displayMovements = type === 'EMOM'
    ? renderEmomChips(share.content?.structure?.minutes, (m, idx) => `${idx + 1}: `)
    : renderMovementChips(structure.movements);
  const metadataHtml = [
    `<div class="flex items-center gap-1.5 text-xs text-slate-300"><i data-lucide="share-2" class="w-3.5 h-3.5 shrink-0"></i><span class="truncate">${escapeHtml(share.sharedByDisplayName || 'Unknown')}</span></div>`,
    share.createdAt ? `<div class="flex items-center gap-1.5 text-xs text-slate-400"><i data-lucide="calendar" class="w-3.5 h-3.5 shrink-0"></i><span>${formatCardDate(share.createdAt)}</span></div>` : ''
  ].filter(Boolean).join('\n');
  const actionsHtml = [
    `<button type="button" data-action="do-shared-plan" data-id="${share.id}" class="flex-1 btn-core is-primary-ghost btn-card-action"><i data-lucide="dumbbell" size="18"></i><span>Train</span></button>`,
    `<button type="button" data-action="load-shared-plan" data-id="${share.id}" class="flex-1 btn-core is-ghost btn-card-action"><i data-lucide="clipboard-pen-line" size="18"></i><span>Plan</span></button>`,
    `<button type="button" data-action="dismiss-shared-plan" data-id="${share.id}" class="flex-1 btn-core is-ghost btn-card-action hover:!text-rose-400 hover:!border-rose-400"><i data-lucide="trash-2" size="18"></i><span>Delete</span></button>`
  ].join('\n');
  return renderWorkoutCard(share.id, share.content?.name || '', type, badgeClass, descLine, metadataHtml, displayMovements, actionsHtml, share.favorite, 'toggle-shared-favorite');
}

function friendToHtml(fUid, data) {
  if (data) {
    return `
      <div class="flex justify-between items-center card p-2 rounded">
        <span class="font-medium text-slate-300 truncate max-w-[120px]">${getDisplayName(data, fUid)}</span>
        <div class="flex items-center gap-2">
          <button type="button" data-action="remove-friend" data-uid="${fUid}" 
          class="items-center justify-center rounded-full px-2 py-0.5 btn-core is-ghost text-xs hover:!text-rose-400 hover:!border-rose-400">
          <i data-lucide="user-minus" size="18"></i>
          </button>
        </div>
      </div>`;
  }
  return `
    <div class="flex justify-between items-center card p-2 rounded">
      <span class="font-medium text-slate-300 truncate max-w-[120px]">Unknown Friend</span>
      <span class="text-xs font-mono text-slate-500">${fUid}</span>
    </div>`;
}

function buildLeaderboardRow(profile, rank, isMe, isFriend) {
  const rawScore = state.social.currentFormula === 'dots' ? profile.dotsScore : (profile.sinclairScore || 0);
  const displayScore = formatDotsScore(rawScore);
  const badgeBaseClasses = 'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider';
  const actionCell = isMe
    ? ''
    : isFriend
      ? `<button type="button" class="${badgeBaseClasses} border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-400/30" 
      data-action="remove-friend" data-uid="${profile.uid}">
      <i data-lucide="user-minus" size="18"></i>
      </button>`
      : `<button type="button" class="${badgeBaseClasses} border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-slate-800" 
      data-action="add-friend" data-uid="${profile.uid}">
      <i data-lucide="user-plus" size="18"></i>
      </button>`;
  return `
    <tr class="border-b border-slate-800/60 align-middle ${isMe ? 'bg-[rgba(39,221,51,0.1)] font-bold' : ''}">
      <td class="py-3 font-mono text-slate-500 align-middle">#${rank}</td>
      <td class="py-3 align-middle">
        <span class="${isMe ? 'text-emerald-400' : 'text-slate-200'}">${getDisplayName(profile, profile.uid)}</span>
      </td>
      <td class="py-3 text-right font-mono font-bold text-emerald-400 align-middle">${displayScore.toFixed(2)}</td>
      <td class="py-3 text-right align-middle">${actionCell}</td>
    </tr>`;
}

export { renderOnboarding1RMItem, renderOnboarding1RMList, renderCalcEntry, renderCalcEntries, renderPlanMovementItem, renderPlanMovements, renderMovementChips, renderEmomChips, renderCalendarWorkoutItem, renderVolumeBar, renderMinuteSlotInner, renderShareFriendItem, renderRegistryRow, renderLeaderboardEmptyRow, buildCalendarDayHtml, workoutToLogHtml, renderWorkoutCard, renderStructuredWorkoutCard, renderPlanCard, renderSharedPlanCard, friendToHtml, buildLeaderboardRow };
