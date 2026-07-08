window.__irontrackAppLoaded = true;
window.__irontrackAuthState = 'pending';
window.__irontrackWorkoutCount = 0;

const activeDates = new Set();

const state = {
  user: {
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
    currentTab: 'dashboard'
  }
};

const EPLEY_CONSTANT = 30;
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
const greeting = document.getElementById('user-greeting');
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
const navTabs = document.querySelectorAll('.nav-tab');

const INPUT_CLASS = 'w-full bg-slate-950 border border-slate-700 rounded-xl px-3 h-[39px] text-center text-slate-100 focus:outline-none focus:border-emerald-400 transition';
const CALC_CLASS = 'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 text-center text-emerald-400 font-bold h-[39px] flex items-center justify-center';

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

export { state, EPLEY_CONSTANT, HAPTIC, CONSISTENCY_CONFIG, entriesPerPage, INPUT_CLASS, CALC_CLASS, FORM_SCHEMAS, activeDates, loginView, appView, bottomNav, authBtn, profileBtn, profileModal, emailInput, passwordInput, loginBtn, signupBtn, greeting, profileForm, workoutForm, workoutList, paginationControls, prevPageBtn, nextPageBtn, currentPageDisplay, totalPagesDisplay, workoutFilter, exerciseSelect, onboardingView, onboardingGender, onboardingWeight, onboardingDaysMonthly, onboardingDaysYearly, onboardingDaysLifetime, onboardingExerciseSelect, onboardingWeightInput, onboardingRepsInput, onboardingAddBtn, onboardingList, onboardingEmpty, onboardingSaveBtn, onboardingFeedback, pbLogExercise, pbLogBtn, pbLogFeedback, tabContents, navTabs };
