import { state, EPLEY_CONSTANT } from './state.js';

const EXERCISE_CATALOG = [
  { name: 'Back Squat', category: 'barbell', type: 'weighted', movement: 'squat' },
  { name: 'Bench Press', category: 'barbell', type: 'weighted', movement: 'push' },
  { name: 'Clean & Jerk', category: 'barbell', type: 'weighted', movement: 'push' },
  { name: 'Deadlift', category: 'barbell', type: 'weighted', movement: 'pull' },
  { name: 'Front Squat', category: 'barbell', type: 'weighted', movement: 'squat' },
  { name: 'Hang Clean', category: 'barbell', type: 'weighted', movement: 'pull' },
  { name: 'Hang Power Clean', category: 'barbell', type: 'weighted', movement: 'pull' },
  { name: 'Hang Power Snatch', category: 'barbell', type: 'weighted', movement: 'pull' },
  { name: 'Hang Snatch', category: 'barbell', type: 'weighted', movement: 'pull' },
  { name: 'Overhead Squat', category: 'barbell', type: 'weighted', movement: 'squat' },
  { name: 'Power Clean', category: 'barbell', type: 'weighted', movement: 'pull' },
  { name: 'Power Snatch', category: 'barbell', type: 'weighted', movement: 'pull' },
  { name: 'Push Press', category: 'barbell', type: 'weighted', movement: 'push' },
  { name: 'Push Jerk', category: 'barbell', type: 'weighted', movement: 'push' },
  { name: 'Romanian Deadlift', category: 'barbell', type: 'weighted', movement: 'pull' },
  { name: 'Shoulder Press', category: 'barbell', type: 'weighted', movement: 'push' },
  { name: 'Snatch', category: 'barbell', type: 'weighted', movement: 'pull' },
  { name: 'Squat Clean', category: 'barbell', type: 'weighted', movement: 'pull' },
  { name: 'Sumo Deadlift', category: 'barbell', type: 'weighted', movement: 'pull' },
  { name: 'Thruster', category: 'barbell', type: 'weighted', movement: 'squat' },
  { name: 'Wall Ball', category: 'barbell', type: 'weighted', movement: 'squat' },
  { name: 'DB Bench Press', category: 'dumbbell', type: 'weighted', movement: 'push' },
  { name: 'DB Box Step-up', category: 'dumbbell', type: 'weighted', movement: 'squat' },
  { name: 'DB Clean', category: 'dumbbell', type: 'weighted', movement: 'pull' },
  { name: 'DB Deadlift', category: 'dumbbell', type: 'weighted', movement: 'pull' },
  { name: 'DB Goblet Squat', category: 'dumbbell', type: 'weighted', movement: 'squat' },
  { name: 'DB Hang Clean', category: 'dumbbell', type: 'weighted', movement: 'pull' },
  { name: 'DB Lunge', category: 'dumbbell', type: 'weighted', movement: 'squat' },
  { name: 'DB Push Press', category: 'dumbbell', type: 'weighted', movement: 'push' },
  { name: 'DB Row', category: 'dumbbell', type: 'weighted', movement: 'pull' },
  { name: 'DB Shoulder Press', category: 'dumbbell', type: 'weighted', movement: 'push' },
  { name: 'DB Snatch', category: 'dumbbell', type: 'weighted', movement: 'pull' },
  { name: 'DB Thruster', category: 'dumbbell', type: 'weighted', movement: 'squat' },
  { name: 'Kettlebell Clean', category: 'kettlebell', type: 'weighted', movement: 'pull' },
  { name: 'Kettlebell Goblet Squat', category: 'kettlebell', type: 'weighted', movement: 'squat' },
  { name: 'Kettlebell High Pull', category: 'kettlebell', type: 'weighted', movement: 'pull' },
  { name: 'Kettlebell Snatch', category: 'kettlebell', type: 'weighted', movement: 'pull' },
  { name: 'Kettlebell Swing', category: 'kettlebell', type: 'weighted', movement: 'pull' },
  { name: 'Assault Bike', category: 'cardio', type: 'cardio', movement: 'pull' },
  { name: 'Bike', category: 'cardio', type: 'cardio', movement: 'pull' },
  { name: 'Double Under', category: 'cardio', type: 'cardio', movement: 'pull' },
  { name: 'Row', category: 'cardio', type: 'cardio', movement: 'pull' },
  { name: 'Run', category: 'cardio', type: 'cardio', movement: 'pull' },
  { name: 'SkiErg', category: 'cardio', type: 'cardio', movement: 'pull' },
  { name: 'Air Squat', category: 'bodyweight', type: 'bodyweight', movement: 'squat', loadFactor: 0.65 },
  { name: 'Box Jump', category: 'bodyweight', type: 'bodyweight', movement: 'squat', loadFactor: 1.00 },
  { name: 'Burpee', category: 'bodyweight', type: 'bodyweight', movement: 'push', loadFactor: 0.80 },
  { name: 'Chin-up', category: 'bodyweight', type: 'bodyweight', movement: 'pull', loadFactor: 1.00 },
  { name: 'Dip', category: 'bodyweight', type: 'bodyweight', movement: 'push', loadFactor: 0.95 },
  { name: 'Elevated Push-up', category: 'bodyweight', type: 'bodyweight', movement: 'push', loadFactor: 0.55 },
  { name: 'Handstand Push-up', category: 'bodyweight', type: 'bodyweight', movement: 'push', loadFactor: 1.00 },
  { name: 'Knee Push-up', category: 'bodyweight', type: 'bodyweight', movement: 'push', loadFactor: 0.49 },
  { name: 'L-sit', category: 'bodyweight', type: 'bodyweight', movement: 'pull', loadFactor: 1.00 },
  { name: 'Muscle-up', category: 'bodyweight', type: 'bodyweight', movement: 'pull', loadFactor: 1.00 },
  { name: 'Pike Push-up', category: 'bodyweight', type: 'bodyweight', movement: 'push', loadFactor: 0.75 },
  { name: 'Pistol', category: 'bodyweight', type: 'bodyweight', movement: 'squat', loadFactor: 1.00 },
  { name: 'Pull Up', category: 'bodyweight', type: 'bodyweight', movement: 'pull', loadFactor: 1.00 },
  { name: 'Pull Up (Weighted)', category: 'bodyweight', type: 'weighted', movement: 'pull', loadFactor: 1.00, hidden: true },
  { name: 'Push-up', category: 'bodyweight', type: 'bodyweight', movement: 'push', loadFactor: 0.67 },
  { name: 'Ring Dip', category: 'bodyweight', type: 'bodyweight', movement: 'push', loadFactor: 1.00 },
  { name: 'Ring Row', category: 'bodyweight', type: 'bodyweight', movement: 'pull', loadFactor: 0.80 },
  { name: 'Sit-up', category: 'bodyweight', type: 'bodyweight', movement: 'pull', loadFactor: 0.50 },
  { name: 'Step-up', category: 'bodyweight', type: 'bodyweight', movement: 'squat', loadFactor: 1.00 },
  { name: 'Strict Pull-up', category: 'bodyweight', type: 'bodyweight', movement: 'pull', loadFactor: 1.00 },
  { name: 'Toes-to-bar', category: 'bodyweight', type: 'bodyweight', movement: 'pull', loadFactor: 0.60 },
  { name: 'Walking Lunge', category: 'bodyweight', type: 'bodyweight', movement: 'squat', loadFactor: 1.00 },
];

