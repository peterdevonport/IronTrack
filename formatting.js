import { state } from './state.js';
import { estimateWeightForReps } from './math.js';

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
  const reps = parseInt(m.reps, 10) || 1;
  if (m.weightMode === 'pct' && m.pct) {
    const computed = oneRM > 0 ? Math.round(oneRM * m.pct / 100) : m.weight;
    return ` @ ${m.pct}% 1RM (${computed}kg)`;
  }
  if (m.weightMode === 'rpe' && m.rpe) {
    const rir = 10 - m.rpe;
    const computed = oneRM > 0 ? Math.round(estimateWeightForReps(oneRM, reps + rir)) : m.weight;
    return ` @ RPE ${m.rpe} (${computed}kg)`;
  }
  if (m.weight) return ` @ ${m.weight}kg`;
  return '';
}

export { formatMovementLoad, formatCardDate, formatWorkoutType, formatDotsScore, formatMovementWeight };
