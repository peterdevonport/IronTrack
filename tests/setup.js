// Mock global variables
global.activeRecords = {};
global.cachedMaxLoadByExercise = {};
global.cachedMax1RMByExercise = {};
global.cachedMaxRepsByExercise = {};
global.lastWorkouts = [];
global.userSignupTs = Date.now();

// Mock Firestore
global.collection = vi.fn();
global.query = vi.fn();
global.where = vi.fn();
global.orderBy = vi.fn();
global.limit = vi.fn();
global.onSnapshot = vi.fn();

// Mock DOM functions
global.populateWorkoutFilter = vi.fn();
global.populateVolumeFilter = vi.fn();
global.update1RMRegistryUI = vi.fn();
global.updateCalcCard = vi.fn();
global.processAnalytics = vi.fn();
global.renderLogs = vi.fn();
global.renderVolumeHistory = vi.fn();
global.debouncedSyncActivity = vi.fn();

// Mock window
global.window = {
  __lastWorkouts: [],
  __irontrackWorkoutCount: 0
};

// Mock LOAD_FACTORS
global.LOAD_FACTORS = {
  'Pull Up': 1.0,
  'Chin Up': 1.0,
  'Dip': 0.7
};

// Mock userBiometrics
global.userBiometrics = {
  bodyweight: 80,
  gender: 'male'
};

// Mock getEffectiveLoad
global.getEffectiveLoad = vi.fn((workout) => {
  if (workout.estimatedLoad !== undefined && workout.estimatedLoad !== null) {
    return workout.estimatedLoad;
  }
  const loadFactor = LOAD_FACTORS[workout.exercise];
  if (loadFactor !== undefined) {
    return (userBiometrics.bodyweight || 0) * loadFactor + (parseFloat(workout.externalLoad) || 0);
  }
  return parseFloat(workout.weight) || 0;
});

// Mock estimate1RM
global.estimate1RM = vi.fn((load, reps) => {
  if (reps === 1) return load;
  return load * (1 + reps / 30);
});
