import { state } from './state.js';
import { computeDisplayWeight } from './math.js';

function formatMovementLoad(m) {
  if (m.weightMode === 'rpe' && m.rpe) {
    return ` @ RPE ${m.rpe}`;
  }
  if (m.weightMode === 'pct' && m.pct) {
    return ` @ ${Math.round(m.pct)}%`;
  }
  return m.weight ? ` @ ${m.weight}kg` : '';
}

function formatCardDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatWorkoutType(type) {
  return type === 'FOR_TIME' ? 'For Time' : type;
}

function formatDotsScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatMovementWeight(m) {
  const oneRM = state.cache.activeRecords[m.exerciseId || m.movement] || 0;
  const weight = computeDisplayWeight(m, oneRM);
  if (m.weightMode === 'pct' && m.pct) {
    return ` @ ${m.pct}% 1RM (${weight}kg)`;
  }
  if (m.weightMode === 'rpe' && m.rpe) {
    return ` @ RPE ${m.rpe} (${weight}kg)`;
  }
  if (m.weight) return ` @ ${m.weight}kg`;
  return '';
}

function formatMovementDisplay(m, oneRM) {
  const weight = computeDisplayWeight(m, oneRM);
  if (m.weightMode === 'pct' && m.pct) {
    return `${m.reps}x ${m.exerciseId} @ ${m.pct}% 1RM (${weight}kg)`;
  }
  if (m.weightMode === 'rpe' && m.rpe) {
    return `${m.reps}x ${m.exerciseId} @ RPE ${m.rpe} (${weight}kg)`;
  }
  return `${m.reps}x ${m.exerciseId} @ ${m.weight}kg`;
}

export { formatMovementLoad, formatCardDate, formatWorkoutType, formatDotsScore, formatMovementWeight, formatMovementDisplay };
