window.__irontrackAppLoaded = true;
window.__irontrackAuthState = 'pending';
window.__irontrackWorkoutCount = 0;

const activeDates = new Set();

const state = {
  user: {
    theme: 'auto',
    userBiometrics: { gender: 'male', bodyweight: 75 },
    userChallengeStreaks: {
      monthly: { completedPeriods: [], currentStreak: 0, bestStreak: 0 },
      yearly: { completedPeriods: [], currentStreak: 0, bestStreak: 0 }
    },
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
    currentTab: null
  }
};

// Domain constants
const EPLEY_CONSTANT = 30;
const SECONDS_PER_MINUTE = 60;
const PERCENT_DIVISOR = 100;
const DAYS_IN_WEEK = 7;
const CONSISTENCY_WINDOW_DAYS = 28;

// Firestore query limits
const FIRESTORE_WORKOUTS_LIMIT = 250;
const FIRESTORE_STRUCTURED_LIMIT = 500;
const FIRESTORE_LEADERBOARD_LIMIT = 50;

// Timing constants (ms)
const DEBOUNCE_DELAY_SYNC_ACTIVITY = 3000;
const DEBOUNCE_DELAY_LEADERBOARD = 5000;
const FEEDBACK_DISMISS_DEFAULT_MS = 2000;
const TOAST_DISMISS_MS = 3000;
const FRIEND_SUCCESS_CLEAR_MS = 4000;
const FAVORITE_DEBOUNCE_MS = 300;

// Pagination
const RECORDS_PER_PAGE = 10;
const HAPTIC = {
    tap: 15,
    confirm: 30,
    achievement: [50, 30, 50],
    error: [40, 50, 40]
};
const CONSISTENCY_CONFIG = {
    monthlyUniqueDays: 14,
    yearlyUniqueDays: 150,
    lifetimeUniqueDays: 3000
};
const entriesPerPage = 5;

const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const bottomNav = document.getElementById('bottom-nav');
const authBtn = document.getElementById('auth-btn');
const profileBtn = document.getElementById('profile-btn');
const profileModal = document.getElementById('profile-modal');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const loginBtn = document.getElementById('email-login-btn');
const signupBtn = document.getElementById('email-signup-btn');
const profileForm = document.getElementById('profile-form');
const workoutForm = document.getElementById('workout-form');
const workoutList = document.getElementById('workout-list');
const paginationControls = document.getElementById('pagination-controls');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const currentPageDisplay = document.getElementById('current-page');
const totalPagesDisplay = document.getElementById('total-pages');
const workoutFilter = document.getElementById('workout-filter');
const exerciseSelect = document.getElementById('exercise');
const onboardingView = document.getElementById('onboarding-view');
const onboardingGender = document.getElementById('onboarding-gender');
const onboardingWeight = document.getElementById('onboarding-weight');
const onboardingDaysMonthly = document.getElementById('onboarding-days-monthly');
const onboardingDaysYearly = document.getElementById('onboarding-days-yearly');
const onboardingDaysLifetime = document.getElementById('onboarding-days-lifetime');
const onboardingExerciseSelect = document.getElementById('onboarding-1rm-exercise');
const onboardingWeightInput = document.getElementById('onboarding-1rm-weight');
const onboardingRepsInput = document.getElementById('onboarding-1rm-reps');
const onboardingAddBtn = document.getElementById('onboarding-add-1rm');
const onboardingList = document.getElementById('onboarding-1rm-list');
const onboardingEmpty = document.getElementById('onboarding-1rm-empty');
const onboardingSaveBtn = document.getElementById('onboarding-save-btn');
const onboardingFeedback = document.getElementById('onboarding-feedback');
const pbLogExercise = document.getElementById('pb-log-exercise');
const pbLogBtn = document.getElementById('pb-log-btn');
const pbLogFeedback = document.getElementById('pb-log-feedback');
const tabContents = document.querySelectorAll('.tab-content');
const navBar = document.getElementById('nav-bar');

const INPUT_CLASS = 'input-core';
const CALC_CLASS = 'font-mono font-bold';

