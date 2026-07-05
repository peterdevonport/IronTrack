import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, deleteDoc, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, orderBy, limit, Timestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Integrated Unique Firebase App Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAJNl8NIZB9UGnqUOXPjWcRgFOiroEbPUY",
    authDomain: "irontrack-f4b19.firebaseapp.com",
    projectId: "irontrack-f4b19",
    storageBucket: "irontrack-f4b19.firebasestorage.app",
    messagingSenderId: "576459465985",
    appId: "1:576459465985:web:c5e387990eabf0c840a700"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Lucide icons
if (typeof lucide !== 'undefined' && lucide.createIcons) {
  lucide.createIcons();
}

window.__irontrackAppLoaded = true;
window.__irontrackAuthState = 'pending';
window.__irontrackWorkoutCount = 0;

// Volume History State (Issue #38)

// Exercise Catalog & Load Factors
const EXERCISE_CATALOG = [
  // ── Barbell ──
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

  // ── Dumbbell ──
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

  // ── Kettlebell ──
  { name: 'Kettlebell Clean', category: 'kettlebell', type: 'weighted', movement: 'pull' },
  { name: 'Kettlebell Goblet Squat', category: 'kettlebell', type: 'weighted', movement: 'squat' },
  { name: 'Kettlebell High Pull', category: 'kettlebell', type: 'weighted', movement: 'pull' },
  { name: 'Kettlebell Snatch', category: 'kettlebell', type: 'weighted', movement: 'pull' },
  { name: 'Kettlebell Swing', category: 'kettlebell', type: 'weighted', movement: 'pull' },

  // ── Cardio ──
  { name: 'Assault Bike', category: 'cardio', type: 'cardio', movement: 'pull' },
  { name: 'Bike', category: 'cardio', type: 'cardio', movement: 'pull' },
  { name: 'Double Under', category: 'cardio', type: 'cardio', movement: 'pull' },
  { name: 'Row', category: 'cardio', type: 'cardio', movement: 'pull' },
  { name: 'Run', category: 'cardio', type: 'cardio', movement: 'pull' },
  { name: 'SkiErg', category: 'cardio', type: 'cardio', movement: 'pull' },

  // ── Bodyweight ──
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

// ─── Schema-Driven Form Layouts ──────────────────────────────────────────────

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

function getSchemaKey(exerciseName) {
  const info = getExerciseInfo(exerciseName);
  if (info.name === 'Pull Up') return 'weighted';
  if (info.type === 'bodyweight') return 'bodyweight';
  if (info.type === 'weighted' && LOAD_FACTORS[exerciseName]) return 'weighted';
  return 'standard';
}

function computeTotalLoad(fieldValues, exerciseName, prefix) {
  const lf = LOAD_FACTORS[exerciseName];
  const bw = parseFloat(fieldValues[prefix + '-bodyweight']) || state.user.userBiometrics.bodyweight || 0;
  const ext = parseFloat(fieldValues[prefix + '-ext-load']) || 0;
  if (lf !== undefined) {
    const est = bw * lf + ext;
    return est > 0 ? Math.round(est).toString() : '\u2014';
  }
  return '\u2014';
}

function buildWmsField(wrapper, fields, grid) {
  const labelRow = document.createElement('div');
  labelRow.className = 'hidden sm:flex gap-3 items-center flex-nowrap mb-0.5';
  const repsLabel = document.createElement('span');
  repsLabel.className = 'form-label text-xs flex-1';
  repsLabel.textContent = 'Reps';
  labelRow.appendChild(repsLabel);
  const labelSpacer = document.createElement('span');
  labelSpacer.className = 'w-4 shrink-0';
  labelRow.appendChild(labelSpacer);
  const loadLabel = document.createElement('span');
  loadLabel.className = 'form-label text-xs flex-1';
  loadLabel.textContent = 'Load';
  labelRow.appendChild(loadLabel);
  const pillSpacer = document.createElement('span');
  pillSpacer.className = 'w-24 shrink-0';
  labelRow.appendChild(pillSpacer);
  wrapper.appendChild(labelRow);

  const inputRow = document.createElement('div');
  inputRow.className = 'flex gap-3 items-center flex-nowrap';

  const repsInput = document.createElement('input');
  repsInput.type = 'number';
  repsInput.id = 'plan-reps';
  repsInput.placeholder = 'Reps';
  repsInput.min = 1;
  repsInput.step = 1;
  repsInput.className = INPUT_CLASS + ' min-w-0 flex-1';
  inputRow.appendChild(repsInput);
  fields['plan-reps'] = repsInput;

  const sep = document.createElement('span');
  sep.className = 'text-slate-500 text-xs font-mono shrink-0';
  sep.textContent = '@';
  inputRow.appendChild(sep);

  const loadInput = document.createElement('input');
  loadInput.type = 'number';
  loadInput.id = 'plan-weight';
  loadInput.placeholder = 'Load';
  loadInput.min = 0;
  loadInput.step = 'any';
  loadInput.className = INPUT_CLASS + ' min-w-0 flex-1';
  inputRow.appendChild(loadInput);
  fields['plan-weight'] = loadInput;

  const pill = document.createElement('div');
  pill.className = 'wms-pill shrink-0';
  pill.id = 'plan-wms-pill';
  pill.dataset.mode = 'absolute';
  const modes = ['absolute', 'pct', 'rpe'];
  const plabels = ['kg', '%', 'RPE'];
  modes.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wms-pill-btn' + (m === 'absolute' ? ' is-active' : '');
    btn.dataset.mode = m;
    btn.textContent = plabels[i];
    btn.onclick = function () { togglePlanWms(this); };
    pill.appendChild(btn);
  });
  fields['plan-wms-pill'] = pill;
  inputRow.appendChild(pill);

  wrapper.appendChild(inputRow);

  const calcRow = document.createElement('div');
  calcRow.className = 'flex items-center mt-1';
  const calcSpan = document.createElement('span');
  calcSpan.id = 'plan-calc-weight';
  calcSpan.className = 'text-emerald-400 font-mono text-xs hidden';
  calcSpan.textContent = '\u2192';
  calcRow.appendChild(calcSpan);
  fields['plan-calc-weight'] = calcSpan;
  wrapper.appendChild(calcRow);

  grid.appendChild(wrapper);
}

function applyFieldAttributes(input, fd, fieldValues) {
  if (!fd.attrs) return;
  Object.entries(fd.attrs).forEach(([k, v]) => {
    if (k === 'value') {
      input.value = v;
      fieldValues[fd.id] = v;
    } else if (v === true) {
      input.setAttribute(k, '');
    } else {
      input.setAttribute(k, v);
    }
  });
}

function renderFormFields(containerId, schema, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return null;
  const existingGrid = container.querySelector('.schema-grid');
  if (existingGrid) existingGrid.remove();

  const grid = document.createElement('div');
  grid.className = 'schema-grid grid grid-cols-12 gap-3';
  container.appendChild(grid);

  const fields = {};
  const fieldValues = { ...options.initialValues };

  schema.forEach(fd => {
    const wrapper = document.createElement('div');
    wrapper.className = fd.width;

    if (fd.type === 'wms') {
      if (fd.label) {
        const label = document.createElement('label');
        label.className = 'form-label';
        label.textContent = fd.label;
        wrapper.appendChild(label);
      }
      buildWmsField(wrapper, fields, grid);
      return;
    }

    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = fd.label;
    if (fd.type !== 'readonly-calc') label.htmlFor = fd.id;
    wrapper.appendChild(label);

    if (fd.type === 'readonly-calc') {
      const display = document.createElement('div');
      display.id = fd.id;
      display.className = CALC_CLASS;
      display.textContent = '\u2014';
      wrapper.appendChild(display);
      fields[fd.id] = display;
    } else {
      const input = document.createElement('input');
      input.type = 'number';
      input.id = fd.id;
      input.className = INPUT_CLASS;
      applyFieldAttributes(input, fd, fieldValues);
      input.addEventListener('input', () => {
        fieldValues[fd.id] = input.value;
        if (options.onFieldChange) options.onFieldChange(fieldValues);
      });
      wrapper.appendChild(input);
      fields[fd.id] = input;
    }

    grid.appendChild(wrapper);
  });

  return { fields, fieldValues, grid };
}

// ─── End Schema-Driven Form Layouts ──────────────────────────────────────────

function getExerciseInfo(name) {
  return EXERCISE_CATALOG.find(ex => ex.name === name) || { category: 'barbell', type: 'weighted' };
}

function computeEffectiveLoad(exercise, weight, externalLoad, bodyweight) {
  const loadFactor = LOAD_FACTORS[exercise];
  if (loadFactor !== undefined) {
    return (bodyweight || 0) * loadFactor + (externalLoad || 0);
  }
  return weight || 0;
}

const EPLEY_CONSTANT = 30;

function estimate1RM(load, reps) {
  if (reps === 1) return load;
  return load * (1 + reps / EPLEY_CONSTANT);
}

function estimateWeightForReps(oneRM, reps) {
  return oneRM / (1 + reps / EPLEY_CONSTANT);
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

function updatePagination(name, page, totalPages) {
  const pagination = document.getElementById(`${name}-pagination`);
  if (!pagination) return;
  const currentEl = document.getElementById(`current-${name}-page`);
  const totalEl = document.getElementById(`total-${name}-pages`);
  const prevBtn = document.getElementById(`prev-${name}-page-btn`);
  const nextBtn = document.getElementById(`next-${name}-page-btn`);
  if (currentEl) currentEl.textContent = page;
  if (totalEl) totalEl.textContent = totalPages;
  if (prevBtn) prevBtn.disabled = page <= 1;
  if (nextBtn) nextBtn.disabled = page >= totalPages;
  pagination.classList.toggle('hidden', totalPages <= 1);
}

// UI Selectors
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
const entriesPerPage = 5;
const exerciseSelect = document.getElementById('exercise');


// Onboarding
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

// PB Log
const pbLogExercise = document.getElementById('pb-log-exercise');
const pbLogBtn = document.getElementById('pb-log-btn');
const pbLogFeedback = document.getElementById('pb-log-feedback');

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

const RPE_RIR_MAP = { 10: 0, 9: 1, 8: 2, 7: 3, 6: 4 };

let currentUser = null;
let unsubscribeLogs = null;
let pendingOnboarding1RMs = [];
let unsubscribeProfile = null;
let leaderboardUnsubscribe = null;
let urlParamsProcessed = false;

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

let unsubscribeStructured = null;
let unsubscribePlans = null;
let unsubscribeSharedPlans = null;
let activeDates = new Set();
let listenersAttached = false;
let _favDebounce = {};

const tabContents = document.querySelectorAll('.tab-content');
const navTabs = document.querySelectorAll('.nav-tab');

function switchTab(tabName) {
  if (tabName === 'profile') {
    openProfileModal();
    return;
  }
  tabContents.forEach(el => el.classList.remove('active'));
  const target = document.getElementById('tab-' + tabName);
  if (target) target.classList.add('active');
  navTabs.forEach(el => el.classList.remove('active'));
  const btn = document.querySelector('.nav-tab[data-tab="' + tabName + '"]');
  if (btn) btn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  state.ui.currentTab = tabName;
}

navTabs.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Extract pending friend request from URL before any auth redirect clears it
const pendingFriendUid = new URLSearchParams(window.location.search).get('addFriend');
const pendingClaimPlanId = new URLSearchParams(window.location.search).get('claimPlan');

// Authentication State Listener
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        loginView.classList.add('hidden');
        appView.classList.remove('hidden');
        if (bottomNav) bottomNav.classList.remove('hidden');
        switchTab('dashboard');
        authBtn.innerText = "Sign Out";
        if (profileBtn) profileBtn.classList.remove('hidden');
        window.__irontrackAuthState = 'signed-in';
        state.user.userSignupTs = new Date(user.metadata.creationTime).getTime() || 0;
        
        // ... (existing code: handle, greeting, cyberTag, pullProfileMetrics) ...
        const handle = (user.email || user.uid).split('@')[0];
        greeting.innerText = `Athlete: ${handle}`;
        
        await pullProfileMetrics(user.uid);
        await initSocialProfile(user);

        // Check if onboarding is needed (first-time user)
        if (!state.user.userBiometrics.onboardingComplete) {
            loginView.classList.add('hidden');
            appView.classList.add('hidden');
            if (bottomNav) bottomNav.classList.add('hidden');
            showOnboarding();
            return;
        }

        syncLeaderboardFeed();
        if (listenersAttached) return;
        listenToDataStream(user.uid);
        listenToStructuredWorkouts(user.uid);
        listenToPlans(user.uid);
        listenToSharedPlans(user.uid);
        listenersAttached = true;
        loadConsistencyConfig();

        showQRCode()

        if (pendingFriendUid && !urlParamsProcessed) {
            await processFriendRequest(pendingFriendUid);
        }

        if (pendingClaimPlanId && !urlParamsProcessed) {
            await processClaimedPlan(pendingClaimPlanId);
        }

        if (pendingFriendUid || pendingClaimPlanId) {
            urlParamsProcessed = true;
            window.history.replaceState({}, document.title, window.location.pathname);
        }

    } else {
        if (unsubscribeLogs) { unsubscribeLogs(); unsubscribeLogs = null; }
        if (unsubscribeStructured) { unsubscribeStructured(); unsubscribeStructured = null; }
        if (unsubscribePlans) { unsubscribePlans(); unsubscribePlans = null; }
        if (unsubscribeSharedPlans) { unsubscribeSharedPlans(); unsubscribeSharedPlans = null; }
        if (unsubscribeProfile) { unsubscribeProfile(); unsubscribeProfile = null; }
        if (leaderboardUnsubscribe) { leaderboardUnsubscribe(); leaderboardUnsubscribe = null; }
        loginView.classList.remove('hidden');
        appView.classList.add('hidden');
        if (bottomNav) bottomNav.classList.add('hidden');
        onboardingView.classList.add('hidden');
        pendingOnboarding1RMs = [];
        if (profileBtn) profileBtn.classList.add('hidden');
        if (profileModal) profileModal.classList.add('hidden');
        authBtn.innerText = "Sign In";
        greeting.innerText = "Analytics Dashboard";
        document.getElementById('workout-list').innerHTML = '';
        renderEmptyState(document.getElementById('structured-workout-list'), 'No structured workouts logged yet.');
        document.getElementById('registry-table-body').innerHTML = '';
        state.data.calcEntriesByLift = {};
        const calcEntriesList = document.getElementById('calc-entries-list');
        if (calcEntriesList) renderEmptyState(calcEntriesList, 'Select a lift with data to get started.');
        const calcOneRm = document.getElementById('calc-one-rm-display');
        if (calcOneRm) calcOneRm.textContent = '—';
        document.getElementById('dots-display').innerText = '0.0';
        document.getElementById('dots-tier').innerText = '-';
        document.getElementById('sinclair-display').innerText = '0.0';
        document.getElementById('sinclair-tier').innerText = '-';
        state.social.userFriendsList = [];
        state.social.friendDisplayCache = {};
        sharedPlanId = null;
        state.pagination.friends = 1;
        state.pagination.sharedPlans = 1;
        state.ui.plansFilter = 'mine';
        document.getElementById('friendsListContainer').innerHTML = '';
        const filterMineBtn = document.getElementById('plans-filter-mine');
        const filterSharedBtn = document.getElementById('plans-filter-shared');
        const filterFavBtn = document.getElementById('plans-filter-favorites');
        if (filterMineBtn) filterMineBtn.className = 'btn-core is-primary btn-size-row';
        if (filterSharedBtn) filterSharedBtn.className = 'btn-core is-ghost btn-size-row';
        if (filterFavBtn) filterFavBtn.className = 'btn-core is-ghost btn-size-row';
        document.getElementById('leaderboardRows').innerHTML = '';
        currentUser = null;
        urlParamsProcessed = false;
        activeDates = new Set();
        state.calendar.month = new Date();
        state.calendar.selectedDate = null;
        state.calendar.compact = true;
        state.calendar.weekOffset = 0;
        listenersAttached = false;
        window.__irontrackAuthState = 'signed-out';
    }
});



// Email Core Auth Handlers
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return alert("Please fill out all credential spaces.");

    try {
        await signInWithEmailAndPassword(auth, email, password);
        emailInput.value = "";
        passwordInput.value = "";
    } catch (error) {
        alert(`Authentication Rejected: ${error.message}`);
    }
});

signupBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return alert("Please assign an email and password.");
    if (password.length < 6) return alert("Password security requires at least 6 characters.");

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        emailInput.value = "";
        passwordInput.value = "";
        alert("Account mapped successfully!");
    } catch (error) {
        alert(`Registration Failed: ${error.message}`);
    }
});

authBtn.addEventListener('click', () => { if (currentUser && confirm("Sign out?")) signOut(auth); });

// Toggle Password Visibility
const togglePasswordBtn = document.getElementById('toggle-password-btn');
const eyeIcon = document.getElementById('eye-icon');
const eyeOffIcon = document.getElementById('eye-off-icon');

if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeIcon.classList.toggle('hidden', !isPassword);
    eyeOffIcon.classList.toggle('hidden', isPassword);
  });
}

document.querySelectorAll('.toggle-pw-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    const isPassword = target.type === 'password';
    target.type = isPassword ? 'text' : 'password';
    btn.querySelector('.eye-icon').classList.toggle('hidden', !isPassword);
    btn.querySelector('.eye-off-icon').classList.toggle('hidden', isPassword);
  });
});

// Forgot Password Flow
const forgotPasswordBtn = document.getElementById('forgot-password-btn');
const forgotPasswordSection = document.getElementById('forgot-password-section');
const forgotPasswordEmail = document.getElementById('forgot-password-email');
const forgotPasswordSend = document.getElementById('forgot-password-send');
const forgotPasswordCancel = document.getElementById('forgot-password-cancel');
const forgotPasswordFeedback = document.getElementById('forgot-password-feedback');
const authFormContainer = document.getElementById('auth-form-container');

function showForgotPassword() {
  authFormContainer.classList.add('hidden');
  forgotPasswordSection.classList.remove('hidden');
  forgotPasswordEmail.value = emailInput.value || '';
  forgotPasswordEmail.focus();
  forgotPasswordFeedback.textContent = '';
  forgotPasswordFeedback.className = 'text-xs text-slate-500 font-medium text-center h-4';
}

function showAuthForm() {
  forgotPasswordSection.classList.add('hidden');
  authFormContainer.classList.remove('hidden');
  forgotPasswordFeedback.textContent = '';
  forgotPasswordFeedback.className = 'text-xs text-slate-500 font-medium text-center h-4';
}

if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener('click', showForgotPassword);
}

if (forgotPasswordCancel) {
  forgotPasswordCancel.addEventListener('click', showAuthForm);
}

if (forgotPasswordSend) {
  forgotPasswordSend.addEventListener('click', async () => {
    const email = forgotPasswordEmail.value.trim();
    if (!email) {
      forgotPasswordFeedback.textContent = 'Enter your email address.';
      forgotPasswordFeedback.className = 'text-xs text-rose-400 font-medium text-center h-4';
      return;
    }
    forgotPasswordSend.disabled = true;
    forgotPasswordSend.textContent = 'Sending...';
    try {
      await sendPasswordResetEmail(auth, email);
      forgotPasswordFeedback.textContent = 'Reset link sent! Check your email.';
      forgotPasswordFeedback.className = 'text-xs text-emerald-400 font-medium text-center h-4';
      setTimeout(showAuthForm, 2000);
    } catch (error) {
      const msg = error.code === 'auth/user-not-found'
        ? 'No account found with this email.'
        : error.code === 'auth/invalid-email'
        ? 'Invalid email address.'
        : `Failed: ${error.message}`;
      forgotPasswordFeedback.textContent = msg;
      forgotPasswordFeedback.className = 'text-xs text-rose-400 font-medium text-center h-4';
    } finally {
      forgotPasswordSend.disabled = false;
      forgotPasswordSend.textContent = 'Send Reset Link';
    }
  });
}

// Profile Management Sync
async function pullProfileMetrics(uid) {
    try {
        const docRef = doc(db, "profiles", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            state.user.userBiometrics = { gender: 'male', bodyweight: 75, displayName: '', ...docSnap.data() };
            if (docSnap.data().challengeStreaks) {
                state.user.userChallengeStreaks = {
                    monthly: { completedPeriods: [], currentStreak: 0, bestStreak: 0, ...docSnap.data().challengeStreaks.monthly },
                    yearly: { completedPeriods: [], currentStreak: 0, bestStreak: 0, ...docSnap.data().challengeStreaks.yearly }
                };
            }
            document.getElementById('profile-gender').value = state.user.userBiometrics.gender;
            document.getElementById('profile-weight').value = state.user.userBiometrics.bodyweight;
            document.getElementById('profile-display-name').value = state.user.userBiometrics.displayName || '';
        }
        const emailEl = document.getElementById('profile-email');
        if (emailEl && auth.currentUser) emailEl.value = auth.currentUser.email || '';
        const saveBtn = document.getElementById('save-profile-btn');
        if (saveBtn) saveBtn.disabled = true;
    } catch (err) {
        console.error('Failed to load profile metrics', err.code, err.message);
        showFeedback('Unable to load profile metrics. Check Firestore rules for profiles.', 'red');
    }
}

function showOnboarding() {
    onboardingView.classList.remove('hidden');
    // Populate exercise dropdown
    const groups = ['barbell', 'dumbbell', 'kettlebell', 'cardio', 'bodyweight'];
    if (onboardingExerciseSelect) {
        onboardingExerciseSelect.innerHTML = buildExerciseOptionsHtml(groups, '<option value="" disabled selected>Select exercise...</option>');
    }
    pendingOnboarding1RMs = [];
    renderOnboarding1RMList();
}

function hideOnboarding() {
    onboardingView.classList.add('hidden');
    appView.classList.remove('hidden');
}

function renderOnboarding1RMList() {
    if (!onboardingList || !onboardingEmpty) return;
    if (pendingOnboarding1RMs.length === 0) {
        onboardingList.innerHTML = `<p class="text-xs text-slate-500 italic py-2 text-center" id="onboarding-1rm-empty">No lifts added yet.</p>`;
        return;
    }
    let html = '';
    pendingOnboarding1RMs.forEach((item, index) => {
        const repLabel = item.reps > 1 ? ` @ ${item.reps} reps` : '';
        html += `
            <div class="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2">
                <span class="text-sm text-slate-200 font-medium">${escapeHtml(item.exercise)}</span>
                <span class="text-sm text-emerald-400 font-mono font-bold">${item.weight} kg${repLabel}</span>
                <button type="button" class="text-rose-400 hover:text-rose-300 text-xs font-bold cursor-pointer bg-transparent border-none" data-index="${index}"><i data-lucide="circle-minus" size="18"></i></button>
            </div>`;
    });
    onboardingList.innerHTML = html;

    // Attach remove handlers
    onboardingList.querySelectorAll('[data-index]').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index, 10);
            pendingOnboarding1RMs.splice(idx, 1);
            renderOnboarding1RMList();
        });
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addOnboarding1RM() {
    const exercise = onboardingExerciseSelect?.value;
    const weight = parseFloat(onboardingWeightInput?.value);
    const reps = parseInt(onboardingRepsInput?.value, 10) || 1;

    if (!exercise) {
        showFeedback('Please select an exercise.', 'red', 'onboarding-feedback');
        return;
    }
    if (!weight || weight <= 0) {
        showFeedback('Please enter a valid weight.', 'red', 'onboarding-feedback');
        return;
    }
    if (pendingOnboarding1RMs.some(item => item.exercise === exercise)) {
        showFeedback('Exercise already added. Remove it first to re-enter.', 'red', 'onboarding-feedback');
        return;
    }

    pendingOnboarding1RMs.push({ exercise, weight, reps });
    renderOnboarding1RMList();

    // Reset inputs
    onboardingExerciseSelect.value = '';
    onboardingWeightInput.value = '';
    onboardingRepsInput.value = '1';
    document.getElementById('onboarding-feedback').textContent = '';
}

function collectOnboardingFormValues() {
  return {
    gender: onboardingGender?.value || 'male',
    bodyweight: parseFloat(onboardingWeight?.value) || 75,
    day0Monthly: parseInt(onboardingDaysMonthly?.value, 10) || 0,
    day0Yearly: parseInt(onboardingDaysYearly?.value, 10) || 0,
    day0Lifetime: parseInt(onboardingDaysLifetime?.value, 10) || 0
  };
}

function buildOnboardingProfileData(values, pending1RMs) {
  const profileData = {
    gender: values.gender,
    bodyweight: values.bodyweight,
    day0TrainingDays: { monthly: values.day0Monthly, yearly: values.day0Yearly, lifetime: values.day0Lifetime },
    onboardingComplete: true,
    onboardedAt: serverTimestamp()
  };
  if (pending1RMs.length > 0) {
    const startingMaxes = {};
    pending1RMs.forEach(item => { startingMaxes[item.exercise] = item.weight; });
    profileData.startingMaxes = startingMaxes;
  }
  return profileData;
}

function buildOnboardingLogEntry(item, userId) {
  return {
    userId,
    exercise: item.exercise,
    sets: 1,
    reps: item.reps,
    weight: item.weight,
    externalLoad: 0,
    estimatedLoad: item.weight,
    totalVolume: item.weight * item.reps,
    timestamp: Timestamp.now(),
    source: 'onboarding',
    isInitialMax: true
  };
}

async function saveOnboarding() {
    if (!currentUser) return;

    const values = collectOnboardingFormValues();

    if (onboardingSaveBtn) onboardingSaveBtn.disabled = true;

    try {
        const profileRef = doc(db, "profiles", currentUser.uid);
        const profileData = buildOnboardingProfileData(values, pendingOnboarding1RMs);
        await setDoc(profileRef, profileData, { merge: true });

        state.user.userBiometrics.gender = values.gender;
        state.user.userBiometrics.bodyweight = values.bodyweight;
        state.user.userBiometrics.day0TrainingDays = { monthly: values.day0Monthly, yearly: values.day0Yearly, lifetime: values.day0Lifetime };
        state.user.userBiometrics.onboardingComplete = true;

        document.getElementById('profile-gender').value = values.gender;
        document.getElementById('profile-weight').value = values.bodyweight;

        for (const item of pendingOnboarding1RMs) {
            await addDoc(collection(db, "workouts"), buildOnboardingLogEntry(item, currentUser.uid));
        }

        hideOnboarding();
        showFeedback('Profile initialized! Welcome to IronTrack.', 'emerald');

        syncLeaderboardFeed();
        if (listenersAttached) return;
        listenToDataStream(currentUser.uid);
        listenToStructuredWorkouts(currentUser.uid);
        listenToPlans(currentUser.uid);
        listenersAttached = true;
        loadConsistencyConfig();
        showQRCode();

    } catch (err) {
        console.error('Onboarding failed', err.code, err.message);
        showFeedback('Failed to save profile: ' + err.message, 'red', 'onboarding-feedback');
    } finally {
        if (onboardingSaveBtn) onboardingSaveBtn.disabled = false;
    }
}

function refreshPBForm() {
  const exercise = document.getElementById('pb-log-exercise')?.value;
  if (!exercise) { renderFormFields('pb-log-fields', FORM_SCHEMAS.logPB.standard); return; }
  const schemaKey = getSchemaKey(exercise);
  const schema = FORM_SCHEMAS.logPB[schemaKey] || FORM_SCHEMAS.logPB.standard;
  const result = renderFormFields('pb-log-fields', schema, {
    initialValues: { 'pb-bodyweight': state.user.userBiometrics.bodyweight || 0 },
    onFieldChange: (values) => {
      const total = document.getElementById('pb-total-load');
      if (total) total.textContent = computeTotalLoad(values, exercise, 'pb');
    }
  });
  if (result && result.fields['pb-bodyweight']) {
    result.fields['pb-bodyweight'].value = state.user.userBiometrics.bodyweight || '';
  }
  if (result && result.fields['pb-total-load']) {
    const initValues = { ...result.fieldValues, 'pb-bodyweight': state.user.userBiometrics.bodyweight || 0 };
    result.fields['pb-total-load'].textContent = computeTotalLoad(initValues, exercise, 'pb');
  }
}

async function logPB() {
    if (!currentUser) return;
    const exercise = pbLogExercise?.value;
    if (!exercise) {
        showFeedback('Please select an exercise.', 'red', 'pb-log-feedback');
        return;
    }
    const schemaKey = getSchemaKey(exercise);
    let weight, externalLoad = 0, estimatedLoad;
    const bw = state.user.userBiometrics.bodyweight || 0;
    if (schemaKey === 'bodyweight') {
      weight = parseFloat(document.getElementById('pb-bodyweight')?.value) || bw;
      estimatedLoad = computeEffectiveLoad(exercise, weight, 0, bw);
    } else if (schemaKey === 'weighted') {
      weight = parseFloat(document.getElementById('pb-bodyweight')?.value) || bw;
      externalLoad = parseFloat(document.getElementById('pb-ext-load')?.value) || 0;
      estimatedLoad = computeEffectiveLoad(exercise, weight, externalLoad, bw);
      weight += externalLoad;
    } else {
      weight = parseFloat(document.getElementById('pb-weight')?.value);
      estimatedLoad = computeEffectiveLoad(exercise, weight, 0, bw);
    }
    const reps = parseInt(document.getElementById('pb-reps')?.value, 10) || 1;

    let storedExercise = exercise;
    if (exercise === 'Pull Up' && externalLoad > 0) {
        storedExercise = 'Pull Up (Weighted)';
    }

    if (!weight || weight <= 0) {
        showFeedback('Please enter a valid weight.', 'red', 'pb-log-feedback');
        return;
    }

    if (pbLogBtn) pbLogBtn.disabled = true;

    try {
        const logEntry = {
            userId: currentUser.uid,
            exercise: storedExercise,
            sets: 1,
            reps,
            weight,
            externalLoad,
            estimatedLoad,
            totalVolume: estimatedLoad * reps,
            timestamp: Timestamp.now(),
            source: 'pb-log',
            isInitialMax: false
        };
        await addDoc(collection(db, "workouts"), logEntry);

        pbLogExercise.value = '';
        refreshPBForm();
        showFeedback('Record logged! It will appear in your records.', 'emerald', 'pb-log-feedback');
        haptic(HAPTIC.confirm);
    } catch (err) {
        console.error('Failed to log record', err.code, err.message);
        showFeedback('Failed to log record: ' + err.message, 'red', 'pb-log-feedback');
    } finally {
        if (pbLogBtn) pbLogBtn.disabled = false;
    }
}

profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const displayName = document.getElementById('profile-display-name').value.trim()
        || currentUser.email?.split('@')[0]
        || 'Anonymous Cyber-Lifter';
    document.getElementById('profile-display-name').value = displayName;

    state.user.userBiometrics = {
        gender: document.getElementById('profile-gender').value,
        bodyweight: parseFloat(document.getElementById('profile-weight').value),
        displayName
    };

    try {
        await setDoc(doc(db, "profiles", currentUser.uid), state.user.userBiometrics, { merge: true });
        processAnalytics();
        showFeedback('Profile updated successfully!', 'emerald', 'profileFeedback');
        saveProfileBtn.disabled = true;
        haptic(HAPTIC.confirm);
    } catch (err) {
        console.error('Failed to save profile', err.code, err.message);
        showFeedback('Unable to update profile: ' + err.message, 'red', 'profileFeedback');
    }
});

// ── Profile form dirty-state tracking ────────────────────────
const saveProfileBtn = document.getElementById('save-profile-btn');
const profileFields = ['profile-display-name', 'profile-gender', 'profile-weight'];
function enableSaveOnDirty() { saveProfileBtn.disabled = false; }
profileFields.forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', enableSaveOnDirty);
    el.addEventListener('change', enableSaveOnDirty);
  }
});

// ── Change Password ────────────────────────────────────────────
const changePasswordBtn = document.getElementById('change-password-btn');
const changePasswordForm = document.getElementById('change-password-form');
const cpCurrent = document.getElementById('cp-current');
const cpNew = document.getElementById('cp-new');
const cpConfirm = document.getElementById('cp-confirm');
const cpCancel = document.getElementById('cp-cancel');
const cpUpdate = document.getElementById('cp-update');
const cpFeedback = document.getElementById('cp-feedback');

if (changePasswordBtn && changePasswordForm) {
  changePasswordBtn.addEventListener('click', () => {
    changePasswordBtn.classList.add('hidden');
    changePasswordForm.classList.remove('hidden');
    cpFeedback.textContent = '';
    cpFeedback.className = 'text-xs text-slate-500 font-medium h-4 text-center';
  });
}

if (cpCancel) {
  cpCancel.addEventListener('click', () => {
    changePasswordForm.classList.add('hidden');
    changePasswordBtn.classList.remove('hidden');
    cpCurrent.value = '';
    cpNew.value = '';
    cpConfirm.value = '';
    cpFeedback.textContent = '';
  });
}

if (cpUpdate) {
  cpUpdate.addEventListener('click', async () => {
    const currentPw = cpCurrent.value;
    const newPw = cpNew.value;
    const confirmPw = cpConfirm.value;

    if (!currentPw || !newPw || !confirmPw) {
      cpFeedback.textContent = 'Fill in all password fields.';
      cpFeedback.className = 'text-xs text-rose-400 font-medium h-4 text-center';
      return;
    }
    if (newPw.length < 6) {
      cpFeedback.textContent = 'New password must be at least 6 characters.';
      cpFeedback.className = 'text-xs text-rose-400 font-medium h-4 text-center';
      return;
    }
    if (newPw !== confirmPw) {
      cpFeedback.textContent = 'New passwords do not match.';
      cpFeedback.className = 'text-xs text-rose-400 font-medium h-4 text-center';
      return;
    }
    if (newPw === currentPw) {
      cpFeedback.textContent = 'New password must differ from current.';
      cpFeedback.className = 'text-xs text-rose-400 font-medium h-4 text-center';
      return;
    }

    cpUpdate.disabled = true;
    cpUpdate.textContent = 'Updating...';
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPw);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPw);
      cpFeedback.textContent = 'Password updated successfully!';
      cpFeedback.className = 'text-xs text-emerald-400 font-medium h-4 text-center';
      cpCurrent.value = '';
      cpNew.value = '';
      cpConfirm.value = '';
      setTimeout(() => {
        changePasswordForm.classList.add('hidden');
        changePasswordBtn.classList.remove('hidden');
        cpFeedback.textContent = '';
      }, 2000);
      haptic(HAPTIC.confirm);
    } catch (err) {
      const msg = err.code === 'auth/wrong-password'
        ? 'Current password is incorrect.'
        : err.code === 'auth/weak-password'
        ? 'New password is too weak.'
        : err.code === 'auth/requires-recent-login'
        ? 'Please sign out and sign in again, then retry.'
        : `Failed: ${err.message}`;
      cpFeedback.textContent = msg;
      cpFeedback.className = 'text-xs text-rose-400 font-medium h-4 text-center';
    } finally {
      cpUpdate.disabled = false;
      cpUpdate.textContent = 'Update Password';
    }
  });
}

// ── Delete Account ─────────────────────────────────────────────
const deleteAccountBtn = document.getElementById('delete-account-btn');

if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener('click', async () => {
    if (!auth.currentUser) return;
    const email = auth.currentUser.email || 'Unknown';
    const msg = `⚠️ PERMANENT ACTION ⚠️\n\nThis will permanently delete your IronTrack account.\n\nEmail: ${email}\n\nYour lifts and workout history will remain anonymised, but your profile, display name, and social connections will be lost forever.\n\nThis cannot be undone.\n\nType "DELETE" to confirm.`;
    const input = prompt(msg);
    if (input !== 'DELETE') return;

    const pw = prompt('Enter your password to confirm deletion:');
    if (!pw) return;

    deleteAccountBtn.disabled = true;
    deleteAccountBtn.textContent = 'Deleting...';
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, pw);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await deleteDoc(doc(db, "profiles", auth.currentUser.uid));
      await deleteUser(auth.currentUser);
      haptic(HAPTIC.confirm);
    } catch (err) {
      const msg = err.code === 'auth/wrong-password'
        ? 'Incorrect password. Account not deleted.'
        : err.code === 'auth/requires-recent-login'
        ? 'Session expired. Please sign out and sign in again, then retry.'
        : `Failed to delete account: ${err.message}`;
      showFeedback(msg, 'red', 'profileFeedback');
      deleteAccountBtn.disabled = false;
      deleteAccountBtn.textContent = 'Delete Account';
    }
  });
}

// Onboarding Event Listeners
if (onboardingAddBtn) {
    onboardingAddBtn.addEventListener('click', addOnboarding1RM);
}
if (onboardingSaveBtn) {
    onboardingSaveBtn.addEventListener('click', saveOnboarding);
}
// Allow pressing Enter in weight input to trigger add
if (onboardingWeightInput) {
    onboardingWeightInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addOnboarding1RM(); }
    });
}
if (onboardingExerciseSelect) {
    onboardingExerciseSelect.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addOnboarding1RM(); }
    });
}

// PB Log Event Listeners
if (pbLogBtn) {
    pbLogBtn.addEventListener('click', logPB);
}
if (pbLogExercise) {
    pbLogExercise.addEventListener('change', refreshPBForm);
    pbLogExercise.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); logPB(); }
    });
}
// Delegate Enter key on recreated PB inputs
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest('#pb-log-fields')) {
        e.preventDefault();
        logPB();
    }
});

// Realtime Data Mining

function processWorkoutSnapshot(docs, getEffectiveLoad, estimate1RM) {
  const workouts = [];
  const activeRecords = {};
  const cachedMaxLoadByExercise = {};
  const cachedMax1RMByExercise = {};
  const cachedMaxRepsByExercise = {};

  docs.forEach(doc => {
    const data = doc.data();
    const timestamp = data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp;
    const workout = { id: doc.id, ...data, timestamp };
    workouts.push(workout);

    if (data.source === 'structured') return;

    const effectiveWeight = getEffectiveLoad(workout);
    const reps = parseInt(data.reps, 10);
    const calculated1RM = estimate1RM(effectiveWeight, reps);

    if (!activeRecords[data.exercise] || calculated1RM > activeRecords[data.exercise]) {
      activeRecords[data.exercise] = calculated1RM;
    }

    if (!cachedMaxLoadByExercise[data.exercise] || effectiveWeight > cachedMaxLoadByExercise[data.exercise]) {
      cachedMaxLoadByExercise[data.exercise] = effectiveWeight;
    }
    if (!cachedMax1RMByExercise[data.exercise] || calculated1RM > cachedMax1RMByExercise[data.exercise]) {
      cachedMax1RMByExercise[data.exercise] = calculated1RM;
    }

    if (!cachedMaxRepsByExercise[data.exercise] || reps > cachedMaxRepsByExercise[data.exercise]) {
      cachedMaxRepsByExercise[data.exercise] = reps;
    }
  });

  return { workouts, activeRecords, cachedMaxLoadByExercise, cachedMax1RMByExercise, cachedMaxRepsByExercise };
}

function updateCaches(processed) {
  state.cache.activeRecords = processed.activeRecords;
  state.cache.cachedMaxLoadByExercise = processed.cachedMaxLoadByExercise;
  state.cache.cachedMax1RMByExercise = processed.cachedMax1RMByExercise;
  state.cache.cachedMaxRepsByExercise = processed.cachedMaxRepsByExercise;
  
  state.data.lastWorkouts = processed.workouts;
  window.__lastWorkouts = state.data.lastWorkouts;
  window.__irontrackWorkoutCount = state.data.lastWorkouts.length;
  
  if (state.data.lastWorkouts.length > 0) {
    const earliestTs = Math.min(...state.data.lastWorkouts.map(w => w.timestamp));
    if (earliestTs > 0 && earliestTs < state.user.userSignupTs) {
      state.user.userSignupTs = earliestTs;
    }
  }
}

function renderFromWorkouts(workouts) {
  try {
    const uniqueExercises = Array.from(new Set(workouts.map(w => w.exercise)));
    populateWorkoutFilter(uniqueExercises);
    populateVolumeFilter(uniqueExercises);
  } catch (e) {
    // ignore if populate not available
  }
  
  update1RMRegistryUI();
  updateCalcCard();
  processAnalytics();
  renderLogs(workouts);
  renderVolumeHistory();
  debouncedSyncActivity();
}

function listenToDataStream(uid) {
    const q = query(
        collection(db, "workouts"),
        where("userId", "==", uid),
        orderBy("timestamp", "desc"),
        limit(500)
    );
    unsubscribeLogs = onSnapshot(q, async (snapshot) => {
        const processed = processWorkoutSnapshot(snapshot.docs, getEffectiveLoad, estimate1RM);
        updateCaches(processed);
        renderFromWorkouts(processed.workouts);
    }, (error) => {
        console.error('Workout stream error', error.code, error.message);
        if (error.code === 'permission-denied') {
            const el = document.getElementById('workout-list');
            if (el) el.innerHTML = `<div class="bg-slate-800 border border-slate-700 rounded-xl p-4 text-red-400 text-xs text-center">Workouts blocked by Firestore rules.</div>`;
        }
    });
}

function update1RMRegistryUI() {
    const tableBody = document.getElementById('registry-table-body');
    if (!tableBody) return;

    const manualWorkouts = state.data.lastWorkouts.filter(w => w.source !== 'structured');

    const uniqueExercises = Array.from(new Set(manualWorkouts.map(w => w.exercise))).filter(Boolean).sort();

    if (uniqueExercises.length === 0) {
        renderEmptyState(tableBody, 'No logs recorded yet.', 'col-span-3');
        const pagination = document.getElementById('records-pagination');
        if (pagination) pagination.classList.add('hidden');
        return;
    }

    const recordsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(uniqueExercises.length / recordsPerPage));
    state.pagination.records = Math.min(state.pagination.records, totalPages);
    const start = (state.pagination.records - 1) * recordsPerPage;
    const pageExercises = uniqueExercises.slice(start, start + recordsPerPage);

    let html = '';
    pageExercises.forEach(exercise => {
        const info = getExerciseInfo(exercise);
        const isBodyweight = info.type === 'bodyweight';

        if (isBodyweight) {
            const maxReps = state.cache.cachedMaxRepsByExercise[exercise] || 0;
            html += `
                <span class="text-slate-400 font-medium truncate">${escapeHtml(exercise)}</span>
                <span class="text-slate-200 font-mono text-right">—</span>
                <span class="text-slate-200 font-mono text-right">${maxReps} reps</span>
            `;
        } else {
            const maxEstimated1RM = state.cache.cachedMax1RMByExercise[exercise] || 0;
            const absolutePB = state.cache.cachedMaxLoadByExercise[exercise] || 0;
            html += `
                <span class="text-slate-400 font-medium truncate">${escapeHtml(exercise)}</span>
                <span class="text-slate-200 font-mono text-right">${Math.round(maxEstimated1RM)} kg</span>
                <span class="text-slate-200 font-mono text-right">${Math.round(absolutePB)} kg</span>
            `;
        }
    });

    tableBody.innerHTML = html;

    updatePagination('records', state.pagination.records, totalPages);
}

function updateCalcCard() {
    const select = document.getElementById('calc-lift-select');
    const oneRmDisplay = document.getElementById('calc-one-rm-display');
    if (!select) return;

    const exercise = select.value;
    if (!exercise) {
        if (oneRmDisplay) oneRmDisplay.textContent = '—';
        renderCalcEntries();
        return;
    }

    const oneRM = state.cache.activeRecords[exercise] || 0;
    if (oneRmDisplay) {
        oneRmDisplay.textContent = oneRM > 0 ? `${Math.round(oneRM)} kg` : '—';
    }

    renderCalcEntries();
    updateCalcPreview();
}

let currentCalcMode = 'pct';

function switchCalcMode(mode) {
    currentCalcMode = mode;
    const pctInputs = document.getElementById('calc-pct-inputs');
    const rpeInputs = document.getElementById('calc-rpe-inputs');
    const pctTab = document.getElementById('calc-mode-pct');
    const rpeTab = document.getElementById('calc-mode-rpe');
    if (!pctInputs || !rpeInputs || !pctTab || !rpeTab) return;

    if (mode === 'pct') {
        pctInputs.classList.remove('hidden');
        rpeInputs.classList.add('hidden');
        pctTab.className = 'btn-core is-primary btn-size-row';
        rpeTab.className = 'btn-core is-ghost btn-size-row';
    } else {
        pctInputs.classList.add('hidden');
        rpeInputs.classList.remove('hidden');
        pctTab.className = 'btn-core is-ghost btn-size-row';
        rpeTab.className = 'btn-core is-primary btn-size-row';
    }
    updateCalcPreview();
}

function updateCalcPreview() {
    const previewWeight = document.getElementById('calc-preview-weight');
    const previewDetail = document.getElementById('calc-preview-detail');
    const addBtn = document.getElementById('calc-add-btn');
    if (!previewWeight || !previewDetail) return;

    const select = document.getElementById('calc-lift-select');
    if (!select) return;
    const exercise = select.value;
    const oneRM = state.cache.activeRecords[exercise] || 0;

    if (!exercise || oneRM <= 0) {
        previewWeight.textContent = '—';
        previewDetail.textContent = 'Select a lift with 1RM data to see recommended weight.';
        if (addBtn) addBtn.disabled = true;
        return;
    }

    let weight = null;
    let detail = '';

    if (currentCalcMode === 'pct') {
        const pctInput = document.getElementById('calc-pct-input');
        const pct = parseFloat(pctInput?.value);
        if (isNaN(pct) || pct <= 0) {
            previewWeight.textContent = '—';
            previewDetail.textContent = 'Enter a percentage to calculate working weight.';
            if (addBtn) addBtn.disabled = true;
            return;
        }
        weight = oneRM * pct / 100;
        detail = `${pct}% of ${Math.round(oneRM)} kg`;
    } else {
        const repsInput = document.getElementById('calc-rpe-reps');
        const rpeSelect = document.getElementById('calc-rpe-select');
        const reps = parseInt(repsInput?.value, 10);
        const rpe = parseFloat(rpeSelect?.value);

        if (!reps || reps < 1 || isNaN(rpe) || rpe < 1 || rpe > 10) {
            previewWeight.textContent = '—';
            previewDetail.textContent = 'Enter reps and RPE (1–10) to calculate working weight.';
            if (addBtn) addBtn.disabled = true;
            return;
        }

        const rir = 10 - rpe;
        const totalRepsPossible = reps + rir;
        weight = estimateWeightForReps(oneRM, totalRepsPossible);
        detail = `${reps} reps @ RPE ${rpe}  ·  ${rir} RIR  ·  Based on est. 1RM: ${Math.round(oneRM)} kg`;
    }

    previewWeight.textContent = weight > 0 ? `${weight.toFixed(1)} kg` : '—';
    previewDetail.textContent = detail;
    if (addBtn) addBtn.disabled = weight <= 0;
}

function handleCalcAdd() {
    const select = document.getElementById('calc-lift-select');
    if (!select) return;
    const exercise = select.value;
    const oneRM = state.cache.activeRecords[exercise] || 0;
    if (!exercise || oneRM <= 0) return;

    if (!state.data.calcEntriesByLift[exercise]) {
        state.data.calcEntriesByLift[exercise] = [];
    }

    if (currentCalcMode === 'pct') {
        const pctInput = document.getElementById('calc-pct-input');
        const pct = parseFloat(pctInput?.value);
        if (isNaN(pct) || pct <= 0) return;
        state.data.calcEntriesByLift[exercise].push({ type: 'pct', pct });
        pctInput.value = '';
    } else {
        const repsInput = document.getElementById('calc-rpe-reps');
        const rpeSelect = document.getElementById('calc-rpe-select');
        const reps = parseInt(repsInput?.value, 10);
        const rpe = parseFloat(rpeSelect?.value);
        if (!reps || reps < 1 || isNaN(rpe)) return;
        state.data.calcEntriesByLift[exercise].push({ type: 'rpe', reps, rpe });
        repsInput.value = '';
        rpeSelect.value = '';
    }

    renderCalcEntries();
    updateCalcPreview();
    haptic(HAPTIC.confirm);
}

function handleCalcRemove(btnEl) {
    if (!btnEl) return;
    const exercise = btnEl.dataset.exercise;
    const idx = parseInt(btnEl.dataset.index, 10);
    if (!state.data.calcEntriesByLift[exercise] || isNaN(idx) || idx < 0 || idx >= state.data.calcEntriesByLift[exercise].length) return;
    state.data.calcEntriesByLift[exercise].splice(idx, 1);
    renderCalcEntries();
}

function handleCalcClear() {
    state.data.calcEntriesByLift = {};
    renderCalcEntries();
}

function renderCalcEntries() {
    const entriesList = document.getElementById('calc-entries-list');
    if (!entriesList) return;

    let allEntries = [];
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
            const rir = 10 - entry.rpe;
            weight = Math.round(estimateWeightForReps(oneRM, entry.reps + rir));
            source = `${entry.exercise} ${entry.reps} reps @ RPE ${entry.rpe}`;
        }
        html += `
        <div class="flex justify-between items-center py-1.5 px-1 rounded-lg hover:bg-slate-800/40">
            <span class="text-slate-200 font-mono text-sm">${escapeHtml(source)}</span>
            <div class="flex items-center gap-2">
                <span class="text-slate-200 font-mono text-sm">${weight} kg</span>
                <button onclick="handleCalcRemove(this)" data-exercise="${escapeHtml(entry.exercise)}" data-index="${entry.idx}" class="text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"><i data-lucide="circle-minus" size="18"></i></button>
            </div>
        </div>`;
    });

    entriesList.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
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

function updatePaginationControls(totalPages) {
    if (!paginationControls || !currentPageDisplay || !totalPagesDisplay || !prevPageBtn || !nextPageBtn) return;

    const isVisible = totalPages > 1;
    paginationControls.classList.toggle('hidden', !isVisible);
    currentPageDisplay.innerText = state.pagination.workouts;
    totalPagesDisplay.innerText = totalPages;

    prevPageBtn.disabled = state.pagination.workouts <= 1;
    nextPageBtn.disabled = state.pagination.workouts >= totalPages;
}

function changePage(direction) {
    const totalPages = Math.max(1, Math.ceil(state.data.paginatedWorkouts.length / entriesPerPage));
    if (direction === 'prev' && state.pagination.workouts > 1) {
        state.pagination.workouts -= 1;
    } else if (direction === 'next' && state.pagination.workouts < totalPages) {
        state.pagination.workouts += 1;
    }
    renderLogs(state.data.lastWorkouts);
}

if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => changePage('prev'));
}
if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => changePage('next'));
}

function changeRecordsPage(direction) {
    const manualWorkouts = state.data.lastWorkouts.filter(w => w.source !== 'structured');
    const uniqueExercises = Array.from(new Set(manualWorkouts.map(w => w.exercise))).filter(Boolean).sort();
    const totalPages = Math.max(1, Math.ceil(uniqueExercises.length / 10));
    if (direction === 'prev' && state.pagination.records > 1) {
        state.pagination.records--;
    } else if (direction === 'next' && state.pagination.records < totalPages) {
        state.pagination.records++;
    }
    update1RMRegistryUI();
}

const prevRecordsBtn = document.getElementById('prev-records-page-btn');
const nextRecordsBtn = document.getElementById('next-records-page-btn');
if (prevRecordsBtn) {
    prevRecordsBtn.addEventListener('click', () => changeRecordsPage('prev'));
}
if (nextRecordsBtn) {
    nextRecordsBtn.addEventListener('click', () => changeRecordsPage('next'));
}
if (workoutFilter) {
  workoutFilter.addEventListener('change', () => {
    state.pagination.workouts = 1;
    renderLogs(state.data.lastWorkouts);
  });
}

// Wire exercise dropdown change
if (exerciseSelect) {
  exerciseSelect.addEventListener('change', refreshLogSetForm);
}

// Populate exercise dropdown on load
populateExerciseDropdown();
populateLiftSelectors();
refreshLogSetForm();
refreshPBForm();

// Wire calculator events
const calcLiftSelect = document.getElementById('calc-lift-select');
const calcPctInput = document.getElementById('calc-pct-input');
const calcRpeReps = document.getElementById('calc-rpe-reps');
const calcRpeSelect = document.getElementById('calc-rpe-select');
const calcAddBtn = document.getElementById('calc-add-btn');
const calcClearBtn = document.getElementById('calc-clear-btn');

if (calcLiftSelect) {
    calcLiftSelect.addEventListener('change', updateCalcCard);
}
if (calcPctInput) {
    calcPctInput.addEventListener('input', updateCalcPreview);
    calcPctInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCalcAdd();
        }
    });
}
if (calcRpeReps) {
    calcRpeReps.addEventListener('input', updateCalcPreview);
    calcRpeReps.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCalcAdd();
        }
    });
}
if (calcRpeSelect) {
    calcRpeSelect.addEventListener('change', updateCalcPreview);
}
if (calcAddBtn) {
    calcAddBtn.addEventListener('click', handleCalcAdd);
}
if (calcClearBtn) {
    calcClearBtn.addEventListener('click', handleCalcClear);
}

// Wire PB / 1RM chips (toggle buttons) - use dataset.active as single source of truth
const chipPBEl = document.getElementById('chip-pb'); //
const chip1RMEl = document.getElementById('chip-1rm'); //

if (chipPBEl) {
  chipPBEl.dataset.active = 'false'; //
  chipPBEl.addEventListener('click', () => {
    const active = chipPBEl.dataset.active !== 'true'; //
    chipPBEl.dataset.active = active ? 'true' : 'false'; //
    
    // Toggle class state cleanly based on status
    chipPBEl.classList.toggle('is-active', active);
    
    state.pagination.workouts = 1; //
    renderLogs(state.data.lastWorkouts); //
  });
}

if (chip1RMEl) {
  chip1RMEl.dataset.active = 'false'; //
  chip1RMEl.addEventListener('click', () => {
    const active = chip1RMEl.dataset.active !== 'true'; //
    chip1RMEl.dataset.active = active ? 'true' : 'false'; //
    
    // Toggle class state cleanly based on status
    chip1RMEl.classList.toggle('is-active', active);
    
    state.pagination.workouts = 1; //
    renderLogs(state.data.lastWorkouts); //
  });
}



function buildExerciseOptionsHtml(categories, placeholder) {
  const labels = { barbell: 'Barbell', dumbbell: 'Dumbbell', kettlebell: 'Kettlebell', cardio: 'Cardio', bodyweight: 'Bodyweight' };
  const sortByName = (a, b) => a.name.localeCompare(b.name);
  let html = placeholder;
  categories.forEach(cat => {
    const items = EXERCISE_CATALOG.filter(ex => ex.category === cat).sort(sortByName);
    if (items.length) {
      html += `<optgroup label="─ ${labels[cat]} ─">`;
      items.forEach(ex => { if (ex.hidden) return; html += `<option value="${ex.name}">${ex.name}</option>`; });
      html += `</optgroup>`;
    }
  });
  return html;
}

function populateExerciseDropdown() {
  const groups = ['barbell', 'dumbbell', 'kettlebell', 'cardio', 'bodyweight'];
  const html = buildExerciseOptionsHtml(groups, '<option value="" disabled selected>Select exercise...</option>');

  const select = document.getElementById('exercise');
  if (select) {
    const currentVal = select.value;
    select.innerHTML = html;
    if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
      select.value = currentVal;
    }
  }

  // Populate PB Log dropdown
  if (pbLogExercise) {
    pbLogExercise.innerHTML = buildExerciseOptionsHtml(groups, '<option value="" disabled selected>Select exercise...</option>');
  }
}

function updateLogSetButtonState() {
  const btn = document.getElementById('log-set-btn');
  const exercise = document.getElementById('exercise')?.value;
  if (!btn) return;

  if (!exercise) {
    btn.disabled = true;
    btn.className = 'btn-core is-ghost btn-size-input';
    return;
  }

  const schemaKey = getSchemaKey(exercise);
  const sets = parseInt(document.getElementById('log-set-sets')?.value, 10);
  const reps = parseInt(document.getElementById('log-set-reps')?.value, 10);

  let valid = sets > 0 && reps > 0;

  if (schemaKey === 'standard') {
    const weight = parseFloat(document.getElementById('log-set-weight')?.value);
    valid = valid && weight > 0;
  }

  if (valid) {
    btn.disabled = false;
    btn.className = 'btn-core is-primary btn-size-input';
  } else {
    btn.disabled = true;
    btn.className = 'btn-core is-ghost btn-size-input';
  }
}

function refreshLogSetForm() {
  const exercise = document.getElementById('exercise')?.value;
  if (!exercise) { renderFormFields('log-set-fields', FORM_SCHEMAS.logSet.standard); updateLogSetButtonState(); return; }
  const schemaKey = getSchemaKey(exercise);
  const schema = FORM_SCHEMAS.logSet[schemaKey];
  if (!schema) return;

  const result = renderFormFields('log-set-fields', schema, {
    initialValues: { 'log-set-bodyweight': state.user.userBiometrics.bodyweight || 0 },
    onFieldChange: (values) => {
      const total = document.getElementById('log-set-total-load');
      if (total) total.textContent = computeTotalLoad(values, exercise, 'log-set');
      updateLogSetButtonState();
    }
  });

  if (result && result.fields['log-set-bodyweight']) {
    result.fields['log-set-bodyweight'].value = state.user.userBiometrics.bodyweight || '';
  }
  if (result && result.fields['log-set-total-load']) {
    const initValues = { ...result.fieldValues, 'log-set-bodyweight': state.user.userBiometrics.bodyweight || 0 };
    result.fields['log-set-total-load'].textContent = computeTotalLoad(initValues, exercise, 'log-set');
  }

  const disclaimer = document.getElementById('lf-disclaimer');
  if (disclaimer) {
    const lf = LOAD_FACTORS[exercise];
    disclaimer.classList.toggle('hidden', lf === undefined);
  }

  updateLogSetButtonState();
}


function populateWorkoutFilter(exercises) {
  if (!workoutFilter) return;
  const prev = workoutFilter.value || 'All';
  const unique = Array.from(new Set(exercises)).filter(Boolean).sort();
  let html = `<option value="All">All Exercises</option>`;
  unique.forEach(ex => {
    html += `<option value="${ex}">${ex}</option>`;
  });
  workoutFilter.innerHTML = html;
  // restore previous selection if still valid
  if (prev && Array.from(workoutFilter.options).some(o => o.value === prev)) {
    workoutFilter.value = prev;
  } else {
    workoutFilter.value = 'All';
  }
}

function populateLiftSelectors() {
    const groups = ['barbell', 'dumbbell', 'kettlebell'];
    const html = buildExerciseOptionsHtml(groups, '<option value="" disabled selected>Select lift...</option>');
    const calcSelect = document.getElementById('calc-lift-select');
    if (calcSelect) calcSelect.innerHTML = html;
}

