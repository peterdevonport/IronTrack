import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser, collection, addDoc, query, where, onSnapshot, deleteDoc, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, orderBy, limit, Timestamp, getDocs } from './firebase.js';
import { state, EPLEY_CONSTANT, HAPTIC, CONSISTENCY_CONFIG, RPE_RIR_MAP, entriesPerPage, INPUT_CLASS, CALC_CLASS, activeDates, loginView, appView, bottomNav, authBtn, profileBtn, profileModal, emailInput, passwordInput, loginBtn, signupBtn, greeting, profileForm, workoutForm, workoutList, paginationControls, prevPageBtn, nextPageBtn, currentPageDisplay, totalPagesDisplay, workoutFilter, exerciseSelect, onboardingView, onboardingGender, onboardingWeight, onboardingDaysMonthly, onboardingDaysYearly, onboardingDaysLifetime, onboardingExerciseSelect, onboardingWeightInput, onboardingRepsInput, onboardingAddBtn, onboardingList, onboardingEmpty, onboardingSaveBtn, onboardingFeedback, pbLogExercise, pbLogBtn, pbLogFeedback, tabContents, navTabs } from './state.js';
import { estimate1RM, estimateWeightForReps, computeEffectiveLoad, getEffectiveLoad } from './math.js';
import { debounce, escapeHtml, haptic } from './dom.js';
import { getExerciseInfo, getDisplayName, EXERCISE_CATALOG, LOAD_FACTORS } from './exercise-data.js';
import { getMonday, countActiveDays, countConsecutiveDays, toLocalDateKey } from './date.js';
import { formatMovementLoad, formatCardDate, formatWorkoutType, formatDotsScore, formatMovementWeight } from './formatting.js';
import { computeDotsScore, computeSinclairScore, getRankingTier, formatScore_ROUNDS_AND_REPS, formatScore_COMPLETED_MINUTES, formatScore_TIME_SECONDS, describeAmrap, describeEmom, describeForTime, describeInterval, buildWorkoutDescription, buildWorkoutSummaryLine, getRepsPerRound } from './analytics.js';
import { clearChildren, renderEmptyState, renderMessage, updatePagination, updatePaginationControls, updatePillActive, setChallengeCard, updateCalTodayBtnState, updateTodayBtnState, toggleWorkoutCard, updateStarIcon, toggleSelectAllFriends, buildExerciseOptionsHtml, saveExpandedCardIds, restoreExpandedCardIds, showFeedback, showToast, openProfileModal, closeProfileModal, showPlanNameModal, enableSwipe, changeGenericPage } from './ui.js';
import { buildWmsField, applyFieldAttributes, renderFormFields, renderOnboarding1RMItem, renderOnboarding1RMList, renderCalcEntry, renderCalcEntries, renderPlanMovementItem, renderPlanMovements, renderMovementChips, renderEmomChips, renderCalendarWorkoutItem, renderVolumeBar, renderMinuteSlotInner, renderShareFriendItem, renderRegistryRow, renderLeaderboardEmptyRow, buildCalendarDayHtml, workoutToLogHtml, renderWorkoutCard, renderStructuredWorkoutCard, renderPlanCard, renderSharedPlanCard, friendToHtml, buildLeaderboardRow } from './rendering.js';
import { getSchemaKey, computeTotalLoad, pullProfileMetrics, refreshPBForm, processWorkoutSnapshot, updateCaches } from './auth.js';
import { showOnboarding, hideOnboarding, addOnboarding1RM } from './onboarding.js';
import { computeAndSyncDailyActivity, renderConsistencyUI, calculateChallengeProgress, renderChallengeCards, loadConsistencyConfig, getPreviousPeriodId, calculateStreakFromPeriods, renderStreakUI, updateChallengeStreaks, renderCalendar, updateConsistencyMetrics, getWorkoutsForDate, selectCalendarDay, changeCalendarNav, applyCalendarNav, autoSelectFirstActiveDay, goToCalendarToday, toggleCalendarView, closeCalendarDayDetail } from './calendar.js';
import { renderLogs, getWeekStart, getWeekEnd, computeDailyBuckets, computeWeeklyBuckets, computeMonthlyBuckets, computeYearlyBuckets, computeVolumeHistory, formatRangeLabel, renderVolumeHistory, switchVolumePeriod, shiftVolumePeriod, goToCurrentPeriod, populateVolumeFilter, onVolumeFilterChange } from './volume.js';
import { getProfileDocRef, getProfileDocument, initSocialProfile, copyCyberTag, handleAddFriend, addFriendFromLeaderboard, removeFriend, cacheUncachedProfiles, renderActiveFriendsList, changeFriendsPage, filterLeaderboardProfiles, computeLeaderboardSlice, switchLeaderboardScope, toggleLeaderboardExpand, renderLeaderboardView, syncLeaderboardFeed, switchLeaderboardFormula, updateUserLeaderboardProfile, showQRCode, processFriendRequest, processClaimedPlan, switchShareMode, openShareModal, resolveShareContent, buildSharedPlanDocument, buildQrShareUrl, buildQrCodeConfig, shareWithFriends, shareByQR, listenToSharedPlans, renderSharedPlansUI, changeSharedPlansPage, saveSharedPlanToMyPlans, dismissSharedPlan, toggleFavoriteGeneric, toggleFavorite, togglePlanFavorite, toggleStructuredFavorite, loadSharedPlan, cleanupSocialSubscriptions } from './social.js';

