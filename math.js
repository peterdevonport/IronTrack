import { state, EPLEY_CONSTANT } from './state.js';
import { LOAD_FACTORS } from './exercise-data.js';

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

export { estimate1RM, estimateWeightForReps, computeEffectiveLoad, getEffectiveLoad };