const LOAD_FACTORS = {};
EXERCISE_CATALOG.forEach(ex => { if (ex.loadFactor) LOAD_FACTORS[ex.name] = ex.loadFactor; });

function estimate1RM(load, reps) {
  if (reps === 1) return load;
  return load * (1 + reps / EPLEY_CONSTANT);
}

function estimateWeightForReps(oneRM, reps) {
  return oneRM / (1 + reps / EPLEY_CONSTANT);
}

function computeEffectiveLoad(exercise, weight, externalLoad, bodyweight) {
  const loadFactor = LOAD_FACTORS[exercise];
  if (loadFactor !== undefined) {
    return (bodyweight || 0) * loadFactor + (parseFloat(externalLoad) || 0);
  }
  return parseFloat(weight) || 0;
}

function getEffectiveLoad(workout) {
  if (workout.estimatedLoad !== undefined && workout.estimatedLoad !== null) {
    return workout.estimatedLoad;
  }
  return computeEffectiveLoad(
    workout.exercise,
    parseFloat(workout.weight),
    parseFloat(workout.externalLoad),
    state.user.userBiometrics.bodyweight
  );
}

function debounce(fn, wait) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), wait);
    };
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function haptic(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (_) {}
}

function getExerciseInfo(name) {
  return EXERCISE_CATALOG.find(ex => ex.name === name) || { category: 'barbell', type: 'weighted' };
}

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

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

function getDisplayName(profile, fallbackUid) {
  return profile?.displayName || profile?.uid || fallbackUid || 'Unknown';
}

function countActiveDays(daysBack, today, activeDates) {
  let count = 0;
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (activeDates.has(dateStr)) count++;
  }
  return count;
}

function countConsecutiveDays(today, activeDates) {
  let streak = 0;
  for (let i = 0; ; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (activeDates.has(dateStr)) streak++;
    else break;
  }
  return streak;
}

export { EXERCISE_CATALOG, LOAD_FACTORS, estimate1RM, estimateWeightForReps, computeEffectiveLoad, getEffectiveLoad, debounce, escapeHtml, haptic, getExerciseInfo, getMonday, formatMovementLoad, formatCardDate, formatWorkoutType, formatDotsScore, formatMovementWeight, getDisplayName, countActiveDays, countConsecutiveDays };
