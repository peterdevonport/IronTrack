import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, deleteDoc, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
let volumePeriod = 'daily';
let volumePeriodOffset = 0;
let volumeFilter = 'All';
let userSignupTs = 0;

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
  { name: 'Pull-up', category: 'bodyweight', type: 'bodyweight', movement: 'pull', loadFactor: 1.00 },
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

function getEffectiveLoad(workout) {
  if (workout.estimatedLoad !== undefined && workout.estimatedLoad !== null) {
    return workout.estimatedLoad;
  }
  const loadFactor = LOAD_FACTORS[workout.exercise];
  if (loadFactor !== undefined) {
    return (userBiometrics.bodyweight || 0) * loadFactor + (parseFloat(workout.externalLoad) || 0);
  }
  return parseFloat(workout.weight) || 0;
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
const externalLoadInput = document.getElementById('external-load');
const estimatedLoadDisplay = document.getElementById('estimated-load-display');
const estLoadLabel = document.getElementById('est-load-label');

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
const pbLogWeight = document.getElementById('pb-log-weight');
const pbLogReps = document.getElementById('pb-log-reps');
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
let userBiometrics = { gender: 'male', bodyweight: 75 };
let userChallengeStreaks = { monthly: { completedPeriods: [], currentStreak: 0, bestStreak: 0 }, yearly: { completedPeriods: [], currentStreak: 0, bestStreak: 0 } };
let pendingOnboarding1RMs = [];
let activeRecords = {};
let cachedMaxLoadByExercise = {};
let cachedMax1RMByExercise = {};
let calendarMonth = new Date();
let calendarSelectedDate = null;
let calendarCompact = true;
let calendarWeekOffset = 0;
let calcEntriesByLift = {};
let currentPage = 1;
let recordsCurrentPage = 1;
let urlParamsProcessed = false; // Add this flag

let paginatedWorkouts = [];
let lastWorkouts = [];

// Structured workout state
let lastStructuredWorkouts = [];
let structuredCurrentPage = 1;
let plansCurrentPage = 1;
let unsubscribeStructured = null;

// Workout plan state
let lastWorkoutPlans = [];
let unsubscribePlans = null;

// Shared plan state
let lastSharedPlans = [];
let sharedPlansPage = 1;
let plansFilter = 'mine'; // 'mine' | 'shared'
let unsubscribeSharedPlans = null;

// Global state variables for social & leaderboards
let currentScope = 'global'; // 'global' or 'friends'
let currentFormula = 'dots';  // 'dots' or 'sinclair'
let userFriendsList = [];    // Array of friend UIDs
let friendDisplayCache = {}; // uid -> profile data snapshot
let friendsPage = 1;         // Pagination for friends list
let leaderboardUnsubscribe = null; //
let leaderboardCache = [];
let leaderboardShowAll = false;

// Bottom Navigation Tab Switching
let currentTab = 'dashboard';
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
  currentTab = tabName;
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
        userSignupTs = new Date(user.metadata.creationTime).getTime() || 0;
        
        // ... (existing code: handle, greeting, cyberTag, pullProfileMetrics) ...
        const handle = (user.email || user.uid).split('@')[0];
        greeting.innerText = `Athlete: ${handle}`;
        
        await pullProfileMetrics(user.uid);
        await initSocialProfile(user);

        // Check if onboarding is needed (first-time user)
        if (!userBiometrics.onboardingComplete) {
            loginView.classList.add('hidden');
            appView.classList.add('hidden');
            if (bottomNav) bottomNav.classList.add('hidden');
            showOnboarding();
            return;
        }

        syncLeaderboardFeed();
        listenToDataStream(user.uid);
        listenToStructuredWorkouts(user.uid);
        listenToPlans(user.uid);
        listenToSharedPlans(user.uid);
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
        document.getElementById('structured-workout-list').innerHTML = '<p class="text-xs text-slate-500 italic py-2 text-center">No structured workouts logged yet.</p>';
        document.getElementById('registry-table-body').innerHTML = '';
        calcEntriesByLift = {};
        const calcEntriesList = document.getElementById('calc-entries-list');
        if (calcEntriesList) calcEntriesList.innerHTML = '<p class="text-xs text-slate-500 italic py-2 text-center">Select a lift with data to get started.</p>';
        const calcOneRm = document.getElementById('calc-one-rm-display');
        if (calcOneRm) calcOneRm.textContent = '—';
        document.getElementById('dots-display').innerText = '0.0';
        document.getElementById('dots-tier').innerText = '-';
        document.getElementById('sinclair-display').innerText = '0.0';
        document.getElementById('sinclair-tier').innerText = '-';
        userFriendsList = [];
        friendDisplayCache = {};
        sharedPlanId = null;
        friendsPage = 1;
        sharedPlansPage = 1;
        plansFilter = 'mine';
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
        window.__irontrackActiveDates = undefined;
        calendarMonth = new Date();
        calendarSelectedDate = null;
        calendarCompact = true;
        calendarWeekOffset = 0;
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
            userBiometrics = { gender: 'male', bodyweight: 75, displayName: '', ...docSnap.data() };
            if (docSnap.data().challengeStreaks) {
                userChallengeStreaks = {
                    monthly: { completedPeriods: [], currentStreak: 0, bestStreak: 0, ...docSnap.data().challengeStreaks.monthly },
                    yearly: { completedPeriods: [], currentStreak: 0, bestStreak: 0, ...docSnap.data().challengeStreaks.yearly }
                };
            }
            document.getElementById('profile-gender').value = userBiometrics.gender;
            document.getElementById('profile-weight').value = userBiometrics.bodyweight;
            document.getElementById('profile-display-name').value = userBiometrics.displayName || '';
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
                <button type="button" class="text-rose-400 hover:text-rose-300 text-xs font-bold cursor-pointer bg-transparent border-none" data-index="${index}"><i data-lucide="circle-minus" size="14"></i></button>
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

async function saveOnboarding() {
    if (!currentUser) return;

    const gender = onboardingGender?.value || 'male';
    const bodyweight = parseFloat(onboardingWeight?.value) || 75;
    const day0Monthly = parseInt(onboardingDaysMonthly?.value, 10) || 0;
    const day0Yearly = parseInt(onboardingDaysYearly?.value, 10) || 0;
    const day0Lifetime = parseInt(onboardingDaysLifetime?.value, 10) || 0;

    if (onboardingSaveBtn) onboardingSaveBtn.disabled = true;

    try {
        // Save biometrics + day0 + onboarding flag to profile
        const profileRef = doc(db, "profiles", currentUser.uid);
        const profileData = {
            gender,
            bodyweight,
            day0TrainingDays: { monthly: day0Monthly, yearly: day0Yearly, lifetime: day0Lifetime },
            onboardingComplete: true,
            onboardedAt: serverTimestamp()
        };
        // Also store startingMaxes as a map for reference
        if (pendingOnboarding1RMs.length > 0) {
            const startingMaxes = {};
            pendingOnboarding1RMs.forEach(item => { startingMaxes[item.exercise] = item.weight; });
            profileData.startingMaxes = startingMaxes;
        }
        await setDoc(profileRef, profileData, { merge: true });

        // Update local userBiometrics
        userBiometrics.gender = gender;
        userBiometrics.bodyweight = bodyweight;
        userBiometrics.day0TrainingDays = { monthly: day0Monthly, yearly: day0Yearly, lifetime: day0Lifetime };
        userBiometrics.onboardingComplete = true;

        // Also update the sidebar profile form
        document.getElementById('profile-gender').value = gender;
        document.getElementById('profile-weight').value = bodyweight;

        // Create synthetic workout entries for each 1RM
        const now = Date.now();
        for (const item of pendingOnboarding1RMs) {
            const logEntry = {
                userId: currentUser.uid,
                exercise: item.exercise,
                sets: 1,
                reps: item.reps,
                weight: item.weight,
                externalLoad: 0,
                estimatedLoad: item.weight,
                totalVolume: item.weight * item.reps,
                timestamp: now,
                source: 'onboarding',
                isInitialMax: true
            };
            await addDoc(collection(db, "workouts"), logEntry);
        }

        hideOnboarding();
        showFeedback('Profile initialized! Welcome to IronTrack.', 'emerald');

        // Now start the dashboard
        syncLeaderboardFeed();
        listenToDataStream(currentUser.uid);
        listenToStructuredWorkouts(currentUser.uid);
        listenToPlans(currentUser.uid);
        loadConsistencyConfig();
        showQRCode();

    } catch (err) {
        console.error('Onboarding failed', err.code, err.message);
        showFeedback('Failed to save profile: ' + err.message, 'red', 'onboarding-feedback');
    } finally {
        if (onboardingSaveBtn) onboardingSaveBtn.disabled = false;
    }
}

async function logPB() {
    if (!currentUser) return;
    const exercise = pbLogExercise?.value;
    const weight = parseFloat(pbLogWeight?.value);
    const reps = parseInt(pbLogReps?.value, 10) || 1;

    if (!exercise) {
        showFeedback('Please select an exercise.', 'red', 'pb-log-feedback');
        return;
    }
    if (!weight || weight <= 0) {
        showFeedback('Please enter a valid weight.', 'red', 'pb-log-feedback');
        return;
    }

    if (pbLogBtn) pbLogBtn.disabled = true;

    try {
        const logEntry = {
            userId: currentUser.uid,
            exercise,
            sets: 1,
            reps,
            weight,
            externalLoad: 0,
            estimatedLoad: weight,
            totalVolume: weight * reps,
            timestamp: Date.now(),
            source: 'pb-log',
            isInitialMax: false
        };
        await addDoc(collection(db, "workouts"), logEntry);

        pbLogExercise.value = '';
        pbLogWeight.value = '';
        pbLogReps.value = '1';
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

    userBiometrics = {
        gender: document.getElementById('profile-gender').value,
        bodyweight: parseFloat(document.getElementById('profile-weight').value),
        displayName
    };

    try {
        await setDoc(doc(db, "profiles", currentUser.uid), userBiometrics, { merge: true });
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
if (pbLogWeight) {
    pbLogWeight.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); logPB(); }
    });
}
if (pbLogExercise) {
    pbLogExercise.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); logPB(); }
    });
}

// Realtime Data Mining
function listenToDataStream(uid) {
    const q = query(
        collection(db, "workouts"),
        where("userId", "==", uid),
        orderBy("timestamp", "desc"),
        limit(100)
    );
    unsubscribeLogs = onSnapshot(q, async (snapshot) => {
        let workouts = [];
        activeRecords = {};
        cachedMaxLoadByExercise = {};
        cachedMax1RMByExercise = {};

        snapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp;
            const workout = { id: doc.id, ...data, timestamp };
            workouts.push(workout);

            // Skip structured workout contributions for 1RM/PB tracking
            if (data.source === 'structured') return;

            // Epley 1RM Estimation Formula using effective load
            const effectiveWeight = getEffectiveLoad(workout);
            const reps = parseInt(data.reps, 10);
            const calculated1RM = reps === 1 ? effectiveWeight : effectiveWeight * (1 + reps / 30);

            if (!activeRecords[data.exercise] || calculated1RM > activeRecords[data.exercise]) {
                activeRecords[data.exercise] = calculated1RM;
            }

            // Track max load and max 1RM per exercise for PB/1RM badge rendering
            if (!cachedMaxLoadByExercise[data.exercise] || effectiveWeight > cachedMaxLoadByExercise[data.exercise]) {
                cachedMaxLoadByExercise[data.exercise] = effectiveWeight;
            }
            if (!cachedMax1RMByExercise[data.exercise] || calculated1RM > cachedMax1RMByExercise[data.exercise]) {
                cachedMax1RMByExercise[data.exercise] = calculated1RM;
            }
        });

        // Data already sorted desc by Firestore
        window.__irontrackWorkoutCount = workouts.length;
        lastWorkouts = workouts;
        // Align signup reference to earliest workout for volume history
        if (workouts.length > 0) {
          const earliestTs = Math.min(...workouts.map(w => w.timestamp));
          if (earliestTs > 0 && earliestTs < userSignupTs) {
            userSignupTs = earliestTs;
          }
        }
        // dynamicFriend populate filter options from live exercise names
        try {
          const uniqueExercises = Array.from(new Set(workouts.map(w => w.exercise)));
          populateWorkoutFilter(uniqueExercises);
          populateVolumeFilter(uniqueExercises);
        } catch (e) {
          // ignore if populate not available
        }
        update1RMRegistryUI();
        updateCalcCard();
        await processAnalytics();
        renderLogs(workouts);
        renderVolumeHistory();
        debouncedSyncActivity();
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

    const manualWorkouts = lastWorkouts.filter(w => w.source !== 'structured');

    const uniqueExercises = Array.from(new Set(manualWorkouts.map(w => w.exercise))).filter(Boolean).sort();

    if (uniqueExercises.length === 0) {
        tableBody.innerHTML = `<p class="col-span-3 text-xs text-slate-500 italic py-2 text-center">No logs recorded yet.</p>`;
        const pagination = document.getElementById('records-pagination');
        if (pagination) pagination.classList.add('hidden');
        return;
    }

    const recordsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(uniqueExercises.length / recordsPerPage));
    recordsCurrentPage = Math.min(recordsCurrentPage, totalPages);
    const start = (recordsCurrentPage - 1) * recordsPerPage;
    const pageExercises = uniqueExercises.slice(start, start + recordsPerPage);

    let html = '';
    pageExercises.forEach(exercise => {
        const maxEstimated1RM = cachedMax1RMByExercise[exercise] || 0;
        const absolutePB = cachedMaxLoadByExercise[exercise] || 0;
        html += `
            <span class="text-slate-400 font-medium truncate">${escapeHtml(exercise)}</span>
            <span class="text-slate-200 font-mono text-right">${Math.round(maxEstimated1RM)} kg</span>
            <span class="text-slate-200 font-mono text-right">${Math.round(absolutePB)} kg</span>
        `;
    });

    tableBody.innerHTML = html;

    const pagination = document.getElementById('records-pagination');
    if (pagination) {
        const currentEl = document.getElementById('current-records-page');
        const totalEl = document.getElementById('total-records-pages');
        const prevBtn = document.getElementById('prev-records-page-btn');
        const nextBtn = document.getElementById('next-records-page-btn');
        if (currentEl) currentEl.textContent = recordsCurrentPage;
        if (totalEl) totalEl.textContent = totalPages;
        if (prevBtn) prevBtn.disabled = recordsCurrentPage <= 1;
        if (nextBtn) nextBtn.disabled = recordsCurrentPage >= totalPages;
        pagination.classList.toggle('hidden', totalPages <= 1);
    }
}

function updateCalcCard() {
    const select = document.getElementById('calc-lift-select');
    const entriesList = document.getElementById('calc-entries-list');
    const oneRmDisplay = document.getElementById('calc-one-rm-display');
    const previewBox = document.getElementById('calc-preview-box');
    if (!select || !entriesList) return;

    const exercise = select.value;
    if (!exercise) {
        if (oneRmDisplay) oneRmDisplay.textContent = '—';
        entriesList.innerHTML = '<p class="text-xs text-slate-500 italic py-2 text-center">Select a lift to begin.</p>';
        return;
    }

    const oneRM = activeRecords[exercise] || 0;
    if (oneRmDisplay) {
        oneRmDisplay.textContent = oneRM > 0 ? `${Math.round(oneRM)} kg` : '—';
    }

    renderCalcEntries(exercise, oneRM);
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
    const oneRM = activeRecords[exercise] || 0;

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
        const pct1RM = 100 / (1 + totalRepsPossible / 30);
        weight = oneRM * pct1RM / 100;
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
    const oneRM = activeRecords[exercise] || 0;
    if (!exercise || oneRM <= 0) return;

    if (!calcEntriesByLift[exercise]) {
        calcEntriesByLift[exercise] = [];
    }

    if (currentCalcMode === 'pct') {
        const pctInput = document.getElementById('calc-pct-input');
        const pct = parseFloat(pctInput?.value);
        if (isNaN(pct) || pct <= 0) return;
        calcEntriesByLift[exercise].push({ type: 'pct', pct });
        pctInput.value = '';
    } else {
        const repsInput = document.getElementById('calc-rpe-reps');
        const rpeSelect = document.getElementById('calc-rpe-select');
        const reps = parseInt(repsInput?.value, 10);
        const rpe = parseFloat(rpeSelect?.value);
        if (!reps || reps < 1 || isNaN(rpe)) return;
        calcEntriesByLift[exercise].push({ type: 'rpe', reps, rpe });
        repsInput.value = '';
        rpeSelect.value = '';
    }

    renderCalcEntries(exercise, oneRM);
    updateCalcPreview();
    haptic(HAPTIC.confirm);
}