function computeDotsScore(squatRec, benchRec, deadliftRec, bw, gender) {
  const plTotal = squatRec + benchRec + deadliftRec;
  if (plTotal <= 0 || bw <= 0) return { dots: 0, plTotal: 0 };

  const c = gender === 'male'
    ? [47.46178854, 8.472061379, -0.07369410346, 0.0002586110512, -0.0000003634089054, 0.000000001790898013]
    : [-125.4255398, 13.71219419, -0.03307250631, 0.00004809990691, -0.00000003622531999, 0.000000000105123006];

  const denominator = c[0] + (c[1] * bw) + (c[2] * Math.pow(bw, 2)) + (c[3] * Math.pow(bw, 3)) + (c[4] * Math.pow(bw, 4)) + (c[5] * Math.pow(bw, 5));
  return { dots: (plTotal * 500) / denominator, plTotal };
}

function computeSinclairScore(snatchRec, cleanRec, bw, gender) {
  const olyTotal = snatchRec + cleanRec;
  if (olyTotal <= 0 || bw <= 0) return { sinclair: 0, olyTotal: 0 };

  const A = gender === 'male' ? 0.722762521 : 0.787004341;
  const b = gender === 'male' ? 193.609 : 153.757;
  if (bw >= b) return { sinclair: olyTotal, olyTotal };

  const coeff = Math.pow(10, A * Math.pow(Math.log10(bw / b), 2));
  return { sinclair: olyTotal * coeff, olyTotal };
}

async function processAnalytics() {
    const bw = state.user.userBiometrics.bodyweight;
    const gender = state.user.userBiometrics.gender;

    const squatRec = state.cache.activeRecords['Back Squat'] || 0;
    const benchRec = state.cache.activeRecords['Bench Press'] || 0;
    const deadliftRec = state.cache.activeRecords['Deadlift'] || 0;

    const dotsSquatEl = document.getElementById('dots-breakdown-squat');
    const dotsBenchEl = document.getElementById('dots-breakdown-bench');
    const dotsDeadliftEl = document.getElementById('dots-breakdown-deadlift');

    if (dotsSquatEl) dotsSquatEl.innerText = `${Math.round(squatRec)} kg`;
    if (dotsBenchEl) dotsBenchEl.innerText = `${Math.round(benchRec)} kg`;
    if (dotsDeadliftEl) dotsDeadliftEl.innerText = `${Math.round(deadliftRec)} kg`;

    const { dots, plTotal } = computeDotsScore(squatRec, benchRec, deadliftRec, bw, gender);

    const dotsDisplayEl = document.getElementById('dots-display');
    const dotsTierEl = document.getElementById('dots-tier');
    if (dotsDisplayEl) dotsDisplayEl.innerText = dots > 0 ? dots.toFixed(1) : "0.0";
    if (dotsTierEl) dotsTierEl.innerText = getRankingTier(dots, 'dots', gender);

    const snatchRec = state.cache.activeRecords['Snatch'] || 0;
    const cleanRec = state.cache.activeRecords['Clean & Jerk'] || 0;

    const sinclairSnatchEl = document.getElementById('sinclair-breakdown-snatch');
    const sinclairCleanEl = document.getElementById('sinclair-breakdown-clean');

    if (sinclairSnatchEl) sinclairSnatchEl.innerText = `${Math.round(snatchRec)} kg`;
    if (sinclairCleanEl) sinclairCleanEl.innerText = `${Math.round(cleanRec)} kg`;

    const { sinclair, olyTotal } = computeSinclairScore(snatchRec, cleanRec, bw, gender);

    const sinclairDisplayEl = document.getElementById('sinclair-display');
    const sinclairTierEl = document.getElementById('sinclair-tier');
    if (sinclairDisplayEl) sinclairDisplayEl.innerText = sinclair > 0 ? sinclair.toFixed(1) : "0.0";
    if (sinclairTierEl) sinclairTierEl.innerText = getRankingTier(sinclair, 'sinclair', gender);

    if (currentUser) {
        debouncedUpdateLeaderboard(currentUser.uid, dots, sinclair);
    }
}
function getRankingTier(score, system, gender) {
    if (score <= 0) return "-";
    if (system === 'dots') {
        const cutoff = gender === 'male' ? [300, 400, 500] : [250, 325, 425];
        if (score < cutoff[0]) return "Beginner";
        if (score < cutoff[1]) return "Intermediate";
        if (score < cutoff[2]) return "Advanced";
        return "Elite";
    } else {
        if (score < 250) return "Beginner";
        if (score < 320) return "Intermediate";
        if (score < 400) return "Advanced";
        if (score < 450) return "Elite";
        return "World Class";
    }
}

// ==========================================
// STRUCTURED WORKOUT SYSTEM
// ==========================================

function populateMovementDropdowns() {
  document.querySelectorAll('.movement-exercise').forEach(sel => {
    if (sel.options.length > 1) return;
    const currentVal = sel.value;
    const groups = ['barbell', 'dumbbell', 'kettlebell', 'cardio', 'bodyweight'];
    sel.innerHTML = buildExerciseOptionsHtml(groups, '<option value="">Select exercise...</option>');
    if (currentVal && Array.from(sel.options).some(o => o.value === currentVal)) {
      sel.value = currentVal;
    }
  });
}

function updatePillActive(pill, mode) {
  pill.querySelectorAll('.wms-pill-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.mode === mode);
  });
}

function updateAmrapScorePreview() {
  const rounds = parseInt(document.getElementById('amrap-rounds')?.value, 10) || 0;
  const additional = parseInt(document.getElementById('amrap-additional-reps')?.value, 10) || 0;
  const preview = document.getElementById('amrap-score-preview');
  if (rounds > 0 || additional > 0) {
    preview.textContent = formatScore_ROUNDS_AND_REPS(rounds, additional);
  } else {
    preview.textContent = '—';
  }
}

function formatScore_ROUNDS_AND_REPS(rounds, additionalReps) {
  // Convert to string and trim whitespace, or default to empty string if null/undefined
  const r = String(rounds ?? '').trim();
  const a = String(additionalReps ?? '').trim();

  if ((r === '0' || r === '') && (a === '0' || a === '')) return '—';
  
  return `${r}+${a}`;
}


async function writeStructuredLogEntry({ workoutId, movement, sets, totalReps, extraFields = {} }) {
  const bw = state.user.userBiometrics.bodyweight || 0;
  const loadFactor = LOAD_FACTORS[movement.exerciseId];
  let estimatedLoad = 0;
  let weight = 0;

  if (loadFactor !== undefined) {
    estimatedLoad = computeEffectiveLoad(movement.exerciseId, bw, 0, bw);
    weight = bw;
  } else {
    estimatedLoad = computeEffectiveLoad(movement.exerciseId, movement.weight, 0, bw);
    weight = movement.weight || 0;
  }

  if (movement.weightMode === 'pct' && movement.pct) {
    const oneRM = state.cache.activeRecords[movement.exerciseId] || 0;
    if (oneRM > 0) {
      estimatedLoad = Math.round(oneRM * movement.pct / 100);
      weight = estimatedLoad;
    }
  } else if (movement.weightMode === 'rpe' && movement.rpe) {
    const oneRM = state.cache.activeRecords[movement.exerciseId] || 0;
    if (oneRM > 0) {
      const rir = 10 - movement.rpe;
      const totalRepsPossible = movement.reps + rir;
      estimatedLoad = Math.round(estimateWeightForReps(oneRM, totalRepsPossible));
      weight = estimatedLoad;
    }
  }

  const totalVolume = estimatedLoad * totalReps;

  const logEntry = {
    userId: currentUser.uid,
    exercise: movement.exerciseId,
    sets,
    reps: movement.reps,
    weight,
    externalLoad: 0,
    estimatedLoad,
    totalVolume,
    timestamp: Timestamp.now(),
    source: 'structured',
    workoutId,
    weightMode: movement.weightMode || 'absolute',
    pct: movement.pct || null,
    rpe: movement.rpe || null,
    ...extraFields,
    totalWorkReps: totalReps
  };

  try {
    const docRef = await addDoc(collection(db, "workouts"), logEntry);
  } catch (err) {
    console.error(`[contrib] addDoc FAILED: exercise=${movement.exerciseId}, code=${err.code}, message=${err.message}`);
    throw err;
  }
}

async function generateContributionsBase(workoutId, movements, processMovement) {
  for (let i = 0; i < movements.length; i++) {
    const movement = movements[i];
    if (getExerciseInfo(movement.exerciseId).category === 'cardio') continue;

    const result = processMovement(movement, i);
    if (!result || result.totalReps <= 0) continue;

    await writeStructuredLogEntry({
      workoutId, movement,
      sets: result.sets,
      totalReps: result.totalReps,
      extraFields: result.extraFields || {}
    });
  }
}

async function generateAmrapContributions(workoutId, movements, roundsCompleted, additionalReps) {
  await generateContributionsBase(workoutId, movements, (movement) => {
    const totalReps = roundsCompleted * movement.reps + additionalReps;
    return { totalReps, sets: roundsCompleted, extraFields: { additionalReps } };
  });
}

// ─── EMOM Functions ───────────────────────────────────────────────────────

function handleWorkoutTypeChange() {
  const type = document.getElementById('workout-type')?.value;
  const desc = document.getElementById('workout-type-desc');
  if (!desc) return;

  // Clear movements on type switch
  state.builder.workoutMovements = [];
  const movementsList = document.getElementById('plan-movements-list');
  if (movementsList) renderEmptyState(movementsList, 'Add movements above.');
  const slots = document.getElementById('emom-minute-slots');
  if (slots) renderEmptyState(slots, 'Add a movement to create the first slot.');

  // Hide all metadata sections
  ['amrap-fields', 'emom-fields', 'fortime-fields', 'interval-fields'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  const movementsSection = document.getElementById('plan-movements-section');
  const emomSlotsArea = document.getElementById('emom-minute-slots-area');

  if (type === 'EMOM') {
    document.getElementById('emom-fields').classList.remove('hidden');
    desc.textContent = 'Record an EMOM (Every Minute On the Minute) workout.';
    if (movementsSection) movementsSection.classList.add('hidden');
    if (emomSlotsArea) emomSlotsArea.classList.remove('hidden');
    switchEmomMode(state.builder.emomMode);
    updateEmomSummary(); updateEmomDurationDisplay();
  } else if (type === 'FOR_TIME') {
    document.getElementById('fortime-fields').classList.remove('hidden');
    desc.textContent = 'Record a For Time workout — complete the rounds as fast as possible.';
    if (movementsSection) movementsSection.classList.remove('hidden');
    if (emomSlotsArea) emomSlotsArea.classList.add('hidden');
  } else if (type === 'INTERVAL') {
    document.getElementById('interval-fields').classList.remove('hidden');
    desc.textContent = 'Record an Interval workout — work/rest rounds.';
    if (movementsSection) movementsSection.classList.remove('hidden');
    if (emomSlotsArea) emomSlotsArea.classList.add('hidden');
  } else {
    document.getElementById('amrap-fields').classList.remove('hidden');
    desc.textContent = 'Record a structured AMRAP workout.';
    if (movementsSection) movementsSection.classList.remove('hidden');
    if (emomSlotsArea) emomSlotsArea.classList.add('hidden');
  }
  populateMovementDropdowns();
  // Also populate the plan exercise dropdown
  const planExercise = document.getElementById('plan-exercise');
  if (planExercise) {
    const currentVal = planExercise.value;
    const groups = ['barbell', 'dumbbell', 'kettlebell', 'cardio', 'bodyweight'];
    planExercise.innerHTML = buildExerciseOptionsHtml(groups, '<option value="">Select exercise...</option>');
    if (currentVal && Array.from(planExercise.options).some(o => o.value === currentVal)) {
      planExercise.value = currentVal;
    }
  }
}

function switchEmomMode(mode) {
  state.builder.emomMode = mode;
  const btnSeq = document.getElementById('emom-mode-seq');
  const btnByRound = document.getElementById('emom-mode-by-round');
  const heading = document.getElementById('emom-slot-heading');
  const roundsField = document.getElementById('emom-rounds-field');
  const roundsInput = document.getElementById('emom-rounds');
  if (btnSeq && btnByRound) {
    if (mode === 'sequence') {
      btnSeq.className = 'btn-core is-primary btn-size-row';
      btnByRound.className = 'btn-core is-ghost btn-size-row';
    } else {
      btnSeq.className = 'btn-core is-ghost btn-size-row';
      btnByRound.className = 'btn-core is-primary btn-size-row';
    }
  }
  if (heading) heading.textContent = mode === 'sequence' ? 'Sequence' : 'Round Schedule';
  if (roundsField) roundsField.classList.toggle('hidden', mode === 'by_round');
  if (roundsInput) roundsInput.required = mode !== 'by_round';
  document.querySelectorAll('#emom-minute-slots .minute-label').forEach((el, i) => {
    el.textContent = mode === 'sequence' ? `#${i + 1}` : `Round ${i + 1}`;
  });
  updateEmomSummary();
  updateEmomDurationDisplay();
  updateEmomScorePreview();
}

function addPlanMinuteSlot(data) {
  const container = document.getElementById('emom-minute-slots');
  if (!container) return;
  if (!container.dataset.planBootstrapped) {
    container.innerHTML = '';
    container.dataset.planBootstrapped = 'true';
  }
  const count = container.children.length + 1;
  const label = state.builder.emomMode === 'sequence' ? `#${count}` : `Round ${count}`;
  const row = document.createElement('div');
  row.className = 'minute-row flex gap-2 items-center py-1.5 px-2 rounded-lg hover:bg-slate-800/40';

  if (data) {
    const oneRM = state.cache.activeRecords[data.exerciseId] || 0;
    let weightDisplay = data.weight;
    let source;
    if (data.weightMode === 'pct' && data.pct) {
      weightDisplay = oneRM > 0 ? Math.round(oneRM * data.pct / 100) : data.weight;
      source = `${data.exerciseId} \u00D7 ${data.reps} @ ${weightDisplay} kg (${data.pct}%)`;
    } else if (data.weightMode === 'rpe' && data.rpe) {
      const rir = 10 - data.rpe;
      const totalRepsPossible = data.reps + rir;
      weightDisplay = oneRM > 0 ? Math.round(estimateWeightForReps(oneRM, totalRepsPossible)) : data.weight;
      source = `${data.exerciseId} \u00D7 ${data.reps} @ ${weightDisplay} kg (RPE ${data.rpe})`;
    } else {
      source = `${data.exerciseId} \u00D7 ${data.reps} @ ${data.weight} kg`;
    }

    row.innerHTML = `
      <span class="minute-label text-xs text-slate-500 font-mono w-12 shrink-0">${label}</span>
      <span class="text-slate-200 font-mono text-sm flex-1">${source}</span>
      <button onclick="removeMinuteSlot(this)" class="text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shrink-0"><i data-lucide="circle-minus" size="18"></i></button>
    `;
    row.dataset.exerciseId = data.exerciseId;
    row.dataset.reps = data.reps;
    row.dataset.weight = data.weight;
    row.dataset.weightMode = data.weightMode;
    if (data.pct) row.dataset.pct = data.pct;
    if (data.rpe) row.dataset.rpe = data.rpe;
  } else {
    row.innerHTML = `
      <span class="minute-label text-xs text-slate-500 font-mono w-12 shrink-0">${label}</span>
      <span class="text-slate-500 font-mono text-sm flex-1 italic">(empty)</span>
      <button onclick="removeMinuteSlot(this)" class="text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shrink-0"><i data-lucide="circle-minus" size="18"></i></button>
    `;
  }

  container.appendChild(row);
  updateEmomSummary();
  updateEmomDurationDisplay();
  updateEmomScorePreview();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── Unified Plan Functions ─────────────────────────────────────────────────

function refreshPlanForm() {
  const exercise = document.getElementById('plan-exercise')?.value;
  const schemaKey = exercise ? getSchemaKey(exercise) : 'standard';
  const schema = FORM_SCHEMAS.planWorkout[schemaKey] || FORM_SCHEMAS.planWorkout.standard;
  const result = renderFormFields('plan-movement-fields', schema, {
    initialValues: { 'plan-bodyweight': state.user.userBiometrics.bodyweight || 0 },
    onFieldChange: (values) => {
      const total = document.getElementById('plan-total-load');
      if (total && exercise) total.textContent = computeTotalLoad(values, exercise, 'plan');
      updatePlanCalcPreview();
    }
  });
  if (result && result.fields['plan-bodyweight']) {
    result.fields['plan-bodyweight'].value = state.user.userBiometrics.bodyweight || '';
  }
  if (result && result.fields['plan-total-load'] && exercise) {
    const initValues = { ...result.fieldValues, 'plan-bodyweight': state.user.userBiometrics.bodyweight || 0 };
    result.fields['plan-total-load'].textContent = computeTotalLoad(initValues, exercise, 'plan');
  }
  updatePlanCalcPreview();
}

function handlePlanExerciseChange() {
  const exercise = document.getElementById('plan-exercise')?.value;
  const oneRmDisplay = document.getElementById('plan-one-rm-display');
  const oneRM = exercise ? (state.cache.activeRecords[exercise] || 0) : 0;
  if (oneRmDisplay) oneRmDisplay.textContent = oneRM > 0 ? `${Math.round(oneRM)} kg` : '\u2014';
  refreshPlanForm();
}

function togglePlanWms(el) {
  const pill = document.getElementById('plan-wms-pill');
  if (!pill) return;
  const mode = el.dataset.mode;
  pill.dataset.mode = mode;
  updatePillActive(pill, mode);

  const weightInput = document.getElementById('plan-weight');
  if (weightInput) {
    weightInput.placeholder = mode === 'pct' ? '%' : (mode === 'rpe' ? 'RPE' : 'Load');
    if (mode === 'rpe') {
      weightInput.min = 1; weightInput.max = 10; weightInput.step = 0.5;
    } else {
      weightInput.min = 0; weightInput.step = 'any'; weightInput.removeAttribute('max');
    }
  }

  const calcSpan = document.getElementById('plan-calc-weight');
  if (calcSpan) {
    if (mode === 'pct' || mode === 'rpe') {
      calcSpan.classList.remove('hidden');
    } else {
      calcSpan.classList.add('hidden');
    }
    updatePlanCalcPreview();
  }
}

function previewPctMode(pct, oneRM, calcSpan, addBtn) {
  if (!isNaN(pct) && pct > 0) {
    const calculated = Math.round(oneRM * pct / 100);
    calcSpan.textContent = '\u2192 ' + calculated + ' kg';
    calcSpan.className = 'text-emerald-400 font-mono text-xs';
    return true;
  }
  calcSpan.textContent = '\u2192';
  calcSpan.className = 'text-emerald-400 font-mono text-xs';
  return false;
}

function previewRpeMode(rpe, reps, oneRM, calcSpan) {
  if (!isNaN(rpe) && rpe >= 1 && rpe <= 10 && reps && reps >= 1) {
    const rir = 10 - rpe;
    const totalRepsPossible = reps + rir;
    const targetWeight = Math.round(estimateWeightForReps(oneRM, totalRepsPossible));
    calcSpan.textContent = '\u2192 ' + targetWeight + ' kg';
    calcSpan.className = 'text-emerald-400 font-mono text-xs';
    return true;
  }
  calcSpan.textContent = '\u2192';
  calcSpan.className = 'text-emerald-400 font-mono text-xs';
  return false;
}

function previewAbsoluteMode(kg, calcSpan) {
  if (kg > 0) {
    calcSpan.textContent = '\u2192 ' + kg + ' kg';
    calcSpan.className = 'text-emerald-400 font-mono text-xs';
    return true;
  }
  calcSpan.textContent = '\u2192';
  calcSpan.className = 'text-emerald-400 font-mono text-xs';
  return false;
}

function updatePlanCalcPreview() {
  const exercise = document.getElementById('plan-exercise')?.value;
  const reps = parseInt(document.getElementById('plan-reps')?.value, 10);
  const addBtn = document.getElementById('plan-add-btn');
  if (!addBtn) return;

  // Bodyweight/weighted: just need reps
  if (exercise) {
    const schemaKey = getSchemaKey(exercise);
    if (schemaKey !== 'standard') {
      addBtn.disabled = !(reps > 0);
      return;
    }
  }

  const weightInput = document.getElementById('plan-weight');
  const calcSpan = document.getElementById('plan-calc-weight');
  const pill = document.getElementById('plan-wms-pill');
  if (!weightInput || !calcSpan || !pill) return;

  const mode = pill.dataset.mode;
  const oneRM = exercise ? (state.cache.activeRecords[exercise] || 0) : 0;

  if (!exercise || oneRM <= 0) {
    calcSpan.textContent = oneRM > 0 ? '\u2192' : 'No 1RM';
    calcSpan.className = 'font-mono text-xs ' + (oneRM > 0 ? 'text-emerald-400' : 'text-rose-400');
    addBtn.disabled = true;
    return;
  }

  let valid = false;
  if (mode === 'pct') {
    valid = previewPctMode(parseFloat(weightInput.value), oneRM, calcSpan, addBtn);
  } else if (mode === 'rpe') {
    valid = previewRpeMode(parseFloat(weightInput.value), reps, oneRM, calcSpan);
  } else {
    valid = previewAbsoluteMode(parseFloat(weightInput.value), calcSpan);
  }

  addBtn.disabled = !valid;
}

function handlePlanAdd() {
  const exercise = document.getElementById('plan-exercise')?.value;
  const reps = parseInt(document.getElementById('plan-reps')?.value, 10);
  if (!exercise || !reps || reps < 1) return;

  const schemaKey = getSchemaKey(exercise);
  let weight = 0, weightMode = 'absolute', pct = null, rpe = null;

  if (schemaKey === 'bodyweight') {
    weight = parseFloat(document.getElementById('plan-bodyweight')?.value) || state.user.userBiometrics.bodyweight || 0;
  } else if (schemaKey === 'weighted') {
    weight = parseFloat(document.getElementById('plan-bodyweight')?.value) || state.user.userBiometrics.bodyweight || 0;
    weight += parseFloat(document.getElementById('plan-ext-load')?.value) || 0;
  } else {
    const weightInput = document.getElementById('plan-weight');
    const pill = document.getElementById('plan-wms-pill');
    if (!weightInput || !pill) return;
    weightMode = pill.dataset.mode;
    const rawWeight = parseFloat(weightInput.value) || 0;
    if (weightMode === 'pct') {
      pct = rawWeight;
    } else if (weightMode === 'rpe') {
      rpe = rawWeight;
      if (rpe < 1 || rpe > 10) return;
    } else if (rawWeight <= 0) {
      return;
    }
    weight = rawWeight;
  }

  const movement = { exerciseId: exercise, reps, weight, weightMode, pct, rpe };
  const type = document.getElementById('workout-type')?.value;

  if (type === 'EMOM') {
    addPlanMinuteSlot(movement);
  } else {
    state.builder.workoutMovements.push(movement);
    renderPlanMovements();
  }

  haptic(HAPTIC.confirm);
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
    let source, weight;
    if (m.weightMode === 'pct' && m.pct) {
      weight = oneRM > 0 ? Math.round(oneRM * m.pct / 100) : m.weight;
      source = `${m.reps}x ${m.exerciseId} @ ${m.pct}% 1RM (${weight}kg)`;
    } else if (m.weightMode === 'rpe' && m.rpe) {
      const rir = 10 - m.rpe;
      weight = oneRM > 0 ? Math.round(estimateWeightForReps(oneRM, m.reps + rir)) : m.weight;
      source = `${m.reps}x ${m.exerciseId} @ RPE ${m.rpe} (${weight}kg)`;
    } else {
      weight = m.weight;
      source = `${m.reps}x ${m.exerciseId} @ ${m.weight}kg`;
    }
    html += `
    <div class="flex justify-between items-center py-1.5 px-1 rounded-lg hover:bg-slate-800/40">
      <span class="text-slate-200 font-mono text-sm truncate">${escapeHtml(source)}</span>
      <button type="button" onclick="removePlanMovement(${i})" class="plan-movement-remove shrink-0 hover:!text-rose-400 transition-colors" title="Remove">
        <i data-lucide="trash-2" size="18"></i>
      </button>
    </div>`;
  });

  list.innerHTML = html;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function removePlanMovement(index) {
  if (index < 0 || index >= state.builder.workoutMovements.length) return;
  state.builder.workoutMovements.splice(index, 1);
  renderPlanMovements();
  haptic(HAPTIC.tap);
}

function populatePlanMovements(movements) {
  state.builder.workoutMovements = (movements || []).map(m => ({
    exerciseId: m.exerciseId || m.movement,
    reps: parseInt(m.reps, 10) || 0,
    weight: parseFloat(m.kg || m.weight) || 0,
    weightMode: m.weightMode || 'absolute',
    pct: m.pct || null,
    rpe: m.rpe || null
  }));
  renderPlanMovements();
}

async function formatIntervalLabel(intervalMin, intervalSec) {
  const intervalSeconds = intervalMin * 60 + intervalSec;
  if (intervalSeconds === 60) return 'EMOM';
  if (intervalSeconds === 120) return 'E2MOM';
  if (intervalSeconds === 180) return 'E3MOM';
  if (intervalMin > 0 && intervalSec === 0) return `E${intervalMin}MOM`;
  if (intervalMin > 0) return `Every ${intervalMin}:${String(intervalSec).padStart(2, '0')}`;
  return `Every :${String(intervalSec).padStart(2, '0')}`;
}

function validatePlanInputs(type) {
  if (!currentUser) { alert('Please sign in first.'); return false; }
  if (!type) { showFeedback('Select a workout type first.', 'rose', 'planFeedback'); return false; }

  if (type === 'AMRAP') {
    const durationMin = parseInt(document.getElementById('amrap-duration')?.value, 10);
    if (!durationMin || durationMin < 1) { showFeedback('Enter a valid duration.', 'rose', 'planFeedback'); return false; }
  } else if (type === 'EMOM') {
    const intervalMin = parseInt(document.getElementById('emom-interval-min')?.value, 10) || 0;
    const intervalSec = parseInt(document.getElementById('emom-interval-sec')?.value, 10) || 0;
    const intervalSeconds = intervalMin * 60 + intervalSec;
    const rounds = parseInt(document.getElementById('emom-rounds')?.value, 10) || 0;
    if (intervalSeconds < 1) { showFeedback('Enter a valid interval.', 'rose', 'planFeedback'); return false; }
    if (rounds < 1) { showFeedback('Enter a valid number of rounds.', 'rose', 'planFeedback'); return false; }
  } else if (type === 'FOR_TIME') {
    const rounds = parseInt(document.getElementById('fortime-rounds')?.value, 10);
    if (!rounds || rounds < 1) { showFeedback('Enter a valid round count.', 'rose', 'planFeedback'); return false; }
  } else if (type === 'INTERVAL') {
    const rounds = parseInt(document.getElementById('interval-rounds')?.value, 10);
    if (!rounds || rounds < 1) { showFeedback('Enter a valid round count.', 'rose', 'planFeedback'); return false; }
  }
  return true;
}

function generateAutoPlanName(type) {
  if (type === 'AMRAP') {
    const d = parseInt(document.getElementById('amrap-duration')?.value, 10) || 0;
    return `${d} Min AMRAP`;
  }
  if (type === 'EMOM') {
    const intervalMin = parseInt(document.getElementById('emom-interval-min')?.value, 10) || 0;
    const intervalSec = parseInt(document.getElementById('emom-interval-sec')?.value, 10) || 0;
    const intervalSeconds = intervalMin * 60 + intervalSec;
    const rounds = state.builder.emomMode === 'by_round' ? (document.querySelectorAll('#emom-minute-slots .minute-row').length) : (parseInt(document.getElementById('emom-rounds')?.value, 10) || 0);
    const durationSeconds = rounds * intervalSeconds;
    const intervalLabel = formatIntervalLabel(intervalMin, intervalSec);
    const prefix = durationSeconds % 60 === 0 ? `${durationSeconds / 60} Min ` : '';
    return `${prefix}${intervalLabel} \u00D7 ${rounds} rounds`;
  }
  if (type === 'FOR_TIME') {
    const timeCap = parseInt(document.getElementById('fortime-cap')?.value, 10) || 0;
    return timeCap ? `${timeCap} Min For Time` : 'For Time';
  }
  return 'Interval Workout';
}

function buildPlanDocument(userId, name, type, structure) {
  return {
    userId,
    name,
    type,
    structure,
    status: 'active',
    createdAt: serverTimestamp()
  };
}

async function savePlan() {
  if (!currentUser) return alert('Please sign in first.');
  const type = document.getElementById('workout-type')?.value;
  if (!type) return showFeedback('Select a workout type first.', 'rose', 'planFeedback');

  let structure;
  try {
    structure = capturePlanStructure(type);
  } catch (err) {
    return showFeedback(err.message, 'rose', 'planFeedback');
  }

  if (!validatePlanInputs(type)) return;

  const autoName = generateAutoPlanName(type);
  const name = await showPlanNameModal(autoName);
  if (!name) return;

  const planDoc = buildPlanDocument(currentUser.uid, name.trim() || autoName, type, structure);

  addDoc(collection(db, "workout_plans"), planDoc).then(() => {
    showFeedback('Plan saved!', 'emerald', 'planFeedback');
    haptic(HAPTIC.confirm);
  }).catch(err => {
    console.error('Save plan failed', err.code, err.message);
    showFeedback('Failed to save plan: ' + err.message, 'rose', 'planFeedback');
  });
}

function removeMinuteSlot(btn) {
  const row = btn.closest('.minute-row');
  if (row) row.remove();
  const container = document.getElementById('emom-minute-slots');
  if (container) {
    container.querySelectorAll('.minute-row').forEach((r, i) => {
      const label = r.querySelector('.minute-label');
      if (label) label.textContent = state.builder.emomMode === 'sequence' ? `#${i + 1}` : `Round ${i + 1}`;
    });
  }
  updateEmomSummary();
  updateEmomDurationDisplay();
  updateEmomScorePreview();
}

function updateEmomDurationDisplay() {
  const roundsInput = document.getElementById('emom-rounds');
  const intervalMin = parseInt(document.getElementById('emom-interval-min')?.value, 10) || 0;
  const intervalSec = parseInt(document.getElementById('emom-interval-sec')?.value, 10) || 0;
  const display = document.getElementById('emom-duration-display');
  const container = document.getElementById('emom-minute-slots');
  const slots = container ? container.querySelectorAll('.minute-row').length : 0;
  const rounds = state.builder.emomMode === 'by_round' ? slots : parseInt(roundsInput?.value, 10);
  if (!display) return;
  if (!rounds || rounds <= 0 || (intervalMin === 0 && intervalSec === 0)) {
    display.textContent = '\u2014';
    return;
  }
  const totalSec = rounds * (intervalMin * 60 + intervalSec);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  display.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
}

function updateEmomSummary() {
  const roundsInput = document.getElementById('emom-rounds');
  const intervalMin = parseInt(document.getElementById('emom-interval-min')?.value, 10) || 1;
  const intervalSec = parseInt(document.getElementById('emom-interval-sec')?.value, 10) || 0;
  const intervalSeconds = intervalMin * 60 + intervalSec;
  const container = document.getElementById('emom-minute-slots');
  const summaryEl = document.getElementById('emom-summary');
  const textEl = document.getElementById('emom-summary-text');
  if (!container || !summaryEl || !textEl) return;
  const slots = container.querySelectorAll('.minute-row').length;
  const rounds = state.builder.emomMode === 'by_round' ? slots : parseInt(roundsInput?.value, 10);
  if (rounds > 0 && slots > 0 && intervalSeconds > 0) {
    const totalSec = rounds * intervalSeconds;
    const intervalLabel = formatIntervalLabel(intervalMin, intervalSec);
    const prefix = totalSec % 60 === 0 ? `${totalSec / 60} Min ` : '';
    const name = `${prefix}${intervalLabel}`;
    if (state.builder.emomMode === 'sequence') {
      const exerciseLabel = slots === 1 ? 'exercise' : 'exercises';
      textEl.textContent = `${name} \u00D7 ${rounds} rounds \u00B7 ${slots}-${exerciseLabel} sequence`;
    } else {
      textEl.textContent = `${name} \u00B7 ${slots} round slots`;
    }
    summaryEl.classList.remove('hidden');
  } else {
    summaryEl.classList.add('hidden');
  }
}

function getEmomMovementData() {
  const minutes = [];
  let error = null;
  document.querySelectorAll('#emom-minute-slots .minute-row').forEach(row => {
    const exercise = row.dataset.exerciseId;
    const reps = parseInt(row.dataset.reps, 10);
    const weight = parseFloat(row.dataset.weight) || 0;
    const weightMode = row.dataset.weightMode || 'absolute';
    const pct = row.dataset.pct ? parseFloat(row.dataset.pct) : null;
    const rpe = row.dataset.rpe ? parseFloat(row.dataset.rpe) : null;

    if (!exercise || exercise === 'undefined') { error = 'Select an exercise for all intervals.'; return; }
    if (!reps || reps < 1) { error = 'Enter reps for all intervals.'; return; }

    const movement = { exerciseId: exercise, reps, weight, weightMode };
    if (pct !== null) movement.pct = pct;
    if (rpe !== null) movement.rpe = rpe;
    minutes.push({ movements: [movement] });
  });
  if (error) throw new Error(error);
  return minutes;
}

function updateEmomScorePreview() {
  const roundsCompleted = parseInt(document.getElementById('emom-rounds-completed')?.value, 10);
  const roundsInput = document.getElementById('emom-rounds');
  const container = document.getElementById('emom-minute-slots');
  const slots = container ? container.querySelectorAll('.minute-row').length : 0;
  const rounds = state.builder.emomMode === 'by_round' ? slots : parseInt(roundsInput?.value, 10);
  const preview = document.getElementById('emom-score-preview');
  if (!preview) return;
  if (rounds > 0) {
    preview.textContent = formatScore_COMPLETED_MINUTES(roundsCompleted || 0, rounds);
  } else {
    preview.textContent = '—';
  }
}

function formatScore_COMPLETED_MINUTES(completed, total) {
  if (completed === 0 && total === 0) return '—';
  return `${completed}/${total}`;
}


async function generateEmomContributions(workoutId, minutes, minutesCompleted, mode) {
  const numMinutes = minutes.length;
  const isByRound = mode === 'by_round';
  if (numMinutes === 0 || minutesCompleted <= 0) return;

  for (let i = 0; i < minutes.length; i++) {
    const slot = minutes[i];
    if (!slot.movements || slot.movements.length === 0) continue;
    const movement = slot.movements[0];
    if (getExerciseInfo(movement.exerciseId).category === 'cardio') continue;

    let performedTimes;
    if (isByRound) {
      performedTimes = i < minutesCompleted ? 1 : 0;
    } else {
      const fullRounds = Math.floor(minutesCompleted / numMinutes);
      const remainder = minutesCompleted % numMinutes;
      performedTimes = fullRounds + (i < remainder ? 1 : 0);
    }
    if (performedTimes <= 0) continue;

    const totalRepsPerMovement = movement.reps * performedTimes;

    await writeStructuredLogEntry({
      workoutId, movement,
      sets: performedTimes,
      totalReps: totalRepsPerMovement,
      extraFields: { minuteIndex: i }
    });
  }
}

// ─── FOR_TIME Functions ────────────────────────────────────────────────────

function toggleForTimeDnf() {
  const dnf = document.getElementById('fortime-dnf')?.checked;
  const timeInputs = document.getElementById('fortime-time-inputs');
  const capRepsContainer = document.getElementById('fortime-cap-reps-container');
  if (!timeInputs || !capRepsContainer) return;
  timeInputs.classList.toggle('hidden', dnf);
  capRepsContainer.classList.toggle('hidden', !dnf);
  ['fortime-minutes', 'fortime-seconds'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.toggleAttribute('required', !dnf);
  });
  if (dnf) {
    recalcForTimeRemaining();
  }
  updateLogScorePreview();
  updateForTimeScorePreview();
}

