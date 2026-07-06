import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser, collection, addDoc, query, where, onSnapshot, deleteDoc, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, orderBy, limit, Timestamp, getDocs } from './firebase.js';
import { state, EPLEY_CONSTANT, HAPTIC, CONSISTENCY_CONFIG, RPE_RIR_MAP, entriesPerPage, INPUT_CLASS, CALC_CLASS, FORM_SCHEMAS, activeDates, loginView, appView, bottomNav, authBtn, profileBtn, profileModal, emailInput, passwordInput, loginBtn, signupBtn, greeting, profileForm, workoutForm, workoutList, paginationControls, prevPageBtn, nextPageBtn, currentPageDisplay, totalPagesDisplay, workoutFilter, exerciseSelect, onboardingView, onboardingGender, onboardingWeight, onboardingDaysMonthly, onboardingDaysYearly, onboardingDaysLifetime, onboardingExerciseSelect, onboardingWeightInput, onboardingRepsInput, onboardingAddBtn, onboardingList, onboardingEmpty, onboardingSaveBtn, onboardingFeedback, pbLogExercise, pbLogBtn, pbLogFeedback, tabContents, navTabs } from './state.js';
import { estimate1RM, estimateWeightForReps, computeEffectiveLoad, getEffectiveLoad } from './math.js';
import { debounce, escapeHtml, haptic } from './dom.js';
import { getExerciseInfo, getDisplayName, EXERCISE_CATALOG, LOAD_FACTORS } from './exercise-data.js';
import { getMonday, countActiveDays, countConsecutiveDays, toLocalDateKey } from './date.js';
import { formatMovementLoad, formatCardDate, formatWorkoutType, formatDotsScore, formatMovementWeight } from './formatting.js';
import { computeDotsScore, computeSinclairScore, getRankingTier, formatScore_ROUNDS_AND_REPS, formatScore_COMPLETED_MINUTES, formatScore_TIME_SECONDS, describeAmrap, describeEmom, describeForTime, describeInterval, buildWorkoutDescription, buildWorkoutSummaryLine, getRepsPerRound } from './analytics.js';
import { clearChildren, renderEmptyState, renderMessage, updatePagination, updatePaginationControls, updatePillActive, setChallengeCard, updateCalTodayBtnState, updateTodayBtnState, toggleWorkoutCard, updateStarIcon, toggleSelectAllFriends, buildExerciseOptionsHtml, saveExpandedCardIds, restoreExpandedCardIds, showFeedback, showToast, openProfileModal, closeProfileModal, showPlanNameModal, enableSwipe, changeGenericPage, switchTab } from './ui.js';
import { buildWmsField, applyFieldAttributes, renderFormFields, renderOnboarding1RMItem, renderOnboarding1RMList, renderCalcEntry, renderCalcEntries, renderPlanMovementItem, renderPlanMovements, renderMovementChips, renderEmomChips, renderCalendarWorkoutItem, renderVolumeBar, renderMinuteSlotInner, renderShareFriendItem, renderRegistryRow, renderLeaderboardEmptyRow, buildCalendarDayHtml, workoutToLogHtml, renderWorkoutCard, renderStructuredWorkoutCard, renderPlanCard, renderSharedPlanCard, friendToHtml, buildLeaderboardRow } from './rendering.js';
import { getSchemaKey, computeTotalLoad, pullProfileMetrics, refreshPBForm, processWorkoutSnapshot, updateCaches } from './auth.js';
import { showOnboarding, hideOnboarding, addOnboarding1RM } from './onboarding.js';
import { computeAndSyncDailyActivity, renderConsistencyUI, calculateChallengeProgress, renderChallengeCards, loadConsistencyConfig, getPreviousPeriodId, calculateStreakFromPeriods, renderStreakUI, updateChallengeStreaks, renderCalendar, updateConsistencyMetrics, getWorkoutsForDate, selectCalendarDay, changeCalendarNav, applyCalendarNav, autoSelectFirstActiveDay, goToCalendarToday, toggleCalendarView, closeCalendarDayDetail } from './calendar.js';
import { renderLogs, getWeekStart, getWeekEnd, computeDailyBuckets, computeWeeklyBuckets, computeMonthlyBuckets, computeYearlyBuckets, computeVolumeHistory, formatRangeLabel, renderVolumeHistory, switchVolumePeriod, shiftVolumePeriod, goToCurrentPeriod, populateVolumeFilter, onVolumeFilterChange } from './volume.js';
import { getProfileDocRef, getProfileDocument, initSocialProfile, copyCyberTag, handleAddFriend, addFriendFromLeaderboard, removeFriend, cacheUncachedProfiles, renderActiveFriendsList, changeFriendsPage, filterLeaderboardProfiles, computeLeaderboardSlice, switchLeaderboardScope, toggleLeaderboardExpand, renderLeaderboardView, syncLeaderboardFeed, switchLeaderboardFormula, updateUserLeaderboardProfile, showQRCode, processFriendRequest, processClaimedPlan, switchShareMode, openShareModal, resolveShareContent, buildSharedPlanDocument, buildQrShareUrl, buildQrCodeConfig, shareWithFriends, shareByQR, listenToSharedPlans, renderSharedPlansUI, changeSharedPlansPage, saveSharedPlanToMyPlans, dismissSharedPlan, toggleFavoriteGeneric, toggleFavorite, togglePlanFavorite, toggleStructuredFavorite, loadSharedPlan, cleanupSocialSubscriptions } from './social.js';
import { writeStructuredLogEntry, generateContributionsBase, generateAmrapContributions, handleWorkoutTypeChange, switchEmomMode, addPlanMinuteSlot, refreshPlanForm, handlePlanExerciseChange, togglePlanWms, previewPctMode, previewRpeMode, previewAbsoluteMode, updatePlanCalcPreview, handlePlanAdd, removePlanMovement, populatePlanMovements, formatIntervalLabel, validatePlanInputs, generateAutoPlanName, buildPlanDocument, savePlan, removeMinuteSlot, updateEmomDurationDisplay, updateEmomSummary, getEmomMovementData, updateEmomScorePreview, generateEmomContributions, toggleForTimeDnf, updateForTimeScorePreview, generateForTimeContributions, updateIntervalScorePreview, recalcForTimeRemaining, logRound, logRep, updateLogScorePreview, updateLogWorkoutButtonState, generateIntervalContributions, listenToStructuredWorkouts, renderStructuredWorkoutHistory, changeStructuredPage, listenToPlans, renderPlansUI, switchPlansFilter, changePlansPage, deletePlan, deleteStructuredWorkout, loadWorkoutIntoBuilder, loadPlan, redoWorkout, setupTrainingTab, doWorkout, doStructuredWorkout, doPlanWorkout, doSharedPlan, submitStructuredWorkout, submitAmrapWorkout, submitEmomWorkout, submitForTimeWorkout, submitIntervalWorkout, resetTrainingTab, submitPendingWorkout, capturePlanStructure, populateAmrapForm, populateEmomForm, populateForTimeForm, populateIntervalForm, populateMovementDropdowns, updateAmrapScorePreview, cleanupWorkoutSubscriptions, debouncedSyncActivity } from './plans.js';

let currentUser = null;
let unsubscribeLogs = null;
let pendingOnboarding1RMs = [];
let urlParamsProcessed = false;
let listenersAttached = false;

// Initialize Lucide icons
if (typeof lucide !== 'undefined' && lucide.createIcons) {
  lucide.createIcons();
}

// Volume History State (Issue #38)

// ─── Schema-Driven Form Layouts ──────────────────────────────────────────────

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
  cleanupWorkoutSubscriptions();
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

    let weight;
    let detail;

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

const debouncedUpdateLeaderboard = debounce(async (uid, dots, sinclair) => {
    if (!auth.currentUser || auth.currentUser.uid !== uid) return;
    await updateUserLeaderboardProfile(uid, dots, sinclair);
}, 5000);

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