const FORM_SCHEMAS = {
  logSet: {
    standard: [
      { id: 'log-set-sets', label: 'Sets', type: 'number', width: 'col-span-4', attrs: { min: 1, step: 1, placeholder: '1' } },
      { id: 'log-set-reps', label: 'Reps', type: 'number', width: 'col-span-4', attrs: { min: 1, step: 1, placeholder: '1' } },
      { id: 'log-set-weight', label: 'Weight (kg)', type: 'number', width: 'col-span-4', attrs: { min: 0, step: 'any', placeholder: '60' } },
    ],
    bodyweight: [
      { id: 'log-set-sets', label: 'Sets', type: 'number', width: 'col-span-4', attrs: { min: 1, step: 1, placeholder: '1' } },
      { id: 'log-set-reps', label: 'Reps', type: 'number', width: 'col-span-4', attrs: { min: 1, step: 1, placeholder: '1' } },
      { id: 'log-set-bodyweight', label: 'Bodyweight (kg)', type: 'number', width: 'col-span-4', attrs: { disabled: true } },
      { id: 'log-set-total-load', label: 'Est. Load', type: 'readonly-calc', width: 'col-span-12' },
    ],
    weighted: [
      { id: 'log-set-sets', label: 'Sets', type: 'number', width: 'col-span-4', attrs: { min: 1, step: 1, placeholder: '1' } },
      { id: 'log-set-reps', label: 'Reps', type: 'number', width: 'col-span-4', attrs: { min: 1, step: 1, placeholder: '1' } },
      { id: 'log-set-bodyweight', label: 'Bodyweight (kg)', type: 'number', width: 'col-span-4', attrs: { disabled: true } },
      { id: 'log-set-ext-load', label: 'External Load (kg)', type: 'number', width: 'col-span-6', attrs: { min: 0, step: 'any', placeholder: '0' } },
      { id: 'log-set-total-load', label: 'Total Load', type: 'readonly-calc', width: 'col-span-6' },
    ],
  },
  logPB: {
    standard: [
      { id: 'pb-reps', label: 'Reps', type: 'number', width: 'col-span-6', attrs: { min: 1, step: 1, value: 1 } },
      { id: 'pb-weight', label: 'Weight (kg)', type: 'number', width: 'col-span-6', attrs: { min: 0, step: 'any', placeholder: 'kg' } },
    ],
    bodyweight: [
      { id: 'pb-reps', label: 'Reps', type: 'number', width: 'col-span-4', attrs: { min: 1, step: 1, value: 1 } },
      { id: 'pb-bodyweight', label: 'Bodyweight (kg)', type: 'number', width: 'col-span-4', attrs: { disabled: true } },
      { id: 'pb-total-load', label: 'Est. Load', type: 'readonly-calc', width: 'col-span-4' },
    ],
    weighted: [
      { id: 'pb-reps', label: 'Reps', type: 'number', width: 'col-span-4', attrs: { min: 1, step: 1, value: 1 } },
      { id: 'pb-bodyweight', label: 'Bodyweight (kg)', type: 'number', width: 'col-span-4', attrs: { disabled: true } },
      { id: 'pb-ext-load', label: 'External Load (kg)', type: 'number', width: 'col-span-4', attrs: { min: 0, step: 'any', placeholder: '0' } },
      { id: 'pb-total-load', label: 'Total Load', type: 'readonly-calc', width: 'col-span-12' },
    ],
  },
  planWorkout: {
      standard: [
        { type: 'wms', label: '', width: 'col-span-12' }
      ],
    bodyweight: [
      { id: 'plan-reps', label: 'Reps', type: 'number', width: 'col-span-4', attrs: { min: 1, step: 1, placeholder: 'Reps' } },
      { id: 'plan-bodyweight', label: 'Bodyweight (kg)', type: 'number', width: 'col-span-4', attrs: { disabled: true } },
      { id: 'plan-total-load', label: 'Est. Load', type: 'readonly-calc', width: 'col-span-4' },
    ],
    weighted: [
      { id: 'plan-reps', label: 'Reps', type: 'number', width: 'col-span-4', attrs: { min: 1, step: 1, placeholder: 'Reps' } },
      { id: 'plan-bodyweight', label: 'Bodyweight (kg)', type: 'number', width: 'col-span-4', attrs: { disabled: true } },
      { id: 'plan-ext-load', label: 'External Load (kg)', type: 'number', width: 'col-span-4', attrs: { min: 0, step: 'any', placeholder: '0' } },
      { id: 'plan-total-load', label: 'Total Load', type: 'readonly-calc', width: 'col-span-12' },
    ],
  },
};

export { state, EPLEY_CONSTANT, SECONDS_PER_MINUTE, PERCENT_DIVISOR, DAYS_IN_WEEK, CONSISTENCY_WINDOW_DAYS, FIRESTORE_WORKOUTS_LIMIT, FIRESTORE_STRUCTURED_LIMIT, FIRESTORE_LEADERBOARD_LIMIT, DEBOUNCE_DELAY_SYNC_ACTIVITY, DEBOUNCE_DELAY_LEADERBOARD, FEEDBACK_DISMISS_DEFAULT_MS, TOAST_DISMISS_MS, FRIEND_SUCCESS_CLEAR_MS, FAVORITE_DEBOUNCE_MS, RECORDS_PER_PAGE, HAPTIC, CONSISTENCY_CONFIG, entriesPerPage, INPUT_CLASS, CALC_CLASS, FORM_SCHEMAS, activeDates, loginView, appView, bottomNav, authBtn, profileBtn, profileModal, emailInput, passwordInput, loginBtn, signupBtn, profileForm, workoutForm, workoutList, paginationControls, prevPageBtn, nextPageBtn, currentPageDisplay, totalPagesDisplay, workoutFilter, exerciseSelect, onboardingView, onboardingGender, onboardingWeight, onboardingDaysMonthly, onboardingDaysYearly, onboardingDaysLifetime, onboardingExerciseSelect, onboardingWeightInput, onboardingRepsInput, onboardingAddBtn, onboardingList, onboardingEmpty, onboardingSaveBtn, onboardingFeedback, pbLogExercise, pbLogBtn, pbLogFeedback, tabContents, navBar };