function updateForTimeScorePreview() {
  const mins = parseInt(document.getElementById('fortime-minutes')?.value, 10);
  const secs = parseInt(document.getElementById('fortime-seconds')?.value, 10);
  const capReps = parseInt(document.getElementById('fortime-cap-reps')?.value, 10);
  const dnf = document.getElementById('fortime-dnf')?.checked;
  const preview = document.getElementById('fortime-score-preview');
  if (!preview) return;
  if (dnf) {
    preview.textContent = `Cap ${capReps || 0}`;
  } else if (mins > 0 || secs > 0) {
    preview.textContent = formatScore_TIME_SECONDS(mins * 60 + secs);
  } else {
    preview.textContent = '—';
  }
}

function formatScore_TIME_SECONDS(totalSeconds) {
  if (!totalSeconds && totalSeconds !== 0) return '—';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}


async function generateForTimeContributions(workoutId, movements, rounds, remainingReps = 0) {
  const repsPerRound = movements.reduce((sum, m) => sum + (m.reps || 0), 0);
  const totalPlanned = repsPerRound * rounds;
  const totalCompleted = Math.max(0, totalPlanned - remainingReps);
  const fullRounds = Math.floor(repsPerRound > 0 ? totalCompleted / repsPerRound : 0);
  let partialRoundReps = totalCompleted % (repsPerRound || 1);

  await generateContributionsBase(workoutId, movements, (movement) => {
    const movementPartialReps = Math.min(movement.reps, partialRoundReps);
    partialRoundReps = Math.max(0, partialRoundReps - movement.reps);
    const performedReps = movement.reps * fullRounds + movementPartialReps;
    if (performedReps <= 0) return null;
    const effectiveSets = fullRounds + (movementPartialReps === movement.reps ? 1 : 0);
    const displayPartialReps = movementPartialReps < movement.reps ? movementPartialReps : 0;
    const extraFields = {};
    if (displayPartialReps > 0) extraFields.partialReps = displayPartialReps;
    return { totalReps: performedReps, sets: effectiveSets, extraFields };
  });
}

// ─── INTERVAL Functions ───────────────────────────────────────────────────

function updateIntervalScorePreview() {
  const rounds = parseInt(document.getElementById('interval-rounds-completed')?.value, 10) || 0;
  const partial = parseInt(document.getElementById('interval-partial-reps')?.value, 10) || 0;
  const preview = document.getElementById('interval-score-preview');
  if (!preview) return;
  if (rounds > 0 || partial > 0) {
    preview.textContent = formatScore_ROUNDS_AND_REPS(rounds, partial);
  } else {
    preview.textContent = '—';
  }
}

function getRepsPerRound(type, structure) {
  if (type === 'EMOM') {
    const firstMin = structure?.minutes?.[0];
    if (!firstMin) return 0;
    return (firstMin.movements || []).reduce((sum, m) => sum + (parseInt(m.reps, 10) || 0), 0);
  }
  return (structure?.movements || []).reduce((sum, m) => sum + (parseInt(m.reps, 10) || 0), 0);
}

function recalcForTimeRemaining() {
  const type = state.builder.pendingPlannedWorkout?.type;
  if (type !== 'FOR_TIME') return;
  const structure = state.builder.pendingPlannedWorkout?.structure;
  if (!structure) return;
  const roundsCompleted = parseInt(document.getElementById('log-rounds')?.value, 10) || 0;
  const partialReps = parseInt(document.getElementById('log-partial-reps')?.value, 10) || 0;
  const prescribed = structure.rounds || 0;
  const repsPerRound = getRepsPerRound(type, structure);
  const repsDone = roundsCompleted * repsPerRound + partialReps;
  const totalReps = prescribed * repsPerRound;
  const remaining = Math.max(0, totalReps - repsDone);
  const capReps = document.getElementById('fortime-cap-reps');
  if (capReps) capReps.value = remaining;
  updateLogScorePreview();
  updateForTimeScorePreview();
}

function logRound() {
  const input = document.getElementById('log-rounds');
  if (!input) return;
  input.value = (parseInt(input.value, 10) || 0) + 1;
  const partial = document.getElementById('log-partial-reps');
  if (partial) partial.value = 0;
  updateLogScorePreview();
  updateLogWorkoutButtonState();
  recalcForTimeRemaining();
  haptic(HAPTIC.tap);
}

function logRep() {
  const type = state.builder.pendingPlannedWorkout?.type;
  const structure = state.builder.pendingPlannedWorkout?.structure;
  const repsPerRound = getRepsPerRound(type, structure);
  const partial = document.getElementById('log-partial-reps');
  if (!partial) return;
  const current = parseInt(partial.value, 10) || 0;
  if (repsPerRound > 0 && current + 1 >= repsPerRound) {
    partial.value = 0;
    const roundInput = document.getElementById('log-rounds');
    if (roundInput) roundInput.value = (parseInt(roundInput.value, 10) || 0) + 1;
    updateLogWorkoutButtonState();
  } else {
    partial.value = current + 1;
  }
  updateLogScorePreview();
  recalcForTimeRemaining();
  haptic(HAPTIC.tap);
}

function updateLogScorePreview() {
  const rounds = parseInt(document.getElementById('log-rounds')?.value, 10) || 0;
  const partial = parseInt(document.getElementById('log-partial-reps')?.value, 10) || 0;
  const type = state.builder.pendingPlannedWorkout?.type;
  const structure = state.builder.pendingPlannedWorkout?.structure;
  const preview = document.getElementById('log-score-preview');
  if (!preview) return;
  if (type === 'FOR_TIME') {
    const capVal = parseInt(document.getElementById('fortime-cap-reps')?.value, 10);
    preview.textContent = `Cap ${capVal >= 0 ? capVal : 0}`;
  } else if (type === 'EMOM') {
    const total = structure?.rounds || 0;
    if (rounds > 0 || partial > 0 || total > 0) {
      preview.textContent = `${formatScore_ROUNDS_AND_REPS(rounds, partial)} / ${total}`;
    } else {
      preview.textContent = '—';
    }
  } else if (rounds > 0 || partial > 0) {
    preview.textContent = formatScore_ROUNDS_AND_REPS(rounds, partial);
  } else {
    preview.textContent = '—';
  }
}

function updateLogWorkoutButtonState() {
  const rounds = parseInt(document.getElementById('log-rounds')?.value, 10) || 0;
  const partial = parseInt(document.getElementById('log-partial-reps')?.value, 10) || 0;
  const hasActivity = rounds > 0 || partial > 0;
  const btn = document.getElementById('log-workout-btn');
  if (btn) {
    if (hasActivity) {
      btn.classList.remove('is-ghost');
      btn.classList.add('is-primary-ghost');
      btn.removeAttribute('disabled');
    } else {
      btn.classList.remove('is-primary-ghost');
      btn.classList.add('is-ghost');
      btn.setAttribute('disabled', 'disabled');
    }
  }
}


async function generateIntervalContributions(workoutId, movements, roundsCompleted, partialReps = 0) {
  let remainingPartial = partialReps;

  await generateContributionsBase(workoutId, movements, (movement) => {
    const movementPartialReps = Math.min(movement.reps, remainingPartial);
    remainingPartial = Math.max(0, remainingPartial - movement.reps);
    const totalReps = movement.reps * roundsCompleted + movementPartialReps;
    const effectiveSets = roundsCompleted + (movementPartialReps === movement.reps ? 1 : 0);
    const displayPartialReps = movementPartialReps < movement.reps ? movementPartialReps : 0;
    const extraFields = {};
    if (displayPartialReps > 0) extraFields.partialReps = displayPartialReps;
    return { totalReps, sets: effectiveSets, extraFields };
  });
}

// ==========================================
// WORKOUT CONSISTENCY SYSTEM
// ==========================================

async function computeAndSyncDailyActivity() {
    if (!currentUser) return;
    
    const allTimestamps = [];
    state.data.lastWorkouts.forEach(w => allTimestamps.push(w.timestamp));
    state.data.lastStructuredWorkouts.forEach(sw => allTimestamps.push(sw.timestamp));
    
    activeDates = new Set();
    allTimestamps.forEach(ts => {
        const d = new Date(ts);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        activeDates.add(dateStr);
    });
    
    renderConsistencyUI();
}

function renderConsistencyUI() {
    renderCalendar();
    updateConsistencyMetrics();
    renderChallengeCards();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    selectCalendarDay(todayStr);
}

function calculateChallengeProgress() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const dateArray = Array.from(activeDates);

    const monthlyActive = dateArray.filter(d => {
        const [y, m] = d.split('-');
        return parseInt(y) === currentYear && (parseInt(m) - 1) === currentMonth;
    }).length;

    const yearlyActive = dateArray.filter(d => {
        return d.startsWith(String(currentYear));
    }).length;

    const lifetimeActive = activeDates.size;

    // Add day0 offsets from onboarding
    const day0 = state.user.userBiometrics?.day0TrainingDays || { monthly: 0, yearly: 0, lifetime: 0 };

    return { monthly: monthlyActive + (day0.monthly || 0), yearly: yearlyActive + (day0.yearly || 0), lifetime: lifetimeActive + (day0.lifetime || 0) };
}

function renderChallengeCards() {
    const progress = calculateChallengeProgress();
    const cfg = CONSISTENCY_CONFIG;

    const monthlyPct = Math.min(100, (progress.monthly / cfg.monthlyUniqueDays) * 100);
    const yearlyPct = Math.min(100, (progress.yearly / cfg.yearlyUniqueDays) * 100);
    const lifetimePct = Math.min(100, (progress.lifetime / cfg.lifetimeUniqueDays) * 100);

    const monthlyDone = progress.monthly >= cfg.monthlyUniqueDays;
    const yearlyDone = progress.yearly >= cfg.yearlyUniqueDays;
    const lifetimeDone = progress.lifetime >= cfg.lifetimeUniqueDays;

    setChallengeCard('challenge-monthly', progress.monthly, cfg.monthlyUniqueDays, monthlyPct, monthlyDone);
    setChallengeCard('challenge-yearly', progress.yearly, cfg.yearlyUniqueDays, yearlyPct, yearlyDone);
    setChallengeCard('challenge-lifetime', progress.lifetime, cfg.lifetimeUniqueDays, lifetimePct, lifetimeDone);

    updateChallengeStreaks(monthlyDone, yearlyDone);
}

function setChallengeCard(idPrefix, current, target, pct, completed) {
    const progressEl = document.getElementById(`${idPrefix}-progress`);
    const barEl = document.getElementById(`${idPrefix}-bar`);
    const cardEl = document.getElementById(idPrefix);
    if (!progressEl || !barEl) return;

    progressEl.textContent = completed ? `${current} / ${target} \u{1F3C6}` : `${current} / ${target}`;
    barEl.style.width = `${pct}%`;
}

async function loadConsistencyConfig() {
    try {
        const docSnap = await getDoc(doc(db, "config", "consistency"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.monthlyUniqueDays) CONSISTENCY_CONFIG.monthlyUniqueDays = data.monthlyUniqueDays;
            if (data.yearlyUniqueDays) CONSISTENCY_CONFIG.yearlyUniqueDays = data.yearlyUniqueDays;
            if (data.lifetimeUniqueDays) CONSISTENCY_CONFIG.lifetimeUniqueDays = data.lifetimeUniqueDays;
        }
    } catch (e) {
        // Config doc may not exist or permission-denied; use defaults
    }
    renderChallengeCards();
}

function getPreviousPeriodId(periodId, type) {
    if (type === 'monthly') {
        const [y, m] = periodId.split('-').map(Number);
        const d = new Date(y, m - 2, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return String(parseInt(periodId) - 1);
}

function calculateStreakFromPeriods(completedPeriods, type) {
    if (!completedPeriods || completedPeriods.length === 0) return 0;
    const sorted = [...completedPeriods].sort().reverse();
    let streak = 1;
    let current = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === getPreviousPeriodId(current, type)) {
            streak++;
            current = sorted[i];
        } else {
            break;
        }
    }
    return streak;
}

function renderStreakUI(monthlyStreak, yearlyStreak) {
    const monthlyEl = document.getElementById('challenge-monthly-streak');
    const yearlyEl = document.getElementById('challenge-yearly-streak');
    if (monthlyEl) {
        if (monthlyStreak > 0) {
            monthlyEl.textContent = `\u{1F525} ${monthlyStreak}-month streak`;
            monthlyEl.classList.remove('hidden');
        } else {
            monthlyEl.classList.add('hidden');
        }
    }
    if (yearlyEl) {
        if (yearlyStreak > 0) {
            yearlyEl.textContent = `\u{1F525} ${yearlyStreak}-year streak`;
            yearlyEl.classList.remove('hidden');
        } else {
            yearlyEl.classList.add('hidden');
        }
    }
}

async function updateChallengeStreaks(monthlyDone, yearlyDone) {
    if (!currentUser) return;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYear = String(now.getFullYear());

    let updated = false;
    const monthly = { completedPeriods: [...state.user.userChallengeStreaks.monthly.completedPeriods], currentStreak: 0, bestStreak: state.user.userChallengeStreaks.monthly.bestStreak || 0 };
    const yearly = { completedPeriods: [...state.user.userChallengeStreaks.yearly.completedPeriods], currentStreak: 0, bestStreak: state.user.userChallengeStreaks.yearly.bestStreak || 0 };

    if (monthlyDone && !monthly.completedPeriods.includes(currentMonth)) {
        monthly.completedPeriods.push(currentMonth);
        updated = true;
    }
    if (yearlyDone && !yearly.completedPeriods.includes(currentYear)) {
        yearly.completedPeriods.push(currentYear);
        updated = true;
    }

    monthly.currentStreak = calculateStreakFromPeriods(monthly.completedPeriods, 'monthly');
    yearly.currentStreak = calculateStreakFromPeriods(yearly.completedPeriods, 'yearly');
    monthly.bestStreak = Math.max(monthly.bestStreak, monthly.currentStreak);
    yearly.bestStreak = Math.max(yearly.bestStreak, yearly.currentStreak);

    state.user.userChallengeStreaks = { monthly, yearly };

    renderStreakUI(monthly.currentStreak, yearly.currentStreak);

    if (updated) {
        try {
            await setDoc(doc(db, "profiles", currentUser.uid), { challengeStreaks: state.user.userChallengeStreaks }, { merge: true });
        } catch (e) {
            console.error('Failed to sync challenge streaks', e);
        }
    }
}

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function buildCalendarDayHtml(dateStr, day, isActive, isToday, isSelected, isThisMonth = true) {
  if (!isThisMonth) {
    return `<div class="cal-day cal-day-other-month">${day}</div>`;
  }
  let cls = 'cal-day';
  if (isActive) cls += ' cal-day-active';
  if (isToday) cls += ' cal-day-today';
  if (isSelected) cls += ' cal-day-selected';
  return `<div class="${cls}" onclick="selectCalendarDay('${dateStr}')" data-date="${dateStr}">${day}</div>`;
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('cal-month-label');
    if (!grid || !label) return;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let html = '';

    if (state.calendar.compact) {
        const monday = getMonday(today);
        monday.setDate(monday.getDate() + state.calendar.weekOffset * 7);
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);

        if (monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear()) {
            label.textContent = `${shortMonthNames[monday.getMonth()]} ${monday.getDate()} – ${sunday.getDate()}, ${sunday.getFullYear()}`;
        } else {
            label.textContent = `${shortMonthNames[monday.getMonth()]} ${monday.getDate()} – ${shortMonthNames[sunday.getMonth()]} ${sunday.getDate()}, ${sunday.getFullYear()}`;
        }

        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const isActive = activeDates.has(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = state.calendar.selectedDate === dateStr;
            const isThisMonth = date.getMonth() === state.calendar.month.getMonth() && date.getFullYear() === state.calendar.month.getFullYear();
            html += buildCalendarDayHtml(dateStr, date.getDate(), isActive, isToday, isSelected, isThisMonth);
        }
    } else {
        const year = state.calendar.month.getFullYear();
        const month = state.calendar.month.getMonth();

        label.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1);
        let startDay = firstDay.getDay() - 1;
        if (startDay < 0) startDay = 6;

        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < startDay; i++) {
            html += '<div class="cal-day cal-day-empty"></div>';
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isActive = activeDates.has(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = state.calendar.selectedDate === dateStr;
            html += buildCalendarDayHtml(dateStr, day, isActive, isToday, isSelected);
        }

        const totalCells = startDay + daysInMonth;
        const remainingCells = (7 - (totalCells % 7)) % 7;
        for (let i = 0; i < remainingCells; i++) {
            html += '<div class="cal-day cal-day-empty"></div>';
        }
    }

    grid.innerHTML = html;
    updateCalTodayBtnState();
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

function updateConsistencyMetrics() {
    const today = new Date();
    const d7 = countActiveDays(7, today, activeDates);
    const d28 = countActiveDays(28, today, activeDates);
    
    const el7 = document.getElementById('consistency-7day');
    const el28 = document.getElementById('consistency-28day');
    const bar7 = document.getElementById('consistency-7day-bar');
    const bar28 = document.getElementById('consistency-28day-bar');
    const streak7 = document.getElementById('consistency-7day-streak');
    const streak28 = document.getElementById('consistency-28day-streak');
    
    if (el7) el7.textContent = `${d7} / 7`;
    if (el28) el28.textContent = `${d28} / 28`;
    if (bar7) bar7.style.width = `${Math.min(100, (d7 / 7) * 100)}%`;
    if (bar28) bar28.style.width = `${Math.min(100, (d28 / 28) * 100)}%`;
    
    const streak = countConsecutiveDays(today, activeDates);
    if (streak7) {
        if (streak > 1) {
            streak7.textContent = `\u{1F525} ${streak}-day streak`;
            streak7.classList.remove('hidden');
        } else {
            streak7.classList.add('hidden');
        }
    }
    if (streak28) {
        if (streak > 1) {
            streak28.textContent = `\u{1F525} ${streak}-day streak`;
            streak28.classList.remove('hidden');
        } else {
            streak28.classList.add('hidden');
        }
    }
}

function getWorkoutsForDate(dateStr) {
    const results = [];
    
    function addIfMatches(item) {
        const d = new Date(item.timestamp);
        const itemDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (itemDate === dateStr) results.push(item);
    }
    
    state.data.lastWorkouts.forEach(addIfMatches);
    state.data.lastStructuredWorkouts.forEach(addIfMatches);
    
    results.sort((a, b) => a.timestamp - b.timestamp);
    return results;
}

function selectCalendarDay(dateStr) {
    state.calendar.selectedDate = dateStr;
    renderCalendar();
    
    const detail = document.getElementById('cal-day-detail');
    const dateLabel = document.getElementById('cal-day-detail-date');
    const workoutsContainer = document.getElementById('cal-day-workouts');
    
    if (!detail || !dateLabel || !workoutsContainer) return;
    
    detail.classList.remove('hidden');
    
    const parts = dateStr.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    dateLabel.textContent = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const items = getWorkoutsForDate(dateStr);
    
    if (items.length === 0) {
        renderEmptyState(workoutsContainer, 'No workouts logged this day.');
        return;
    }
    
    workoutsContainer.innerHTML = items.map(item => {
        if (item.type) {
            const badgeClass = (item.type || '').toLowerCase();
            const descLine = buildWorkoutSummaryLine(item.type, item.structure || {});
            return `
<div class="bg-slate-900 border border-slate-700 rounded-xl p-2.5">
    <div class="flex justify-between items-center">
        <span class="workout-type-badge ${badgeClass}">${escapeHtml(formatWorkoutType(item.type))}</span>
        <span class="text-emerald-400 font-bold font-mono text-xs">${escapeHtml(item.scoreDisplay || '—')}</span>
    </div>
    ${descLine ? `<p class="text-[10px] text-slate-400 font-mono mt-1">${escapeHtml(descLine)}</p>` : ''}
</div>`;
        } else {
            const load = getEffectiveLoad(item);
            const reps = parseInt(item.reps, 10) || 1;
            const sets = item.sets || 1;
            const oneRM = Math.round(estimate1RM(load, reps));
            const repDisplay = item.partialReps ? `${sets} × ${reps} + ${item.partialReps} reps` : `${sets} × ${reps}`;
            let loadDisplay;
            if (item.weightMode === 'pct' && item.pct) {
                loadDisplay = `${item.pct}% 1RM (${Math.round(load)}kg)`;
            } else if (item.weightMode === 'rpe' && item.rpe) {
                loadDisplay = `RPE ${item.rpe} (${Math.round(load)}kg)`;
            } else {
                loadDisplay = `${Math.round(load)}kg`;
            }
            return `
<div class="bg-slate-900 border border-slate-700 rounded-xl p-2.5">
    <div class="flex justify-between items-center">
        <span class="text-emerald-300 font-bold text-xs uppercase tracking-wider">${escapeHtml(item.exercise)}</span>
        <span class="text-slate-200 font-mono text-xs">${repDisplay} @ ${loadDisplay}</span>
    </div>
    <p class="text-slate-500 text-[10px] font-mono mt-0.5">Est. 1RM: ${oneRM}kg</p>
</div>`;
        }
    }).join('');
}

function changeCalendarNav(delta) {
    const inner = document.getElementById('cal-grid-inner');
    if (!inner) {
        applyCalendarNav(delta);
        renderCalendar();
        return;
    }
    const outClass = delta > 0 ? 'slide-out-left' : 'slide-out-right';
    const inClass = delta > 0 ? 'slide-in-left' : 'slide-in-right';
    inner.classList.add(outClass);
    inner.addEventListener('animationend', function handlerOut() {
        inner.removeEventListener('animationend', handlerOut);
        inner.classList.remove(outClass);
        applyCalendarNav(delta);
        renderCalendar();
        inner.classList.add(inClass);
        inner.addEventListener('animationend', function handlerIn() {
            inner.removeEventListener('animationend', handlerIn);
            inner.classList.remove(inClass);
        }, { once: true });
    }, { once: true });
}

function applyCalendarNav(delta) {
    if (state.calendar.compact) {
        state.calendar.weekOffset += delta;
        const monday = getMonday(new Date());
        monday.setDate(monday.getDate() + state.calendar.weekOffset * 7);
        state.calendar.month = new Date(monday);
    } else {
        state.calendar.month.setMonth(state.calendar.month.getMonth() + delta);
    }
    state.calendar.selectedDate = null;
    const detail = document.getElementById('cal-day-detail');
    if (detail) detail.classList.add('hidden');
    autoSelectFirstActiveDay();
}

function autoSelectFirstActiveDay() {
    if (activeDates.size === 0) return;
    let startDate, endDate;
    if (state.calendar.compact) {
        const monday = getMonday(new Date());
        monday.setDate(monday.getDate() + state.calendar.weekOffset * 7);
        startDate = new Date(monday);
        endDate = new Date(monday);
        endDate.setDate(endDate.getDate() + 6);
    } else {
        const year = state.calendar.month.getFullYear();
        const month = state.calendar.month.getMonth();
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);
    }
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (activeDates.has(dateStr)) {
            selectCalendarDay(dateStr);
            return;
        }
    }
}

function goToCalendarToday() {
    state.calendar.weekOffset = 0;
    state.calendar.month = new Date();
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    selectCalendarDay(todayStr);
}