function handleCalcRemove(btnEl) {
    const select = document.getElementById('calc-lift-select');
    if (!select || !btnEl) return;
    const exercise = select.value;
    const idx = parseInt(btnEl.dataset.index, 10);
    if (!calcEntriesByLift[exercise] || isNaN(idx) || idx < 0 || idx >= calcEntriesByLift[exercise].length) return;
    calcEntriesByLift[exercise].splice(idx, 1);
    const oneRM = activeRecords[exercise] || 0;
    renderCalcEntries(exercise, oneRM);
}

function handleCalcClear() {
    const select = document.getElementById('calc-lift-select');
    if (!select) return;
    const exercise = select.value;
    calcEntriesByLift[exercise] = [];
    const oneRM = activeRecords[exercise] || 0;
    renderCalcEntries(exercise, oneRM);
}

function renderCalcEntries(exercise, oneRM) {
    const entriesList = document.getElementById('calc-entries-list');
    if (!entriesList) return;

    const entries = calcEntriesByLift[exercise] || [];

    if (entries.length === 0) {
        entriesList.innerHTML = '<p class="text-xs text-slate-500 italic py-2 text-center">Enter values above and click Add to save working weights.</p>';
        return;
    }

    let html = '';
    entries.forEach((entry, idx) => {
        let source, weight;
        if (entry.type === 'pct') {
            weight = Math.round(oneRM * entry.pct / 100);
            source = `${entry.pct}%`;
        } else {
            const rir = 10 - entry.rpe;
            weight = Math.round(oneRM * (100 / (1 + (entry.reps + rir) / 30)) / 100);
            source = `${entry.reps} reps @ RPE ${entry.rpe}`;
        }
        html += `
        <div class="flex justify-between items-center py-1.5 px-1 rounded-lg hover:bg-slate-800/40">
            <span class="text-slate-200 font-mono text-sm">${escapeHtml(source)}</span>
            <div class="flex items-center gap-2">
                <span class="text-slate-200 font-mono text-sm">${weight} kg</span>
                <button onclick="handleCalcRemove(this)" data-index="${idx}" class="text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"><i data-lucide="circle-minus" size="14"></i></button>
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
    currentPageDisplay.innerText = currentPage;
    totalPagesDisplay.innerText = totalPages;

    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

function changePage(direction) {
    const totalPages = Math.max(1, Math.ceil(paginatedWorkouts.length / entriesPerPage));
    if (direction === 'prev' && currentPage > 1) {
        currentPage -= 1;
    } else if (direction === 'next' && currentPage < totalPages) {
        currentPage += 1;
    }
    renderLogs(lastWorkouts);
}

if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => changePage('prev'));
}
if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => changePage('next'));
}

function changeRecordsPage(direction) {
    const manualWorkouts = lastWorkouts.filter(w => w.source !== 'structured');
    const uniqueExercises = Array.from(new Set(manualWorkouts.map(w => w.exercise))).filter(Boolean).sort();
    const totalPages = Math.max(1, Math.ceil(uniqueExercises.length / 10));
    if (direction === 'prev' && recordsCurrentPage > 1) {
        recordsCurrentPage--;
    } else if (direction === 'next' && recordsCurrentPage < totalPages) {
        recordsCurrentPage++;
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
    currentPage = 1;
    renderLogs(lastWorkouts);
  });
}

// Wire exercise dropdown change and external load input
if (exerciseSelect) {
  exerciseSelect.addEventListener('change', toggleBWFields);
}
if (externalLoadInput) {
  externalLoadInput.addEventListener('input', updateEstimatedLoadDisplay);
}

// Populate exercise dropdown on load
populateExerciseDropdown();
populateLiftSelectors();

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
    
    currentPage = 1; //
    renderLogs(lastWorkouts); //
  });
}

if (chip1RMEl) {
  chip1RMEl.dataset.active = 'false'; //
  chip1RMEl.addEventListener('click', () => {
    const active = chip1RMEl.dataset.active !== 'true'; //
    chip1RMEl.dataset.active = active ? 'true' : 'false'; //
    
    // Toggle class state cleanly based on status
    chip1RMEl.classList.toggle('is-active', active);
    
    currentPage = 1; //
    renderLogs(lastWorkouts); //
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
      items.forEach(ex => { html += `<option value="${ex.name}">${ex.name}</option>`; });
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

function toggleBWFields() {
  const exercise = document.getElementById('exercise').value;
  const info = getExerciseInfo(exercise);
  const isBodyweight = info.type === 'bodyweight';
  const bwExtras = document.getElementById('bw-extras');
  const weightField = document.getElementById('weight-field');
  const weightInput = document.getElementById('weight');
  const weightLabel = document.getElementById('weight-label');

  if (isBodyweight) {
    bwExtras.classList.remove('hidden');
    weightField.classList.remove('hidden');
    weightInput.value = userBiometrics.bodyweight || '';
    weightInput.disabled = true;
    if (weightLabel) weightLabel.textContent = 'Bodyweight';
  } else {
    bwExtras.classList.add('hidden');
    weightField.classList.remove('hidden');
    weightInput.disabled = false;
    if (externalLoadInput) externalLoadInput.value = '';
    if (weightLabel) weightLabel.textContent = 'Weight (kg)';
  }
  updateEstimatedLoadDisplay();
}

function updateEstimatedLoadDisplay() {
  const exercise = document.getElementById('exercise').value;
  const externalLoad = parseFloat(document.getElementById('external-load').value) || 0;
  const loadFactor = LOAD_FACTORS[exercise];
  const display = document.getElementById('estimated-load-display');
  const disclaimer = document.getElementById('lf-disclaimer');
  if (!display) return;

  if (loadFactor !== undefined) {
    const bw = userBiometrics.bodyweight || 0;
    const estLoad = bw * loadFactor + externalLoad;
    display.textContent = estLoad > 0 ? `${Math.round(estLoad)}` : '—';
    if (disclaimer) disclaimer.classList.remove('hidden');
    if (estLoadLabel) {
      estLoadLabel.textContent = `BW × ${loadFactor} + External Load`;
    }
  } else {
    display.textContent = '—';
    if (disclaimer) disclaimer.classList.add('hidden');
    if (estLoadLabel) estLoadLabel.textContent = 'Est. Load / Rep';
  }
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

// Mathematical Engine Implementations
async function processAnalytics() {
    const bw = userBiometrics.bodyweight;
    const gender = userBiometrics.gender;

    // ==========================================
    // 1. DOTS Calculation & Lift Breakdown
    // ==========================================
    const squatRec = activeRecords['Back Squat'] || 0;
    const benchRec = activeRecords['Bench Press'] || 0;
    const deadliftRec = activeRecords['Deadlift'] || 0;

    // Inject individual Powerlifting 1RMs into the DOTS side-breakdown view
    const dotsSquatEl = document.getElementById('dots-breakdown-squat');
    const dotsBenchEl = document.getElementById('dots-breakdown-bench');
    const dotsDeadliftEl = document.getElementById('dots-breakdown-deadlift');

    if (dotsSquatEl) dotsSquatEl.innerText = `${Math.round(squatRec)} kg`;
    if (dotsBenchEl) dotsBenchEl.innerText = `${Math.round(benchRec)} kg`;
    if (dotsDeadliftEl) dotsDeadliftEl.innerText = `${Math.round(deadliftRec)} kg`;

    const plTotal = squatRec + benchRec + deadliftRec;
    let dots = 0;
    if (plTotal > 0 && bw > 0) {
        const c = gender === 'male' 
            ? [47.46178854, 8.472061379, -0.07369410346, 0.0002586110512, -0.0000003634089054, 0.000000001790898013]
            : [-125.4255398, 13.71219419, -0.03307250631, 0.00004809990691, -0.00000003622531999, 0.000000000105123006];
        
        const denominator = c[0] + (c[1] * bw) + (c[2] * Math.pow(bw, 2)) + (c[3] * Math.pow(bw, 3)) + (c[4] * Math.pow(bw, 4)) + (c[5] * Math.pow(bw, 5));
        dots = (plTotal * 500) / denominator;
    }
    
    const dotsDisplayEl = document.getElementById('dots-display');
    const dotsTierEl = document.getElementById('dots-tier');
    if (dotsDisplayEl) dotsDisplayEl.innerText = dots > 0 ? dots.toFixed(1) : "0.0";
    if (dotsTierEl) dotsTierEl.innerText = getRankingTier(dots, 'dots', gender);

    // ==========================================
    // 2. Sinclair Calculation & Lift Breakdown
    // ==========================================
    const snatchRec = activeRecords['Snatch'] || 0;
    const cleanRec = activeRecords['Clean & Jerk'] || 0;

    // Inject individual Olympic Weightlifting 1RMs into the Sinclair side-breakdown view
    const sinclairSnatchEl = document.getElementById('sinclair-breakdown-snatch');
    const sinclairCleanEl = document.getElementById('sinclair-breakdown-clean');

    if (sinclairSnatchEl) sinclairSnatchEl.innerText = `${Math.round(snatchRec)} kg`;
    if (sinclairCleanEl) sinclairCleanEl.innerText = `${Math.round(cleanRec)} kg`;

    const olyTotal = snatchRec + cleanRec;
    let sinclair = 0;
    if (olyTotal > 0 && bw > 0) {
        const A = gender === 'male' ? 0.722762521 : 0.787004341;
        const b = gender === 'male' ? 193.609 : 153.757;
        if (bw >= b) {
            sinclair = olyTotal;
        } else {
            const coeff = Math.pow(10, A * Math.pow(Math.log10(bw / b), 2));
            sinclair = olyTotal * coeff;
        }
    }
    
    const sinclairDisplayEl = document.getElementById('sinclair-display');
    const sinclairTierEl = document.getElementById('sinclair-tier');
    if (sinclairDisplayEl) sinclairDisplayEl.innerText = sinclair > 0 ? sinclair.toFixed(1) : "0.0";
    if (sinclairTierEl) sinclairTierEl.innerText = getRankingTier(sinclair, 'sinclair', gender);

    // ==========================================
    // 3. Social Sync Integration
    // ==========================================
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

let workoutMode = 'set';
let emomMode = 'sequence';

function switchWorkoutMode(mode) {
  workoutMode = mode;
  const tabSet = document.getElementById('tab-log-set');
  const tabWorkout = document.getElementById('tab-log-workout');
  const setSection = document.getElementById('log-set-section');
  const workoutSection = document.getElementById('log-workout-section');
  const workoutFormEl = document.getElementById('workout-form');
  if (!tabSet || !tabWorkout || !setSection || !workoutSection) return;

  if (mode === 'set') {
    tabSet.className = 'btn-core is-primary btn-size-row';
    tabWorkout.className = 'btn-core is-ghost btn-size-row';
    setSection.classList.remove('hidden');
    if (workoutFormEl) workoutFormEl.classList.remove('hidden');
    workoutSection.classList.add('hidden');
  } else {
    tabSet.className = 'btn-core is-ghost btn-size-row';
    tabWorkout.className = 'btn-core is-primary btn-size-row';
    setSection.classList.add('hidden');
    if (workoutFormEl) workoutFormEl.classList.add('hidden');
    workoutSection.classList.remove('hidden');
    populateMovementDropdowns();
    handleWorkoutTypeChange();
  }
}

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

function handleMovementExerciseChange(selectEl) {
  const row = selectEl.closest('.movement-row, .minute-row');
  if (!row) return;
  const weightInput = row.querySelector('.movement-weight');
  const pill = row.querySelector('.wms-pill');
  const calcSpan = row.querySelector('.movement-calc');
  const exercise = selectEl.value;
  const loadFactor = LOAD_FACTORS[exercise];

  if (loadFactor !== undefined) {
    weightInput.value = '';
    weightInput.disabled = true;
    weightInput.placeholder = 'BW';
    if (pill) { pill.classList.add('hidden'); pill.dataset.mode = 'absolute'; }
    if (calcSpan) calcSpan.classList.add('hidden');
  } else {
    weightInput.disabled = false;
    const mode = pill?.dataset?.mode || 'absolute';
    weightInput.placeholder = mode === 'pct' ? '%' : (mode === 'rpe' ? 'RPE' : 'Load');
    if (pill) pill.classList.remove('hidden');
    if (calcSpan) {
      if (mode === 'pct' || mode === 'rpe') {
        calcSpan.classList.remove('hidden');
        updateRowCalcDisplay(row);
      } else {
        calcSpan.classList.add('hidden');
      }
    }
  }
}

function addMovementRow(containerId, exerciseName) {
  if (!containerId) containerId = 'movement-list';
  const container = document.getElementById(containerId);
  if (!container) return;
  // Clear initial static HTML placeholder on first call for this container
  if (!container.dataset.wmsBootstrapped) {
    container.innerHTML = '';
    container.dataset.wmsBootstrapped = 'true';
  }
  const row = document.createElement('div');
  row.className = 'movement-row flex flex-col gap-1.5';
  row.innerHTML = `
    <div class="w-full flex gap-2 items-center">
      <select class="movement-exercise dropdown-core flex-1" onchange="handleMovementExerciseChange(this)">
        <option value="">Select exercise...</option>
      </select>
      <button type="button" onclick="removeMovementRow(this)" class="btn-core is-secondary min-w-0 px-1.5 py-1 text-xs leading-none shrink-0"><i data-lucide="circle-minus" size="14"></i></button>
    </div>
    <div class="flex gap-2 items-center flex-wrap">
      <div class="w-16 shrink-0">
        <input type="number" class="movement-reps input-core" placeholder="Reps" min="1" step="1" />
      </div>
      <span class="text-slate-500 text-xs font-mono shrink-0">@</span>
      <div class="w-20 shrink-0">
        <input type="number" class="movement-weight input-core" placeholder="Load" min="0" step="any" />
      </div>
      <div class="wms-pill shrink-0" data-mode="absolute">
        <button type="button" class="wms-pill-btn is-active" data-mode="absolute" onclick="toggleWeightMode(this)">kg</button>
        <button type="button" class="wms-pill-btn" data-mode="pct" onclick="toggleWeightMode(this)">%</button>
        <button type="button" class="wms-pill-btn" data-mode="rpe" onclick="toggleWeightMode(this)">RPE</button>
      </div>
      <div class="w-16 shrink-0 flex items-center justify-center">
        <span class="movement-calc text-emerald-400 font-mono text-xs hidden">\u2192</span>
      </div>
    </div>
  `;
  container.appendChild(row);
  populateMovementDropdowns();
  if (exerciseName) {
    const sel = row.querySelector('.movement-exercise');
    if (sel) { sel.value = exerciseName; handleMovementExerciseChange(sel); }
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function removeMovementRow(btn) {
  const row = btn.closest('.movement-row');
  if (row) row.remove();
  const container = btn.closest('#movement-list, #fortime-movement-list, #interval-movement-list');
  if (container?.id === 'movement-list') updateAmrapScorePreview();
}

function updatePillActive(pill, mode) {
  pill.querySelectorAll('.wms-pill-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.mode === mode);
  });
}

function toggleWeightMode(el) {
  const pill = el.closest('.wms-pill');
  if (!pill) return;
  const row = pill.closest('.movement-row, .minute-row');
  if (!row) return;
  const newMode = el.dataset.mode;
  pill.dataset.mode = newMode;
  updatePillActive(pill, newMode);

  const weightInput = row.querySelector('.movement-weight');
  if (weightInput) {
    weightInput.placeholder = newMode === 'pct' ? '%' : (newMode === 'rpe' ? 'RPE' : 'Load');
    if (newMode === 'rpe') {
      weightInput.min = 1;
      weightInput.max = 10;
      weightInput.step = 0.5;
    } else {
      weightInput.min = 0;
      weightInput.step = 'any';
      weightInput.removeAttribute('max');
    }
  }

  const calcSpan = row.querySelector('.movement-calc');
  if (!calcSpan) return;
  if (newMode === 'pct' || newMode === 'rpe') {
    calcSpan.classList.remove('hidden');
    updateRowCalcDisplay(row);
  } else {
    calcSpan.classList.add('hidden');
  }
}

function updateRowCalcDisplay(row) {
  const exercise = row.querySelector('.movement-exercise')?.value;
  const weightInput = row.querySelector('.movement-weight');
  const calcSpan = row.querySelector('.movement-calc');
  const pill = row.querySelector('.wms-pill');
  if (!weightInput || !calcSpan || !pill) return;

  const mode = pill.dataset.mode;
  const oneRM = exercise ? (activeRecords[exercise] || 0) : 0;

  if (!exercise) {
    calcSpan.textContent = '\u2192';
    calcSpan.className = 'movement-calc text-slate-500 font-mono text-xs';
    return;
  }

  if (mode === 'pct') {
    const pct = parseFloat(weightInput.value);
    if (isNaN(pct) || pct <= 0 || oneRM <= 0) {
      calcSpan.textContent = oneRM > 0 ? '\u2192' : 'No 1RM';
      calcSpan.className = 'movement-calc font-mono text-xs ' + (oneRM > 0 ? 'text-emerald-400' : 'text-rose-400');
      return;
    }
    const calculated = Math.round(oneRM * pct / 100);
    calcSpan.textContent = '\u2192 ' + calculated + ' kg';
    calcSpan.className = 'movement-calc text-emerald-400 font-mono text-xs';
  } else if (mode === 'rpe') {
    const rpe = parseFloat(weightInput.value);
    const reps = parseInt(row.querySelector('.movement-reps')?.value, 10);
    if (isNaN(rpe) || rpe < 1 || rpe > 10 || isNaN(reps) || reps < 1 || oneRM <= 0) {
      if (oneRM <= 0) {
        calcSpan.textContent = 'No 1RM';
        calcSpan.className = 'movement-calc font-mono text-xs text-rose-400';
      } else if (isNaN(rpe) || rpe < 1 || rpe > 10) {
        calcSpan.textContent = '\u2192';
        calcSpan.className = 'movement-calc font-mono text-xs text-slate-500';
      } else {
        calcSpan.textContent = '\u2192';
        calcSpan.className = 'movement-calc font-mono text-xs text-emerald-400';
      }
      return;
    }
    const rir = 10 - rpe;
    const totalRepsPossible = reps + rir;
    const targetWeight = Math.round(oneRM / (1 + totalRepsPossible / 30));
    calcSpan.textContent = '\u2192 ' + targetWeight + ' kg';
    calcSpan.className = 'movement-calc text-emerald-400 font-mono text-xs';
  }
}

function getMovementData(containerSelector) {
  const movements = [];
  let error = null;
  document.querySelectorAll(containerSelector).forEach(row => {
    const exercise = row.querySelector('.movement-exercise')?.value;
    const reps = parseInt(row.querySelector('.movement-reps')?.value, 10);
    const weightInput = row.querySelector('.movement-weight');
    const pill = row.querySelector('.wms-pill');
    const weightMode = pill?.dataset?.mode || 'absolute';

    let rawWeight = parseFloat(weightInput?.value) || 0;
    let pct = null;
    let rpe = null;

    if (!exercise) { error = 'Select an exercise for all movements.'; return; }
    if (!reps || reps < 1) { error = 'Enter reps for all movements.'; return; }

    if (weightMode === 'pct') {
      pct = rawWeight;
      const oneRM = activeRecords[exercise] || 0;
      rawWeight = oneRM > 0 ? Math.round(oneRM * rawWeight / 100) : rawWeight;
    } else if (weightMode === 'rpe') {
      rpe = rawWeight;
      const oneRM = activeRecords[exercise] || 0;
      if (oneRM > 0 && rpe >= 1 && rpe <= 10) {
        const rir = 10 - rpe;
        const totalRepsPossible = reps + rir;
        rawWeight = Math.round(oneRM / (1 + totalRepsPossible / 30));
      }
    }

    const exInfo = getExerciseInfo(exercise);
    const loadFactor = LOAD_FACTORS[exercise];
    if (!loadFactor && exInfo.category !== 'cardio' && (!rawWeight || rawWeight <= 0)) { error = `Enter a load for ${exercise}.`; return; }

    const movement = { exerciseId: exercise, reps, weight: rawWeight, weightMode };
    if (pct !== null) movement.pct = pct;
    if (rpe !== null) movement.rpe = rpe;
    movements.push(movement);
  });
  if (error) throw new Error(error);
  return movements;
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
  if (rounds === 0 && additionalReps === 0) return '—';
  return `${rounds} + ${additionalReps}`;
}

async function submitAmrapWorkout(e) {
  e.preventDefault();
  if (!currentUser) return alert('Please sign in first.');

  const durationMin = parseInt(document.getElementById('amrap-duration').value, 10);
  const roundsCompleted = parseInt(document.getElementById('amrap-rounds').value, 10);
  const additionalReps = parseInt(document.getElementById('amrap-additional-reps').value, 10) || 0;
  let movements;
  try {
    movements = getMovementData('#movement-list .movement-row');
  } catch (err) {
    return showFeedback(err.message, 'red', 'amrapFeedback');
  }

  if (!durationMin || durationMin < 1) return showFeedback('Enter a valid duration.', 'red', 'amrapFeedback');
  if (roundsCompleted < 0) return showFeedback('Enter rounds completed.', 'red', 'amrapFeedback');
  if (movements.length === 0) return showFeedback('Add at least one movement.', 'red', 'amrapFeedback');

  const durationSeconds = durationMin * 60;
  const now = Date.now();

  const workoutDoc = {
    userId: currentUser.uid,
    name: `${durationMin} Min AMRAP`,
    type: 'AMRAP',
    structure: {
      durationSeconds,
      movements
    },
    result: {
      roundsCompleted,
      additionalReps
    },
    scoreDisplay: formatScore_ROUNDS_AND_REPS(roundsCompleted, additionalReps),
    scoreType: 'ROUNDS_AND_REPS',
    // numeric value for sorting: rounds*1000 + additionalReps (higher is better)
    scoreValue: roundsCompleted * 1000 + additionalReps,
    timestamp: now
  };

  try {
    const docRef = await addDoc(collection(db, "structured_workouts"), workoutDoc);
    await generateAmrapContributions(docRef.id, movements, roundsCompleted, additionalReps);

    document.getElementById('amrap-form').reset();
    document.getElementById('movement-list').innerHTML = '';
    addMovementRow();
    document.getElementById('amrap-score-preview').textContent = '—';
    showFeedback('AMRAP workout saved!', 'emerald', 'amrapFeedback');
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('AMRAP submission failed', err.code, err.message);
    if (err.code === 'permission-denied') {
      showFeedback('Save blocked by Firestore rules.', 'red', 'amrapFeedback');
    } else {
      alert(`Failed to save workout: ${err.message}`);
    }
  }
}

async function writeStructuredLogEntry({ workoutId, movement, sets, totalReps, extraFields = {}, now = Date.now() }) {
  const bw = userBiometrics.bodyweight || 0;
  const loadFactor = LOAD_FACTORS[movement.exerciseId];
  let estimatedLoad = 0;
  let weight = 0;

  if (loadFactor !== undefined) {
    estimatedLoad = bw * loadFactor;
    weight = bw;
  } else {
    estimatedLoad = movement.weight || 0;
    weight = movement.weight || 0;
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
    timestamp: now,
    source: 'structured',
    workoutId,
    ...extraFields,
    totalWorkReps: totalReps
  };

  await addDoc(collection(db, "workouts"), logEntry);
}

async function generateAmrapContributions(workoutId, movements, roundsCompleted, additionalReps) {
  const now = Date.now();

  for (const movement of movements) {
    if (getExerciseInfo(movement.exerciseId).category === 'cardio') continue;
    const totalRepsPerMovement = roundsCompleted * movement.reps + additionalReps;
    if (totalRepsPerMovement <= 0) continue;

    await writeStructuredLogEntry({
      workoutId, movement, now,
      sets: roundsCompleted,
      totalReps: totalRepsPerMovement,
      extraFields: { additionalReps }
    });
  }
}

// ─── EMOM Functions ───────────────────────────────────────────────────────

function handleWorkoutTypeChange() {
  const type = document.getElementById('workout-type')?.value;
  const amrapForm = document.getElementById('amrap-form');
  const emomForm = document.getElementById('emom-form');
  const forTimeForm = document.getElementById('for-time-form');
  const intervalForm = document.getElementById('interval-form');
  const desc = document.getElementById('workout-type-desc');
  if (!amrapForm || !emomForm || !forTimeForm || !intervalForm || !desc) return;

  [amrapForm, emomForm, forTimeForm, intervalForm].forEach(f => f.classList.add('hidden'));

  if (type === 'EMOM') {
    emomForm.classList.remove('hidden');
    desc.textContent = 'Record an EMOM (Every Minute On the Minute) workout.';
    switchEmomMode(emomMode);
    updateEmomSummary(); updateEmomDurationDisplay();
  } else if (type === 'FOR_TIME') {
    forTimeForm.classList.remove('hidden');
    desc.textContent = 'Record a For Time workout — complete the rounds as fast as possible.';
  } else if (type === 'INTERVAL') {
    intervalForm.classList.remove('hidden');
    desc.textContent = 'Record an Interval workout — work/rest rounds.';
  } else {
    amrapForm.classList.remove('hidden');
    desc.textContent = 'Record a structured AMRAP workout.';
  }
  populateMovementDropdowns();
}

function switchEmomMode(mode) {
  emomMode = mode;
  const btnSeq = document.getElementById('emom-mode-seq');
  const btnByRound = document.getElementById('emom-mode-by-round');
  const heading = document.getElementById('emom-slot-heading');
  const addBtn = document.getElementById('emom-add-slot-btn');
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
  if (addBtn) addBtn.textContent = mode === 'sequence' ? '+ Add Interval' : '+ Add Round';
  if (roundsField) roundsField.classList.toggle('hidden', mode === 'by_round');
  if (roundsInput) roundsInput.required = mode !== 'by_round';
  document.querySelectorAll('#emom-minute-slots .minute-label').forEach((el, i) => {
    el.textContent = mode === 'sequence' ? `#${i + 1}` : `Round ${i + 1}`;
  });
  updateEmomSummary();
  updateEmomDurationDisplay();
  updateEmomScorePreview();
}

