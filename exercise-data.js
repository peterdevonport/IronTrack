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

function getExerciseInfo(name) {
  return EXERCISE_CATALOG.find(ex => ex.name === name) || { category: 'barbell', type: 'weighted' };
}

function getDisplayName(profile, fallbackUid) {
  return profile?.displayName || profile?.uid || fallbackUid || 'Unknown';
}

function resolveExerciseVariant(name, externalLoad) {
  const VARIANTS = { 'Pull Up': { condition: (ext) => ext > 0, variant: 'Pull Up (Weighted)' } };
  const rule = VARIANTS[name];
  return rule?.condition(externalLoad) ? rule.variant : name;
}

export { EXERCISE_CATALOG, LOAD_FACTORS, getExerciseInfo, getDisplayName, resolveExerciseVariant };