function updateCalTodayBtnState() {
    const btn = document.getElementById('cal-today');
    if (!btn) return;
    const now = new Date();
    let isCurrent = false;
    if (state.calendar.compact) {
        isCurrent = state.calendar.weekOffset === 0;
    } else {
        isCurrent = state.calendar.month.getFullYear() === now.getFullYear() && state.calendar.month.getMonth() === now.getMonth();
    }
    if (isCurrent) {
        btn.className = 'btn-core is-ghost btn-size-row';
        btn.disabled = true;
    } else {
        btn.className = 'btn-core is-primary-ghost btn-size-row';
        btn.disabled = false;
    }
}

function toggleCalendarView() {
    state.calendar.compact = !state.calendar.compact;
    if (state.calendar.compact) {
        state.calendar.weekOffset = 0;
        const monday = getMonday(new Date());
        state.calendar.month = new Date(monday);
    } else {
        const monday = getMonday(new Date());
        monday.setDate(monday.getDate() + state.calendar.weekOffset * 7);
        state.calendar.month = new Date(monday);
    }
    const btn = document.getElementById('cal-toggle-view');
    if (btn) btn.textContent = state.calendar.compact ? 'Month View ▽' : 'Week View △';
    renderCalendar();
}

function closeCalendarDayDetail() {
    state.calendar.selectedDate = null;
    const detail = document.getElementById('cal-day-detail');
    if (detail) detail.classList.add('hidden');
    renderCalendar();
}

function listenToStructuredWorkouts(uid) {
  const q = query(
    collection(db, "structured_workouts"),
    where("userId", "==", uid),
    orderBy("timestamp", "desc"),
    limit(500)
  );
  unsubscribeStructured = onSnapshot(q, (snapshot) => {
    const workouts = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const timestamp = data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp;
      workouts.push({ id: doc.id, ...data, timestamp });
    });
    state.data.lastStructuredWorkouts = workouts;
    renderStructuredWorkoutHistory();
    debouncedSyncActivity();
  }, (error) => {
    console.error('Structured workouts stream error', error.code, error.message);
    // Show a visible hint so users know a composite index may be needed
    const container = document.getElementById('structured-workout-list');
    if (container && !container.querySelector('.index-hint')) {
      const hint = document.createElement('p');
      hint.className = 'index-hint text-xs text-yellow-400 italic py-2 text-center';
      hint.textContent = 'Structured workouts unavailable — check browser console for index link.';
      container.prepend(hint);
    }
  });
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

function renderWorkoutCard(id, name, type, badgeClass, descLine, metadataHtml, movementsHtml, actionsHtml, isFavorite, favCallback) {
  const isFav = isFavorite === true;
  const starIcon = isFav ? '\u2605' : '\u2606';
  const favColorClass = isFav ? 'text-amber-400' : 'text-slate-500';
  const hasMovements = movementsHtml.trim().length > 0;

  return `<div class="structured-card p-4 rounded-2xl mb-3 shadow-2xl shadow-slate-950/60 transition-all duration-200" style="background-color: var(--slate-900);" data-workout-id="${id}">
    <div class="flex justify-between items-stretch gap-3 ${hasMovements ? 'structured-header-clickable cursor-pointer' : ''}"${hasMovements ? ` onclick="toggleWorkoutCard(this)"` : ''}>
      <div class="flex flex-col justify-start gap-1.5 min-w-0 flex-1">
        <h4 class="text-emerald-300 font-bold uppercase tracking-wider text-sm truncate">${escapeHtml(name)}</h4>
        ${metadataHtml}
        <span class="workout-type-badge self-start ${badgeClass}">${escapeHtml(formatWorkoutType(type))}</span>
        ${descLine ? `<span class="text-xs text-slate-400 font-mono mt-0.5">${escapeHtml(descLine)}</span>` : ''}
      </div>
      <div class="flex flex-col justify-between items-end shrink-0">
        <button type="button" onclick="event.stopPropagation(); ${favCallback}" class="${favColorClass} hover:scale-110 transition-transform btn-fav-star" title="Favorite">
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
      <span class="text-xs text-slate-500 font-medium hover:text-slate-300 transition-colors cursor-pointer show-more-text" onclick="event.stopPropagation(); toggleWorkoutCard(this)">Show more</span>
    </div>` : ''}
