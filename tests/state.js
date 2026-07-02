// State module for testing - mirrors the state object in app.js
export const state = {
  user: {
    currentUser: null,
    userBiometrics: { gender: 'male', bodyweight: 75 },
    userChallengeStreaks: {
      monthly: { completedPeriods: [], currentStreak: 0, bestStreak: 0 },
      yearly: { completedPeriods: [], currentStreak: 0, bestStreak: 0 }
    },
    pendingOnboarding1RMs: [],
    userSignupTs: 0
  },
  cache: {
    activeRecords: {},
    cachedMaxLoadByExercise: {},
    cachedMax1RMByExercise: {},
    cachedMaxRepsByExercise: {}
  },
  data: {
    lastWorkouts: [],
    lastStructuredWorkouts: [],
    lastWorkoutPlans: [],
    lastSharedPlans: [],
    paginatedWorkouts: [],
    calcEntriesByLift: {}
  },
  pagination: {
    workouts: 1,
    structured: 1,
    plans: 1,
    sharedPlans: 1,
    records: 1,
    friends: 1
  },
  calendar: {
    month: new Date(),
    selectedDate: null,
    compact: true,
    weekOffset: 0
  },
  volume: {
    period: 'daily',
    offset: 0,
    filter: 'All'
  },
  builder: {
    workoutMovements: [],
    pendingPlannedWorkout: null,
    emomMode: 'sequence'
  },
  social: {
    currentScope: 'global',
    currentFormula: 'dots',
    userFriendsList: [],
    friendDisplayCache: {},
    leaderboardCache: [],
    leaderboardShowAll: false
  },
  share: {
    sharePlanId: null,
    shareIsWorkout: false,
    shareMode: 'friends'
  },
  ui: {
    plansFilter: 'mine',
    currentTab: 'dashboard',
    urlParamsProcessed: false
  }
};