let currentUser = null;
let unsubscribeLogs = null;
let pendingOnboarding1RMs = [];
let urlParamsProcessed = false;
let unsubscribeStructured = null;
let unsubscribePlans = null;
let listenersAttached = false;

// Initialize Lucide icons
if (typeof lucide !== 'undefined' && lucide.createIcons) {
  lucide.createIcons();
}

// Volume History State (Issue #38)

// ─── Schema-Driven Form Layouts ──────────────────────────────────────────────

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
    await handleSignedIn(user);
  } else {
    handleSignedOut();
  }
});

async function handleSignedIn(user) {
  loginView.classList.add('hidden');
  appView.classList.remove('hidden');
  if (bottomNav) bottomNav.classList.remove('hidden');
  switchTab('dashboard');
  authBtn.innerText = "Sign Out";
  if (profileBtn) profileBtn.classList.remove('hidden');
  window.__irontrackAuthState = 'signed-in';
  state.user.userSignupTs = new Date(user.metadata.creationTime).getTime() || 0;

  const handle = (user.email || user.uid).split('@')[0];
  greeting.innerText = `Athlete: ${handle}`;

  await pullProfileMetrics(user.uid);
  await initSocialProfile(user);

  if (!state.user.userBiometrics.onboardingComplete) {
    loginView.classList.add('hidden');
    appView.classList.add('hidden');
    if (bottomNav) bottomNav.classList.add('hidden');
    showOnboarding(pendingOnboarding1RMs);
    return;
  }

  syncLeaderboardFeed();
  attachListeners(user.uid);
  loadConsistencyConfig();
  showQRCode();
  await processUrlParams();
}

function handleSignedOut() {
  if (unsubscribeLogs) { unsubscribeLogs(); unsubscribeLogs = null; }
  if (unsubscribeStructured) { unsubscribeStructured(); unsubscribeStructured = null; }
  if (unsubscribePlans) { unsubscribePlans(); unsubscribePlans = null; }
  cleanupSocialSubscriptions();
  loginView.classList.remove('hidden');
  appView.classList.add('hidden');
  if (bottomNav) bottomNav.classList.add('hidden');
  onboardingView.classList.add('hidden');
  pendingOnboarding1RMs = [];
  if (profileBtn) profileBtn.classList.add('hidden');
  if (profileModal) profileModal.classList.add('hidden');
  authBtn.innerText = "Sign In";
  greeting.innerText = "Analytics Dashboard";
  clearChildren(document.getElementById('workout-list'));
  renderEmptyState(document.getElementById('structured-workout-list'), 'No structured workouts logged yet.');
  clearChildren(document.getElementById('registry-table-body'));
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
  clearChildren(document.getElementById('friendsListContainer'));
  const filterMineBtn = document.getElementById('plans-filter-mine');
  const filterSharedBtn = document.getElementById('plans-filter-shared');
  const filterFavBtn = document.getElementById('plans-filter-favorites');
  if (filterMineBtn) filterMineBtn.className = 'btn-core is-primary btn-size-row';
  if (filterSharedBtn) filterSharedBtn.className = 'btn-core is-ghost btn-size-row';
  if (filterFavBtn) filterFavBtn.className = 'btn-core is-ghost btn-size-row';
  clearChildren(document.getElementById('leaderboardRows'));
  currentUser = null;
  urlParamsProcessed = false;
  activeDates.clear();
  state.calendar.month = new Date();
  state.calendar.selectedDate = null;
  state.calendar.compact = true;
  state.calendar.weekOffset = 0;
  listenersAttached = false;
  window.__irontrackAuthState = 'signed-out';
}