</div>`;
}

function renderStructuredWorkoutCard(sw) {
  const type = sw.type || 'AMRAP';
  const badgeClass = type.toLowerCase();
  const descLine = buildWorkoutSummaryLine(type, sw.structure || {});
  let movementsHtml = '';

  if (type === 'EMOM') {
    const minutes = sw.structure?.minutes || [];
    const isByRound = sw.structure?.mode === 'by_round';
    movementsHtml = minutes.map((m, idx) => {
      const mov = m.movements?.[0];
      if (!mov) return '';
      const label = isByRound ? `Round ${idx + 1}: ` : '';
      return `<span class="movement-chip">${label}${escapeHtml(mov.exerciseId)} × ${mov.reps}${formatMovementLoad(mov)}</span>`;
    }).join('');
  } else if (type === 'FOR_TIME') {
    const movements = sw.structure?.movements || [];
    movementsHtml = movements.map(m => {
      return `<span class="movement-chip">${escapeHtml(m.exerciseId)} × ${m.reps}${formatMovementLoad(m)}</span>`;
    }).join('');
  } else if (type === 'INTERVAL') {
    const movements = sw.structure?.movements || [];
    movementsHtml = movements.map(m => {
      return `<span class="movement-chip">${escapeHtml(m.exerciseId)} × ${m.reps}${formatMovementLoad(m)}</span>`;
    }).join('');
  } else {
    const movements = sw.structure?.movements || [];
    movementsHtml = movements.map(m => {
      return `<span class="movement-chip">${escapeHtml(m.exerciseId)} × ${m.reps}${formatMovementLoad(m)}</span>`;
    }).join('');
  }

  if (movementsHtml.trim().length > 0) {
    movementsHtml = `<div class="w-full text-sm text-slate-300 border-t border-slate-800/60 pt-2">${movementsHtml}</div>`;
  }

  const metadataHtml = [
    sw.isShared ? `<div class="flex items-center gap-1.5 text-xs text-slate-300"><i data-lucide="share-2" class="w-3.5 h-3.5 shrink-0"></i><span class="truncate">${escapeHtml(sw.username || 'Shared User')}</span></div>` : '',
    sw.timestamp ? `<div class="flex items-center gap-1.5 text-xs text-slate-400"><i data-lucide="calendar" class="w-3.5 h-3.5 shrink-0"></i><span>${formatCardDate(sw.timestamp)}</span></div>` : ''
  ].filter(Boolean).join('\n');

  const actionsHtml = [
    `<button type="button" onclick="event.stopPropagation(); doStructuredWorkout('${sw.id}')" class="flex-1 btn-core is-primary-ghost btn-card-action" title="Do Workout"><i data-lucide="dumbbell" size="18"></i><span>Train</span></button>`,
    `<button type="button" onclick="event.stopPropagation(); redoWorkout('${sw.id}')" class="flex-1 btn-core is-ghost btn-card-action" title="Load"><i data-lucide="clipboard-pen-line" size="18"></i><span>Plan</span></button>`,
    `<button type="button" onclick="event.stopPropagation(); openShareModal('${sw.id}', true)" class="flex-1 btn-core is-ghost btn-card-action" title="Share"><i data-lucide="share-2" size="18"></i><span>Share</span></button>`,
    `<button type="button" onclick="event.stopPropagation(); deleteStructuredWorkout('${sw.id}')" class="flex-1 btn-core is-ghost btn-card-action hover:!text-rose-400 hover:!border-rose-400" title="Delete"><i data-lucide="trash-2" size="18"></i><span>Delete</span></button>`
  ].join('\n');

  return renderWorkoutCard(sw.id, sw.name, type, badgeClass, descLine, metadataHtml, movementsHtml, actionsHtml, sw.favorite, `toggleStructuredFavorite('${sw.id}')`);
}

function saveExpandedCardIds() {
  const ids = [];
  document.querySelectorAll('.structured-card').forEach(card => {
    const id = card.getAttribute('data-workout-id');
    if (!id) return;
    const movements = card.querySelector('.structured-movements');
    if (movements && !movements.classList.contains('hidden')) {
      ids.push(id);
    }
  });
  return ids;
}

function restoreExpandedCardIds(ids) {
  if (!ids || !ids.length) return;
  ids.forEach(id => {
    const card = document.querySelector(`[data-workout-id="${id}"]`);
    if (!card) return;
    const movements = card.querySelector('.structured-movements');
    const showMore = card.querySelector('.show-more-text');
    if (movements) movements.classList.remove('hidden');
    if (showMore) showMore.textContent = 'Show less';
  });
}

function toggleWorkoutCard(headerEl) {
    const card = headerEl.closest('.structured-card');
    const movements = card.querySelector('.structured-movements');
    const showMore = card.querySelector('.show-more-text');
    if (!movements || !showMore) return;
    movements.classList.toggle('hidden');
    showMore.textContent = movements.classList.contains('hidden') ? 'Show more' : 'Show less';
}

function renderStructuredWorkoutHistory() {
  const container = document.getElementById('structured-workout-list');
  const pagination = document.getElementById('structured-pagination');
  if (!container) return;

  const expandedIds = saveExpandedCardIds();

  const workouts = state.data.lastStructuredWorkouts;

  if (!workouts.length) {
    renderEmptyState(container, 'No structured workouts logged yet.');
    if (pagination) pagination.classList.add('hidden');
    return;
  }

  const perPage = 3;
  const totalPages = Math.max(1, Math.ceil(workouts.length / perPage));
  state.pagination.structured = Math.min(state.pagination.structured, totalPages);
  const start = (state.pagination.structured - 1) * perPage;
  const pageItems = workouts.slice(start, start + perPage);

  container.innerHTML = pageItems.map(renderStructuredWorkoutCard).join('');
  restoreExpandedCardIds(expandedIds);
  if (typeof lucide !== 'undefined') lucide.createIcons();

  updatePagination('structured', state.pagination.structured, totalPages);
}

function changeStructuredPage(direction) {
  const totalPages = Math.max(1, Math.ceil(state.data.lastStructuredWorkouts.length / 3));
  if (direction === 'prev' && state.pagination.structured > 1) {
    state.pagination.structured--;
  } else if (direction === 'next' && state.pagination.structured < totalPages) {
    state.pagination.structured++;
  }
  renderStructuredWorkoutHistory();
}

// ==========================================
// END STRUCTURED WORKOUT SYSTEM
// ==========================================

// ==========================================
// WORKOUT PLAN SYSTEM
// ==========================================

function listenToPlans(uid) {
  const q = query(
    collection(db, "workout_plans"),
    where("userId", "==", uid)
  );
  unsubscribePlans = onSnapshot(q, (snapshot) => {
    const plans = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status !== 'active') return;
      const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt;
      plans.push({ id: doc.id, ...data, createdAt });
    });
    plans.sort((a, b) => b.createdAt - a.createdAt);
    state.data.lastWorkoutPlans = plans;
    if (state.ui.plansFilter === 'mine') renderPlansUI();
    if (state.ui.plansFilter === 'favorites') renderSharedPlansUI();
  }, (error) => {
    console.error('Plans stream error', error.code, error.message);
  });
}

function renderPlansUI() {
  const container = document.getElementById('saved-plans-inline');
  const pagination = document.getElementById('plans-pagination');
  if (!container) return;

  const expandedIds = saveExpandedCardIds();

  if (!state.data.lastWorkoutPlans.length) {
    renderEmptyState(container, 'No saved plans yet.');
    if (pagination) pagination.classList.add('hidden');
    return;
  }

  const perPage = 3;
  const totalPages = Math.max(1, Math.ceil(state.data.lastWorkoutPlans.length / perPage));
  state.pagination.plans = Math.min(state.pagination.plans, totalPages);
  const start = (state.pagination.plans - 1) * perPage;
  const pageItems = state.data.lastWorkoutPlans.slice(start, start + perPage);

  container.innerHTML = pageItems.map(plan => renderPlanCard(plan)).join('');
  restoreExpandedCardIds(expandedIds);
  if (typeof lucide !== 'undefined') lucide.createIcons();

  updatePagination('plans', state.pagination.plans, totalPages);
}

function switchPlansFilter(filter) {
  state.ui.plansFilter = filter;
  const btnMine = document.getElementById('plans-filter-mine');
  const btnShared = document.getElementById('plans-filter-shared');
  const btnFavs = document.getElementById('plans-filter-favorites');
  const plansSection = document.getElementById('saved-plans-inline');
  const plansPagination = document.getElementById('plans-pagination');
  const sharedSection = document.getElementById('shared-plans-inline');
  const sharedPagination = document.getElementById('shared-plans-pagination');

  const setActive = (btn) => btn.className = 'btn-core is-primary btn-size-row';
  const setInactive = (btn) => btn.className = 'btn-core is-ghost btn-size-row';

  if (filter === 'mine') {
    setActive(btnMine); setInactive(btnShared); setInactive(btnFavs);
    if (plansSection) plansSection.classList.remove('hidden');
    if (plansPagination) plansPagination.classList.remove('hidden');
    if (sharedSection) sharedSection.classList.add('hidden');
    if (sharedPagination) sharedPagination.classList.add('hidden');
    renderPlansUI();
  } else {
    setInactive(btnMine);
    if (filter === 'shared') { setActive(btnShared); setInactive(btnFavs); }
    else { setActive(btnFavs); setInactive(btnShared); }
    if (plansSection) plansSection.classList.add('hidden');
    if (plansPagination) plansPagination.classList.add('hidden');
    if (sharedSection) sharedSection.classList.remove('hidden');
    if (sharedPagination) sharedPagination.classList.remove('hidden');
    renderSharedPlansUI();
  }
}

function changePlansPage(direction) {
  const totalPages = Math.max(1, Math.ceil(state.data.lastWorkoutPlans.length / 3));
  if (direction === 'prev' && state.pagination.plans > 1) {
    state.pagination.plans--;
  } else if (direction === 'next' && state.pagination.plans < totalPages) {
    state.pagination.plans++;
  }
  renderPlansUI();
}

function renderPlanCard(plan) {
  const type = plan.type || 'AMRAP';
  const badgeClass = type.toLowerCase();
  const descLine = buildWorkoutSummaryLine(type, plan.structure || {});

  let movementsHtml = '';
  const structure = plan.structure || {};

  if (type === 'EMOM') {
    const minutes = structure.minutes || [];
    movementsHtml = minutes.map((m, idx) => {
      const mov = m.movements?.[0];
      if (!mov) return '';
      return `<span class="movement-chip">${idx + 1}: ${escapeHtml(mov.exerciseId)} \u00D7 ${mov.reps}${formatMovementLoad(mov)}</span>`;
    }).join('');
  } else {
    const movements = structure.movements || [];
    movementsHtml = movements.map(m => {
      return `<span class="movement-chip">${escapeHtml(m.exerciseId)} \u00D7 ${m.reps}${formatMovementLoad(m)}</span>`;
    }).join('');
  }

  const metadataHtml = plan.createdAt
    ? `<div class="flex items-center gap-1.5 text-xs text-slate-400"><i data-lucide="calendar" class="w-3.5 h-3.5 shrink-0"></i><span>${formatCardDate(plan.createdAt)}</span></div>`
    : '';

  const actionsHtml = [
    `<button type="button" onclick="doPlanWorkout('${plan.id}')" class="flex-1 btn-core is-primary-ghost btn-card-action"><i data-lucide="dumbbell" size="18"></i><span>Train</span></button>`,
    `<button type="button" onclick="loadPlan('${plan.id}')" class="flex-1 btn-core is-ghost btn-card-action"><i data-lucide="clipboard-pen-line" size="18"></i><span>Plan</span></button>`,
    `<button type="button" onclick="openShareModal('${plan.id}')" class="flex-1 btn-core is-ghost btn-card-action"><i data-lucide="share-2" size="18"></i><span>Share</span></button>`,
    `<button type="button" onclick="deletePlan('${plan.id}')" class="flex-1 btn-core is-ghost btn-card-action hover:!text-rose-400 hover:!border-rose-400"><i data-lucide="trash-2" size="18"></i><span>Delete</span></button>`
  ].join('\n');

  return renderWorkoutCard(plan.id, plan.name, type, badgeClass, descLine, metadataHtml, movementsHtml, actionsHtml, plan.favorite, `togglePlanFavorite('${plan.id}')`);
}

async function deletePlan(planId) {
  if (!currentUser) return;
  if (!confirm('Delete this saved plan?')) return;
  try {
    await updateDoc(doc(db, "workout_plans", planId), { status: 'deleted' });
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('Delete plan failed', err.code, err.message);
    alert('Failed to delete plan: ' + err.message);
  }
}

async function deleteStructuredWorkout(workoutId) {
  if (!currentUser) return;
  if (!confirm('Delete this workout log?')) return;
  try {
    await deleteDoc(doc(db, "structured_workouts", workoutId));
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('Delete workout failed', err.code, err.message);
    alert('Failed to delete workout: ' + err.message);
  }
}

function loadPlan(planId) {
  const plan = state.data.lastWorkoutPlans.find(p => p.id === planId);
  if (!plan) return;

  switchTab('calculator');

  const typeSelect = document.getElementById('workout-type');
  if (typeSelect) typeSelect.value = plan.type;
  handleWorkoutTypeChange();

  const structure = plan.structure || {};

  switch (plan.type) {
    case 'AMRAP': populateAmrapForm(structure); break;
    case 'EMOM': populateEmomForm(structure); break;
    case 'FOR_TIME': populateForTimeForm(structure); break;
    case 'INTERVAL': populateIntervalForm(structure); break;
  }

  const planCard = document.getElementById('plan-workout-card');
  if (planCard) planCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showFeedback(`Plan "${plan.name}" loaded!`, 'emerald', 'planFeedback');
  haptic(HAPTIC.tap);
}

function redoWorkout(workoutId) {
  const sw = state.data.lastStructuredWorkouts.find(w => w.id === workoutId);
  if (!sw) return;

  switchTab('calculator');

  const typeSelect = document.getElementById('workout-type');
  if (typeSelect) typeSelect.value = sw.type;
  handleWorkoutTypeChange();

  const structure = sw.structure || {};
  switch (sw.type) {
    case 'AMRAP': populateAmrapForm(structure); break;
    case 'EMOM': populateEmomForm(structure); break;
    case 'FOR_TIME': populateForTimeForm(structure); break;
    case 'INTERVAL': populateIntervalForm(structure); break;
  }

  const planCard = document.getElementById('plan-workout-card');
  if (planCard) planCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showFeedback(`Workout "${sw.name}" loaded for redo!`, 'emerald', 'planFeedback');
  haptic(HAPTIC.tap);
}

const WORKOUT_TYPE_TO_RESULT_ID = {
  AMRAP: 'amrap',
  EMOM: 'emom',
  FOR_TIME: 'fortime',
  INTERVAL: 'interval'
};

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

function describeAmrap(structure) {
  const mins = Math.round((structure.durationSeconds || 0) / 60);
  const lines = [`${mins}:00`];
  (structure.movements || []).forEach(m =>
    lines.push(`\u2022 ${m.reps || '?'}x ${m.movement}${formatMovementWeight(m)}`)
  );
  return lines.join('<br>');
}

function describeEmom(structure) {
  const lines = [];
  const totalSec = structure.intervalSeconds || 0;
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const isStandardEmom = totalSec === 60;
  if (!isStandardEmom) {
    lines.push(`Every ${mins}:${String(secs).padStart(2, '0')} min \u00D7 ${structure.rounds || 0} rounds`);
  } else {
    lines.push(`\u00D7 ${structure.rounds || 0} rounds`);
  }
  (structure.minutes || []).forEach((m, i) => {
    const mov = m.movements?.[0];
    if (mov) lines.push(`Round ${i + 1}: ${mov.reps || '?'}x ${mov.exerciseId || ''}${formatMovementWeight(mov)}`);
  });
  return lines.join('<br>');
}

function describeForTime(structure) {
  const lines = [];
  const parts = [];
  if (structure.durationMinutes) parts.push(`${structure.durationMinutes}:00 cap`);
  parts.push(`${structure.rounds || 0} rounds`);
  lines.push(parts.join(' \u00B7 '));
  const uniqueMovements = structure.movements || [];
  if (uniqueMovements.length) {
    lines.push('Each round:');
    uniqueMovements.forEach(m =>
      lines.push(`  ${m.reps || '?'}x ${m.movement}${formatMovementWeight(m)}`)
    );
  }
  return lines.join('<br>');
}

function describeInterval(structure) {
  const lines = [];
  const wMin = Math.floor((structure.workSeconds || 0) / 60);
  const rMin = Math.floor((structure.restSeconds || 0) / 60);
  lines.push(`Work ${wMin}:00 \u00B7 Rest ${rMin}:00 \u00B7 ${structure.rounds || 0} rounds`);
  (structure.movements || []).forEach(m =>
    lines.push(`  ${m.reps || '?'}x ${m.movement}${formatMovementWeight(m)}`)
  );
  return lines.join('<br>');
}

function buildWorkoutDescription(workout) {
  const { type, structure } = workout;
  switch (type) {
    case 'AMRAP': return describeAmrap(structure);
    case 'EMOM': return describeEmom(structure);
    case 'FOR_TIME': return describeForTime(structure);
    case 'INTERVAL': return describeInterval(structure);
    default: return '';
  }
}

function formatWorkoutType(type) {
  return type === 'FOR_TIME' ? 'For Time' : type;
}

function buildWorkoutSummaryLine(type, structure) {
  switch (type) {
    case 'AMRAP': {
      const mins = Math.round((structure.durationSeconds || 0) / 60);
      return `As Many Rounds As Possible in ${mins}:00 mins`;
    }
    case 'EMOM': {
      const rounds = structure.rounds || 0;
      const intervalSec = structure.intervalSeconds || 60;
      const mins = Math.floor(intervalSec / 60);
      const secs = intervalSec % 60;
      return `Every ${mins}:${String(secs).padStart(2, '0')} x ${rounds} rounds`;
    }
    case 'FOR_TIME': {
      const cap = structure.durationMinutes;
      const rounds = structure.rounds;
      const parts = [];
      if (cap) parts.push(`${cap} min cap`);
      if (rounds) parts.push(`${rounds} rounds`);
      return parts.join(' \u00B7 ');
    }
    case 'INTERVAL': {
      const ws = structure.workSeconds || 0;
      const rs = structure.restSeconds || 0;
      const wrk = `${Math.floor(ws / 60)}:${(ws % 60).toString().padStart(2, '0')}`;
      const rst = `${Math.floor(rs / 60)}:${(rs % 60).toString().padStart(2, '0')}`;
      const rds = structure.rounds || 0;
      return `Work ${wrk} \u00B7 Rest ${rst} \u00B7 ${rds} rounds`;
    }
    default: return '';
  }
}

function setupTrainingTab(w) {
  const type = w.type;
  state.builder.pendingPlannedWorkout = w;

  const placeholder = document.getElementById('log-workout-placeholder');
  if (placeholder) placeholder.classList.add('hidden');

  const badge = document.getElementById('log-workout-type-badge');
  if (badge) {
    badge.textContent = formatWorkoutType(type);
    badge.className = 'workout-type-badge self-start ' + type.toLowerCase();
    badge.style.display = '';
  }

  const desc = document.getElementById('workout-description');
  if (desc) {
    desc.classList.remove('hidden');
    desc.innerHTML = buildWorkoutDescription(w);
  }

  document.querySelectorAll('[id^="log-result-"]').forEach(el => el.classList.add('hidden'));
  document.getElementById('log-result')?.classList.remove('hidden');
  const fortimeEl = document.getElementById('log-result-fortime');
  if (fortimeEl) fortimeEl.classList.toggle('hidden', type !== 'FOR_TIME');
  if (type === 'FOR_TIME') {
    document.getElementById('fortime-dnf') && (document.getElementById('fortime-dnf').checked = false);
    document.getElementById('fortime-cap-reps-container')?.classList.add('hidden');
    document.getElementById('fortime-minutes')?.toggleAttribute('required', true);
    document.getElementById('fortime-seconds')?.toggleAttribute('required', true);
  }

  const logRounds = document.getElementById('log-rounds');
  const logPartial = document.getElementById('log-partial-reps');
  if (logRounds) logRounds.value = '';
  if (logPartial) logPartial.value = '';
  recalcForTimeRemaining();
  updateLogScorePreview();
  updateLogWorkoutButtonState();

  const btn = document.getElementById('log-workout-btn');
  if (btn) { btn.disabled = false; }

  const fb = document.getElementById('log-workout-feedback');
  if (fb) fb.textContent = '';
  haptic(HAPTIC.tap);
}

function doWorkout() {
  const type = document.getElementById('workout-type').value;
  if (!type) { showFeedback('Select a workout type first', 'rose', 'planFeedback'); return; }

  const resultId = WORKOUT_TYPE_TO_RESULT_ID[type];
  if (!resultId) { showFeedback('Unknown workout type.', 'rose', 'planFeedback'); return; }

  let structure;
  try {
    structure = capturePlanStructure(type);
  } catch (err) {
    console.error('capturePlanStructure error:', err);
    showFeedback(err.message, 'rose', 'log-workout-feedback');
    return;
  }

  const hasMovements = type === 'EMOM'
    ? (structure.minutes && structure.minutes.length > 0)
    : (structure.movements && structure.movements.length > 0);
  if (!hasMovements) {
    showFeedback('Add at least one movement before starting the workout.', 'rose', 'planFeedback');
    return;
  }

  switchTab('training');
  setupTrainingTab({
    id: 'pending_' + Date.now(),
    type: type,
    name: type === 'FOR_TIME' ? 'For Time' : type + ' Workout',
    timestamp: new Date().toISOString(),
    structure
  });
}

function doStructuredWorkout(workoutId) {
  const sw = state.data.lastStructuredWorkouts.find(w => w.id === workoutId);
  if (!sw) return;
  switchTab('training');
  setupTrainingTab({
    id: 'pending_' + Date.now(),
    type: sw.type,
    name: sw.name || (sw.type === 'FOR_TIME' ? 'For Time' : sw.type + ' Workout'),
    timestamp: new Date().toISOString(),
    structure: sw.structure || {}
  });
}

function doPlanWorkout(planId) {
  const plan = state.data.lastWorkoutPlans.find(p => p.id === planId);
  if (!plan) return;
  switchTab('training');
  setupTrainingTab({
    id: 'pending_' + Date.now(),
    type: plan.type,
    name: plan.name || (plan.type === 'FOR_TIME' ? 'For Time' : plan.type + ' Workout'),
    timestamp: new Date().toISOString(),
    structure: plan.structure || {}
  });
}

function doSharedPlan(shareId) {
  const share = state.data.lastSharedPlans.find(s => s.id === shareId);
  if (!share || !share.content) return;
  const plan = share.content;
  switchTab('training');
  setupTrainingTab({
    id: 'pending_' + Date.now(),
    type: plan.type,
    name: plan.name || (plan.type === 'FOR_TIME' ? 'For Time' : plan.type + ' Workout'),
    timestamp: new Date().toISOString(),
    structure: plan.structure || {}
  });
}

let isSubmittingWorkout = false;

async function submitAmrapWorkout(name, structure, now) {
  const roundsCompleted = parseInt(document.getElementById('log-rounds').value, 10);
  const additionalReps = parseInt(document.getElementById('log-partial-reps').value, 10) || 0;
  if (roundsCompleted < 0) {
    showFeedback('Enter rounds completed.', 'rose', 'log-workout-feedback');
    return;
  }

  const workoutDoc = {
    userId: currentUser.uid,
    name,
    type: 'AMRAP',
    structure,
    result: { roundsCompleted, additionalReps },
    scoreDisplay: formatScore_ROUNDS_AND_REPS(roundsCompleted, additionalReps),
    scoreType: 'ROUNDS_AND_REPS',
    scoreValue: roundsCompleted * 1000 + additionalReps,
    timestamp: now
  };
  const docRef = await addDoc(collection(db, "structured_workouts"), workoutDoc);
  await generateAmrapContributions(docRef.id, structure.movements, roundsCompleted, additionalReps);
}

async function submitEmomWorkout(name, structure, now) {
  const roundsCompleted = parseInt(document.getElementById('log-rounds').value, 10);
  if (roundsCompleted < 0) {
    showFeedback('Enter rounds completed.', 'rose', 'log-workout-feedback');
    return;
  }

  const workoutDoc = {
    userId: currentUser.uid,
    name,
    type: 'EMOM',
    structure,
    result: { roundsCompleted },
    scoreDisplay: formatScore_COMPLETED_MINUTES(roundsCompleted, structure.rounds),
    scoreType: 'COMPLETED_MINUTES',
    scoreValue: roundsCompleted,
    timestamp: now
  };
  const docRef = await addDoc(collection(db, "structured_workouts"), workoutDoc);
  await generateEmomContributions(docRef.id, structure.minutes, roundsCompleted, structure.mode);
}

async function submitForTimeWorkout(name, structure, now) {
  const dnf = document.getElementById('fortime-dnf').checked;
  const remainingReps = dnf ? (parseInt(document.getElementById('fortime-cap-reps').value, 10) || 0) : 0;
  const resultMins = dnf ? 0 : (parseInt(document.getElementById('fortime-minutes').value, 10) || 0);
  const resultSecs = dnf ? 0 : (parseInt(document.getElementById('fortime-seconds').value, 10) || 0);
  const timeSeconds = dnf ? 0 : resultMins * 60 + resultSecs;
  if (resultSecs > 59) {
    showFeedback('Seconds must be 0–59.', 'rose', 'log-workout-feedback');
    return;
  }

  const workoutDoc = {
    userId: currentUser.uid,
    name,
    type: 'FOR_TIME',
    structure,
    result: { timeSeconds, completed: !dnf, ...(dnf && { remainingReps }) },
    scoreDisplay: dnf ? `Cap ${remainingReps}` : formatScore_TIME_SECONDS(timeSeconds),
    scoreType: 'TIME_SECONDS',
    scoreValue: dnf ? remainingReps : timeSeconds,
    timestamp: now
  };
  const docRef = await addDoc(collection(db, "structured_workouts"), workoutDoc);
  await generateForTimeContributions(docRef.id, structure.movements, structure.rounds, remainingReps);
}

async function submitIntervalWorkout(name, structure, now) {
  const roundsCompleted = parseInt(document.getElementById('log-rounds').value, 10);
  const partialReps = parseInt(document.getElementById('log-partial-reps').value, 10) || 0;
  if (roundsCompleted < 0) {
    showFeedback('Enter rounds completed.', 'rose', 'log-workout-feedback');
    return;
  }

  const workoutDoc = {
    userId: currentUser.uid,
    name,
    type: 'INTERVAL',
    structure,
    result: { roundsCompleted, partialReps, completed: roundsCompleted >= structure.rounds },
    scoreDisplay: formatScore_ROUNDS_AND_REPS(roundsCompleted, partialReps),
    scoreType: 'ROUNDS_AND_REPS',
    scoreValue: roundsCompleted * 1000 + partialReps,
    timestamp: now
  };
  const docRef = await addDoc(collection(db, "structured_workouts"), workoutDoc);
  await generateIntervalContributions(docRef.id, structure.movements, roundsCompleted, partialReps);
}

function resetTrainingTab() {
  state.builder.pendingPlannedWorkout = null;
  const pwBadge = document.getElementById('log-workout-type-badge');
  if (pwBadge) { pwBadge.textContent = ''; pwBadge.style.display = 'none'; }
  const pwPlaceholder = document.getElementById('log-workout-placeholder');
  if (pwPlaceholder) pwPlaceholder.classList.remove('hidden');
  const pwDesc = document.getElementById('workout-description');
  if (pwDesc) { pwDesc.classList.add('hidden'); pwDesc.innerHTML = ''; }
  document.querySelectorAll('[id^="log-result-"]').forEach(el => el.classList.add('hidden'));
  const logRoundsReset = document.getElementById('log-rounds');
  const logPartialReset = document.getElementById('log-partial-reps');
  if (logRoundsReset) logRoundsReset.value = '';
  if (logPartialReset) logPartialReset.value = '';
  const roundBtn = document.getElementById('log-round-btn');
  const repBtn = document.getElementById('log-rep-btn');
  if (roundBtn) { roundBtn.classList.remove('is-secondary'); roundBtn.classList.add('is-primary'); }
  if (repBtn) { repBtn.classList.remove('is-secondary'); repBtn.classList.add('is-primary-ghost'); }
  const scorePreview = document.getElementById('log-score-preview');
  if (scorePreview) scorePreview.textContent = '—';
  const ftDnf = document.getElementById('fortime-dnf');
  if (ftDnf) ftDnf.checked = false;
  const ftMins = document.getElementById('fortime-minutes');
  const ftSecs = document.getElementById('fortime-seconds');
  const ftCap = document.getElementById('fortime-cap-reps');
  if (ftMins) { ftMins.value = ''; ftMins.toggleAttribute('required', true); }
  if (ftSecs) { ftSecs.value = ''; ftSecs.toggleAttribute('required', true); }
  if (ftCap) ftCap.value = '';
  const ftTimeInputs = document.getElementById('fortime-time-inputs');
  const ftCapContainer = document.getElementById('fortime-cap-reps-container');
  if (ftTimeInputs) ftTimeInputs.classList.remove('hidden');
  if (ftCapContainer) ftCapContainer.classList.add('hidden');
  const ftScore = document.getElementById('fortime-score-preview');
  if (ftScore) ftScore.textContent = '—';
  const pwBtn = document.getElementById('log-workout-btn');
  if (pwBtn) { pwBtn.disabled = true; pwBtn.classList.remove('is-primary'); pwBtn.classList.add('is-ghost'); }
}

async function submitPendingWorkout() {
  if (isSubmittingWorkout) return;
  if (!currentUser) return alert('Please sign in first.');
  if (!state.builder.pendingPlannedWorkout) return showFeedback('No planned workout to log.', 'rose', 'log-workout-feedback');

  const btn = document.getElementById('log-workout-btn');
  if (btn) btn.disabled = true;
  isSubmittingWorkout = true;

  const { type, name, structure } = state.builder.pendingPlannedWorkout;
  const now = Timestamp.now();

  try {
    const handlers = {
      'AMRAP': submitAmrapWorkout,
      'EMOM': submitEmomWorkout,
      'FOR_TIME': submitForTimeWorkout,
      'INTERVAL': submitIntervalWorkout
    };

    if (!handlers[type]) {
      return showFeedback('Unknown workout type.', 'rose', 'log-workout-feedback');
    }

    await handlers[type](name, structure, now);
    resetTrainingTab();
    showFeedback('Workout logged!', 'emerald', 'log-workout-feedback');
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('Log pending workout failed', err.code, err.message);
    if (err.code === 'permission-denied') {
      showFeedback('Save blocked by Firestore rules.', 'rose', 'log-workout-feedback');
    } else {
      showFeedback('Failed to log workout: ' + err.message, 'rose', 'log-workout-feedback');
    }
  } finally {
    if (btn) btn.disabled = false;
    isSubmittingWorkout = false;
  }
}

function capturePlanStructure(type) {
  const getMovementsFromWorkout = () => {
    return state.builder.workoutMovements.map(m => ({
      movement: m.exerciseId,
      reps: m.reps,
      kg: m.weight,
      weightMode: m.weightMode,
      pct: m.pct,
      rpe: m.rpe,
      exerciseId: m.exerciseId,
      weight: m.weight
    }));
  };

  switch (type) {
    case 'AMRAP': {
      const durationMin = parseInt(document.getElementById('amrap-duration')?.value, 10) || 0;
      const movements = getMovementsFromWorkout();
      return { durationSeconds: durationMin * 60, movements };
    }
    case 'EMOM': {
      const intervalMin = parseInt(document.getElementById('emom-interval-min')?.value, 10) || 0;
      const intervalSec = parseInt(document.getElementById('emom-interval-sec')?.value, 10) || 0;
      const intervalSeconds = intervalMin * 60 + intervalSec;
      let minutes;
      try { minutes = getEmomMovementData(); } catch (e) { console.error('EMOM movement data error:', e); minutes = []; }
      const rounds = state.builder.emomMode === 'by_round' ? minutes.length : parseInt(document.getElementById('emom-rounds')?.value, 10) || 0;
      const durationSeconds = rounds * intervalSeconds;
      return { mode: state.builder.emomMode, rounds, durationMinutes: Math.floor(durationSeconds / 60), intervalSeconds, minutes };
    }
    case 'FOR_TIME': {
      const timeCap = parseInt(document.getElementById('fortime-cap')?.value, 10) || 0;
      const rounds = parseInt(document.getElementById('fortime-rounds')?.value, 10) || 0;
      const movements = getMovementsFromWorkout();
      return { durationMinutes: timeCap || null, movements, rounds };
    }
    case 'INTERVAL': {
      const rounds = parseInt(document.getElementById('interval-rounds')?.value, 10) || 0;
      const workMin = parseInt(document.getElementById('interval-work-min')?.value, 10) || 0;
      const restMin = parseInt(document.getElementById('interval-rest-min')?.value, 10) || 0;
      const movements = getMovementsFromWorkout();
      return { rounds, workSeconds: workMin * 60, restSeconds: restMin * 60, movements };
    }
    default: return {};
  }
}

function switchShareMode(mode) {
  state.share.shareMode = mode;
  const btnFriends = document.getElementById('share-mode-friends');
  const btnQR = document.getElementById('share-mode-qr');
  const friendsSection = document.getElementById('share-friends-section');
  const qrSection = document.getElementById('share-qr-section');

  if (mode === 'friends') {
    btnFriends.className = 'btn-core is-primary btn-size-row';
    btnQR.className = 'btn-core is-ghost btn-size-row';
    friendsSection.classList.remove('hidden');
    qrSection.classList.add('hidden');
    document.getElementById('share-plan-feedback').textContent = '';
  } else {
    btnQR.className = 'btn-core is-primary btn-size-row';
    btnFriends.className = 'btn-core is-ghost btn-size-row';
    friendsSection.classList.add('hidden');
    qrSection.classList.remove('hidden');
    shareByQR();
  }
}

async function openShareModal(planId, isWorkout = false) {
  const modal = document.getElementById('share-plan-modal');
  const list = document.getElementById('share-friend-list');
  const feedback = document.getElementById('share-plan-feedback');
  if (!modal || !list) return;

  state.share.sharePlanId = planId;
  state.share.shareIsWorkout = isWorkout;
  feedback.textContent = '';

  switchShareMode('qr');
  document.getElementById('share-qr-display').innerHTML = '';
  document.getElementById('share-select-all-container').classList.add('hidden');
  if (!state.social.userFriendsList.length) {
    renderEmptyState(list, 'No friends linked yet. Add friends in the Friends section first.');
    modal.classList.remove('hidden');
    return;
  }

  const friendDocs = await Promise.allSettled(
    state.social.userFriendsList.filter(fUid => !state.social.friendDisplayCache[fUid]).map(fUid => getProfileDocument(fUid))
  );
  friendDocs.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.exists()) {
      const uid = state.social.userFriendsList.filter(fUid => !state.social.friendDisplayCache[fUid])[i];
      if (uid) state.social.friendDisplayCache[uid] = result.value.data();
    }
  });

  document.getElementById('share-select-all-container').classList.remove('hidden');
  document.getElementById('share-select-all').checked = false;

  let html = '';
  state.social.userFriendsList.forEach((fUid) => {
    const fDoc = state.social.friendDisplayCache[fUid];
    const name = fDoc ? getDisplayName(fDoc, fUid) : fUid;
    html += `
      <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 cursor-pointer">
        <input type="checkbox" class="share-friend-checkbox" value="${fUid}" />
        <span class="text-sm text-slate-200">${escapeHtml(name)}</span>
      </label>`;
  });
  list.innerHTML = html;
  modal.classList.remove('hidden');
}

function toggleSelectAllFriends() {
  const selectAll = document.getElementById('share-select-all');
  const checked = selectAll?.checked ?? false;
  document.querySelectorAll('.share-friend-checkbox').forEach(cb => cb.checked = checked);
}

function resolveShareContent() {
  if (state.share.shareIsWorkout) {
    const w = state.data.lastStructuredWorkouts.find(w => w.id === state.share.sharePlanId);
    if (!w) return null;
    return { name: w.name, type: w.type, structure: w.structure };
  }
  const p = state.data.lastWorkoutPlans.find(p => p.id === state.share.sharePlanId);
  if (!p) return null;
  return { name: p.name, type: p.type, structure: p.structure };
}

function buildSharedPlanDocument(fUid, content, displayName) {
  return {
    sharedBy: currentUser.uid,
    sharedByDisplayName: displayName,
    sharedWith: fUid,
    planId: state.share.sharePlanId,
    contentType: state.share.shareIsWorkout ? 'workout' : 'plan',
    content,
    status: 'pending',
    createdAt: serverTimestamp()
  };
}

function buildQrShareUrl(docRefId) {
  const base = window.location.pathname.replace(/\/?[^\/]*$/, '/');
  return window.location.origin + base + '?claimPlan=' + docRefId;
}

function buildQrCodeConfig(url) {
  return {
    type: "canvas",
    shape: "square",
    width: 300,
    height: 300,
    data: url,
    margin: 0,
    qrOptions: { typeNumber: 0, mode: "Byte", errorCorrectionLevel: "Q" },
    imageOptions: { saveAsBlob: true, hideBackgroundDots: true, imageSize: 0.4, margin: 0 },
    dotsOptions: { type: "dots", color: "#f8fafc", roundSize: true, gradient: null },
    backgroundOptions: { round: 0, color: "#0f172a" },
    cornersSquareOptions: { type: "extra-rounded", color: "#34d399" },
    cornersDotOptions: { type: "", color: "#f8fafc" }
  };
}

async function shareWithFriends() {
  const modal = document.getElementById('share-plan-modal');
  const feedback = document.getElementById('share-plan-feedback');
  const checked = document.querySelectorAll('.share-friend-checkbox:checked');
  if (!checked.length) {
    feedback.textContent = 'Select at least one friend.';
    return;
  }

  const content = resolveShareContent();
  if (!content) {
    feedback.textContent = 'Plan/workout not found.';
    return;
  }

  const selectedUids = Array.from(checked).map(cb => cb.value);
  const sharerSnap = await getDoc(getProfileDocRef(currentUser.uid));
  const sharerData = sharerSnap.exists() ? sharerSnap.data() : {};
  const displayName = sharerData.displayName || currentUser?.email?.split('@')[0] || 'Unknown';

  try {
    await Promise.all(selectedUids.map(fUid =>
      addDoc(collection(db, "shared_plans"), buildSharedPlanDocument(fUid, content, displayName))
    ));
    modal.classList.add('hidden');
    showFeedback(`Shared with ${selectedUids.length} friend${selectedUids.length > 1 ? 's' : ''}!`, 'emerald');
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('Share plan failed', err.code, err.message);
    feedback.textContent = 'Failed to share: ' + err.message;
  }
}

async function shareByQR() {
  const feedback = document.getElementById('share-plan-feedback');
  const qrDisplay = document.getElementById('share-qr-display');
  if (!qrDisplay) return;

  const plan = resolveShareContent();
  if (!plan) {
    feedback.textContent = 'Plan/workout not found.';
    return;
  }

  try {
    const sharerSnap = await getDoc(getProfileDocRef(currentUser.uid));
    const sharerData = sharerSnap.exists() ? sharerSnap.data() : {};
    const displayName = sharerData.displayName || currentUser?.email?.split('@')[0] || 'Unknown';

    const existing = await getDocs(query(
      collection(db, "shared_plans"),
      where("sharedBy", "==", currentUser.uid),
      where("planId", "==", state.share.sharePlanId),
      where("shareMethod", "==", "qr")
    ));

    let docRef;
    if (!existing.empty) {
      docRef = existing.docs[0].ref;
    } else {
      docRef = await addDoc(collection(db, "shared_plans"), {
        sharedBy: currentUser.uid,
        sharedByDisplayName: displayName,
        sharedWith: '__qr__',
        shareMethod: 'qr',
        planId: state.share.sharePlanId,
        createdAt: serverTimestamp()
      });
    }

    const qrUrl = buildQrShareUrl(docRef.id);
    qrDisplay.innerHTML = '';
    const qrCode = new QRCodeStyling(buildQrCodeConfig(qrUrl));
    qrCode.append(qrDisplay);
    feedback.textContent = 'QR code generated! Friend scans to import.';
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('QR share failed', err.code, err.message);
    feedback.textContent = 'Failed to generate QR: ' + err.message;
  }
}

function listenToSharedPlans(uid) {
  const q = query(
    collection(db, "shared_plans"),
    where("sharedWith", "==", uid)
  );
  unsubscribeSharedPlans = onSnapshot(q, (snapshot) => {
    const plans = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'dismissed') return;
      const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt;
      plans.push({ id: doc.id, ...data, createdAt });
    });
    plans.sort((a, b) => b.createdAt - a.createdAt);
    state.data.lastSharedPlans = plans;
    if (state.ui.plansFilter === 'shared' || state.ui.plansFilter === 'favorites') {
      renderSharedPlansUI();
    }
  }, (error) => {
    console.error('Shared plans stream error', error.code, error.message);
  });
}

function renderSharedPlansUI() {
  const container = document.getElementById('shared-plans-inline');
  const pagination = document.getElementById('shared-plans-pagination');
  if (!container) return;

  const expandedIds = saveExpandedCardIds();

  let items = [];
  if (state.ui.plansFilter === 'favorites') {
    const favoritedOwn = state.data.lastWorkoutPlans.filter(p => p.favorite === true).map(p => ({ type: 'own', plan: p }));
    const favoritedShared = state.data.lastSharedPlans.filter(s => s.favorite === true).map(s => ({ type: 'shared', share: s }));
    const favoritedStructured = state.data.lastStructuredWorkouts.filter(w => w.favorite === true).map(w => ({ type: 'structured', structured: w }));
    items = [...favoritedOwn, ...favoritedShared, ...favoritedStructured];
    items.sort((a, b) => {
      const aDate = a.type === 'own' ? a.plan.createdAt : a.type === 'shared' ? a.share.createdAt : a.structured.timestamp;
      const bDate = b.type === 'own' ? b.plan.createdAt : b.type === 'shared' ? b.share.createdAt : b.structured.timestamp;
      return (bDate || 0) - (aDate || 0);
    });
  } else {
    items = state.data.lastSharedPlans.map(s => ({ type: 'shared', share: s }));
  }

  if (!items.length) {
    const msg = state.ui.plansFilter === 'favorites'
      ? 'No favorited plans yet. Star a plan to add it here.'
      : 'No shared plans yet.';
    renderEmptyState(container, msg);
    if (pagination) pagination.classList.add('hidden');
    return;
  }

  const perPage = 3;
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  state.pagination.sharedPlans = Math.min(state.pagination.sharedPlans, totalPages);
  const start = (state.pagination.sharedPlans - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);

  container.innerHTML = pageItems.map(item => {
    return item.type === 'own' ? renderPlanCard(item.plan) : item.type === 'shared' ? renderSharedPlanCard(item.share) : renderStructuredWorkoutCard(item.structured);
  }).join('');
  restoreExpandedCardIds(expandedIds);
  if (typeof lucide !== 'undefined') lucide.createIcons();

  updatePagination('shared-plans', state.pagination.sharedPlans, totalPages);
}

function renderSharedPlanCard(share) {
  const type = share.content?.type || 'AMRAP';
  const badgeClass = type.toLowerCase();
  const structure = share.content?.structure || {};
  const descLine = buildWorkoutSummaryLine(type, structure);
  const movements = structure.movements || [];
  const movementsHtml = movements.map(m =>
    `<span class="movement-chip">${escapeHtml(m.exerciseId)} \u00D7 ${m.reps}${m.weight ? ' @ ' + m.weight + 'kg' : ''}</span>`
  ).join('');

  const emomMinutes = share.content?.structure?.minutes || [];
  const emomHtml = emomMinutes.map((m, idx) => {
    const mov = m.movements?.[0];
    if (!mov) return '';
    return `<span class="movement-chip">${idx + 1}: ${escapeHtml(mov.exerciseId)} \u00D7 ${mov.reps}${mov.weight ? ' @ ' + mov.weight + 'kg' : ''}</span>`;
  }).join('');

  const displayMovements = type === 'EMOM' ? emomHtml : movementsHtml;

  const metadataHtml = [
    `<div class="flex items-center gap-1.5 text-xs text-slate-300"><i data-lucide="share-2" class="w-3.5 h-3.5 shrink-0"></i><span class="truncate">${escapeHtml(share.sharedByDisplayName || 'Unknown')}</span></div>`,
    share.createdAt ? `<div class="flex items-center gap-1.5 text-xs text-slate-400"><i data-lucide="calendar" class="w-3.5 h-3.5 shrink-0"></i><span>${formatCardDate(share.createdAt)}</span></div>` : ''
  ].filter(Boolean).join('\n');

  const actionsHtml = [
    `<button type="button" onclick="doSharedPlan('${share.id}')" class="flex-1 btn-core is-primary-ghost btn-card-action"><i data-lucide="dumbbell" size="18"></i><span>Train</span></button>`,
    `<button type="button" onclick="loadSharedPlan('${share.id}')" class="flex-1 btn-core is-ghost btn-card-action"><i data-lucide="clipboard-pen-line" size="18"></i><span>Plan</span></button>`,
    `<button type="button" onclick="dismissSharedPlan('${share.id}')" class="flex-1 btn-core is-ghost btn-card-action hover:!text-rose-400 hover:!border-rose-400"><i data-lucide="trash-2" size="18"></i><span>Delete</span></button>`
  ].join('\n');

  return renderWorkoutCard(share.id, share.content?.name || '', type, badgeClass, descLine, metadataHtml, displayMovements, actionsHtml, share.favorite, `toggleFavorite('${share.id}')`);
}

function changeSharedPlansPage(direction) {
  const totalPages = Math.max(1, Math.ceil(state.data.lastSharedPlans.length / 3));
  if (direction === 'prev' && state.pagination.sharedPlans > 1) {
    state.pagination.sharedPlans--;
  } else if (direction === 'next' && state.pagination.sharedPlans < totalPages) {
    state.pagination.sharedPlans++;
  }
  renderSharedPlansUI();
}

async function saveSharedPlanToMyPlans(shareId) {
  if (!currentUser) return;
  const share = state.data.lastSharedPlans.find(s => s.id === shareId);
  if (!share) return;

  const planDoc = {
    userId: currentUser.uid,
    name: share.content?.name || 'Shared Plan',
    type: share.content?.type || 'AMRAP',
    structure: share.content?.structure || {},
    status: 'active',
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "workout_plans"), planDoc);
    await updateDoc(doc(db, "shared_plans", shareId), { status: 'saved' });
    showFeedback('Plan saved to your collection!', 'emerald');
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('Save shared plan failed', err.code, err.message);
    showFeedback('Failed to save plan: ' + err.message, 'red');
  }
}

async function dismissSharedPlan(shareId) {
  if (!currentUser) return;
  if (!confirm('Dismiss this shared plan?')) return;
  try {
    await updateDoc(doc(db, "shared_plans", shareId), { status: 'dismissed' });
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('Dismiss shared plan failed', err.code, err.message);
    alert('Failed to dismiss: ' + err.message);
  }
}

function updateStarIcon(id, isFav) {
  const btn = document.querySelector(`[data-fav-id="${id}"]`);
  if (!btn) return;
  btn.textContent = isFav ? '\u2605' : '\u2606';
  btn.className = `${isFav ? 'text-amber-400' : 'text-slate-500'} hover:scale-110 transition-transform btn-fav-star`;
}

async function toggleFavorite(shareId) {
  if (_favDebounce[shareId]) return;
  _favDebounce[shareId] = setTimeout(() => delete _favDebounce[shareId], 300);
  if (!currentUser) return;
  const share = state.data.lastSharedPlans.find(s => s.id === shareId);
  if (!share) return;
  const newVal = !(share.favorite === true);
  share.favorite = newVal;
  updateStarIcon(shareId, newVal);
  try {
    await updateDoc(doc(db, "shared_plans", shareId), { favorite: newVal });
    haptic(HAPTIC.tap);
    if (state.ui.plansFilter === 'favorites') renderSharedPlansUI();
  } catch (err) {
    share.favorite = !newVal;
    updateStarIcon(shareId, !newVal);
    clearTimeout(_favDebounce[shareId]);
    delete _favDebounce[shareId];
    console.error('Toggle favorite failed', err.code, err.message);
  }
}

async function togglePlanFavorite(planId) {
  if (_favDebounce[planId]) return;
  _favDebounce[planId] = setTimeout(() => delete _favDebounce[planId], 300);
  if (!currentUser) return;
  const plan = state.data.lastWorkoutPlans.find(p => p.id === planId);
  if (!plan) return;
  const newVal = !(plan.favorite === true);
  plan.favorite = newVal;
  updateStarIcon(planId, newVal);
  try {
    await updateDoc(doc(db, "workout_plans", planId), { favorite: newVal });
    haptic(HAPTIC.tap);
    if (state.ui.plansFilter === 'favorites') renderSharedPlansUI();
  } catch (err) {
    plan.favorite = !newVal;
    updateStarIcon(planId, !newVal);
    clearTimeout(_favDebounce[planId]);
    delete _favDebounce[planId];
    console.error('Toggle plan favorite failed', err.code, err.message);
  }
}

async function toggleStructuredFavorite(swId) {
  if (_favDebounce[swId]) return;
  _favDebounce[swId] = setTimeout(() => delete _favDebounce[swId], 300);
  if (!currentUser) return;
  const sw = state.data.lastStructuredWorkouts.find(w => w.id === swId);
  if (!sw) return;
  const newVal = !(sw.favorite === true);
  sw.favorite = newVal;
  updateStarIcon(swId, newVal);
  try {
    await updateDoc(doc(db, "structured_workouts", swId), { favorite: newVal });
    haptic(HAPTIC.tap);
    if (state.ui.plansFilter === 'favorites') renderSharedPlansUI();
  } catch (err) {
    sw.favorite = !newVal;
    updateStarIcon(swId, !newVal);
    clearTimeout(_favDebounce[swId]);
    delete _favDebounce[swId];
    console.error('Toggle structured favorite failed', err.code, err.message);
  }
}

function loadSharedPlan(shareId) {
  const share = state.data.lastSharedPlans.find(s => s.id === shareId);
  if (!share) return;
  const plan = share.content;
  if (!plan) return;

  switchTab('calculator');

  const typeSelect = document.getElementById('workout-type');
  if (typeSelect) typeSelect.value = plan.type;
  handleWorkoutTypeChange();

  const structure = plan.structure || {};

  switch (plan.type) {
    case 'AMRAP': populateAmrapForm(structure); break;
    case 'EMOM': populateEmomForm(structure); break;
    case 'FOR_TIME': populateForTimeForm(structure); break;
    case 'INTERVAL': populateIntervalForm(structure); break;
  }

  const planCard = document.getElementById('plan-workout-card');
  if (planCard) planCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showFeedback(`Plan "${plan.name}" loaded!`, 'emerald', 'planFeedback');
  haptic(HAPTIC.tap);
}

function populateAmrapForm(structure) {
  if (structure.durationSeconds) {
    document.getElementById('amrap-duration').value = Math.round(structure.durationSeconds / 60);
  }
  populatePlanMovements(structure.movements || []);
}

function populateEmomForm(structure) {
  if (structure.intervalSeconds) {
    const mins = Math.floor(structure.intervalSeconds / 60);
    const secs = structure.intervalSeconds % 60;
    document.getElementById('emom-interval-min').value = mins || '';
    document.getElementById('emom-interval-sec').value = secs || '';
  }
  const mode = structure.mode || 'sequence';
  switchEmomMode(mode);
  if (mode !== 'by_round' && structure.rounds) {
    document.getElementById('emom-rounds').value = structure.rounds;
  }
  const slots = document.getElementById('emom-minute-slots');
  if (slots) {
    slots.innerHTML = '';
    delete slots.dataset.planBootstrapped;
  }
  (structure.minutes || []).forEach(m => {
    const mov = m.movements?.[0];
    if (mov) {
      addPlanMinuteSlot({
        exerciseId: mov.exerciseId || mov.movement,
        reps: parseInt(mov.reps, 10) || 0,
        weight: parseFloat(mov.weight || mov.kg) || 0,
        weightMode: mov.weightMode || 'absolute',
        pct: mov.pct || null,
        rpe: mov.rpe || null
      });
    } else {
      addPlanMinuteSlot();
    }
  });
}

function populateForTimeForm(structure) {
  if (structure.durationMinutes) {
    document.getElementById('fortime-cap').value = structure.durationMinutes;
  }
  if (structure.rounds) {
    document.getElementById('fortime-rounds').value = structure.rounds;
  }
  // Reset DNF state
  const dnfCheck = document.getElementById('fortime-dnf');
  if (dnfCheck) { dnfCheck.checked = false; toggleForTimeDnf(); }
  populatePlanMovements(structure.movements || []);
}

function populateIntervalForm(structure) {
  if (structure.rounds) {
    document.getElementById('interval-rounds').value = structure.rounds;
  }
  if (structure.workSeconds) {
    document.getElementById('interval-work-min').value = Math.round(structure.workSeconds / 60);
  }
  if (structure.restSeconds) {
    document.getElementById('interval-rest-min').value = Math.round(structure.restSeconds / 60);
  }
  populatePlanMovements(structure.movements || []);
}

// Plan name modal — replaces prompt() with themed overlay
let planNameResolve = null;

function showPlanNameModal(defaultName) {
  return new Promise((resolve) => {
    planNameResolve = resolve;
    const modal = document.getElementById('plan-name-modal');
    const input = document.getElementById('plan-name-input');
    const feedback = document.getElementById('plan-name-feedback');
    const saveBtn = document.getElementById('plan-name-save');
    const cancelBtn = document.getElementById('plan-name-cancel');
    if (!modal || !input) { resolve(null); return; }

    input.value = defaultName || '';
    feedback.textContent = '';
    modal.classList.remove('hidden');
    setTimeout(() => input.focus(), 100);

    function cleanup() {
      modal.classList.add('hidden');
      saveBtn.removeEventListener('click', onSave);
      cancelBtn.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onKey);
    }

    function onSave() {
      const val = input.value.trim();
      if (!val) {
        feedback.textContent = 'Enter a plan name.';
        feedback.className = 'text-xs text-rose-400 font-medium text-center h-4';
        input.focus();
        return;
      }
      cleanup();
      planNameResolve(val);
      planNameResolve = null;
    }

    function onCancel() {
      cleanup();
      planNameResolve(null);
      planNameResolve = null;
    }

    function onKey(e) {
      if (e.key === 'Enter') onSave();
      if (e.key === 'Escape') onCancel();
    }

    saveBtn.addEventListener('click', onSave);
    cancelBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown', onKey);
  });
}

// ==========================================
// END WORKOUT PLAN SYSTEM
// ==========================================

// Render Existing Logs
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

  let borderClass;
  if (chipPBActive && !chip1RMActive) {
    borderClass = 'log-entry-pb';
  } else if (chip1RMActive && !chipPBActive) {
    borderClass = 'log-entry-1rm';
  } else {
    borderClass = isPB ? 'log-entry-pb' : is1RMOnly ? 'log-entry-1rm' : 'log-entry';
  }

  const secondLine = `Est. 1RM: ${oneRM}kg  <span class="text-slate-600">|</span>  Vol: ${totalVolume.toLocaleString()}kg`;
  const repDisplay = workout.partialReps ? `${sets} × ${reps} + ${workout.partialReps} reps` : `${sets} × ${reps}`;

  return `