function addMinuteSlot(exerciseName) {
  const container = document.getElementById('emom-minute-slots');
  if (!container) return;
  if (!container.dataset.wmsBootstrapped) {
    container.innerHTML = '';
    container.dataset.wmsBootstrapped = 'true';
  }
  const count = container.children.length + 1;
  const label = emomMode === 'sequence' ? `#${count}` : `Round ${count}`;
  const row = document.createElement('div');
  row.className = 'minute-row flex flex-col gap-1.5';
  row.innerHTML = `
    <div class="w-full">
      <span class="minute-label text-xs text-slate-500 font-mono">${label}</span>
    </div>
    <div class="w-full flex gap-2 items-center">
      <select class="movement-exercise dropdown-core flex-1" onchange="handleMovementExerciseChange(this)">
        <option value="">Select exercise...</option>
      </select>
      <button type="button" onclick="removeMinuteSlot(this)" class="btn-core is-secondary min-w-0 px-1.5 py-1 text-xs leading-none shrink-0"><i data-lucide="circle-minus" size="14"></i></button>
    </div>
    <div class="flex gap-2 items-center flex-wrap">
      <div class="w-16 shrink-0">
        <input type="number" class="movement-reps input-core" placeholder="Reps" min="1" step="1" />
      </div>
      <span class="text-slate-500 text-xs font-mono shrink-0">@</span>
      <div class="w-20 shrink-0">
        <input type="number" class="movement-weight input-core" placeholder="Load" min="0" step="any" />
      </div>
      <div class="wms-pill shrink-0" data-mode="absolute">
        <button type="button" class="wms-pill-btn is-active" data-mode="absolute" onclick="toggleWeightMode(this)">kg</button>
        <button type="button" class="wms-pill-btn" data-mode="pct" onclick="toggleWeightMode(this)">%</button>
        <button type="button" class="wms-pill-btn" data-mode="rpe" onclick="toggleWeightMode(this)">RPE</button>
      </div>
      <div class="w-16 shrink-0 flex items-center justify-center">
        <span class="movement-calc text-emerald-400 font-mono text-xs hidden">\u2192</span>
      </div>
    </div>
  `;
  container.appendChild(row);
  populateMovementDropdowns();
  if (exerciseName) {
    const sel = row.querySelector('.movement-exercise');
    if (sel) { sel.value = exerciseName; handleMovementExerciseChange(sel); }
  }
  updateEmomSummary();
  updateEmomDurationDisplay();
  updateEmomScorePreview();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function removeMinuteSlot(btn) {
  const row = btn.closest('.minute-row');
  if (row) row.remove();
  const container = document.getElementById('emom-minute-slots');
  if (container) {
    container.querySelectorAll('.minute-row').forEach((r, i) => {
      const label = r.querySelector('.minute-label');
      if (label) label.textContent = emomMode === 'sequence' ? `#${i + 1}` : `Round ${i + 1}`;
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
  const rounds = emomMode === 'by_round' ? slots : parseInt(roundsInput?.value, 10);
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
  const rounds = emomMode === 'by_round' ? slots : parseInt(roundsInput?.value, 10);
  if (rounds > 0 && slots > 0 && intervalSeconds > 0) {
    const totalSec = rounds * intervalSeconds;
    let intervalLabel;
    if (intervalSeconds === 60) {
      intervalLabel = `EMOM`;
    } else if (intervalSeconds === 120) {
      intervalLabel = `E2MOM`;
    } else if (intervalSeconds === 180) {
      intervalLabel = `E3MOM`;
    } else if (intervalMin > 0 && intervalSec === 0) {
      intervalLabel = `E${intervalMin}MOM`;
    } else if (intervalMin > 0) {
      intervalLabel = `Every ${intervalMin}:${String(intervalSec).padStart(2, '0')}`;
    } else {
      intervalLabel = `Every :${String(intervalSec).padStart(2, '0')}`;
    }
    const prefix = totalSec % 60 === 0 ? `${totalSec / 60} Min ` : '';
    const name = `${prefix}${intervalLabel}`;
    if (emomMode === 'sequence') {
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
    const exercise = row.querySelector('.movement-exercise')?.value;
    const reps = parseInt(row.querySelector('.movement-reps')?.value, 10);
    const weightInput = row.querySelector('.movement-weight');
    const pill = row.querySelector('.wms-pill');
    const weightMode = pill?.dataset?.mode || 'absolute';

    let rawWeight = parseFloat(weightInput?.value) || 0;
    let pct = null;
    let rpe = null;

    if (!exercise) { error = 'Select an exercise for all intervals.'; return; }
    if (!reps || reps < 1) { error = 'Enter reps for all intervals.'; return; }

    if (weightMode === 'pct') {
      pct = rawWeight;
      const oneRM = activeRecords[exercise] || 0;
      rawWeight = oneRM > 0 ? Math.round(oneRM * rawWeight / 100) : rawWeight;
    } else if (weightMode === 'rpe') {
      rpe = rawWeight;
      const oneRM = activeRecords[exercise] || 0;
      if (oneRM > 0 && rpe >= 1 && rpe <= 10) {
        const rir = 10 - rpe;
        const totalRepsPossible = reps + rir;
        rawWeight = Math.round(oneRM / (1 + totalRepsPossible / 30));
      }
    }

    const exInfo = getExerciseInfo(exercise);
    const loadFactor = LOAD_FACTORS[exercise];
    if (!loadFactor && exInfo.category !== 'cardio' && (!rawWeight || rawWeight <= 0)) { error = `Enter a load for ${exercise}.`; return; }

    const movement = { exerciseId: exercise, reps, weight: rawWeight, weightMode };
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
  const rounds = emomMode === 'by_round' ? slots : parseInt(roundsInput?.value, 10);
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

async function submitEmomWorkout(e) {
  e.preventDefault();
  if (!currentUser) return alert('Please sign in first.');

  const intervalMin = parseInt(document.getElementById('emom-interval-min').value, 10) || 0;
  const intervalSec = parseInt(document.getElementById('emom-interval-sec').value, 10) || 0;
  const intervalSeconds = intervalMin * 60 + intervalSec;
  const roundsCompleted = parseInt(document.getElementById('emom-rounds-completed').value, 10);
  let minutes;
  try {
    minutes = getEmomMovementData();
  } catch (err) {
    return showFeedback(err.message, 'red', 'emomFeedback');
  }

  const rounds = emomMode === 'by_round' ? minutes.length : parseInt(document.getElementById('emom-rounds').value, 10);

  if (!rounds || rounds < 1) return showFeedback('Enter a valid number of rounds.', 'red', 'emomFeedback');
  if (intervalSeconds < 1) return showFeedback('Enter a valid interval.', 'red', 'emomFeedback');
  if (roundsCompleted < 0) return showFeedback('Enter rounds completed.', 'red', 'emomFeedback');
  if (roundsCompleted > rounds) return showFeedback('Rounds completed cannot exceed total rounds.', 'red', 'emomFeedback');
  if (minutes.length === 0) return showFeedback('Add at least one interval slot.', 'red', 'emomFeedback');

  const durationSeconds = rounds * intervalSeconds;
  const durationMinutes = Math.floor(durationSeconds / 60);
  const now = Date.now();

  let name;
  const totalSec = intervalSeconds;
  let intervalLabel;
  if (totalSec === 60) {
    intervalLabel = `EMOM`;
  } else if (totalSec === 120) {
    intervalLabel = `E2MOM`;
  } else if (totalSec === 180) {
    intervalLabel = `E3MOM`;
  } else if (intervalMin > 0 && intervalSec === 0) {
    intervalLabel = `E${intervalMin}MOM`;
  } else if (intervalMin > 0) {
    intervalLabel = `Every ${intervalMin}:${String(intervalSec).padStart(2, '0')}`;
  } else {
    intervalLabel = `Every :${String(intervalSec).padStart(2, '0')}`;
  }
  const prefix = durationSeconds % 60 === 0 ? `${durationSeconds / 60} Min ` : '';
  name = `${prefix}${intervalLabel} \u00D7 ${rounds} rounds`;

  const workoutDoc = {
    userId: currentUser.uid,
    name,
    type: 'EMOM',
    structure: {
      mode: emomMode,
      rounds,
      durationMinutes,
      intervalSeconds,
      minutes
    },
    result: {
      roundsCompleted
    },
    scoreDisplay: formatScore_COMPLETED_MINUTES(roundsCompleted, rounds),
    scoreType: 'COMPLETED_MINUTES',
    scoreValue: roundsCompleted,
    timestamp: now
  };

  try {
    const docRef = await addDoc(collection(db, "structured_workouts"), workoutDoc);
    await generateEmomContributions(docRef.id, minutes, roundsCompleted, emomMode);

    document.getElementById('emom-form').reset();
    document.getElementById('emom-minute-slots').innerHTML = '';
    addMinuteSlot();
    document.getElementById('emom-score-preview').textContent = '—';
    updateEmomDurationDisplay();
    showFeedback('EMOM workout saved!', 'emerald', 'emomFeedback');
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('EMOM submission failed', err.code, err.message);
    if (err.code === 'permission-denied') {
      showFeedback('Save blocked by Firestore rules.', 'red', 'emomFeedback');
    } else {
      alert(`Failed to save workout: ${err.message}`);
    }
  }
}

async function generateEmomContributions(workoutId, minutes, minutesCompleted, mode) {
  const now = Date.now();
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
      workoutId, movement, now,
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
  // Toggle required on time inputs so HTML5 validation doesn't block submit
  ['fortime-minutes', 'fortime-seconds'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.toggleAttribute('required', !dnf);
  });
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
    preview.textContent = capReps > 0 ? `Cap ${capReps}` : 'DNF';
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

async function submitForTimeWorkout(e) {
  e.preventDefault();
  if (!currentUser) return alert('Please sign in first.');

  const timeCap = parseInt(document.getElementById('fortime-cap').value, 10) || 0;
  const rounds = parseInt(document.getElementById('fortime-rounds').value, 10);
  const dnf = document.getElementById('fortime-dnf').checked;
  const remainingReps = dnf ? (parseInt(document.getElementById('fortime-cap-reps').value, 10) || 0) : 0;
  const resultMins = dnf ? 0 : (parseInt(document.getElementById('fortime-minutes').value, 10) || 0);
  const resultSecs = dnf ? 0 : (parseInt(document.getElementById('fortime-seconds').value, 10) || 0);

  let movements;
  try {
    movements = getMovementData('#fortime-movement-list .movement-row');
  } catch (err) {
    return showFeedback(err.message, 'red', 'fortimeFeedback');
  }

  if (!rounds || rounds < 1) return showFeedback('Enter a valid round count.', 'red', 'fortimeFeedback');
  if (movements.length === 0) return showFeedback('Add at least one movement.', 'red', 'fortimeFeedback');
  if (resultSecs > 59) return showFeedback('Seconds must be 0–59.', 'red', 'fortimeFeedback');
  if (!dnf && (resultMins < 0 || resultSecs < 0)) return showFeedback('Enter a valid time.', 'red', 'fortimeFeedback');

  const now = Date.now();
  const timeSeconds = dnf ? 0 : resultMins * 60 + resultSecs;

  const workoutDoc = {
    userId: currentUser.uid,
    name: timeCap ? `${timeCap} Min For Time` : `For Time`,
    type: 'FOR_TIME',
    structure: {
      durationMinutes: timeCap || null,
      movements,
      rounds
    },
    result: {
      timeSeconds,
      completed: !dnf,
      ...(dnf && { remainingReps })
    },
    scoreDisplay: dnf ? `Cap ${remainingReps}` : formatScore_TIME_SECONDS(timeSeconds),
    scoreType: 'TIME_SECONDS',
    scoreValue: dnf ? remainingReps : timeSeconds,
    timestamp: now
  };

  try {
    const docRef = await addDoc(collection(db, "structured_workouts"), workoutDoc);
    await generateForTimeContributions(docRef.id, movements, rounds, remainingReps);

    document.getElementById('for-time-form').reset();
    document.getElementById('fortime-movement-list').innerHTML = '';
    addMovementRow('fortime-movement-list');
    toggleForTimeDnf();
    document.getElementById('fortime-score-preview').textContent = '—';
    showFeedback('For Time workout saved!', 'emerald', 'fortimeFeedback');
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('FOR_TIME submission failed', err.code, err.message);
    if (err.code === 'permission-denied') {
      showFeedback('Save blocked by Firestore rules.', 'red', 'fortimeFeedback');
    } else {
      alert(`Failed to save workout: ${err.message}`);
    }
  }
}

async function generateForTimeContributions(workoutId, movements, rounds, remainingReps = 0) {
  const now = Date.now();
  const repsPerRound = movements.reduce((sum, m) => sum + (m.reps || 0), 0);
  const totalPlanned = repsPerRound * rounds;
  const totalCompleted = Math.max(0, totalPlanned - remainingReps);
  const fullRounds = Math.floor(repsPerRound > 0 ? totalCompleted / repsPerRound : 0);
  let partialRoundReps = totalCompleted % (repsPerRound || 1);

  for (const movement of movements) {
    if (getExerciseInfo(movement.exerciseId).category === 'cardio') continue;
    const movementPartialReps = Math.min(movement.reps, partialRoundReps);
    partialRoundReps = Math.max(0, partialRoundReps - movement.reps);
    const performedReps = movement.reps * fullRounds + movementPartialReps;
    if (performedReps <= 0) continue;

    const effectiveSets = fullRounds + (movementPartialReps === movement.reps ? 1 : 0);
    const displayPartialReps = movementPartialReps < movement.reps ? movementPartialReps : 0;

    const extraFields = {};
    if (displayPartialReps > 0) extraFields.partialReps = displayPartialReps;

    await writeStructuredLogEntry({
      workoutId, movement, now,
      sets: effectiveSets,
      totalReps: performedReps,
      extraFields
    });
  }
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

async function submitIntervalWorkout(e) {
  e.preventDefault();
  if (!currentUser) return alert('Please sign in first.');

  const rounds = parseInt(document.getElementById('interval-rounds').value, 10);
  const workMin = parseInt(document.getElementById('interval-work-min').value, 10) || 0;
  const restMin = parseInt(document.getElementById('interval-rest-min').value, 10) || 0;
  const roundsCompleted = parseInt(document.getElementById('interval-rounds-completed').value, 10);
  const partialReps = parseInt(document.getElementById('interval-partial-reps').value, 10) || 0;

  let movements;
  try {
    movements = getMovementData('#interval-movement-list .movement-row');
  } catch (err) {
    return showFeedback(err.message, 'red', 'intervalFeedback');
  }

  if (!rounds || rounds < 1) return showFeedback('Enter a valid round count.', 'red', 'intervalFeedback');
  if (roundsCompleted < 0) return showFeedback('Enter rounds completed.', 'red', 'intervalFeedback');
  if (movements.length === 0) return showFeedback('Add at least one movement.', 'red', 'intervalFeedback');

  const now = Date.now();
  const workSeconds = workMin * 60;
  const restSeconds = restMin * 60;

  const workoutDoc = {
    userId: currentUser.uid,
    name: `${workMin}:${restMin} × ${rounds} INTERVAL`,
    type: 'INTERVAL',
    structure: {
      rounds,
      workSeconds,
      restSeconds,
      movements
    },
    result: {
      roundsCompleted,
      partialReps,
      completed: roundsCompleted >= rounds
    },
    scoreDisplay: formatScore_ROUNDS_AND_REPS(roundsCompleted, partialReps),
    scoreType: 'ROUNDS_AND_REPS',
    scoreValue: roundsCompleted * 1000 + partialReps,
    timestamp: now
  };

  try {
    const docRef = await addDoc(collection(db, "structured_workouts"), workoutDoc);
    await generateIntervalContributions(docRef.id, movements, roundsCompleted, partialReps);

    document.getElementById('interval-form').reset();
    document.getElementById('interval-movement-list').innerHTML = '';
    addMovementRow('interval-movement-list');
    document.getElementById('interval-score-preview').textContent = '—';
    showFeedback('Interval workout saved!', 'emerald', 'intervalFeedback');
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('INTERVAL submission failed', err.code, err.message);
    if (err.code === 'permission-denied') {
      showFeedback('Save blocked by Firestore rules.', 'red', 'intervalFeedback');
    } else {
      alert(`Failed to save workout: ${err.message}`);
    }
  }
}

async function generateIntervalContributions(workoutId, movements, roundsCompleted, partialReps = 0) {
  const now = Date.now();
  let remainingPartial = partialReps;

  for (let i = 0; i < movements.length; i++) {
    const movement = movements[i];
    if (getExerciseInfo(movement.exerciseId).category === 'cardio') continue;
    const movementPartialReps = Math.min(movement.reps, remainingPartial);
    remainingPartial = Math.max(0, remainingPartial - movement.reps);
    const totalRepsPerMovement = movement.reps * roundsCompleted + movementPartialReps;
    if (totalRepsPerMovement <= 0) continue;

    const effectiveSets = roundsCompleted + (movementPartialReps === movement.reps ? 1 : 0);
    const displayPartialReps = movementPartialReps < movement.reps ? movementPartialReps : 0;

    const extraFields = {};
    if (displayPartialReps > 0) extraFields.partialReps = displayPartialReps;

    await writeStructuredLogEntry({
      workoutId, movement, now,
      sets: effectiveSets,
      totalReps: totalRepsPerMovement,
      extraFields
    });
  }
}

// ==========================================
// WORKOUT CONSISTENCY SYSTEM
// ==========================================

async function computeAndSyncDailyActivity() {
    if (!currentUser) return;
    
    const allTimestamps = [];
    lastWorkouts.forEach(w => allTimestamps.push(w.timestamp));
    lastStructuredWorkouts.forEach(sw => allTimestamps.push(sw.timestamp));
    
    const activeDates = new Set();
    allTimestamps.forEach(ts => {
        const d = new Date(ts);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        activeDates.add(dateStr);
    });
    
    window.__irontrackActiveDates = activeDates;
    
    const writes = [];
    activeDates.forEach(dateStr => {
        writes.push(setDoc(doc(db, "daily_activity", `${currentUser.uid}_${dateStr}`), {
            userId: currentUser.uid,
            date: dateStr,
            hasWorkout: true,
            totalDuration: 0
        }, { merge: true }));
    });
    
    try {
        await Promise.all(writes);
    } catch (e) {
        if (e.code !== 'permission-denied') console.error('Daily activity sync error', e);
    }
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
    const activeDates = window.__irontrackActiveDates || new Set();
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
    const day0 = userBiometrics?.day0TrainingDays || { monthly: 0, yearly: 0, lifetime: 0 };

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
    const monthly = { completedPeriods: [...userChallengeStreaks.monthly.completedPeriods], currentStreak: 0, bestStreak: userChallengeStreaks.monthly.bestStreak || 0 };
    const yearly = { completedPeriods: [...userChallengeStreaks.yearly.completedPeriods], currentStreak: 0, bestStreak: userChallengeStreaks.yearly.bestStreak || 0 };

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

    userChallengeStreaks = { monthly, yearly };

    renderStreakUI(monthly.currentStreak, yearly.currentStreak);

    if (updated) {
        try {
            await setDoc(doc(db, "profiles", currentUser.uid), { challengeStreaks: userChallengeStreaks }, { merge: true });
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

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('cal-month-label');
    if (!grid || !label) return;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const activeDates = window.__irontrackActiveDates || new Set();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let html = '';

    if (calendarCompact) {
        const monday = getMonday(today);
        monday.setDate(monday.getDate() + calendarWeekOffset * 7);
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
            const isSelected = calendarSelectedDate === dateStr;
            const isThisMonth = date.getMonth() === calendarMonth.getMonth() && date.getFullYear() === calendarMonth.getFullYear();

            if (isThisMonth) {
                let cls = 'cal-day';
                if (isActive) cls += ' cal-day-active';
                if (isToday) cls += ' cal-day-today';
                if (isSelected) cls += ' cal-day-selected';
                html += `<div class="${cls}" onclick="selectCalendarDay('${dateStr}')" data-date="${dateStr}">${date.getDate()}</div>`;
            } else {
                html += `<div class="cal-day cal-day-other-month">${date.getDate()}</div>`;
            }
        }
    } else {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();

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
            const isSelected = calendarSelectedDate === dateStr;

            let cls = 'cal-day';
            if (isActive) cls += ' cal-day-active';
            if (isToday) cls += ' cal-day-today';
            if (isSelected) cls += ' cal-day-selected';

            html += `<div class="${cls}" onclick="selectCalendarDay('${dateStr}')" data-date="${dateStr}">${day}</div>`;
        }

        const totalCells = startDay + daysInMonth;
        const remainingCells = (7 - (totalCells % 7)) % 7;
        for (let i = 0; i < remainingCells; i++) {
            html += '<div class="cal-day cal-day-empty"></div>';
        }
    }

    grid.innerHTML = html;
}

function updateConsistencyMetrics() {
    const activeDates = window.__irontrackActiveDates || new Set();
    const today = new Date();
    
    function countActiveDays(daysBack) {
        let count = 0;
        for (let i = 0; i < daysBack; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (activeDates.has(dateStr)) count++;
        }
        return count;
    }
    
    function countConsecutiveDays() {
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
    
    const el7 = document.getElementById('consistency-7day');
    const el28 = document.getElementById('consistency-28day');
    const bar7 = document.getElementById('consistency-7day-bar');
    const bar28 = document.getElementById('consistency-28day-bar');
    const streak7 = document.getElementById('consistency-7day-streak');
    const streak28 = document.getElementById('consistency-28day-streak');
    
    const d7 = countActiveDays(7);
    const d28 = countActiveDays(28);
    
    if (el7) el7.textContent = `${d7} / 7`;
    if (el28) el28.textContent = `${d28} / 28`;
    if (bar7) bar7.style.width = `${Math.min(100, (d7 / 7) * 100)}%`;
    if (bar28) bar28.style.width = `${Math.min(100, (d28 / 28) * 100)}%`;
    
    const streak = countConsecutiveDays();
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
    
    lastWorkouts.forEach(addIfMatches);
    lastStructuredWorkouts.forEach(addIfMatches);
    
    results.sort((a, b) => a.timestamp - b.timestamp);
    return results;
}

function selectCalendarDay(dateStr) {
    calendarSelectedDate = dateStr;
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
        workoutsContainer.innerHTML = '<p class="text-xs text-slate-500 italic">No workouts logged this day.</p>';
        return;
    }
    
    workoutsContainer.innerHTML = items.map(item => {
        if (item.type) {
            const badgeClass = (item.type || '').toLowerCase();
            return `
<div class="bg-slate-900 border border-slate-700 rounded-xl p-2.5">
    <div class="flex justify-between items-center">
        <span class="workout-type-badge ${badgeClass}">${escapeHtml(item.type)}</span>
        <span class="text-emerald-400 font-bold font-mono text-xs">${escapeHtml(item.scoreDisplay || '—')}</span>
    </div>
    <p class="text-xs text-slate-300 font-bold mt-1">${escapeHtml(item.name || '')}</p>
</div>`;
        } else {
            const load = getEffectiveLoad(item);
            const reps = parseInt(item.reps, 10) || 1;
            const sets = item.sets || 1;
            const oneRM = Math.round(load * (1 + reps / 30));
            const repDisplay = item.partialReps ? `${sets} × ${reps} + ${item.partialReps} reps` : `${sets} × ${reps}`;
            return `
<div class="bg-slate-900 border border-slate-700 rounded-xl p-2.5">
    <div class="flex justify-between items-center">
        <span class="text-emerald-300 font-bold text-xs uppercase tracking-wider">${escapeHtml(item.exercise)}</span>
        <span class="text-slate-200 font-mono text-xs">${repDisplay} @ ${Math.round(load)}kg</span>
    </div>
    <p class="text-slate-500 text-[10px] font-mono mt-0.5">Est. 1RM: ${oneRM}kg</p>
</div>`;
        }
    }).join('');
}

function changeCalendarNav(delta) {
    if (calendarCompact) {
        calendarWeekOffset += delta;
        const monday = getMonday(new Date());
        monday.setDate(monday.getDate() + calendarWeekOffset * 7);
        calendarMonth = new Date(monday);
    } else {
        calendarMonth.setMonth(calendarMonth.getMonth() + delta);
    }
    renderCalendar();
}

function toggleCalendarView() {
    calendarCompact = !calendarCompact;
    if (calendarCompact) {
        calendarWeekOffset = 0;
        const monday = getMonday(new Date());
        calendarMonth = new Date(monday);
    } else {
        const monday = getMonday(new Date());
        monday.setDate(monday.getDate() + calendarWeekOffset * 7);
        calendarMonth = new Date(monday);
    }
    const btn = document.getElementById('cal-toggle-view');
    if (btn) btn.textContent = calendarCompact ? 'Show Full Month' : 'Show Current Week';
    renderCalendar();
}

function closeCalendarDayDetail() {
    calendarSelectedDate = null;
    const detail = document.getElementById('cal-day-detail');
    if (detail) detail.classList.add('hidden');
    renderCalendar();
}

function listenToStructuredWorkouts(uid) {
  const q = query(
    collection(db, "structured_workouts"),
    where("userId", "==", uid),
    orderBy("timestamp", "desc"),
    limit(100)
  );
  unsubscribeStructured = onSnapshot(q, (snapshot) => {
    const workouts = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const timestamp = data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp;
      workouts.push({ id: doc.id, ...data, timestamp });
    });
    lastStructuredWorkouts = workouts;
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

function renderStructuredWorkoutCard(sw) {
  const type = sw.type || 'AMRAP';
  const badgeClass = type.toLowerCase();
  let durationLabel = '';
  let scoreLabel = '';
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
    durationLabel = `${sw.structure?.durationMinutes || 0} min`;
    const intSec = sw.structure?.intervalSeconds;
    if (intSec && intSec !== 60) {
      durationLabel += ` · ${intSec}s interval`;
    }
    scoreLabel = 'rounds completed';
  } else if (type === 'FOR_TIME') {
    const movements = sw.structure?.movements || [];
    movementsHtml = movements.map(m => {
      return `<span class="movement-chip">${escapeHtml(m.exerciseId)} × ${m.reps}${formatMovementLoad(m)}</span>`;
    }).join('');
    const cap = sw.structure?.durationMinutes;
    durationLabel = cap ? `${cap} min cap` : '';
    const rounds = sw.structure?.rounds;
    const rdLabel = rounds ? ` · ${rounds} rds` : '';
    durationLabel += rdLabel;
    scoreLabel = sw.result?.completed === false ? 'cap reps' : 'time';
  } else if (type === 'INTERVAL') {
    const movements = sw.structure?.movements || [];
    movementsHtml = movements.map(m => {
      return `<span class="movement-chip">${escapeHtml(m.exerciseId)} × ${m.reps}${formatMovementLoad(m)}</span>`;
    }).join('');
    const ws = sw.structure?.workSeconds || 0;
    const rs = sw.structure?.restSeconds || 0;
    const wrk = `${Math.floor(ws / 60)}:${(ws % 60).toString().padStart(2, '0')}`;
    const rst = `${Math.floor(rs / 60)}:${(rs % 60).toString().padStart(2, '0')}`;
    const rds = sw.structure?.rounds || 0;
    durationLabel = `${wrk} / ${rst} × ${rds}`;
    scoreLabel = 'rounds + reps';
  } else {
    const movements = sw.structure?.movements || [];
    movementsHtml = movements.map(m => {
      return `<span class="movement-chip">${escapeHtml(m.exerciseId)} × ${m.reps}${formatMovementLoad(m)}</span>`;
    }).join('');
    const durationMin = Math.round((sw.structure?.durationSeconds || 0) / 60);
    durationLabel = `${durationMin} min`;
    scoreLabel = 'rounds + reps';
  }

  const dateStr = new Date(sw.timestamp).toLocaleDateString();

  const hasMovements = movementsHtml.trim().length > 0;
  const isFav = sw.favorite === true;
  const starIcon = isFav ? '\u2605' : '\u2606';
  const starClass = isFav ? 'text-yellow-400' : 'text-slate-500';

  return `
<div class="structured-card p-4 rounded-2xl mb-3 shadow-2xl shadow-slate-950/60 transition-all duration-200" style="background-color: var(--slate-900);">
    <div class="flex justify-between items-start mb-2${hasMovements ? ' structured-header-clickable' : ''}"${hasMovements ? ` onclick="toggleWorkoutCard(this)"` : ''}>
      <div>
        <h4 class="text-emerald-300 font-bold uppercase tracking-wider text-sm">${escapeHtml(sw.name)}</h4>
        <p class="text-slate-500 text-[10px] font-mono mt-0.5">${dateStr} · ${durationLabel}</p>
        <span class="workout-type-badge ${badgeClass}">${escapeHtml(type)}</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="text-right">
          <div class="score-display">${escapeHtml(sw.scoreDisplay || '—')}</div>
          <p class="text-slate-500 text-[10px] font-mono mt-0.5">${scoreLabel}</p>
        </div>
        ${hasMovements ? '<span class="toggle-arrow">\u25BE</span>' : ''}
        <button type="button" onclick="event.stopPropagation();toggleStructuredFavorite('${sw.id}')" class="text-lg leading-none ${starClass} hover:text-yellow-400 transition-colors p-1" title="Favorite">${starIcon}</button>
      </div>
    </div>
    <div class="flex flex-wrap gap-1.5 mt-2 structured-movements${hasMovements ? ' hidden' : ''}">
      ${movementsHtml}
      ${hasMovements ? `<div class="mt-3 w-full flex justify-end"><button type="button" onclick="redoWorkout('${sw.id}')" class="btn-core is-secondary btn-size-row"><i data-lucide="upload" size="14"></i></button></div>` : ''}
    </div>
</div>
  `;
}

function toggleWorkoutCard(headerEl) {
    const card = headerEl.closest('.structured-card');
    const movements = card.querySelector('.structured-movements');
    const arrow = card.querySelector('.toggle-arrow');
    if (!movements || !arrow) return;
    movements.classList.toggle('hidden');
    arrow.classList.toggle('rotated');
}

function renderStructuredWorkoutHistory() {
  const container = document.getElementById('structured-workout-list');
  const pagination = document.getElementById('structured-pagination');
  if (!container) return;

  const workouts = lastStructuredWorkouts;

  if (!workouts.length) {
    container.innerHTML = '<p class="text-xs text-slate-500 italic py-2 text-center">No structured workouts logged yet.</p>';
    if (pagination) pagination.classList.add('hidden');
    return;
  }

  const perPage = 3;
  const totalPages = Math.max(1, Math.ceil(workouts.length / perPage));
  structuredCurrentPage = Math.min(structuredCurrentPage, totalPages);
  const start = (structuredCurrentPage - 1) * perPage;
  const pageItems = workouts.slice(start, start + perPage);

  container.innerHTML = pageItems.map(renderStructuredWorkoutCard).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();

  if (pagination) {
    const currentEl = document.getElementById('current-structured-page');
    const totalEl = document.getElementById('total-structured-pages');
    const prevBtn = document.getElementById('prev-structured-page-btn');
    const nextBtn = document.getElementById('next-structured-page-btn');
    if (currentEl) currentEl.textContent = structuredCurrentPage;
    if (totalEl) totalEl.textContent = totalPages;
    if (prevBtn) prevBtn.disabled = structuredCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = structuredCurrentPage >= totalPages;
    pagination.classList.toggle('hidden', totalPages <= 1);
  }
}

function changeStructuredPage(direction) {
  const totalPages = Math.max(1, Math.ceil(lastStructuredWorkouts.length / 3));
  if (direction === 'prev' && structuredCurrentPage > 1) {
    structuredCurrentPage--;
  } else if (direction === 'next' && structuredCurrentPage < totalPages) {
    structuredCurrentPage++;
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
    lastWorkoutPlans = plans;
    renderPlansUI();
    if (plansFilter === 'favorites') renderSharedPlansUI();
  }, (error) => {
    console.error('Plans stream error', error.code, error.message);
  });
}

function renderPlansUI() {
  const container = document.getElementById('saved-plans-inline');
  const pagination = document.getElementById('plans-pagination');
  if (!container) return;

  if (!lastWorkoutPlans.length) {
    container.innerHTML = '<p class="text-xs text-slate-500 italic py-2 text-center">No saved plans yet.</p>';
    if (pagination) pagination.classList.add('hidden');
    return;
  }

  const perPage = 3;
  const totalPages = Math.max(1, Math.ceil(lastWorkoutPlans.length / perPage));
  plansCurrentPage = Math.min(plansCurrentPage, totalPages);
  const start = (plansCurrentPage - 1) * perPage;
  const pageItems = lastWorkoutPlans.slice(start, start + perPage);

  container.innerHTML = pageItems.map(plan => renderPlanCard(plan)).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();

  if (pagination) {
    const currentEl = document.getElementById('current-plans-page');
    const totalEl = document.getElementById('total-plans-pages');
    const prevBtn = document.getElementById('prev-plans-page-btn');
    const nextBtn = document.getElementById('next-plans-page-btn');
    if (currentEl) currentEl.textContent = plansCurrentPage;
    if (totalEl) totalEl.textContent = totalPages;
    if (prevBtn) prevBtn.disabled = plansCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = plansCurrentPage >= totalPages;
    pagination.classList.toggle('hidden', totalPages <= 1);
  }
}

function switchPlansFilter(filter) {
  plansFilter = filter;
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
  const totalPages = Math.max(1, Math.ceil(lastWorkoutPlans.length / 3));
  if (direction === 'prev' && plansCurrentPage > 1) {
    plansCurrentPage--;
  } else if (direction === 'next' && plansCurrentPage < totalPages) {
    plansCurrentPage++;
  }
  renderPlansUI();
}

function renderPlanCard(plan) {
  const type = plan.type || 'AMRAP';
  const badgeClass = type.toLowerCase();
  const dateStr = new Date(plan.createdAt).toLocaleDateString();

  function formatLoad(m) {
    if (m.weightMode === 'rpe' && m.rpe) {
      return ` @ RPE ${m.rpe}`;
    }
    if (m.weightMode === 'pct' && m.pct) {
      return ` @ ${Math.round(m.pct)}%`;
    }
    return m.weight ? ` @ ${m.weight}kg` : '';
  }

  let movementsHtml = '';
  const structure = plan.structure || {};

  if (type === 'EMOM') {
    const minutes = structure.minutes || [];
    movementsHtml = minutes.map((m, idx) => {
      const mov = m.movements?.[0];
      if (!mov) return '';
      return `<span class="movement-chip">${idx + 1}: ${escapeHtml(mov.exerciseId)} \u00D7 ${mov.reps}${formatLoad(mov)}</span>`;
    }).join('');
  } else {
    const movements = structure.movements || [];
    movementsHtml = movements.map(m => {
      return `<span class="movement-chip">${escapeHtml(m.exerciseId)} \u00D7 ${m.reps}${formatLoad(m)}</span>`;
    }).join('');
  }

  const hasMovements = movementsHtml.trim().length > 0;
  const isFav = plan.favorite === true;
  const starIcon = isFav ? '\u2605' : '\u2606';
  const starClass = isFav ? 'text-yellow-400' : 'text-slate-500';

  return `
<div class="structured-card p-4 rounded-2xl mb-3 shadow-2xl shadow-slate-950/60 transition-all duration-200" style="background-color: var(--slate-900);">
    <div class="flex justify-between items-start mb-2${hasMovements ? ' structured-header-clickable' : ''}"${hasMovements ? ` onclick="toggleWorkoutCard(this)"` : ''}>
      <div>
        <h4 class="text-emerald-300 font-bold uppercase tracking-wider text-sm">${escapeHtml(plan.name)}</h4>
        <p class="text-slate-500 text-[10px] font-mono mt-0.5">${dateStr}</p>
        <span class="workout-type-badge ${badgeClass}">${escapeHtml(type)}</span>
      </div>
      <div class="flex items-center gap-2">
        ${hasMovements ? '<span class="toggle-arrow">\u25BE</span>' : ''}
        <button type="button" onclick="event.stopPropagation();togglePlanFavorite('${plan.id}')" class="text-lg leading-none ${starClass} hover:text-yellow-400 transition-colors p-1" title="Favorite">${starIcon}</button>
      </div>
    </div>
    <div class="flex flex-wrap gap-1.5 mt-2 structured-movements${hasMovements ? ' hidden' : ''}">
      ${movementsHtml}
      ${hasMovements ? `<div class="flex gap-2 mt-3 w-full">
        <button type="button" onclick="loadPlan('${plan.id}')" class="btn-core is-secondary btn-size-row"><i data-lucide="upload" size="14"></i></button>
        <button type="button" onclick="openShareModal('${plan.id}')" class="btn-core is-secondary btn-size-row"><i data-lucide="share-2" size="14"></i></button>
        <button type="button" onclick="deletePlan('${plan.id}')" class="btn-core is-ghost btn-size-row"><i data-lucide="trash-2" size="14"></i></button>
      </div>` : ''}
    </div>
</div>`;
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

function loadPlan(planId) {
  const plan = lastWorkoutPlans.find(p => p.id === planId);
  if (!plan) return;

  switchWorkoutMode('workout');

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

  const recordCard = document.getElementById('record-training-card');
  if (recordCard) recordCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showFeedback(`Plan "${plan.name}" loaded!`, 'emerald', `${plan.type.toLowerCase()}Feedback`);
  haptic(HAPTIC.tap);
}

function redoWorkout(workoutId) {
  const sw = lastStructuredWorkouts.find(w => w.id === workoutId);
  if (!sw) return;

  switchWorkoutMode('workout');

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

  const recordCard = document.getElementById('record-training-card');
  if (recordCard) recordCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showFeedback(`Workout "${sw.name}" loaded for redo!`, 'emerald', `${sw.type.toLowerCase()}Feedback`);
  haptic(HAPTIC.tap);
}

// ── Share Plan with Friend ──

let sharePlanId = null;
let shareMode = 'friends'; // 'friends' | 'qr'

function switchShareMode(mode) {
  shareMode = mode;
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

async function openShareModal(planId) {
  const modal = document.getElementById('share-plan-modal');
  const list = document.getElementById('share-friend-list');
  const feedback = document.getElementById('share-plan-feedback');
  if (!modal || !list) return;

  sharePlanId = planId;
  feedback.textContent = '';

  switchShareMode('qr');
  document.getElementById('share-qr-display').innerHTML = '';
  document.getElementById('share-select-all-container').classList.add('hidden');
  if (!userFriendsList.length) {
    list.innerHTML = '<p class="text-xs text-slate-500 italic text-center py-2">No friends linked yet. Add friends in the Friends section first.</p>';
    modal.classList.remove('hidden');
    return;
  }

  const friendDocs = await Promise.allSettled(
    userFriendsList.filter(fUid => !friendDisplayCache[fUid]).map(fUid => getProfileDocument(fUid))
  );
  friendDocs.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.exists()) {
      const uid = userFriendsList.filter(fUid => !friendDisplayCache[fUid])[i];
      if (uid) friendDisplayCache[uid] = result.value.data();
    }
  });

  document.getElementById('share-select-all-container').classList.remove('hidden');
  document.getElementById('share-select-all').checked = false;

  let html = '';
  userFriendsList.forEach((fUid) => {
    const fDoc = friendDisplayCache[fUid];
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

async function shareWithFriends() {
  const modal = document.getElementById('share-plan-modal');
  const feedback = document.getElementById('share-plan-feedback');
  const checked = document.querySelectorAll('.share-friend-checkbox:checked');
  if (!checked.length) {
    feedback.textContent = 'Select at least one friend.';
    return;
  }

  const plan = lastWorkoutPlans.find(p => p.id === sharePlanId);
  if (!plan) {
    feedback.textContent = 'Plan not found.';
    return;
  }

  const selectedUids = Array.from(checked).map(cb => cb.value);
  const sharerSnap = await getDoc(getProfileDocRef(currentUser.uid));
  const sharerData = sharerSnap.exists() ? sharerSnap.data() : {};
  const displayName = sharerData.displayName || currentUser?.email?.split('@')[0] || 'Unknown';

  try {
    await Promise.all(selectedUids.map(fUid =>
      addDoc(collection(db, "shared_plans"), {
        sharedBy: currentUser.uid,
        sharedByDisplayName: displayName,
        sharedWith: fUid,
        planId: plan.id,
        contentType: 'plan',
        content: {
          name: plan.name,
          type: plan.type,
          structure: plan.structure
        },
        status: 'pending',
        createdAt: serverTimestamp()
      })
    ));
    modal.classList.add('hidden');
    showFeedback(`Plan shared with ${selectedUids.length} friend${selectedUids.length > 1 ? 's' : ''}!`, 'emerald');
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

  const plan = lastWorkoutPlans.find(p => p.id === sharePlanId);
  if (!plan) {
    feedback.textContent = 'Plan not found.';
    return;
  }

  const sharerSnap = await getDoc(getProfileDocRef(currentUser.uid));
  const sharerData = sharerSnap.exists() ? sharerSnap.data() : {};
  const displayName = sharerData.displayName || currentUser?.email?.split('@')[0] || 'Unknown';

  try {
    const existing = await getDocs(query(
      collection(db, "shared_plans"),
      where("sharedBy", "==", currentUser.uid),
      where("planId", "==", plan.id),
      where("shareMethod", "==", "qr")
    ));

    let docRef;
    if (!existing.empty) {
      docRef = existing.docs[0].ref;
      await updateDoc(docRef, { createdAt: serverTimestamp() });
    } else {
      docRef = await addDoc(collection(db, "shared_plans"), {
        sharedBy: currentUser.uid,
        sharedByDisplayName: displayName,
        sharedWith: '__qr__',
        shareMethod: 'qr',
        planId: plan.id,
        createdAt: serverTimestamp()
      });
    }

    const base = window.location.pathname.replace(/\/?[^\/]*$/, '/');
    const qrUrl = window.location.origin + base + '?claimPlan=' + docRef.id;
    qrDisplay.innerHTML = '';
    const qrConfig = {
      type: "canvas",
      shape: "square",
      width: 300,
      height: 300,
      data: qrUrl,
      margin: 0,
      qrOptions: { typeNumber: 0, mode: "Byte", errorCorrectionLevel: "Q" },
      imageOptions: { saveAsBlob: true, hideBackgroundDots: true, imageSize: 0.4, margin: 0 },
      dotsOptions: { type: "dots", color: "#f8fafc", roundSize: true, gradient: null },
      backgroundOptions: { round: 0, color: "#0f172a" },
      cornersSquareOptions: { type: "extra-rounded", color: "#34d399" },
      cornersDotOptions: { type: "", color: "#f8fafc" }
    };
    const qrCode = new QRCodeStyling(qrConfig);
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
    lastSharedPlans = plans;
    if (plansFilter === 'shared' || plansFilter === 'favorites') {
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

  let items = [];
  if (plansFilter === 'favorites') {
    const favoritedOwn = lastWorkoutPlans.filter(p => p.favorite === true).map(p => ({ type: 'own', plan: p }));
    const favoritedShared = lastSharedPlans.filter(s => s.favorite === true).map(s => ({ type: 'shared', share: s }));
    const favoritedStructured = lastStructuredWorkouts.filter(w => w.favorite === true).map(w => ({ type: 'structured', structured: w }));
    items = [...favoritedOwn, ...favoritedShared, ...favoritedStructured];
    items.sort((a, b) => {
      const aDate = a.type === 'own' ? a.plan.createdAt : a.type === 'shared' ? a.share.createdAt : a.structured.timestamp;
      const bDate = b.type === 'own' ? b.plan.createdAt : b.type === 'shared' ? b.share.createdAt : b.structured.timestamp;
      return (bDate || 0) - (aDate || 0);
    });
  } else {
    items = lastSharedPlans.map(s => ({ type: 'shared', share: s }));
  }

  if (!items.length) {
    const msg = plansFilter === 'favorites'
      ? '<p class="text-xs text-slate-500 italic py-2 text-center">No favorited plans yet. Star a plan to add it here.</p>'
      : '<p class="text-xs text-slate-500 italic py-2 text-center">No shared plans yet.</p>';
    container.innerHTML = msg;
    if (pagination) pagination.classList.add('hidden');
    return;
  }

  const perPage = 3;
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  sharedPlansPage = Math.min(sharedPlansPage, totalPages);
  const start = (sharedPlansPage - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);

  container.innerHTML = pageItems.map(item => {
    return item.type === 'own' ? renderPlanCard(item.plan) : item.type === 'shared' ? renderSharedPlanCard(item.share) : renderStructuredWorkoutCard(item.structured);
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();

  if (pagination) {
    const currentEl = document.getElementById('current-shared-plans-page');
    const totalEl = document.getElementById('total-shared-plans-pages');
    const prevBtn = document.getElementById('prev-shared-plans-page-btn');
    const nextBtn = document.getElementById('next-shared-plans-page-btn');
    if (currentEl) currentEl.textContent = sharedPlansPage;
    if (totalEl) totalEl.textContent = totalPages;
    if (prevBtn) prevBtn.disabled = sharedPlansPage <= 1;
    if (nextBtn) nextBtn.disabled = sharedPlansPage >= totalPages;
    pagination.classList.toggle('hidden', totalPages <= 1);
  }
}

function renderSharedPlanCard(share) {
  const type = share.content?.type || 'AMRAP';
  const badgeClass = type.toLowerCase();
  const dateStr = share.createdAt ? new Date(share.createdAt).toLocaleDateString() : '';
  const movements = share.content?.structure?.movements || [];
  const movementsHtml = movements.map(m =>
    `<span class="movement-chip">${escapeHtml(m.exerciseId)} \u00D7 ${m.reps}${m.weight ? ' @ ' + m.weight + 'kg' : ''}</span>`
  ).join('');

  const emomMinutes = share.content?.structure?.minutes || [];
  const emomHtml = emomMinutes.map((m, idx) => {
    const mov = m.movements?.[0];
    if (!mov) return '';
    return `<span class="movement-chip">${idx + 1}: ${escapeHtml(mov.exerciseId)} \u00D7 ${mov.reps}${mov.weight ? ' @ ' + mov.weight + 'kg' : ''}</span>`;
  }).join('');

  const isFav = share.favorite === true;
  const starIcon = isFav ? '\u2605' : '\u2606';
  const starClass = isFav ? 'text-yellow-400' : 'text-slate-500';

  const displayMovements = type === 'EMOM' ? emomHtml : movementsHtml;
  const hasMovements = displayMovements.trim().length > 0;

  return `
<div class="structured-card p-4 rounded-2xl mb-3 shadow-2xl shadow-slate-950/60 transition-all duration-200" style="background-color: var(--slate-900);">
    <div class="flex justify-between items-start mb-2${hasMovements ? ' structured-header-clickable' : ''}"${hasMovements ? ` onclick="toggleWorkoutCard(this)"` : ''}>
      <div>
        <h4 class="text-emerald-300 font-bold uppercase tracking-wider text-sm">${escapeHtml(share.content?.name || '')}</h4>
        <p class="text-slate-500 text-[10px] font-mono mt-0.5">Shared by ${escapeHtml(share.sharedByDisplayName || 'Unknown')} &middot; ${dateStr}</p>
        <span class="workout-type-badge ${badgeClass}">${escapeHtml(type)}</span>
      </div>
      <div class="flex items-center gap-2">
        ${hasMovements ? '<span class="toggle-arrow">\u25BE</span>' : ''}
        <button type="button" onclick="event.stopPropagation();toggleFavorite('${share.id}')" class="text-lg leading-none ${starClass} hover:text-yellow-400 transition-colors p-1" title="Favorite">${starIcon}</button>
      </div>
    </div>
    <div class="flex flex-wrap gap-1.5 mt-2 structured-movements${hasMovements ? ' hidden' : ''}">
      ${displayMovements}
      ${hasMovements ? `<div class="flex gap-2 mt-3 w-full">
        <button type="button" onclick="loadSharedPlan('${share.id}')" class="btn-core is-primary btn-size-row"><i data-lucide="upload" size="14"></i></button>
        <button type="button" onclick="dismissSharedPlan('${share.id}')" class="btn-core is-ghost btn-size-row"><i data-lucide="trash-2" size="14"></i></button>
      </div>` : ''}
    </div>
</div>`;
}

function changeSharedPlansPage(direction) {
  const totalPages = Math.max(1, Math.ceil(lastSharedPlans.length / 3));
  if (direction === 'prev' && sharedPlansPage > 1) {
    sharedPlansPage--;
  } else if (direction === 'next' && sharedPlansPage < totalPages) {
    sharedPlansPage++;
  }
  renderSharedPlansUI();
}

async function saveSharedPlanToMyPlans(shareId) {
  if (!currentUser) return;
  const share = lastSharedPlans.find(s => s.id === shareId);
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

async function toggleFavorite(shareId) {
  if (!currentUser) return;
  const share = lastSharedPlans.find(s => s.id === shareId);
  if (!share) return;
  const newVal = !(share.favorite === true);
  share.favorite = newVal;
  try {
    await updateDoc(doc(db, "shared_plans", shareId), { favorite: newVal });
    haptic(HAPTIC.tap);
  } catch (err) {
    share.favorite = !newVal;
    console.error('Toggle favorite failed', err.code, err.message);
  }
}

async function togglePlanFavorite(planId) {
  if (!currentUser) return;
  const plan = lastWorkoutPlans.find(p => p.id === planId);
  if (!plan) return;
  const newVal = !(plan.favorite === true);
  plan.favorite = newVal;
  try {
    await updateDoc(doc(db, "workout_plans", planId), { favorite: newVal });
    haptic(HAPTIC.tap);
    if (plansFilter === 'favorites') renderSharedPlansUI();
  } catch (err) {
    plan.favorite = !newVal;
    console.error('Toggle plan favorite failed', err.code, err.message);
  }
}

async function toggleStructuredFavorite(swId) {
  if (!currentUser) return;
  const sw = lastStructuredWorkouts.find(w => w.id === swId);
  if (!sw) return;
  const newVal = !(sw.favorite === true);
  sw.favorite = newVal;
  try {
    await updateDoc(doc(db, "structured_workouts", swId), { favorite: newVal });
    haptic(HAPTIC.tap);
    renderSharedPlansUI();
  } catch (err) {
    sw.favorite = !newVal;
    console.error('Toggle structured favorite failed', err.code, err.message);
  }
}

function loadSharedPlan(shareId) {
  const share = lastSharedPlans.find(s => s.id === shareId);
  if (!share) return;
  const plan = share.content;
  if (!plan) return;

  switchWorkoutMode('workout');

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

  const recordCard = document.getElementById('record-training-card');
  if (recordCard) recordCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showFeedback(`Plan "${plan.name}" loaded!`, 'emerald', `${plan.type.toLowerCase()}Feedback`);
  haptic(HAPTIC.tap);
}

function populateAmrapForm(structure) {
  if (structure.durationSeconds) {
    document.getElementById('amrap-duration').value = Math.round(structure.durationSeconds / 60);
  }
  const list = document.getElementById('movement-list');
  if (list) list.innerHTML = '';
  (structure.movements || []).forEach(m => addMovementRow('movement-list', m.exerciseId));
  setTimeout(() => {
    document.querySelectorAll('#movement-list .movement-row').forEach((row, i) => {
      const mov = structure.movements[i];
      if (!mov) return;
      const repsInput = row.querySelector('.movement-reps');
      const weightInput = row.querySelector('.movement-weight');
      const pill = row.querySelector('.wms-pill');
      const calcSpan = row.querySelector('.movement-calc');
      if (repsInput) repsInput.value = mov.reps;

      const setMode = (mode, value, placeholder) => {
        if (pill) { pill.dataset.mode = mode; updatePillActive(pill, mode); }
        if (weightInput) { weightInput.value = value; weightInput.placeholder = placeholder; }
        if (calcSpan) {
          if (mode === 'pct' || mode === 'rpe') {
            calcSpan.classList.remove('hidden');
            updateRowCalcDisplay(row);
          } else {
            calcSpan.classList.add('hidden');
          }
        }
      };

      if (mov.weightMode === 'rpe' && mov.rpe) {
        setMode('rpe', mov.rpe, 'RPE');
      } else if (mov.weightMode === 'pct' && mov.pct) {
        setMode('pct', mov.pct, '%');
      } else {
        setMode('absolute', mov.weight || '', 'Load');
      }
    });
  }, 0);
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
  if (slots) slots.innerHTML = '';
  (structure.minutes || []).forEach(m => {
    const mov = m.movements?.[0];
    addMinuteSlot(mov?.exerciseId);
  });
  setTimeout(() => {
    document.querySelectorAll('#emom-minute-slots .minute-row').forEach((row, i) => {
      const mov = structure.minutes?.[i]?.movements?.[0];
      if (!mov) return;
      const repsInput = row.querySelector('.movement-reps');
      const weightInput = row.querySelector('.movement-weight');
      const pill = row.querySelector('.wms-pill');
      const calcSpan = row.querySelector('.movement-calc');
      if (repsInput) repsInput.value = mov.reps;

      const setMode = (mode, value, placeholder) => {
        if (pill) { pill.dataset.mode = mode; updatePillActive(pill, mode); }
        if (weightInput) { weightInput.value = value; weightInput.placeholder = placeholder; }
        if (calcSpan) {
          if (mode === 'pct' || mode === 'rpe') {
            calcSpan.classList.remove('hidden');
            updateRowCalcDisplay(row);
          } else {
            calcSpan.classList.add('hidden');
          }
        }
      };

      if (mov.weightMode === 'rpe' && mov.rpe) {
        setMode('rpe', mov.rpe, 'RPE');
      } else if (mov.weightMode === 'pct' && mov.pct) {
        setMode('pct', mov.pct, '%');
      } else {
        setMode('absolute', mov.weight || '', 'Load');
      }
    });
  }, 0);
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
  const list = document.getElementById('fortime-movement-list');
  if (list) list.innerHTML = '';
  (structure.movements || []).forEach(m => addMovementRow('fortime-movement-list', m.exerciseId));
  setTimeout(() => {
    document.querySelectorAll('#fortime-movement-list .movement-row').forEach((row, i) => {
      const mov = structure.movements[i];
      if (!mov) return;
      const repsInput = row.querySelector('.movement-reps');
      const weightInput = row.querySelector('.movement-weight');
      const pill = row.querySelector('.wms-pill');
      const calcSpan = row.querySelector('.movement-calc');
      if (repsInput) repsInput.value = mov.reps;

      const setMode = (mode, value, placeholder) => {
        if (pill) { pill.dataset.mode = mode; updatePillActive(pill, mode); }
        if (weightInput) { weightInput.value = value; weightInput.placeholder = placeholder; }
        if (calcSpan) {
          if (mode === 'pct' || mode === 'rpe') {
            calcSpan.classList.remove('hidden');
            updateRowCalcDisplay(row);
          } else {
            calcSpan.classList.add('hidden');
          }
        }
      };

      if (mov.weightMode === 'rpe' && mov.rpe) {
        setMode('rpe', mov.rpe, 'RPE');
      } else if (mov.weightMode === 'pct' && mov.pct) {
        setMode('pct', mov.pct, '%');
      } else {
        setMode('absolute', mov.weight || '', 'Load');
      }
    });
  }, 0);
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
  const list = document.getElementById('interval-movement-list');
  if (list) list.innerHTML = '';
  (structure.movements || []).forEach(m => addMovementRow('interval-movement-list', m.exerciseId));
  setTimeout(() => {
    document.querySelectorAll('#interval-movement-list .movement-row').forEach((row, i) => {
      const mov = structure.movements[i];
      if (!mov) return;
      const repsInput = row.querySelector('.movement-reps');
      const weightInput = row.querySelector('.movement-weight');
      const pill = row.querySelector('.wms-pill');
      const calcSpan = row.querySelector('.movement-calc');
      if (repsInput) repsInput.value = mov.reps;

      const setMode = (mode, value, placeholder) => {
        if (pill) { pill.dataset.mode = mode; updatePillActive(pill, mode); }
        if (weightInput) { weightInput.value = value; weightInput.placeholder = placeholder; }
        if (calcSpan) {
          if (mode === 'pct' || mode === 'rpe') {
            calcSpan.classList.remove('hidden');
            updateRowCalcDisplay(row);
          } else {
            calcSpan.classList.add('hidden');
          }
        }
      };

      if (mov.weightMode === 'rpe' && mov.rpe) {
        setMode('rpe', mov.rpe, 'RPE');
      } else if (mov.weightMode === 'pct' && mov.pct) {
        setMode('pct', mov.pct, '%');
      } else {
        setMode('absolute', mov.weight || '', 'Load');
      }
    });
  }, 0);
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

async function saveAmrapPlan() {
  if (!currentUser) return alert('Please sign in first.');
  const durationMin = parseInt(document.getElementById('amrap-duration').value, 10);
  let movements;
  try {
    movements = getMovementData('#movement-list .movement-row');
  } catch (err) {
    return showFeedback(err.message, 'red', 'amrapFeedback');
  }
  if (!durationMin || durationMin < 1) return showFeedback('Enter a valid duration.', 'red', 'amrapFeedback');
  if (movements.length === 0) return showFeedback('Add at least one movement.', 'red', 'amrapFeedback');

  const autoName = `${durationMin} Min AMRAP`;
  const name = await showPlanNameModal(autoName);
  if (!name) return;

  const planDoc = {
    userId: currentUser.uid,
    name: name.trim() || autoName,
    type: 'AMRAP',
    structure: { durationSeconds: durationMin * 60, movements },
    status: 'active',
    createdAt: Date.now()
  };

  addDoc(collection(db, "workout_plans"), planDoc).then(() => {
    showFeedback('AMRAP plan saved!', 'emerald', 'amrapFeedback');
    haptic(HAPTIC.confirm);
  }).catch(err => {
    console.error('Save plan failed', err.code, err.message);
    showFeedback('Failed to save plan: ' + err.message, 'red', 'amrapFeedback');
  });
}

async function saveEmomPlan() {
  if (!currentUser) return alert('Please sign in first.');
  const intervalMin = parseInt(document.getElementById('emom-interval-min').value, 10) || 0;
  const intervalSec = parseInt(document.getElementById('emom-interval-sec').value, 10) || 0;
  const intervalSeconds = intervalMin * 60 + intervalSec;
  let minutes;
  try {
    minutes = getEmomMovementData();
  } catch (err) {
    return showFeedback(err.message, 'red', 'emomFeedback');
  }
  const rounds = emomMode === 'by_round' ? minutes.length : parseInt(document.getElementById('emom-rounds').value, 10);
  if (!rounds || rounds < 1) return showFeedback('Enter a valid number of rounds.', 'red', 'emomFeedback');
  if (intervalSeconds < 1) return showFeedback('Enter a valid interval.', 'red', 'emomFeedback');
  if (minutes.length === 0) return showFeedback('Add at least one interval slot.', 'red', 'emomFeedback');

  const durationSeconds = rounds * intervalSeconds;
  const durationMinutes = Math.floor(durationSeconds / 60);
  let intervalLabel;
  if (intervalSeconds === 60) { intervalLabel = 'EMOM'; }
  else if (intervalSeconds === 120) { intervalLabel = 'E2MOM'; }
  else if (intervalSeconds === 180) { intervalLabel = 'E3MOM'; }
  else if (intervalMin > 0 && intervalSec === 0) { intervalLabel = `E${intervalMin}MOM`; }
  else if (intervalMin > 0) { intervalLabel = `Every ${intervalMin}:${String(intervalSec).padStart(2, '0')}`; }
  else { intervalLabel = `Every :${String(intervalSec).padStart(2, '0')}`; }
  const prefix = durationSeconds % 60 === 0 ? `${durationSeconds / 60} Min ` : '';
  const autoName = `${prefix}${intervalLabel} \u00D7 ${rounds} rounds`;
  const name = await showPlanNameModal(autoName);
  if (!name) return;

  const planDoc = {
    userId: currentUser.uid,
    name: name.trim() || autoName,
    type: 'EMOM',
    structure: { mode: emomMode, rounds, durationMinutes, intervalSeconds, minutes },
    status: 'active',
    createdAt: Date.now()
  };

  addDoc(collection(db, "workout_plans"), planDoc).then(() => {
    showFeedback('EMOM plan saved!', 'emerald', 'emomFeedback');
    haptic(HAPTIC.confirm);
  }).catch(err => {
    console.error('Save plan failed', err.code, err.message);
    showFeedback('Failed to save plan: ' + err.message, 'red', 'emomFeedback');
  });
}

async function saveForTimePlan() {
  if (!currentUser) return alert('Please sign in first.');
  const timeCap = parseInt(document.getElementById('fortime-cap').value, 10) || 0;
  const rounds = parseInt(document.getElementById('fortime-rounds').value, 10);
  let movements;
  try {
    movements = getMovementData('#fortime-movement-list .movement-row');
  } catch (err) {
    return showFeedback(err.message, 'red', 'fortimeFeedback');
  }
  if (!rounds || rounds < 1) return showFeedback('Enter a valid round count.', 'red', 'fortimeFeedback');
  if (movements.length === 0) return showFeedback('Add at least one movement.', 'red', 'fortimeFeedback');

  const autoName = timeCap ? `${timeCap} Min For Time` : 'For Time';
  const name = await showPlanNameModal(autoName);
  if (!name) return;

  const planDoc = {
    userId: currentUser.uid,
    name: name.trim() || autoName,
    type: 'FOR_TIME',
    structure: { durationMinutes: timeCap || null, movements, rounds },
    status: 'active',
    createdAt: Date.now()
  };

  addDoc(collection(db, "workout_plans"), planDoc).then(() => {
    showFeedback('For Time plan saved!', 'emerald', 'fortimeFeedback');
    haptic(HAPTIC.confirm);
  }).catch(err => {
    console.error('Save plan failed', err.code, err.message);
    showFeedback('Failed to save plan: ' + err.message, 'red', 'fortimeFeedback');
  });
}

async function saveIntervalPlan() {
  if (!currentUser) return alert('Please sign in first.');
  const rounds = parseInt(document.getElementById('interval-rounds').value, 10);
  const workMin = parseInt(document.getElementById('interval-work-min').value, 10) || 0;
  const restMin = parseInt(document.getElementById('interval-rest-min').value, 10) || 0;
  let movements;
  try {
    movements = getMovementData('#interval-movement-list .movement-row');
  } catch (err) {
    return showFeedback(err.message, 'red', 'intervalFeedback');
  }
  if (!rounds || rounds < 1) return showFeedback('Enter a valid round count.', 'red', 'intervalFeedback');
  if (movements.length === 0) return showFeedback('Add at least one movement.', 'red', 'intervalFeedback');

  const workSeconds = workMin * 60;
  const restSeconds = restMin * 60;
  const autoName = `${workMin}:${restMin} \u00D7 ${rounds} INTERVAL`;
  const name = await showPlanNameModal(autoName);
  if (!name) return;

  const planDoc = {
    userId: currentUser.uid,
    name: name.trim() || autoName,
    type: 'INTERVAL',
    structure: { rounds, workSeconds, restSeconds, movements },
    status: 'active',
    createdAt: Date.now()
  };

  addDoc(collection(db, "workout_plans"), planDoc).then(() => {
    showFeedback('Interval plan saved!', 'emerald', 'intervalFeedback');
    haptic(HAPTIC.confirm);
  }).catch(err => {
    console.error('Save plan failed', err.code, err.message);
    showFeedback('Failed to save plan: ' + err.message, 'red', 'intervalFeedback');
  });
}

// ==========================================
// END WORKOUT PLAN SYSTEM
// ==========================================

// Render Existing Logs
function renderLogs(workouts) {
    const logContainer = document.getElementById('workout-list');
    if (!logContainer) return;

    if (!workouts.length) {
        logContainer.innerHTML = `<div class="bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-500 text-sm text-center">No workout logs yet. Add a set to start tracking your training history.</div>`;
        if (paginationControls) paginationControls.classList.add('hidden');
        return;
    }

    paginatedWorkouts = workouts;
    const selected = workoutFilter ? workoutFilter.value : 'All';

    paginatedWorkouts.forEach(workout => {
        if (workout.source === 'structured' || workout.source === 'onboarding' || workout.source === 'pb-log') return;
        const load = getEffectiveLoad(workout);
        workout._isPB = load >= (cachedMaxLoadByExercise[workout.exercise] || 0) && load > 0;
        const reps = parseInt(workout.reps, 10) || 1;
        const oneRM = Math.round(load * (1 + reps / 30));
        workout._isMax1RM = oneRM >= (cachedMax1RMByExercise[workout.exercise] || 0) && oneRM > 0;
    });

    let displayList = (selected === 'All') ? paginatedWorkouts : paginatedWorkouts.filter(w => w.exercise === selected);

    // Apply PB / 1RM chip filters if enabled (read state from DOM dataset)
    const chipPBActive = document.getElementById('chip-pb')?.dataset?.active === 'true';
    const chip1RMActive = document.getElementById('chip-1rm')?.dataset?.active === 'true';
    if (chipPBActive || chip1RMActive) {
      displayList = displayList.filter(w => (chipPBActive && w._isPB) || (chip1RMActive && w._isMax1RM));
    }

    // Expose render debug info for testing
    try { window.__lastRenderInfo = { chipPBActive, chip1RMActive, displayListLength: displayList.length, totalWorkouts: paginatedWorkouts.length }; } catch (e) {}

    const totalPages = Math.max(1, Math.ceil(displayList.length / entriesPerPage));
    currentPage = Math.min(currentPage, totalPages);
    let startIndex = (currentPage - 1) * entriesPerPage;
    let pageItems = displayList.slice(startIndex, startIndex + entriesPerPage);

    if (!pageItems.length && displayList.length) {
      currentPage = 1;
      startIndex = 0;
      pageItems = displayList.slice(0, entriesPerPage);
    }

    updatePaginationControls(totalPages);

    // 2. Render logic
    logContainer.innerHTML = pageItems.map(workout => {
        const load = getEffectiveLoad(workout);
        const reps = parseInt(workout.reps, 10) || 1;
        const sets = workout.sets || 1;
        const isPB = !!workout._isPB;
        const isMax1RM = !!workout._isMax1RM;
        const is1RMOnly = isMax1RM && !isPB;
        const oneRM = Math.round(load * (1 + reps / 30));
        const totalWorkReps = workout.totalWorkReps || (reps * sets);
        const totalVolume = Math.round(load * totalWorkReps);
        const borderClass = isPB ? 'log-entry-pb' : is1RMOnly ? 'log-entry-1rm' : 'log-entry';
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
    }).join('');
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

function computeVolumeHistory(workouts, period, filterExercise) {
  const now = new Date();
  const buckets = {};

  if (period === 'daily') {
    const ref = new Date(now);
    ref.setDate(ref.getDate() + volumePeriodOffset * 7);
    const weekStart = getWeekStart(ref);
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = toLocalDateKey(d);
      const periodStart = new Date(d);
      const periodEnd = new Date(d);
      periodEnd.setHours(23, 59, 59, 999);
      const periodEndMs = periodEnd.getTime();
      buckets[key] = { label: periodEndMs < userSignupTs ? '' : d.toLocaleDateString('en-US', { weekday: 'short' }), volume: 0, periodStart: periodStart.getTime(), periodEnd: periodEndMs };
    }
  } else if (period === 'weekly') {
    const monthRef = new Date(now.getFullYear(), now.getMonth() + volumePeriodOffset, 1);
    const monthStart = monthRef;
    const monthEnd = new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 0, 23, 59, 59, 999);
    const firstWeekStart = getWeekStart(monthStart);
    const lastWeekStart = getWeekStart(monthEnd);
    let cursor = new Date(firstWeekStart);
    while (cursor <= lastWeekStart) {
      const weekEnd = getWeekEnd(cursor);
      const key = toLocalDateKey(cursor);
      const weekEndMs = weekEnd.getTime();
      const label = weekEndMs < userSignupTs ? '' : cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      buckets[key] = { label, volume: 0, weekStart: new Date(cursor), weekEnd: new Date(weekEnd), periodStart: cursor.getTime(), periodEnd: weekEndMs };
      cursor.setDate(cursor.getDate() + 7);
    }
  } else if (period === 'monthly') {
    const year = now.getFullYear() + volumePeriodOffset;
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (let i = 0; i < 12; i++) {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`;
      const monthEnd = new Date(year, i + 1, 0, 23, 59, 59, 999);
      const monthStart = new Date(year, i, 1);
      const monthEndMs = monthEnd.getTime();
      buckets[key] = { label: monthEndMs < userSignupTs ? '' : monthNames[i], volume: 0, periodStart: monthStart.getTime(), periodEnd: monthEndMs };
    }
  } else {
    const baseYear = now.getFullYear() + volumePeriodOffset * 5;
    for (let i = 0; i < 5; i++) {
      const yr = baseYear - 4 + i;
      const key = String(yr);
      const yearEnd = new Date(yr + 1, 0, 0, 23, 59, 59, 999);
      const yearStart = new Date(yr, 0, 1);
      const yearEndMs = yearEnd.getTime();
      buckets[key] = { label: yearEndMs < userSignupTs ? '' : String(yr), volume: 0, periodStart: yearStart.getTime(), periodEnd: yearEndMs };
    }
  }

  workouts.forEach(w => {
    const ts = w.timestamp;
    if (!ts) return;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return;

    if (filterExercise !== 'All' && w.exercise !== filterExercise) return;

    const volume = parseFloat(w.totalVolume) || 0;
    if (volume <= 0) return;

    if (period === 'daily') {
      const ref = new Date(now);
      ref.setDate(ref.getDate() + volumePeriodOffset * 7);
      const weekStart = getWeekStart(ref);
      const weekEnd = getWeekEnd(ref);
      if (d < weekStart || d > weekEnd) return;
      const key = toLocalDateKey(d);
      if (buckets[key] !== undefined) {
        buckets[key].volume += volume;
      }
    } else if (period === 'weekly') {
      for (const key in buckets) {
        const b = buckets[key];
        if (d >= b.weekStart && d <= b.weekEnd) {
          b.volume += volume;
          break;
        }
      }
    } else if (period === 'monthly') {
      const year = now.getFullYear() + volumePeriodOffset;
      if (d.getFullYear() !== year) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (buckets[key] !== undefined) {
        buckets[key].volume += volume;
      }
    } else {
      const baseYear = now.getFullYear() + volumePeriodOffset * 5;
      const startYear = baseYear - 4;
      const endYear = baseYear;
      if (d.getFullYear() < startYear || d.getFullYear() > endYear) return;
      const key = String(d.getFullYear());
      if (buckets[key] !== undefined) {
        buckets[key].volume += volume;
      }
    }
  });

  return Object.values(buckets);
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
  const container = document.getElementById('vh-bars-container');
  const totalEl = document.getElementById('vh-total');
  const rangeLabel = document.getElementById('vh-range-label');
  if (!container) return;

  if (!lastWorkouts || lastWorkouts.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 italic py-8 text-center w-full">Log some workouts to see your volume history.</p>';
    if (totalEl) totalEl.textContent = '';
    if (rangeLabel) rangeLabel.textContent = '';
    return;
  }

  if (rangeLabel) {
    rangeLabel.textContent = formatRangeLabel(volumePeriod, volumePeriodOffset);
  }

  const buckets = computeVolumeHistory(lastWorkouts, volumePeriod, volumeFilter);

  const maxVolume = Math.max(...buckets.map(b => b.volume), 1);
  const totalVolume = buckets.reduce((sum, b) => sum + b.volume, 0);

  if (totalEl) {
    totalEl.textContent = `Total: ${Math.round(totalVolume).toLocaleString()} kg`;
  }

  const avgEl = document.getElementById('vh-avg');
  const nowMs = Date.now();
  const startedCount = buckets.filter(b => b.periodStart <= nowMs && b.periodEnd >= userSignupTs).length;
  const avgVolume = startedCount >= 2 ? totalVolume / startedCount : 0;
  if (avgEl) {
    avgEl.textContent = avgVolume > 0 ? `Avg: ${Math.round(avgVolume).toLocaleString()} kg` : '';
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

  container.innerHTML = barsHtml + avgLineHtml;
}

function switchVolumePeriod(period) {
  volumePeriod = period;
  volumePeriodOffset = 0;

  ['daily', 'weekly', 'monthly', 'yearly'].forEach(p => {
    const btn = document.getElementById(`vh-period-${p}`);
    if (btn) {
      btn.className = p === period ? 'btn-core is-primary btn-size-row' : 'btn-core is-ghost btn-size-row';
    }
  });

  renderVolumeHistory();
}

function shiftVolumePeriod(delta) {
  volumePeriodOffset += delta;
  renderVolumeHistory();
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
    volumeFilter = currentVal;
  } else {
    select.value = 'All';
    volumeFilter = 'All';
  }
}

function onVolumeFilterChange() {
  const select = document.getElementById('vh-filter');
  volumeFilter = select ? select.value : 'All';
  renderVolumeHistory();
}

// Add Log Submission
workoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return alert('Please sign in before logging a workout.');

    const exercise = document.getElementById('exercise').value;
    if (!exercise) return showFeedback('Please select an exercise.', 'red', 'workoutFeedback');
    const sets = parseInt(document.getElementById('sets').value, 10);
    const reps = parseInt(document.getElementById('reps').value, 10);
    const weight = parseFloat(document.getElementById('weight').value) || 0;
    const externalLoad = parseFloat(document.getElementById('external-load').value) || 0;
    const loadFactor = LOAD_FACTORS[exercise];
    let estimatedLoad = weight;
    if (loadFactor !== undefined) {
        estimatedLoad = (userBiometrics.bodyweight || 0) * loadFactor + externalLoad;
    }
    const totalVolume = estimatedLoad * reps * sets;

    const log = {
        userId: currentUser.uid,
        exercise,
        sets,
        reps,
        weight,
        externalLoad,
        estimatedLoad,
        totalVolume,
        timestamp: Date.now()
    };

    try {
        await addDoc(collection(db, "workouts"), log);
        workoutForm.reset();
        const weightInput = document.getElementById('weight');
        const weightLabel = document.getElementById('weight-label');
        weightInput.disabled = false;
        if (weightLabel) weightLabel.textContent = 'Weight (kg)';
        document.getElementById('bw-extras').classList.add('hidden');
        if (estimatedLoadDisplay) estimatedLoadDisplay.textContent = '—';
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

// AMRAP Form Submit
const amrapForm = document.getElementById('amrap-form');
if (amrapForm) {
  amrapForm.addEventListener('submit', submitAmrapWorkout);
}

// AMRAP Score Preview
const amrapRounds = document.getElementById('amrap-rounds');
const amrapAdditional = document.getElementById('amrap-additional-reps');
if (amrapRounds) amrapRounds.addEventListener('input', updateAmrapScorePreview);
if (amrapAdditional) amrapAdditional.addEventListener('input', updateAmrapScorePreview);

// EMOM Form Submit
const emomForm = document.getElementById('emom-form');
if (emomForm) {
  emomForm.addEventListener('submit', submitEmomWorkout);
}

// EMOM Score Preview
const emomRoundsCompleted = document.getElementById('emom-rounds-completed');
const emomRounds = document.getElementById('emom-rounds');
const emomIntervalMin = document.getElementById('emom-interval-min');
const emomIntervalSec = document.getElementById('emom-interval-sec');
if (emomRoundsCompleted) emomRoundsCompleted.addEventListener('input', updateEmomScorePreview);
if (emomRounds) emomRounds.addEventListener('input', () => { updateEmomScorePreview(); updateEmomSummary(); updateEmomDurationDisplay(); });
if (emomIntervalMin) emomIntervalMin.addEventListener('input', () => { updateEmomSummary(); updateEmomDurationDisplay(); });
if (emomIntervalSec) emomIntervalSec.addEventListener('input', () => { updateEmomSummary(); updateEmomDurationDisplay(); });

// FOR_TIME Form Submit
const forTimeForm = document.getElementById('for-time-form');
if (forTimeForm) {
  forTimeForm.addEventListener('submit', submitForTimeWorkout);
}

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
    addMovementRow('fortime-movement-list');
  }

  // INTERVAL Form Submit
const intervalForm = document.getElementById('interval-form');
if (intervalForm) {
  intervalForm.addEventListener('submit', submitIntervalWorkout);
}

// INTERVAL Score Preview
const intervalRounds = document.getElementById('interval-rounds-completed');
const intervalPartial = document.getElementById('interval-partial-reps');
if (intervalRounds) intervalRounds.addEventListener('input', updateIntervalScorePreview);
if (intervalPartial) intervalPartial.addEventListener('input', updateIntervalScorePreview);

// Initial movement row for INTERVAL
if (document.getElementById('interval-movement-list')) {
    addMovementRow('interval-movement-list');
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
  addMinuteSlot();
}

// Real-time calc recalculation on weight input change/blur in pct/rpe mode
document.addEventListener('input', (e) => {
  const input = e.target;
  if (input.classList.contains('movement-weight')) {
    const row = input.closest('.movement-row, .minute-row');
    if (!row) return;
    const pill = row.querySelector('.wms-pill');
    if (pill?.dataset?.mode === 'pct' || pill?.dataset?.mode === 'rpe') {
      updateRowCalcDisplay(row);
    }
  }
});

document.addEventListener('blur', (e) => {
  const input = e.target;
  if (input.classList.contains('movement-weight')) {
    const row = input.closest('.movement-row, .minute-row');
    if (!row) return;
    const pill = row.querySelector('.wms-pill');
    if (pill?.dataset?.mode === 'pct' || pill?.dataset?.mode === 'rpe') {
      updateRowCalcDisplay(row);
    }
  }
});

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
  sharePlanId = null;
});

// Shared Plans Pagination
const prevSharedPlansBtn = document.getElementById('prev-shared-plans-page-btn');
const nextSharedPlansBtn = document.getElementById('next-shared-plans-page-btn');
if (prevSharedPlansBtn) prevSharedPlansBtn.addEventListener('click', () => changeSharedPlansPage('prev'));
if (nextSharedPlansBtn) nextSharedPlansBtn.addEventListener('click', () => changeSharedPlansPage('next'));

// Initial movement row
if (document.getElementById('movement-list')) {
  addMovementRow();
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

  onSnapshot(profileRef, (snapshot) => {
    const data = snapshot.data();
    userFriendsList = Array.isArray(data?.friends) ? data.friends : [];
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
  if (userFriendsList.includes(targetUid)) {
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
  if (userFriendsList.includes(friendUid)) {
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
  if (!userFriendsList.includes(friendUid)) return showFeedback('Athlete not in your friend list.', 'yellow');

  if (!confirm('Remove this friend from your list?')) return;

  try {
    await updateDoc(getProfileDocRef(currentUser.uid), {
      friends: arrayRemove(friendUid)
    });

    userFriendsList = userFriendsList.filter(u => u !== friendUid);
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
async function renderActiveFriendsList() {
  const container = document.getElementById('friendsListContainer');
  const pagination = document.getElementById('friends-pagination');
  if (userFriendsList.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500 italic">No allies linked yet. Share your Cyber-Tag!</p>`;
    if (pagination) pagination.classList.add('hidden');
    return;
  }

  try {
    const friendResults = await Promise.allSettled(
      userFriendsList.map(fUid => getProfileDocument(fUid))
    );

    friendDisplayCache = {};
    friendResults.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value.exists()) {
        friendDisplayCache[userFriendsList[i]] = result.value.data();
      }
    });

    const perPage = 3;
    const totalPages = Math.max(1, Math.ceil(userFriendsList.length / perPage));
    friendsPage = Math.min(friendsPage, totalPages);
    const start = (friendsPage - 1) * perPage;
    const pageItems = userFriendsList.slice(start, start + perPage);

    let html = '';
    pageItems.forEach((fUid, i) => {
      const globalIdx = start + i;
      const result = friendResults[globalIdx];

      if (result.status === 'rejected') {
        html += `
          <div class="flex justify-between items-center bg-slate-900/50 p-2 border border-slate-800 rounded">
            <span class="font-medium text-slate-300 truncate max-w-[120px]">Locked Friend</span>
            <span class="text-xs font-mono text-yellow-400">Permission denied</span>
          </div>`;
        return;
      }

      const fDoc = result.value;
      if (fDoc && fDoc.exists()) {
        const data = fDoc.data();
        html += `
          <div class="flex justify-between items-center bg-slate-900/50 p-2 border border-slate-800 rounded">
            <span class="font-medium text-slate-300 truncate max-w-[120px]">${getDisplayName(data, fUid)}</span>
            <div class="flex items-center gap-2">
              <button type="button" onclick="removeFriend('${fUid}')" 
              class="items-center justify-center rounded-full px-2 py-0.5 btn-core is-ghost text-xs ">
              <i data-lucide="user-minus" size="14"></i>
              </button>
            </div>
          </div>`;
      } else {
        html += `
          <div class="flex justify-between items-center bg-slate-900/50 p-2 border border-slate-800 rounded">
            <span class="font-medium text-slate-300 truncate max-w-[120px]">Unknown Friend</span>
            <span class="text-xs font-mono text-slate-500">${fUid}</span>
          </div>`;
      }
    });

    container.innerHTML = html || `<p class="text-xs text-slate-500 italic">No valid allies found for the linked Cyber-Tags.</p>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    if (pagination) {
      const currentEl = document.getElementById('current-friends-page');
      const totalEl = document.getElementById('total-friends-pages');
      const prevBtn = document.getElementById('prev-friends-page-btn');
      const nextBtn = document.getElementById('next-friends-page-btn');
      if (currentEl) currentEl.textContent = friendsPage;
      if (totalEl) totalEl.textContent = totalPages;
      if (prevBtn) prevBtn.disabled = friendsPage <= 1;
      if (nextBtn) nextBtn.disabled = friendsPage >= totalPages;
      pagination.classList.toggle('hidden', totalPages <= 1);
    }
  } catch (error) {
    console.error('Active friends render failed', error.code, error.message);
    container.innerHTML = `<p class="text-xs text-red-400">Failed to render active grid context. Check Firestore rules for profiles.</p>`;
  }
}

function changeFriendsPage(direction) {
  const totalPages = Math.max(1, Math.ceil(userFriendsList.length / 3));
  if (direction === 'prev' && friendsPage > 1) {
    friendsPage--;
  } else if (direction === 'next' && friendsPage < totalPages) {
    friendsPage++;
  }
  renderActiveFriendsList();
}

/**
 * Manage Global vs Friends Leaderboard UI Toggles
 */
function switchLeaderboardScope(scope) {
  currentScope = scope; //
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
  const rawScore = currentFormula === 'dots' ? profile.dotsScore : (profile.sinclairScore || 0);
  const displayScore = formatDotsScore(rawScore);
  const badgeBaseClasses = 'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider w-20';
  const actionCell = isMe
    ? ''
    : isFriend
      ? ''
      : `<button type="button" class="${badgeBaseClasses} border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-slate-800" 
      onclick="addFriendFromLeaderboard('${profile.uid}')">
      <i data-lucide="user-plus" size="14"></i>
      </button>`;

  return `
    <tr class="border-b border-slate-800/60 ${isMe ? 'bg-emerald-500/10 font-bold' : ''}">
      <td class="py-3 font-mono text-slate-500">#${rank}</td>
      <td class="py-3 flex items-center gap-2">
        <span class="${isMe ? 'text-emerald-400' : 'text-slate-200'}">${getDisplayName(profile, profile.uid)}</span>
      </td>
      <td class="py-3 text-right font-mono font-bold text-emerald-400">${displayScore.toFixed(2)}</td>
      <td class="py-3 text-right">${actionCell}</td>
    </tr>`;
}

/**
 * Toggle leaderboard between compact and show-all modes
 */
function toggleLeaderboardExpand() {
  leaderboardShowAll = !leaderboardShowAll;
  renderLeaderboardView();
}

/**
 * Re-render leaderboard table from cached data applying current scope, formula, and friends list
 */
function renderLeaderboardView() {
  const rowsContainer = document.getElementById('leaderboardRows');
  const expandBtn = document.getElementById('leaderboard-expand-btn');
  if (!rowsContainer) return;
  const currentUser = auth.currentUser;

  const filtered = [];
  leaderboardCache.forEach(profile => {
    const isMe = currentUser && profile.uid === currentUser.uid;
    const isFriend = userFriendsList.includes(profile.uid);

    if (currentScope === 'friends' && !isMe && !isFriend) {
      return;
    }

    filtered.push({ profile, isMe, isFriend });
  });

  if (!leaderboardShowAll && filtered.length > 0) {
    const meIdx = filtered.findIndex(f => f.isMe);
    let sliceStart, sliceEnd;

    if (meIdx === -1) {
      sliceStart = 0;
      sliceEnd = 1;
    } else {
      sliceStart = Math.max(0, meIdx - 1);
      sliceEnd = Math.min(filtered.length, meIdx + 2);
    }

    const subset = filtered.slice(sliceStart, sliceEnd);
    let html = '';
    subset.forEach((f, i) => {
      html += buildLeaderboardRow(f.profile, sliceStart + i + 1, f.isMe, f.isFriend);
    });
    rowsContainer.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    if (expandBtn) {
      expandBtn.classList.toggle('hidden', filtered.length <= subset.length);
      expandBtn.textContent = 'Show All';
    }
  } else {
    let html = '';
    filtered.forEach((f, i) => {
      html += buildLeaderboardRow(f.profile, i + 1, f.isMe, f.isFriend);
    });
    rowsContainer.innerHTML = html || `<tr><td colspan="4" class="py-4 text-center text-xs text-slate-500 italic">No network entries visible in this grid scope.</td></tr>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    if (expandBtn) {
      expandBtn.classList.toggle('hidden', filtered.length <= 3 || !leaderboardShowAll);
      if (leaderboardShowAll) {
        expandBtn.textContent = 'Show Compact';
      } else {
        expandBtn.textContent = 'Show All';
      }
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

  const sortField = currentFormula === 'dots' ? "dotsScore" : "sinclairScore";

  const leaderboardQuery = query(collection(db, "profiles"), orderBy(sortField, "desc"), limit(50));
  
  leaderboardUnsubscribe = onSnapshot(leaderboardQuery, (snapshot) => {
    leaderboardCache = [];
    snapshot.forEach((doc) => {
      leaderboardCache.push(doc.data());
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
  currentFormula = formula;
  
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
  await setDoc(getProfileDocRef(uid), {
    dotsScore: parseFloat(dotsScore) || 0,
    sinclairScore: parseFloat(sinclairScore) || 0, // Added field mapping
    lastActive: serverTimestamp()
  }, { merge: true });
}

const debouncedUpdateLeaderboard = debounce(async (uid, dots, sinclair) => {
    if (!auth.currentUser || auth.currentUser.uid !== uid) return;
    await updateUserLeaderboardProfile(uid, dots, sinclair);
}, 5000);

const debouncedSyncActivity = debounce(() => {
    computeAndSyncDailyActivity();
}, 3000);


// Visual Alert helper (Updated with dynamic target and optional auto-vanish delay)
function showFeedback(msg, color, targetId = 'socialFeedback', delay = 2000) {
  const el = document.getElementById(targetId);
  if (!el) return;

  const colorClasses = {
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    slate: 'text-slate-400'
  };

  // 1. Set the text and colors
  el.innerText = msg;
  el.className = `text-xs font-medium transition-all duration-500 opacity-100 ${colorClasses[color] || 'text-slate-400'}`;

  // 2. If a delay (in ms) is passed, clear the text after that delay
  if (delay) {
    // Optional: Clear any existing timeout attached to this element to prevent overlapping animations
    if (el.dataset.timeoutId) {
      clearTimeout(Number(el.dataset.timeoutId));
    }

    const timeoutId = setTimeout(() => {
      // Smoothly fade out using CSS opacity before clearing text
      el.classList.replace('opacity-100', 'opacity-0');
      
      // Wait for the 500ms transition animation to finish, then clear the text completely
      setTimeout(() => {
        el.innerText = '\u00A0';
      }, 500);
    }, delay);

    // Save the timeout ID on the element's dataset so we can track it
    el.dataset.timeoutId = timeoutId.toString();
  }
}

function showToast(msg, color) {
    const inner = document.getElementById('toast-notification-inner');
    if (!inner) return;
    const colorClasses = { emerald: 'text-emerald-400', red: 'text-red-400', yellow: 'text-yellow-400', slate: 'text-slate-400' };
    inner.innerText = msg;
    inner.className = `px-4 py-2 rounded-lg bg-slate-800/90 backdrop-blur-sm border border-slate-700 shadow-xl text-xs font-medium transition-all duration-500 opacity-100 ${colorClasses[color] || 'text-slate-400'}`;
    if (inner.dataset.timeoutId) clearTimeout(Number(inner.dataset.timeoutId));
    inner.dataset.timeoutId = String(setTimeout(() => {
        inner.classList.replace('opacity-100', 'opacity-0');
        setTimeout(() => { inner.innerText = ''; }, 500);
    }, 3000));
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
    if (userFriendsList.includes(friendId)) {
        console.log("Friend already linked.");
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
            console.log("Cannot claim your own QR share.");
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
window.toggleLeaderboardExpand = toggleLeaderboardExpand;
window.showQRCode = showQRCode;
window.handleCalcRemove = handleCalcRemove;
window.switchCalcMode = switchCalcMode;
window.switchWorkoutMode = switchWorkoutMode;
window.addMovementRow = addMovementRow;
window.removeMovementRow = removeMovementRow;
window.handleMovementExerciseChange = handleMovementExerciseChange;
window.handleWorkoutTypeChange = handleWorkoutTypeChange;
window.addMinuteSlot = addMinuteSlot;
window.removeMinuteSlot = removeMinuteSlot;
window.toggleForTimeDnf = toggleForTimeDnf;
window.selectCalendarDay = selectCalendarDay;
window.changeCalendarNav = changeCalendarNav;
window.toggleCalendarView = toggleCalendarView;
window.closeCalendarDayDetail = closeCalendarDayDetail;
window.saveAmrapPlan = saveAmrapPlan;
window.saveEmomPlan = saveEmomPlan;
window.saveForTimePlan = saveForTimePlan;
window.saveIntervalPlan = saveIntervalPlan;
window.loadPlan = loadPlan;
window.toggleWorkoutCard = toggleWorkoutCard;
window.redoWorkout = redoWorkout;
window.deletePlan = deletePlan;
window.openShareModal = openShareModal;
window.saveSharedPlanToMyPlans = saveSharedPlanToMyPlans;
window.dismissSharedPlan = dismissSharedPlan;
window.switchPlansFilter = switchPlansFilter;
window.toggleSelectAllFriends = toggleSelectAllFriends;
window.toggleFavorite = toggleFavorite;
window.togglePlanFavorite = togglePlanFavorite;
window.toggleStructuredFavorite = toggleStructuredFavorite;
window.loadSharedPlan = loadSharedPlan;
window.switchShareMode = switchShareMode;
window.shareByQR = shareByQR;
window.toggleWeightMode = toggleWeightMode;
window.updatePillActive = updatePillActive;
window.switchVolumePeriod = switchVolumePeriod;
window.shiftVolumePeriod = shiftVolumePeriod;
window.onVolumeFilterChange = onVolumeFilterChange;

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