function attachListeners(uid) {
  if (listenersAttached) return;
  listenToDataStream(uid);
  listenToStructuredWorkouts(uid);
  listenToPlans(uid);
  listenToSharedPlans(uid);
  listenersAttached = true;
}

async function processUrlParams() {
  if (pendingFriendUid && !urlParamsProcessed) {
    await processFriendRequest(pendingFriendUid);
  }
  if (pendingClaimPlanId && !urlParamsProcessed) {
    await processClaimedPlan(pendingClaimPlanId, switchPlansFilter);
  }
  if (pendingFriendUid || pendingClaimPlanId) {
    urlParamsProcessed = true;
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

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
    togglePasswordBtn.setAttribute('aria-pressed', String(!isPassword));
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
    btn.setAttribute('aria-pressed', String(!isPassword));
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
        refreshPBForm(FORM_SCHEMAS);
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
    onboardingAddBtn.addEventListener('click', () => addOnboarding1RM(pendingOnboarding1RMs));
}
if (onboardingSaveBtn) {
    onboardingSaveBtn.addEventListener('click', saveOnboarding);
}
// Allow pressing Enter in weight input to trigger add
if (onboardingWeightInput) {
    onboardingWeightInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addOnboarding1RM(pendingOnboarding1RMs); }
    });
}
if (onboardingExerciseSelect) {
    onboardingExerciseSelect.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addOnboarding1RM(pendingOnboarding1RMs); }
    });
}