<div class="${borderClass} p-4 rounded-2xl mb-3 flex justify-between items-center shadow-2xl shadow-slate-950/60 transition-all duration-200" style="background-color: var(--slate-900);">
    <div>
        <div class="flex items-center gap-2">
            <h4 class="text-emerald-300 font-bold uppercase tracking-wider text-sm">${escapeHtml(workout.exercise)}</h4>
            ${isPB ? '<span class="bg-purple-950/50 text-purple-400 border border-purple-800/60 text-[9px] px-1.5 rounded font-black">PB</span>' : ''}
            ${isMax1RM ? '<span class="bg-emerald-950/50 text-emerald-400 border border-emerald-800/60 text-[9px] px-1.5 rounded font-extrabold">1RM</span>' : ''}
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
</div>
  `;
}

function renderLogs(workouts) {
    const logContainer = document.getElementById('workout-list');
    if (!logContainer) return;

    if (!workouts.length) {
        logContainer.innerHTML = `<div class="bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-500 text-sm text-center">No workout logs yet. Add a set to start tracking your training history.</div>`;
        if (paginationControls) paginationControls.classList.add('hidden');
        return;
    }

    state.data.paginatedWorkouts = workouts;
    const selected = workoutFilter ? workoutFilter.value : 'All';

    state.data.paginatedWorkouts.forEach(workout => {
        if (workout.source === 'structured' || workout.source === 'onboarding' || workout.source === 'pb-log') return;
        const load = getEffectiveLoad(workout);
        workout._isPB = load >= (state.cache.cachedMaxLoadByExercise[workout.exercise] || 0) && load > 0;
        const reps = parseInt(workout.reps, 10) || 1;
        const oneRM = Math.round(estimate1RM(load, reps));
        workout._isMax1RM = oneRM >= (state.cache.cachedMax1RMByExercise[workout.exercise] || 0) && oneRM > 0;
    });

    let displayList = (selected === 'All') ? state.data.paginatedWorkouts : state.data.paginatedWorkouts.filter(w => w.exercise === selected);

    const chipPBActive = document.getElementById('chip-pb')?.dataset?.active === 'true';
    const chip1RMActive = document.getElementById('chip-1rm')?.dataset?.active === 'true';
    if (chipPBActive || chip1RMActive) {
      displayList = displayList.filter(w => (chipPBActive && w._isPB) || (chip1RMActive && w._isMax1RM));
    }

    try { window.__lastRenderInfo = { chipPBActive, chip1RMActive, displayListLength: displayList.length, totalWorkouts: state.data.paginatedWorkouts.length }; } catch (e) {}

    const totalPages = Math.max(1, Math.ceil(displayList.length / entriesPerPage));
    state.pagination.workouts = Math.min(state.pagination.workouts, totalPages);
    let startIndex = (state.pagination.workouts - 1) * entriesPerPage;
    let pageItems = displayList.slice(startIndex, startIndex + entriesPerPage);

    if (!pageItems.length && displayList.length) {
      state.pagination.workouts = 1;
      startIndex = 0;
      pageItems = displayList.slice(0, entriesPerPage);
    }

    updatePaginationControls(totalPages);

    logContainer.innerHTML = pageItems.map(workout =>
      workoutToLogHtml(workout, chipPBActive, chip1RMActive)
    ).join('');
}

// ==========================================
// VOLUME HISTORY (Issue #38)
// ==========================================

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(date) {
  const d = getWeekStart(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function toLocalDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function computeDailyBuckets(workouts, now, filterExercise) {
  const buckets = {};
  const ref = new Date(now);
  ref.setDate(ref.getDate() + state.volume.offset * 7);
  const weekStart = getWeekStart(ref);
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = toLocalDateKey(d);
    const periodStart = new Date(d);
    const periodEnd = new Date(d);
    periodEnd.setHours(23, 59, 59, 999);
    const periodEndMs = periodEnd.getTime();
    buckets[key] = { label: periodEndMs < state.user.userSignupTs ? '' : d.toLocaleDateString('en-US', { weekday: 'short' }), volume: 0, periodStart: periodStart.getTime(), periodEnd: periodEndMs };
  }
  const weekEnd = getWeekEnd(ref);
  workouts.forEach(w => {
    const d = new Date(w.timestamp);
    if (isNaN(d.getTime())) return;
    if (d < weekStart || d > weekEnd) return;
    if (filterExercise !== 'All' && w.exercise !== filterExercise) return;
    const volume = parseFloat(w.totalVolume) || 0;
    if (volume <= 0) return;
    const key = toLocalDateKey(d);
    if (buckets[key] !== undefined) buckets[key].volume += volume;
  });
  return Object.values(buckets);
}

function computeWeeklyBuckets(workouts, now, filterExercise) {
  const buckets = {};
  const monthRef = new Date(now.getFullYear(), now.getMonth() + state.volume.offset, 1);
  const monthEnd = new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 0, 23, 59, 59, 999);
  const firstWeekStart = getWeekStart(monthRef);
  const lastWeekStart = getWeekStart(monthEnd);
  let cursor = new Date(firstWeekStart);
  while (cursor <= lastWeekStart) {
    const weekEnd = getWeekEnd(cursor);
    const key = toLocalDateKey(cursor);
    const weekEndMs = weekEnd.getTime();
    const label = weekEndMs < state.user.userSignupTs ? '' : cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    buckets[key] = { label, volume: 0, weekStart: new Date(cursor), weekEnd: new Date(weekEnd), periodStart: cursor.getTime(), periodEnd: weekEndMs };
    cursor.setDate(cursor.getDate() + 7);
  }
  workouts.forEach(w => {
    const d = new Date(w.timestamp);
    if (isNaN(d.getTime()) || d < monthRef || d > monthEnd) return;
    if (filterExercise !== 'All' && w.exercise !== filterExercise) return;
    const volume = parseFloat(w.totalVolume) || 0;
    if (volume <= 0) return;
    for (const key in buckets) {
      if (d >= buckets[key].weekStart && d <= buckets[key].weekEnd) {
        buckets[key].volume += volume;
        break;
      }
    }
  });
  return Object.values(buckets);
}

function computeMonthlyBuckets(workouts, now, filterExercise) {
  const buckets = {};
  const year = now.getFullYear() + state.volume.offset;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let i = 0; i < 12; i++) {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    const monthEnd = new Date(year, i + 1, 0, 23, 59, 59, 999);
    const monthStart = new Date(year, i, 1);
    const monthEndMs = monthEnd.getTime();
    buckets[key] = { label: monthEndMs < state.user.userSignupTs ? '' : monthNames[i], volume: 0, periodStart: monthStart.getTime(), periodEnd: monthEndMs };
  }
  workouts.forEach(w => {
    const d = new Date(w.timestamp);
    if (isNaN(d.getTime()) || d.getFullYear() !== year) return;
    if (filterExercise !== 'All' && w.exercise !== filterExercise) return;
    const volume = parseFloat(w.totalVolume) || 0;
    if (volume <= 0) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (buckets[key] !== undefined) buckets[key].volume += volume;
  });
  return Object.values(buckets);
}

function computeYearlyBuckets(workouts, now, filterExercise) {
  const buckets = {};
  const baseYear = now.getFullYear() + state.volume.offset * 5;
  const startYear = baseYear - 4;
  for (let i = 0; i < 5; i++) {
    const yr = startYear + i;
    const key = String(yr);
    const yearEnd = new Date(yr + 1, 0, 0, 23, 59, 59, 999);
    const yearStart = new Date(yr, 0, 1);
    const yearEndMs = yearEnd.getTime();
    buckets[key] = { label: yearEndMs < state.user.userSignupTs ? '' : String(yr), volume: 0, periodStart: yearStart.getTime(), periodEnd: yearEndMs };
  }
  workouts.forEach(w => {
    const d = new Date(w.timestamp);
    if (isNaN(d.getTime())) return;
    if (d.getFullYear() < startYear || d.getFullYear() > baseYear) return;
    if (filterExercise !== 'All' && w.exercise !== filterExercise) return;
    const volume = parseFloat(w.totalVolume) || 0;
    if (volume <= 0) return;
    const key = String(d.getFullYear());
    if (buckets[key] !== undefined) buckets[key].volume += volume;
  });
  return Object.values(buckets);
}

function computeVolumeHistory(workouts, period, filterExercise) {
  const now = new Date();
  switch (period) {
    case 'daily': return computeDailyBuckets(workouts, now, filterExercise);
    case 'weekly': return computeWeeklyBuckets(workouts, now, filterExercise);
    case 'monthly': return computeMonthlyBuckets(workouts, now, filterExercise);
    default: return computeYearlyBuckets(workouts, now, filterExercise);
  }
}

function formatRangeLabel(period, offset) {
  const now = new Date();
  if (period === 'daily') {
    const ref = new Date(now);
    ref.setDate(ref.getDate() + offset * 7);
    const start = getWeekStart(ref);
    const end = getWeekEnd(ref);
    const opts = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`;
  }
  if (period === 'weekly') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (period === 'monthly') {
    return String(now.getFullYear() + offset);
  }
  const baseYear = now.getFullYear() + offset * 5;
  return `${baseYear - 4} - ${baseYear}`;
}

function renderVolumeHistory() {
  const inner = document.getElementById('vh-bars-inner');
  const totalEl = document.getElementById('vh-total');
  const rangeLabel = document.getElementById('vh-range-label');
  if (!inner) return;

  if (!state.data.lastWorkouts || state.data.lastWorkouts.length === 0) {
    inner.innerHTML = '<p class="text-xs text-slate-500 italic py-8 text-center w-full">Log some workouts to see your volume history.</p>';
    if (totalEl) totalEl.textContent = '';
    if (rangeLabel) rangeLabel.textContent = '';
    updateTodayBtnState();
    return;
  }

  if (rangeLabel) {
    rangeLabel.textContent = formatRangeLabel(state.volume.period, state.volume.offset);
  }

  const buckets = computeVolumeHistory(state.data.lastWorkouts, state.volume.period, state.volume.filter);

  const maxVolume = Math.max(...buckets.map(b => b.volume), 1);
  const totalVolume = buckets.reduce((sum, b) => sum + b.volume, 0);

  if (totalEl) {
    totalEl.textContent = `Total Volume: ${Math.round(totalVolume).toLocaleString()} kg`;
  }

  const avgEl = document.getElementById('vh-avg');
  const activeCount = buckets.filter(b => b.volume > 0).length;
  const avgVolume = activeCount >= 2 ? totalVolume / activeCount : 0;
  if (avgEl) {
    avgEl.textContent = avgVolume > 0 ? `Average Training Day Vol: ${Math.round(avgVolume).toLocaleString()} kg` : '';
  }

  const chartHeight = 104;
  const avgHeight = maxVolume > 0 ? (avgVolume / maxVolume) * chartHeight : 0;

  let barsHtml = buckets.map(b => {
    const volStr = Math.round(b.volume).toLocaleString();
    const hasVol = b.volume > 0;
    const h = hasVol ? Math.max(4, (b.volume / maxVolume) * chartHeight) : 0;
    return `
      <div class="vh-bar-wrap">
        ${hasVol ? `<div class="vh-bar" style="height: ${h}px"><div class="vh-bar-tooltip">${volStr} kg</div></div>` : '<div class="vh-bar is-zero"></div>'}
        <span class="vh-bar-label">${b.label || ''}</span>
      </div>
    `;
  }).join('');

  let avgLineHtml = '';
  if (avgVolume > 0 && avgHeight > 0) {
    avgLineHtml = `<div class="vh-avg-line" style="bottom: ${avgHeight}px"></div>`;
  }

  inner.innerHTML = barsHtml + avgLineHtml;
  updateTodayBtnState();
}

function switchVolumePeriod(period) {
  state.volume.period = period;
  state.volume.offset = 0;

  ['daily', 'weekly', 'monthly', 'yearly'].forEach(p => {
    const btn = document.getElementById(`vh-period-${p}`);
    if (btn) {
      btn.className = p === period ? 'btn-core is-primary btn-size-row' : 'btn-core is-ghost btn-size-row';
    }
  });

  renderVolumeHistory();
}

function shiftVolumePeriod(delta) {
  const inner = document.getElementById('vh-bars-inner');
  if (!inner) {
    state.volume.offset += delta;
    renderVolumeHistory();
    return;
  }
  const outClass = delta > 0 ? 'slide-out-left' : 'slide-out-right';
  const inClass = delta > 0 ? 'slide-in-left' : 'slide-in-right';
  inner.classList.add(outClass);
  inner.addEventListener('animationend', function handlerOut() {
    inner.removeEventListener('animationend', handlerOut);
    inner.classList.remove(outClass);
    state.volume.offset += delta;
    renderVolumeHistory();
    inner.classList.add(inClass);
    inner.addEventListener('animationend', function handlerIn() {
      inner.removeEventListener('animationend', handlerIn);
      inner.classList.remove(inClass);
    }, { once: true });
  }, { once: true });
}

function goToCurrentPeriod() {
  state.volume.offset = 0;
  renderVolumeHistory();
}

function updateTodayBtnState() {
  const btn = document.getElementById('vh-today');
  if (!btn) return;
  if (state.volume.offset === 0) {
    btn.className = 'btn-core is-ghost btn-size-row';
    btn.disabled = true;
  } else {
    btn.className = 'btn-core is-primary-ghost btn-size-row';
    btn.disabled = false;
  }
}

function populateVolumeFilter(exercises) {
  const select = document.getElementById('vh-filter');
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="All">All Exercises</option>';
  exercises.sort().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
  if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
    select.value = currentVal;
    state.volume.filter = currentVal;
  } else {
    select.value = 'All';
    state.volume.filter = 'All';
  }
}

function onVolumeFilterChange() {
  const select = document.getElementById('vh-filter');
  state.volume.filter = select ? select.value : 'All';
  renderVolumeHistory();
}

// Add Log Submission
workoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return alert('Please sign in before logging a workout.');

    const exercise = document.getElementById('exercise').value;
    if (!exercise) return showFeedback('Please select an exercise.', 'red', 'workoutFeedback');
    const schemaKey = getSchemaKey(exercise);
    const sets = parseInt(document.getElementById('log-set-sets').value, 10);
    const reps = parseInt(document.getElementById('log-set-reps').value, 10);
    const weight = parseFloat(document.getElementById('log-set-weight')?.value) || parseFloat(document.getElementById('log-set-bodyweight')?.value) || 0;
    const externalLoad = parseFloat(document.getElementById('log-set-ext-load')?.value) || 0;
    const estimatedLoad = computeEffectiveLoad(exercise, weight, externalLoad, state.user.userBiometrics.bodyweight);
    const totalVolume = estimatedLoad * reps * sets;

    let storedExercise = exercise;
    if (exercise === 'Pull Up' && externalLoad > 0) {
        storedExercise = 'Pull Up (Weighted)';
    }

    const log = {
        userId: currentUser.uid,
        exercise: storedExercise,
        sets,
        reps,
        weight,
        externalLoad,
        estimatedLoad,
        totalVolume,
        timestamp: Timestamp.now()
    };

    try {
        await addDoc(collection(db, "workouts"), log);
        refreshLogSetForm();
        showFeedback('Workout saved. Keep crushing it!', 'emerald', 'workoutFeedback');
        haptic(HAPTIC.confirm);
    } catch (err) {
        console.error('Workout submission failed', err.code, err.message);
        if (err.code === 'permission-denied') {
            showFeedback('Save blocked by Firestore rules: update workouts permissions.', 'red');
        }
        alert(`Failed to save workout: ${err.message}`);
    }
});

// AMRAP Score Preview
const amrapRounds = document.getElementById('amrap-rounds');
const amrapAdditional = document.getElementById('amrap-additional-reps');
if (amrapRounds) amrapRounds.addEventListener('input', updateAmrapScorePreview);
if (amrapAdditional) amrapAdditional.addEventListener('input', updateAmrapScorePreview);

// EMOM Score Preview
const emomRoundsCompleted = document.getElementById('emom-rounds-completed');
const emomRounds = document.getElementById('emom-rounds');
const emomIntervalMin = document.getElementById('emom-interval-min');
const emomIntervalSec = document.getElementById('emom-interval-sec');
if (emomRoundsCompleted) emomRoundsCompleted.addEventListener('input', updateEmomScorePreview);
if (emomRounds) emomRounds.addEventListener('input', () => { updateEmomScorePreview(); updateEmomSummary(); updateEmomDurationDisplay(); });
if (emomIntervalMin) emomIntervalMin.addEventListener('input', () => { updateEmomSummary(); updateEmomDurationDisplay(); });
if (emomIntervalSec) emomIntervalSec.addEventListener('input', () => { updateEmomSummary(); updateEmomDurationDisplay(); });

// FOR_TIME Score Preview
const fortimeMinutes = document.getElementById('fortime-minutes');
const fortimeSeconds = document.getElementById('fortime-seconds');
const fortimeDnf = document.getElementById('fortime-dnf');
const fortimeCapReps = document.getElementById('fortime-cap-reps');
if (fortimeMinutes) fortimeMinutes.addEventListener('input', updateForTimeScorePreview);
if (fortimeSeconds) fortimeSeconds.addEventListener('input', updateForTimeScorePreview);
if (fortimeDnf) fortimeDnf.addEventListener('change', updateForTimeScorePreview);
if (fortimeCapReps) fortimeCapReps.addEventListener('input', updateForTimeScorePreview);

// Initial movement row for FOR_TIME
if (document.getElementById('fortime-movement-list')) {
    // Removed - uses unified Add Movement form
  }

  // Unified Log Score Preview
const logRoundsInput = document.getElementById('log-rounds');
const logPartialInput = document.getElementById('log-partial-reps');
if (logRoundsInput) { logRoundsInput.addEventListener('input', updateLogScorePreview); logRoundsInput.addEventListener('input', updateLogWorkoutButtonState); logRoundsInput.addEventListener('input', recalcForTimeRemaining); }
if (logPartialInput) { logPartialInput.addEventListener('input', updateLogScorePreview); logPartialInput.addEventListener('input', updateLogWorkoutButtonState); logPartialInput.addEventListener('input', recalcForTimeRemaining); }
document.getElementById('fortime-cap-reps')?.addEventListener('input', updateLogScorePreview);

// Initial movement row for INTERVAL
if (document.getElementById('interval-movement-list')) {
    // Removed - uses unified Add Movement form
  }

  // EMOM mode toggle
const emomModeSeq = document.getElementById('emom-mode-seq');
const emomModeByRound = document.getElementById('emom-mode-by-round');
if (emomModeSeq) emomModeSeq.addEventListener('click', () => switchEmomMode('sequence'));
if (emomModeByRound) emomModeByRound.addEventListener('click', () => switchEmomMode('by_round'));

// EMOM minute slot changes re-trigger summary etc.
const emomMinuteSlots = document.getElementById('emom-minute-slots');
if (emomMinuteSlots) {
  emomMinuteSlots.addEventListener('change', () => {
    updateEmomSummary();
    updateEmomDurationDisplay();
    updateEmomScorePreview();
  });
}

// Initial minute row for EMOM
if (document.getElementById('emom-minute-slots')) {
  // Removed - slots created via Add Movement form
}

// Real-time calc recalculation for the unified plan form
document.addEventListener('input', (e) => {
  const input = e.target;
  if (input.id === 'plan-weight' || input.id === 'plan-reps') {
    updatePlanCalcPreview();
  }
});

populateMovementDropdowns();
refreshPlanForm();

// Structured Workout Pagination
const prevStructuredBtn = document.getElementById('prev-structured-page-btn');
const nextStructuredBtn = document.getElementById('next-structured-page-btn');
if (prevStructuredBtn) prevStructuredBtn.addEventListener('click', () => changeStructuredPage('prev'));
if (nextStructuredBtn) nextStructuredBtn.addEventListener('click', () => changeStructuredPage('next'));

// Friends Pagination
const prevFriendsBtn = document.getElementById('prev-friends-page-btn');
const nextFriendsBtn = document.getElementById('next-friends-page-btn');
if (prevFriendsBtn) prevFriendsBtn.addEventListener('click', () => changeFriendsPage('prev'));
if (nextFriendsBtn) nextFriendsBtn.addEventListener('click', () => changeFriendsPage('next'));

// Plans Pagination
const prevPlansBtn = document.getElementById('prev-plans-page-btn');
const nextPlansBtn = document.getElementById('next-plans-page-btn');
if (prevPlansBtn) prevPlansBtn.addEventListener('click', () => changePlansPage('prev'));
if (nextPlansBtn) nextPlansBtn.addEventListener('click', () => changePlansPage('next'));

// Share Modal
const shareSendBtn = document.getElementById('share-plan-send');
const shareCancelBtn = document.getElementById('share-plan-cancel');
if (shareSendBtn) shareSendBtn.addEventListener('click', () => shareWithFriends());
if (shareCancelBtn) shareCancelBtn.addEventListener('click', () => {
  document.getElementById('share-plan-modal').classList.add('hidden');
  document.getElementById('share-plan-feedback').textContent = '';
  document.getElementById('share-qr-display').innerHTML = '';
  state.share.sharePlanId = null;
});

// Shared Plans Pagination
const prevSharedPlansBtn = document.getElementById('prev-shared-plans-page-btn');
const nextSharedPlansBtn = document.getElementById('next-shared-plans-page-btn');
if (prevSharedPlansBtn) prevSharedPlansBtn.addEventListener('click', () => changeSharedPlansPage('prev'));
if (nextSharedPlansBtn) nextSharedPlansBtn.addEventListener('click', () => changeSharedPlansPage('next'));

// Initial movement row
if (document.getElementById('movement-list')) {
  // Removed - uses unified Add Movement form
}

// leaderboard



function getProfileDocRef(uid) {
  return doc(db, "profiles", uid);
}

function getDisplayName(profile, fallbackUid) {
  return profile?.displayName || profile?.uid || fallbackUid || 'Unknown';
}

function formatDotsScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * Initialize Social Features upon successful Auth session 
 */
async function initSocialProfile(user, dotsScore = 0) {
  const tagEl = document.getElementById('myCyberTag');
  if (tagEl) {
    tagEl.value = user.uid;
  }



  const profileRef = getProfileDocRef(user.uid);

  const existingSnap = await getDoc(profileRef);
  if (!existingSnap.exists() || !existingSnap.data().displayName) {
    await setDoc(profileRef, {
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous Cyber-Lifter',
      dotsScore: parseFloat(dotsScore) || 0,
      lastActive: serverTimestamp()
    }, { merge: true });
  } else {
    await updateDoc(profileRef, {
      dotsScore: parseFloat(dotsScore) || 0,
      lastActive: serverTimestamp()
    });
  }

  unsubscribeProfile = onSnapshot(profileRef, (snapshot) => {
    const data = snapshot.data();
    state.social.userFriendsList = Array.isArray(data?.friends) ? data.friends : [];
    renderActiveFriendsList();
    renderLeaderboardView();
  }, (error) => {
    console.error('Profile snapshot failed', error.code, error.message);
    showFeedback('Profile access denied: check Firestore rules for profiles.', 'red');
  });
}

/**
 * Copy Cyber-Tag utility
 */
function copyCyberTag() {
  const tagText = document.getElementById('myCyberTag').value;
  navigator.clipboard.writeText(tagText);
  showFeedback('Cyber-Tag copied to clipboard!', 'emerald');
  haptic(HAPTIC.tap);
}

/**
 * Handle Add Friend Form Action
 */
async function getProfileDocument(uid) {
  return await getDoc(getProfileDocRef(uid));
}

async function handleAddFriend() {
  const input = document.getElementById('friendUidInput');
  const targetUid = input.value.trim();
  const currentUser = auth.currentUser;
  const feedbackTarget = 'socialAddFriendFeedback'; // Target ID

  if (!targetUid) return;
  
  // Show a loading status immediately
  showFeedback('Connecting to network node...', 'slate', feedbackTarget);

  if (!currentUser) {
    return showFeedback('Authenticate to link friends.', 'red', feedbackTarget);
  }
  if (targetUid === currentUser.uid) {
    return showFeedback("Can't link your own tag.", 'red', feedbackTarget);
  }
  if (state.social.userFriendsList.includes(targetUid)) {
    return showFeedback("Friend already linked.", 'yellow', feedbackTarget);
  }

  try {
    const targetDoc = await getProfileDocument(targetUid);
    if (!targetDoc.exists()) {
      return showFeedback("Cyber-Tag not found in database.", 'red', feedbackTarget);
    }

    await setDoc(getProfileDocRef(currentUser.uid), {
      friends: arrayUnion(targetUid)
    }, { merge: true });

    input.value = '';
    showFeedback('Friend link established successfully!', 'emerald', feedbackTarget);
    haptic(HAPTIC.tap);

    // Optional: Clear success message after 4 seconds so the UI stays tidy
    setTimeout(() => {
      const el = document.getElementById(feedbackTarget);
      if (el && el.innerText === 'Friend link established successfully!') {
        el.innerText = '';
      }
    }, 4000);

  } catch (err) {
    console.error('Friend add failed', err.code, err.message);
    if (err.code === 'permission-denied') {
      showFeedback('Permission denied: check Firestore rules for profiles.', 'red', feedbackTarget);
    } else {
      showFeedback(`Error linking network node: ${err.message}`, 'red', feedbackTarget);
    }
  }
}

async function addFriendFromLeaderboard(friendUid) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return showFeedback('Sign in to add friends from leaderboard.', 'red');
  }
  if (!friendUid || friendUid === currentUser.uid) {
    return;
  }
  if (state.social.userFriendsList.includes(friendUid)) {
    return showFeedback('Already connected with this athlete.', 'yellow');
  }

  try {
    const targetDoc = await getProfileDocument(friendUid);
    if (!targetDoc.exists()) {
      return showFeedback('Unable to add athlete: Cyber-Tag missing.', 'red');
    }

    await setDoc(getProfileDocRef(currentUser.uid), {
      friends: arrayUnion(friendUid)
    }, { merge: true });
    showFeedback('Friend added from leaderboard!', 'emerald');
    haptic(HAPTIC.tap);
  } catch (err) {
    console.error('Leaderboard friend add failed', err.code, err.message);
    if (err.code === 'permission-denied') {
      showFeedback('Permission denied: check Firestore rules for profiles.', 'red');
    } else {
      showFeedback(`Could not add friend: ${err.message}`, 'red');
    }
  }
}

async function removeFriend(friendUid) {
  const currentUser = auth.currentUser;
  if (!currentUser) return showFeedback('Sign in to remove friends.', 'red');
  if (!friendUid) return;
  if (!state.social.userFriendsList.includes(friendUid)) return showFeedback('Athlete not in your friend list.', 'yellow');

  if (!confirm('Remove this friend from your list?')) return;

  try {
    await updateDoc(getProfileDocRef(currentUser.uid), {
      friends: arrayRemove(friendUid)
    });

    state.social.userFriendsList = state.social.userFriendsList.filter(u => u !== friendUid);
    renderActiveFriendsList();
    syncLeaderboardFeed();
    showFeedback('Friend removed.', 'slate');
  } catch (err) {
    console.error('Remove friend failed', err.code, err.message || err);
    showFeedback('Unable to remove friend. Check permissions.', 'red');
  }
}

/**
 * Render the side panel showing friends' names and current scores (paginated, 3 per page)
 */
async function cacheUncachedProfiles(fUids) {
  const uncached = fUids.filter(fUid => !state.social.friendDisplayCache[fUid]);
  if (uncached.length === 0) return;

  const results = await Promise.allSettled(uncached.map(fUid => getProfileDocument(fUid)));
  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.exists()) {
      state.social.friendDisplayCache[uncached[i]] = result.value.data();
    }
  });
}