// PB Log Event Listeners
if (pbLogBtn) {
    pbLogBtn.addEventListener('click', logPB);
}
if (pbLogExercise) {
    pbLogExercise.addEventListener('change', () => refreshPBForm(FORM_SCHEMAS));
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
            renderMessage(el, 'Workouts blocked by Firestore rules.');
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
            html += renderRegistryRow(exercise, true, maxReps, 0, 0);
        } else {
            const maxEstimated1RM = state.cache.cachedMax1RMByExercise[exercise] || 0;
            const absolutePB = state.cache.cachedMaxLoadByExercise[exercise] || 0;
            html += renderRegistryRow(exercise, false, 0, maxEstimated1RM, absolutePB);
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

function changePage(direction) {
  changeGenericPage('workouts', state.data.paginatedWorkouts, entriesPerPage, () => renderLogs(state.data.lastWorkouts), direction);
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
  changeGenericPage('records', uniqueExercises, 10, update1RMRegistryUI, direction);
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
refreshPBForm(FORM_SCHEMAS);

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
    clearChildren(container);
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

    row.innerHTML = renderMinuteSlotInner(label, source);
    row.dataset.exerciseId = data.exerciseId;
    row.dataset.reps = data.reps;
    row.dataset.weight = data.weight;
    row.dataset.weightMode = data.weightMode;
    if (data.pct) row.dataset.pct = data.pct;
    if (data.rpe) row.dataset.rpe = data.rpe;
  } else {
    row.innerHTML = renderMinuteSlotInner(label, '<span class="text-slate-500 font-mono text-sm italic">(empty)</span>');
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
  changeGenericPage('structured', state.data.lastStructuredWorkouts, 3, renderStructuredWorkoutHistory, direction);
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
  changeGenericPage('plans', state.data.lastWorkoutPlans, 3, renderPlansUI, direction);
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

function loadWorkoutIntoBuilder(type, structure, feedbackMessage) {
  switchTab('calculator');

  const typeSelect = document.getElementById('workout-type');
  if (typeSelect) typeSelect.value = type;
  handleWorkoutTypeChange();

  const s = structure || {};

  switch (type) {
    case 'AMRAP': populateAmrapForm(s); break;
    case 'EMOM': populateEmomForm(s); break;
    case 'FOR_TIME': populateForTimeForm(s); break;
    case 'INTERVAL': populateIntervalForm(s); break;
  }

  const planCard = document.getElementById('plan-workout-card');
  if (planCard) planCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showFeedback(feedbackMessage, 'emerald', 'planFeedback');
  haptic(HAPTIC.tap);
}

function loadPlan(planId) {
  const plan = state.data.lastWorkoutPlans.find(p => p.id === planId);
  if (!plan) return;
  loadWorkoutIntoBuilder(plan.type, plan.structure, `Plan "${plan.name}" loaded!`);
}

function redoWorkout(workoutId) {
  const sw = state.data.lastStructuredWorkouts.find(w => w.id === workoutId);
  if (!sw) return;
  loadWorkoutIntoBuilder(sw.type, sw.structure, `Workout "${sw.name}" loaded for redo!`);
}

const WORKOUT_TYPE_TO_RESULT_ID = {
  AMRAP: 'amrap',
  EMOM: 'emom',
  FOR_TIME: 'fortime',
  INTERVAL: 'interval'
};

/**
 * Set up the training tab from a stored workout plan
 */
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

async function submitStructuredWorkout(name, structure, now, config) {
  const { type, buildResult, scoreDisplay, scoreType, scoreValue, generateContributions } = config;
  const result = buildResult();
  const workoutDoc = {
    userId: currentUser.uid, name, type, structure, result,
    scoreDisplay: scoreDisplay(result),
    scoreType,
    scoreValue: scoreValue(result),
    timestamp: now
  };
  const docRef = await addDoc(collection(db, "structured_workouts"), workoutDoc);
  await generateContributions(docRef.id, structure, result);
}

function submitAmrapWorkout(name, structure, now) {
  const roundsCompleted = parseInt(document.getElementById('log-rounds').value, 10);
  const additionalReps = parseInt(document.getElementById('log-partial-reps').value, 10) || 0;
  if (roundsCompleted < 0) {
    showFeedback('Enter rounds completed.', 'rose', 'log-workout-feedback');
    return;
  }
  return submitStructuredWorkout(name, structure, now, {
    type: 'AMRAP',
    buildResult: () => ({ roundsCompleted, additionalReps }),
    scoreDisplay: r => formatScore_ROUNDS_AND_REPS(r.roundsCompleted, r.additionalReps),
    scoreType: 'ROUNDS_AND_REPS',
    scoreValue: r => r.roundsCompleted * 1000 + r.additionalReps,
    generateContributions: (docId, struct, r) => generateAmrapContributions(docId, struct.movements, r.roundsCompleted, r.additionalReps)
  });
}

function submitEmomWorkout(name, structure, now) {
  const roundsCompleted = parseInt(document.getElementById('log-rounds').value, 10);
  if (roundsCompleted < 0) {
    showFeedback('Enter rounds completed.', 'rose', 'log-workout-feedback');
    return;
  }
  return submitStructuredWorkout(name, structure, now, {
    type: 'EMOM',
    buildResult: () => ({ roundsCompleted }),
    scoreDisplay: r => formatScore_COMPLETED_MINUTES(r.roundsCompleted, structure.rounds),
    scoreType: 'COMPLETED_MINUTES',
    scoreValue: r => r.roundsCompleted,
    generateContributions: (docId, struct, r) => generateEmomContributions(docId, struct.minutes, r.roundsCompleted, struct.mode)
  });
}

function submitForTimeWorkout(name, structure, now) {
  const dnf = document.getElementById('fortime-dnf').checked;
  const remainingReps = dnf ? (parseInt(document.getElementById('fortime-cap-reps').value, 10) || 0) : 0;
  const resultMins = dnf ? 0 : (parseInt(document.getElementById('fortime-minutes').value, 10) || 0);
  const resultSecs = dnf ? 0 : (parseInt(document.getElementById('fortime-seconds').value, 10) || 0);
  const timeSeconds = dnf ? 0 : resultMins * 60 + resultSecs;
  if (resultSecs > 59) {
    showFeedback('Seconds must be 0–59.', 'rose', 'log-workout-feedback');
    return;
  }
  return submitStructuredWorkout(name, structure, now, {
    type: 'FOR_TIME',
    buildResult: () => ({ timeSeconds, completed: !dnf, ...(dnf && { remainingReps }) }),
    scoreDisplay: r => dnf ? `Cap ${remainingReps}` : formatScore_TIME_SECONDS(r.timeSeconds),
    scoreType: 'TIME_SECONDS',
    scoreValue: r => dnf ? r.remainingReps : r.timeSeconds,
    generateContributions: (docId, struct, r) => generateForTimeContributions(docId, struct.movements, struct.rounds, r.remainingReps || 0)
  });
}

function submitIntervalWorkout(name, structure, now) {
  const roundsCompleted = parseInt(document.getElementById('log-rounds').value, 10);
  const partialReps = parseInt(document.getElementById('log-partial-reps').value, 10) || 0;
  if (roundsCompleted < 0) {
    showFeedback('Enter rounds completed.', 'rose', 'log-workout-feedback');
    return;
  }
  return submitStructuredWorkout(name, structure, now, {
    type: 'INTERVAL',
    buildResult: () => ({ roundsCompleted, partialReps, completed: roundsCompleted >= structure.rounds }),
    scoreDisplay: r => formatScore_ROUNDS_AND_REPS(r.roundsCompleted, r.partialReps),
    scoreType: 'ROUNDS_AND_REPS',
    scoreValue: r => r.roundsCompleted * 1000 + r.partialReps,
    generateContributions: (docId, struct, r) => generateIntervalContributions(docId, struct.movements, r.roundsCompleted, r.partialReps)
  });
}

function resetTrainingTab() {
  state.builder.pendingPlannedWorkout = null;
  const pwBadge = document.getElementById('log-workout-type-badge');
  if (pwBadge) { pwBadge.textContent = ''; pwBadge.style.display = 'none'; }
  const pwPlaceholder = document.getElementById('log-workout-placeholder');
  if (pwPlaceholder) pwPlaceholder.classList.remove('hidden');
  const pwDesc = document.getElementById('workout-description');
  if (pwDesc) { pwDesc.classList.add('hidden'); clearChildren(pwDesc); }
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
    clearChildren(slots);
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
  clearChildren(document.getElementById('share-qr-display'));
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

const debouncedUpdateLeaderboard = debounce(async (uid, dots, sinclair) => {
    if (!auth.currentUser || auth.currentUser.uid !== uid) return;
    await updateUserLeaderboardProfile(uid, dots, sinclair);
}, 5000);

const debouncedSyncActivity = debounce(() => {
    computeAndSyncDailyActivity();
}, 3000);

;

// ── Action Handler Registry (replaces window.* inline onclick exports) ──
const actionHandlers = {
  'calc-remove':                (el) => handleCalcRemove(el),
  'remove-minute-slot':         (el) => removeMinuteSlot(el),
  'remove-plan-movement':       (el) => removePlanMovement(parseInt(el.dataset.index, 10)),
  'select-calendar-day':        (el) => selectCalendarDay(el.dataset.date),
  'toggle-workout-card':        (el) => toggleWorkoutCard(el),
  'toggle-structured-favorite': (el) => toggleStructuredFavorite(el.dataset.id),
  'toggle-plan-favorite':       (el) => togglePlanFavorite(el.dataset.id),
  'toggle-shared-favorite':     (el) => toggleFavorite(el.dataset.id),
  'do-structured-workout':      (el) => doStructuredWorkout(el.dataset.id),
  'redo-workout':               (el) => redoWorkout(el.dataset.id),
  'open-share-modal-workout':   (el) => openShareModal(el.dataset.id, true),
  'delete-structured-workout':  (el) => deleteStructuredWorkout(el.dataset.id),
  'do-plan-workout':            (el) => doPlanWorkout(el.dataset.id),
  'load-plan':                  (el) => loadPlan(el.dataset.id),
  'open-share-modal-plan':      (el) => openShareModal(el.dataset.id),
  'delete-plan':                (el) => deletePlan(el.dataset.id),
  'do-shared-plan':             (el) => doSharedPlan(el.dataset.id),
  'load-shared-plan':           (el) => loadSharedPlan(el.dataset.id, loadWorkoutIntoBuilder),
  'dismiss-shared-plan':        (el) => dismissSharedPlan(el.dataset.id),
  'remove-friend':              (el) => removeFriend(el.dataset.uid),
  'add-friend':                 (el) => addFriendFromLeaderboard(el.dataset.uid),
};

function initActionDispatcher() {
  document.body.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const handler = actionHandlers[el.dataset.action];
    if (handler) handler(el, e);
  });
}

enableSwipe(document.getElementById('vh-bars-container'), {
  onSwipeLeft: () => shiftVolumePeriod(1),
  onSwipeRight: () => shiftVolumePeriod(-1)
});

enableSwipe(document.getElementById('cal-grid-container'), {
  onSwipeLeft: () => changeCalendarNav(1),
  onSwipeRight: () => changeCalendarNav(-1)
});

// Profile Modal
const modalClose = document.getElementById('profile-modal-close');
const modalBackdrop = document.getElementById('profile-modal-backdrop');

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

  // Event delegation for dynamic content
  initActionDispatcher();
}

// Initialize CSP handlers after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCSPHandlers);
} else {
  initCSPHandlers();
}