function friendToHtml(fUid, data) {
  if (data) {
    return `
      <div class="flex justify-between items-center bg-slate-900/50 p-2 border border-slate-800 rounded">
        <span class="font-medium text-slate-300 truncate max-w-[120px]">${getDisplayName(data, fUid)}</span>
        <div class="flex items-center gap-2">
          <button type="button" onclick="removeFriend('${fUid}')" 
          class="items-center justify-center rounded-full px-2 py-0.5 btn-core is-ghost text-xs hover:!text-rose-400 hover:!border-rose-400">
          <i data-lucide="user-minus" size="18"></i>
          </button>
        </div>
      </div>`;
  }
  return `
    <div class="flex justify-between items-center bg-slate-900/50 p-2 border border-slate-800 rounded">
      <span class="font-medium text-slate-300 truncate max-w-[120px]">Unknown Friend</span>
      <span class="text-xs font-mono text-slate-500">${fUid}</span>
    </div>`;
}
async function renderActiveFriendsList() {
  const container = document.getElementById('friendsListContainer');
  const pagination = document.getElementById('friends-pagination');
  if (state.social.userFriendsList.length === 0) {
    renderEmptyState(container, 'No allies linked yet. Share your Cyber-Tag!');
    if (pagination) pagination.classList.add('hidden');
    return;
  }

  try {
    const perPage = 3;
    const totalPages = Math.max(1, Math.ceil(state.social.userFriendsList.length / perPage));
    state.pagination.friends = Math.min(state.pagination.friends, totalPages);
    const start = (state.pagination.friends - 1) * perPage;
    const pageItems = state.social.userFriendsList.slice(start, start + perPage);

    await cacheUncachedProfiles(pageItems);

    let html = '';
    pageItems.forEach(fUid => {
      html += friendToHtml(fUid, state.social.friendDisplayCache[fUid]);
    });

    if (html) {
      container.innerHTML = html;
    } else {
      renderEmptyState(container, 'No valid allies found for the linked Cyber-Tags.');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();

    updatePagination('friends', state.pagination.friends, totalPages);
  } catch (error) {
    console.error('Active friends render failed', error.code, error.message);
    container.innerHTML = `<p class="text-xs text-red-400">Failed to render active grid context. Check Firestore rules for profiles.</p>`;
  }
}

function changeFriendsPage(direction) {
  const totalPages = Math.max(1, Math.ceil(state.social.userFriendsList.length / 3));
  if (direction === 'prev' && state.pagination.friends > 1) {
    state.pagination.friends--;
  } else if (direction === 'next' && state.pagination.friends < totalPages) {
    state.pagination.friends++;
  }
  renderActiveFriendsList();
}

function filterLeaderboardProfiles() {
  const filtered = [];
  state.social.leaderboardCache.forEach(profile => {
    const isMe = currentUser && profile.uid === currentUser.uid;
    const isFriend = state.social.userFriendsList.includes(profile.uid);
    if (state.social.currentScope === 'friends' && !isMe && !isFriend) return;
    filtered.push({ profile, isMe, isFriend });
  });
  return filtered;
}

function computeLeaderboardSlice(filtered) {
  if (state.social.leaderboardShowAll || filtered.length === 0) return null;
  const meIdx = filtered.findIndex(f => f.isMe);
  if (meIdx === -1) return { start: 0, end: 1 };
  return { start: Math.max(0, meIdx - 1), end: Math.min(filtered.length, meIdx + 2) };
}

/**
 * Manage Global vs Friends Leaderboard UI Toggles
 */
function switchLeaderboardScope(scope) {
  state.social.currentScope = scope; //
  const btnGlobal = document.getElementById('btnGlobalBoard'); //
  const btnFriends = document.getElementById('btnFriendsBoard'); //

  if (scope === 'global') { //
    btnGlobal.className = "btn-core is-primary btn-size-row";
    btnFriends.className = "btn-core is-ghost btn-size-row";
  } else {
    btnFriends.className = "btn-core is-primary btn-size-row";
    btnGlobal.className = "btn-core is-ghost btn-size-row";
  }
  renderLeaderboardView(); //
}

/**
 * Build a single leaderboard row HTML
 */
function buildLeaderboardRow(profile, rank, isMe, isFriend) {
  const rawScore = state.social.currentFormula === 'dots' ? profile.dotsScore : (profile.sinclairScore || 0);
  const displayScore = formatDotsScore(rawScore);
  const badgeBaseClasses = 'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider';
  const actionCell = isMe
    ? ''
    : isFriend
      ? `<button type="button" class="${badgeBaseClasses} border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-400/30" 
      onclick="removeFriend('${profile.uid}')">
      <i data-lucide="user-minus" size="18"></i>
      </button>`
      : `<button type="button" class="${badgeBaseClasses} border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-slate-800" 
      onclick="addFriendFromLeaderboard('${profile.uid}')">
      <i data-lucide="user-plus" size="18"></i>
      </button>`;

  return `
    <tr class="border-b border-slate-800/60 align-middle ${isMe ? 'bg-emerald-500/10 font-bold' : ''}">
      <td class="py-3 font-mono text-slate-500 align-middle">#${rank}</td>
      <td class="py-3 align-middle">
        <span class="${isMe ? 'text-emerald-400' : 'text-slate-200'}">${getDisplayName(profile, profile.uid)}</span>
      </td>
      <td class="py-3 text-right font-mono font-bold text-emerald-400 align-middle">${displayScore.toFixed(2)}</td>
      <td class="py-3 text-right align-middle">${actionCell}</td>
    </tr>`;
}

/**
 * Toggle leaderboard between compact and show-all modes
 */
function toggleLeaderboardExpand() {
  state.social.leaderboardShowAll = !state.social.leaderboardShowAll;
  renderLeaderboardView();
}

/**
 * Re-render leaderboard table from cached data applying current scope, formula, and friends list
 */
function renderLeaderboardView() {
  const rowsContainer = document.getElementById('leaderboardRows');
  const expandBtn = document.getElementById('leaderboard-expand-btn');
  if (!rowsContainer) return;

  const filtered = filterLeaderboardProfiles();
  const slice = computeLeaderboardSlice(filtered);
  let html = '';

  if (slice) {
    filtered.slice(slice.start, slice.end).forEach((f, i) => {
      html += buildLeaderboardRow(f.profile, slice.start + i + 1, f.isMe, f.isFriend);
    });
    rowsContainer.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    if (expandBtn) {
      expandBtn.classList.toggle('hidden', filtered.length <= (slice.end - slice.start));
      expandBtn.textContent = 'Show All';
    }
  } else {
    filtered.forEach((f, i) => {
      html += buildLeaderboardRow(f.profile, i + 1, f.isMe, f.isFriend);
    });
    rowsContainer.innerHTML = html || `<tr><td colspan="4" class="py-4 text-center text-xs text-slate-500 italic">No network entries visible in this grid scope.</td></tr>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    if (expandBtn) {
      expandBtn.classList.toggle('hidden', filtered.length <= 3 || !state.social.leaderboardShowAll);
      expandBtn.textContent = state.social.leaderboardShowAll ? 'Show Compact' : 'Show All';
    }
  }
}

/**
 * Fetch and Cache Leaderboard data via real-time snapshot
 */
function syncLeaderboardFeed() {
  if (leaderboardUnsubscribe) {
    leaderboardUnsubscribe();
    leaderboardUnsubscribe = null;
  }

  const sortField = state.social.currentFormula === 'dots' ? "dotsScore" : "sinclairScore";

  const leaderboardQuery = query(collection(db, "profiles"), orderBy(sortField, "desc"), limit(50));
  
  leaderboardUnsubscribe = onSnapshot(leaderboardQuery, (snapshot) => {
    state.social.leaderboardCache = [];
    snapshot.forEach((doc) => {
      state.social.leaderboardCache.push(doc.data());
    });
    renderLeaderboardView();
  }, (error) => {
    console.error('Leaderboard snapshot failed', error.code, error.message);
    showFeedback('Leaderboard access denied: update Firestore rules for profiles.', 'red');
  });
}

/**
 * Manage DOTS vs Sinclair Leaderboard Metric System Toggles
 */
function switchLeaderboardFormula(formula) {
  state.social.currentFormula = formula;
  
  const btnDots = document.getElementById('btnFormulaDots');
  const btnSinclair = document.getElementById('btnFormulaSinclair');
  const tableHeaderScore = document.getElementById('tableHeaderScore');
  const descEl = document.getElementById('leaderboard-desc');

  // 1. Swap visual layout pill configurations 
  if (formula === 'dots') {
    if (btnDots) btnDots.className = "btn-core is-primary btn-size-row";
    if (btnSinclair) btnSinclair.className = "btn-core is-ghost btn-size-row";
    if (tableHeaderScore) tableHeaderScore.innerText = "DOTS";
    if (descEl) descEl.innerText = "Pound-for-pound DOTS standings live.";
  } else {
    if (btnSinclair) btnSinclair.className = "btn-core is-primary btn-size-row";
    if (btnDots) btnDots.className = "btn-core is-ghost btn-size-row";
    if (tableHeaderScore) tableHeaderScore.innerText = "Sinclair";
    if (descEl) descEl.innerText = "Pound-for-pound Olympic Sinclair scores live.";
  }

  // 2. Trigger active real-time view sync updates
  syncLeaderboardFeed();
}

async function updateUserLeaderboardProfile(uid, dotsScore, sinclairScore) {
  try {
    await setDoc(getProfileDocRef(uid), {
      dotsScore: parseFloat(dotsScore) || 0,
      sinclairScore: parseFloat(sinclairScore) || 0,
      lastActive: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error('Leaderboard profile update failed', err.code, err.message);
  }
}

const debouncedUpdateLeaderboard = debounce(async (uid, dots, sinclair) => {
    if (!auth.currentUser || auth.currentUser.uid !== uid) return;
    await updateUserLeaderboardProfile(uid, dots, sinclair);
}, 5000);

const debouncedSyncActivity = debounce(() => {
    computeAndSyncDailyActivity();
}, 3000);


function renderEmptyState(container, message, extraClass = '') {
  if (!container) return;
  container.innerHTML = `<p class="text-xs text-slate-500 italic py-2 text-center${extraClass ? ' ' + extraClass : ''}">${message}</p>`;
}

const NOTIFICATION_COLORS = {
  emerald: 'text-emerald-400',
  red: 'text-red-400',
  yellow: 'text-yellow-400',
  slate: 'text-slate-400'
};

function showFeedback(msg, color, targetId = 'socialFeedback', delay = 2000, extraClass = '') {
  const el = document.getElementById(targetId);
  if (!el) return;

  el.innerText = msg;
  el.className = `${extraClass} text-xs font-medium transition-all duration-500 opacity-100 ${NOTIFICATION_COLORS[color] || 'text-slate-400'}`;

  if (delay) {
    if (el.dataset.timeoutId) {
      clearTimeout(Number(el.dataset.timeoutId));
    }

    const timeoutId = setTimeout(() => {
      el.classList.replace('opacity-100', 'opacity-0');
      setTimeout(() => {
        el.innerText = '\u00A0';
      }, 500);
    }, delay);

    el.dataset.timeoutId = timeoutId.toString();
  }
}

function showToast(msg, color) {
  showFeedback(msg, color, 'toast-notification-inner', 3000, 'px-4 py-2 rounded-lg bg-slate-800/90 backdrop-blur-sm border border-slate-700 shadow-xl');
}

function showQRCode() {
    const container = document.getElementById('qrcode-container');
    const qrDiv = document.getElementById('qrcode');

    // Clear previous
    qrDiv.innerHTML = "";
    
    // Generate QR (assuming `currentUser` is your global auth object)
    const qrUrl = new URL(window.location.href);
    qrUrl.search = `addFriend=${currentUser.uid}`;
    const qrData = qrUrl.toString();
    const qrConfig = {
    type: "canvas",
    shape: "square",
    width: 300,
    height: 300,
    data: qrData,
    margin: 0,
    qrOptions: {
        typeNumber: 0,
        mode: "Byte",
        errorCorrectionLevel: "Q"
    },
    imageOptions: {
        saveAsBlob: true,
        hideBackgroundDots: true,
        imageSize: 0.4,
        margin: 0
    },
    dotsOptions: {
        type: "dots",
        color: "#f8fafc",
        roundSize: true,
        gradient: null
    },
    backgroundOptions: {
        round: 0,
        color: "#0f172a"
    },
    image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMUAAAAjCAYAAAAkJc5vAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAoISURBVHhe7Zx/aFRXFsc/9xmGqSQwkLCKQXaWZok0al1NiFCZqo3YorSS4m6XCSgVlW0UZVNW1LoIVqHsBlraKmlwaaGhdCXSDcoabGsUhUiCtptGIox0tv5YAwoDyabZoO/uH2/ivLl5977pmB/T9n1gwDn3zWTmvnvO+Z5z7yis0BxJQEDAIyzVEBDwcydwioAAhcApAgIUAqcICFAInCIgQCFwioAAhcApAgIUhHafoimOHY+qVodUL9bqzszztxuxYxH3FWZGRuH7FKL/G8Q/voZzo+oVekrC8MoK5AuVyF8Uw+yizNjYKAylEFe6Ecf6Iel+oQemz33hQ6zdt1VrNtrXJxFL2xDr1mIfqlYH82d83k33xouxURgZRgzcgM+7ESeH1Sv0lFQhz25AhtQBN0nEs22IIdWeI09FkZuWQNUvkZFw9j0lvV5SdxHfDcKZi4iOUaAc+eVmpNf0A6LtMKI52yY/2oNcpLy3m55PsbYnZihTzA5D6VxkrA67uQn77MvIGvUihZIIvL0Z+8sm7D/UIqORiZMXSr/vmg3YJ/dj/70O/N5XR6wBuVU1/kgJhSFShlxei3xjF/b5zciNhsXhpmGhj0MARGGbasuB52uR/2zC/jiOXFOFnKcEuXFmh2Fe1Pn8q0vV0dyI1ZkdYiyB+EsCCkY+lS5AHm1EvqgOpKlZgjzViB0rh1nqoIGKWuyjjchNxepIDhQht8SRi1T7T4CScuTeXcgm/3mRsQrV5IlcXKWaDBTD0UbsI3XIOWF1cGrYsky1ZCFOnUY4PlEgTgEwK4LctlK1wqpnkO+uQ5aoAzkyK4LctT2nBTCBUBR5YBLlT0ERRm5cC6Z5LamGStWooXJhbveoJIL8pBF7uUb3TAWxleYscecS4s2MpCwcpwCYV4Vc53peUoE8uDKH9O1HGBn/XX5Rv2ItdnO5av1pEFqANMmeHQvxLjg9CEWhQTV68N52ZKVhgU4FW2oN3yOF+KAryzL1TnG9E2vpYedx8HOfYiwCC1xP//oYGWICc5H78oz6qzbopZ2J067vrjzEdfXiDKJt4vXW0sPZzQ0dqd7M9Ts/Q9x5oF6RhZyvc/gwssZrLIW4nlKNjtxc7iOhtr6MbYrYU4FflujrQnRkm6beKdx0XEa895Vq9WbRM8gak+QZRVz4DKvhLWcB1LcgLtxVL8qmchkyphpzIYJs2mCWGoXIpX7E7i6Eas+FiqfBs8F1D67+VzU6VLojmkoZst40DjAKX3Vh7Xsf61lXMNj+PtaxLsS1e4j/qa/xIf60PkuMJRCH+lXrNDsFwJlB800aD2wNptT9ANHWgtjdD9fSL0jeQ+w+jnXS5BhlyHqv6JcDJVXYH+SZaWaSxC3wCuzjPHyoWhxe0cz/zVuIq/9RrQ6hCn3HLr4COUc1uhhLIrY3Y716Cc6kwK0oelLQegnR0ILY49Mmd+MTWN3FtZvpd4ptld6TDcBtOI0TmavK1MEMNy8imjW99je/MEu0il+rltypfC6/gn0mWbdQ28uHYUS3VxAJI2vmqkaHxA04ewMxog7gSKgVGgkVe1K1uEghjrQhelT7Y7KjWr/WlOLazfQ5RUkYdr2M/YpnTnbo60l7bhTmqYMZRP/ElJchifiX95cFYN4c/UT5UoSMx/OUYNNNEcTrkHsN2e3O14gTqhGoWAbzVSOOZL1yF0joN0Y9JVQEWW5ovSZ7J+j6x+aJWkOWmFhcu5l6p6hci31lP/b5JuxNC/T7DPd7sXakF/sa08J9AN+a9IAjpfQYiq5H3EUkdAVqGfKATytzJolUO/N9ZQ92Uy1ytnpBmrEkYq9mYbyqkU5jSUSb808x4JVh0m3suGosB0Pi59t/q5bHRq42ZAmP4trN1DtFLlzrxKrvzOhIYwt2GO6otslmFA59gRhT7WlKq7EP5VmbFAI3e7G2tiH61AGcqL5Ys4IHXY5w+ZZ7xEXYY8PvCeM9FXc0DvY4RLSa0ZcZdIoH0PM5Vv1hrIbe7MLKSLFRWk0afb2I4wOqNUNsg7lwLDgeQOIy1s63sF7qBE+HAGLVSM38ZslWbV0BVC1ULWZK81/AebGoziObZZhBpyiCmjrsN6snSpEL9w0dqiLwOxow3zDJY6OG91Zobce6oJNqEWSl4e8UHEXOsZc/PQemTcx1uoJ4GLrdc5FA3NBIzNlPKovue9BlXUD+Ss0sU00xcsta1fiIGXSKNE+txT6paPShFOiiECBrTOdYypGLDYvVLQFyYfdHhvriR8j8auxW3ZmuMr10ohh5cH+6Xkk/tJtiYeQz7obKbTCVeZW1+W2Omhg0/UGn9pJHvL/r1DvF9U6s+k/NO6ul1ci97g9oiEIA81foW6MHnze0IP06V14MI0z1RaGR6sV6oQXRZ+jAhaLI1z1ap+uWTZ4krHK/fwrxneHzEEHui/uflP4BiHMXfe+ZXL3eMzhMvVMAJBOI33+M0CkRQK5+LvtIx6lvXE9UipDx7ci3qzK7rk9FkUe3YL+o6a+DE7H+ZvgQOvp6EUd6VWvhMngPsem4OcMtWjGxtbxmEmVMSQVyo+v5OY9dMjehKLKlCXm0Fp53B7wiWD4XdtUhTzbmfg7tYb+5JgQIlXsGh+lxCoCh24izht3IUAXscNUKJ84jbrovUAkjY+nfTVzZ75zJX25yCKDnoucOZk50dGKd8UnJBcUw4oQpsJQhs/aMosjfGFLsD6YYucr1/r73E+eeLq/DPrLLJdP2YB/dgr0p/RsaXUvfi9Z2rD5DYMC76J4+pwB4r8eY0mRshevZMKL5Uu5FsR/3e7Fez9cj0uxrQ1z3meRC4sRlxKBqdLG0NpOdN1ZN4uHLNAvc586HER/MQLbdccq45qAYuTm76J5epxjqNy+qOU9mp/QLXYhWnxSYC2NJxB9d+yB5M4zY9jHivmovVO4hrhqym/u49yqDdLrZNfHE7vjjNUPgilRk/xTgdCdWm24rfIoYykFGlVYj38hItul1CoCLpmitpnTgWDvWO1+B5tyaL0MDiJ26jao8GLqNeHcGIl6+dFzXL1qKkGtqHelUpWlc+DUnum8ZOoUR5BqlBmhuw2odyP9+5kMOMkqufwmZjgvT7xStX+s3fVBS+jgfncZafxxx7QcUyQ+HEWfbsda3T/5Bs44ZiHj50t0NJi0fXYL885KJc/6IFFwyzbtPp3Cxx0besXas19oRCVNHapLxk1GhKPKAU3RPv1OQMB/Y0/2Ca/AuouF9rBdasDr6EXeGJ24IjYxCsh9x7EOs1e8g9gxMgmTS0NyG1WP4HgXDKKLb0OCgDBkznBweuY04rRoV+g2FiyqhxukZQPz2Haz6FqwTvYhkCkY8nGtkFO7fRXRfRjS3YB0wfRcDQ/2IT0wqBVi0Evmi6b+4CQj4mTIDmSIgoLAJnCIgQCFwioAAhf8DYdFTYBOCdsMAAAAASUVORK5CYII=",
    cornersSquareOptions: {
        type: "extra-rounded",
        color: "#34d399"
    },
    cornersDotOptions: {
        type: "",
        color: "#f8fafc"
    }
    };
    
    const qrCode = new QRCodeStyling(qrConfig);
    qrCode.append(qrDiv);
    container.classList.remove('hidden');
}

// --- QR add friend  ---
async function processFriendRequest(friendId) {
    if (!currentUser || friendId === currentUser.uid) return;

    // Check if already friends to prevent unnecessary updates
    if (state.social.userFriendsList.includes(friendId)) {
        return;
    }

    try {
        const targetDoc = await getProfileDocument(friendId);
        if (targetDoc.exists()) {
            await setDoc(getProfileDocRef(currentUser.uid), {
                friends: arrayUnion(friendId)
            }, { merge: true });
            showFeedback('Friend link established successfully!', 'emerald', 'socialAddFriendFeedback');
            haptic(HAPTIC.tap);
        } else {
            console.error("Cyber-Tag not found.");
            showFeedback('Cyber-Tag not found. Check the ID and try again.', 'rose', 'socialAddFriendFeedback');
        }
    } catch (err) {
        console.error("Error linking friend:", err);
    }
}

async function processClaimedPlan(claimId) {
    if (!currentUser) return;

    try {
        const shareSnap = await getDoc(doc(db, "shared_plans", claimId));
        if (!shareSnap.exists()) {
            console.error("Claimed plan not found.");
            return;
        }

        const data = shareSnap.data();
        if (data.shareMethod !== 'qr') {
            console.error("Invalid share method.");
            return;
        }

        if (data.sharedBy === currentUser.uid) {
            return;
        }

        const existing = await getDocs(query(
            collection(db, "shared_plans"),
            where("sharedWith", "==", currentUser.uid),
            where("planId", "==", data.planId),
            where("shareMethod", "==", "qr_claimed")
        ));
        if (!existing.empty) {
            showToast('Plan already claimed!', 'yellow');
            switchPlansFilter('shared');
            return;
        }

        const planSnap = await getDoc(doc(db, "workout_plans", data.planId));
        if (!planSnap.exists()) {
            console.error("Source plan not found.");
            return;
        }

        const plan = planSnap.data();
        await addDoc(collection(db, "shared_plans"), {
            sharedBy: data.sharedBy,
            sharedByDisplayName: data.sharedByDisplayName,
            sharedWith: currentUser.uid,
            shareMethod: 'qr_claimed',
            planId: data.planId,
            contentType: 'plan',
            content: {
                name: plan.name,
                type: plan.type,
                structure: plan.structure
            },
            status: 'active',
            createdAt: serverTimestamp()
        });

        showToast('Plan imported from QR code!', 'emerald');
        switchPlansFilter('shared');
    } catch (err) {
        console.error("Claim plan failed:", err);
        showToast('Failed to import plan from QR.', 'red');
    }
}

window.copyCyberTag = copyCyberTag;
window.handleAddFriend = handleAddFriend;
window.addFriendFromLeaderboard = addFriendFromLeaderboard;
window.removeFriend = removeFriend;
window.switchLeaderboardScope = switchLeaderboardScope;
window.switchLeaderboardFormula = switchLeaderboardFormula;
window.logRound = logRound;
window.logRep = logRep;
window.toggleLeaderboardExpand = toggleLeaderboardExpand;
window.showQRCode = showQRCode;
window.handleCalcRemove = handleCalcRemove;
window.switchCalcMode = switchCalcMode;
// addMovementRow and removeMovementRow removed - using unified Add Movement form
window.handlePlanExerciseChange = handlePlanExerciseChange;
window.handleWorkoutTypeChange = handleWorkoutTypeChange;
window.addPlanMinuteSlot = addPlanMinuteSlot;
window.removeMinuteSlot = removeMinuteSlot;
window.handlePlanAdd = handlePlanAdd;
window.togglePlanWms = togglePlanWms;
window.toggleForTimeDnf = toggleForTimeDnf;
window.selectCalendarDay = selectCalendarDay;
window.changeCalendarNav = changeCalendarNav;
window.goToCalendarToday = goToCalendarToday;
window.toggleCalendarView = toggleCalendarView;
window.closeCalendarDayDetail = closeCalendarDayDetail;
window.savePlan = savePlan;
window.loadPlan = loadPlan;
window.toggleWorkoutCard = toggleWorkoutCard;
window.redoWorkout = redoWorkout;
window.deletePlan = deletePlan;
window.removePlanMovement = removePlanMovement;
window.deleteStructuredWorkout = deleteStructuredWorkout;
window.openShareModal = openShareModal;
window.saveSharedPlanToMyPlans = saveSharedPlanToMyPlans;
window.dismissSharedPlan = dismissSharedPlan;
window.switchPlansFilter = switchPlansFilter;
window.toggleSelectAllFriends = toggleSelectAllFriends;
window.toggleFavorite = toggleFavorite;
window.togglePlanFavorite = togglePlanFavorite;
window.toggleStructuredFavorite = toggleStructuredFavorite;
window.doWorkout = doWorkout;
window.doStructuredWorkout = doStructuredWorkout;
window.doPlanWorkout = doPlanWorkout;
window.doSharedPlan = doSharedPlan;
window.submitPendingWorkout = submitPendingWorkout;
window.loadSharedPlan = loadSharedPlan;
window.switchShareMode = switchShareMode;
window.shareByQR = shareByQR;
window.updatePillActive = updatePillActive;
window.switchVolumePeriod = switchVolumePeriod;
window.shiftVolumePeriod = shiftVolumePeriod;
window.goToCurrentPeriod = goToCurrentPeriod;
window.onVolumeFilterChange = onVolumeFilterChange;

// Volume Chart Touch Swipe
(function setupVolumeSwipe() {
  const container = document.getElementById('vh-bars-container');
  if (!container) return;
  let startX = 0, startY = 0, startTime = 0;
  container.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
  }, { passive: true });
  container.addEventListener('touchmove', function(e) {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      e.preventDefault();
    }
  }, { passive: false });
  container.addEventListener('touchend', function(e) {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    const elapsed = Date.now() - startTime;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && elapsed < 500) {
      shiftVolumePeriod(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
})();

// Calendar Touch Swipe
(function setupCalendarSwipe() {
  const container = document.getElementById('cal-grid-container');
  if (!container) return;
  let startX = 0, startY = 0, startTime = 0;
  container.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
  }, { passive: true });
  container.addEventListener('touchmove', function(e) {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      e.preventDefault();
    }
  }, { passive: false });
  container.addEventListener('touchend', function(e) {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    const elapsed = Date.now() - startTime;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && elapsed < 500) {
      changeCalendarNav(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
})();

// Profile Modal
const modalClose = document.getElementById('profile-modal-close');
const modalBackdrop = document.getElementById('profile-modal-backdrop');

function openProfileModal() {
  profileModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeProfileModal() {
  profileModal.classList.add('hidden');
  document.body.style.overflow = '';
}

if (profileBtn && profileModal) {
  profileBtn.addEventListener('click', openProfileModal);
}

if (modalClose) {
  modalClose.addEventListener('click', closeProfileModal);
}

if (modalBackdrop) {
  modalBackdrop.addEventListener('click', closeProfileModal);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && profileModal && !profileModal.classList.contains('hidden')) {
    closeProfileModal();
  }
});

// CSP-compliant event handler bindings
function initCSPHandlers() {
  const bind = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  };

  // Calendar
  bind('cal-prev-month', 'click', () => changeCalendarNav(-1));
  bind('cal-today', 'click', goToCalendarToday);
  bind('cal-next-month', 'click', () => changeCalendarNav(1));
  bind('cal-toggle-view', 'click', toggleCalendarView);
  bind('cal-day-detail-close', 'click', closeCalendarDayDetail);

  // Plans filters
  bind('plans-filter-mine', 'click', () => switchPlansFilter('mine'));
  bind('plans-filter-shared', 'click', () => switchPlansFilter('shared'));
  bind('plans-filter-favorites', 'click', () => switchPlansFilter('favorites'));

  // Leaderboard
  bind('btnGlobalBoard', 'click', () => switchLeaderboardScope('global'));
  bind('btnFriendsBoard', 'click', () => switchLeaderboardScope('friends'));
  bind('btnFormulaDots', 'click', () => switchLeaderboardFormula('dots'));
  bind('btnFormulaSinclair', 'click', () => switchLeaderboardFormula('sinclair'));
  bind('leaderboard-expand-btn', 'click', toggleLeaderboardExpand);

  // Training tab
  bind('log-round-btn', 'click', logRound);
  bind('log-rep-btn', 'click', logRep);
  bind('log-workout-btn', 'click', submitPendingWorkout);

  // FOR_TIME
  bind('fortime-dnf', 'change', toggleForTimeDnf);

  // Share modal
  bind('share-mode-friends', 'click', () => switchShareMode('friends'));
  bind('share-mode-qr', 'click', () => switchShareMode('qr'));
  bind('share-select-all', 'change', toggleSelectAllFriends);

  // Calculator
  bind('calc-mode-pct', 'click', () => switchCalcMode('pct'));
  bind('calc-mode-rpe', 'click', () => switchCalcMode('rpe'));

  // Workout type
  bind('workout-type', 'change', handleWorkoutTypeChange);

  // EMOM modes
  bind('emom-mode-seq', 'click', () => switchEmomMode('sequence'));
  bind('emom-mode-by-round', 'click', () => switchEmomMode('by_round'));

  // Plan exercise
  bind('plan-exercise', 'change', handlePlanExerciseChange);
  bind('plan-add-btn', 'click', handlePlanAdd);

  // Plan/Save buttons in training tab
  bind('btn-do-workout', 'click', doWorkout);
  bind('btn-save-plan', 'click', savePlan);

  // Volume history
  bind('vh-filter', 'change', onVolumeFilterChange);
  bind('vh-period-daily', 'click', () => switchVolumePeriod('daily'));
  bind('vh-period-weekly', 'click', () => switchVolumePeriod('weekly'));
  bind('vh-period-monthly', 'click', () => switchVolumePeriod('monthly'));
  bind('vh-period-yearly', 'click', () => switchVolumePeriod('yearly'));
  bind('vh-prev', 'click', () => shiftVolumePeriod(-1));
  bind('vh-today', 'click', goToCurrentPeriod);
  bind('vh-next', 'click', () => shiftVolumePeriod(1));

  // Social
  bind('btnCopyCyberTag', 'click', copyCyberTag);
  bind('btnAddFriend', 'click', handleAddFriend);
}

// Initialize CSP handlers after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCSPHandlers);
} else {
  initCSPHandlers();
}