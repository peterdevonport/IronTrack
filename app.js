import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser, collection, addDoc, writeBatch, query, where, onSnapshot, deleteDoc, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, orderBy, limit, Timestamp, getDocs } from './firebase.js';
import { state, EPLEY_CONSTANT, HAPTIC, CONSISTENCY_CONFIG, entriesPerPage, INPUT_CLASS, CALC_CLASS, FORM_SCHEMAS, activeDates, loginView, appView, bottomNav, authBtn, profileBtn, profileModal, emailInput, passwordInput, loginBtn, signupBtn, greeting, profileForm, workoutForm, workoutList, paginationControls, prevPageBtn, nextPageBtn, currentPageDisplay, totalPagesDisplay, workoutFilter, exerciseSelect, onboardingView, onboardingGender, onboardingWeight, onboardingDaysMonthly, onboardingDaysYearly, onboardingDaysLifetime, onboardingExerciseSelect, onboardingWeightInput, onboardingRepsInput, onboardingAddBtn, onboardingList, onboardingEmpty, onboardingSaveBtn, onboardingFeedback, pbLogExercise, pbLogBtn, pbLogFeedback, tabContents, navTabs, FEEDBACK_DISMISS_DEFAULT_MS } from './state.js';
import { estimate1RM, estimateWeightForReps, computeEffectiveLoad, getEffectiveLoad } from './math.js';
import { debounce, escapeHtml, haptic } from './dom.js';
import { getExerciseInfo, getDisplayName, EXERCISE_CATALOG, LOAD_FACTORS, resolveExerciseVariant } from './exercise-data.js';
import { getMonday, countActiveDays, countConsecutiveDays, toLocalDateKey } from './date.js';
import { formatMovementLoad, formatCardDate, formatWorkoutType, formatDotsScore, formatMovementWeight } from './formatting.js';
import { computeDotsScore, computeSinclairScore, getRankingTier, formatScore_ROUNDS_AND_REPS, formatScore_COMPLETED_MINUTES, formatScore_TIME_SECONDS, describeAmrap, describeEmom, describeForTime, describeInterval, buildWorkoutDescription, buildWorkoutSummaryLine, getRepsPerRound } from './analytics.js';
import { PERMISSION_ERROR_MAP, clearChildren, renderEmptyState, renderMessage, updatePagination, updatePaginationControls, updatePillActive, setChallengeCard, updateCalTodayBtnState, updateTodayBtnState, toggleWorkoutCard, updateStarIcon, toggleSelectAllFriends, buildExerciseOptionsHtml, showFeedback, showToast, openProfileModal, closeProfileModal, showPlanNameModal, enableSwipe, changeGenericPage, switchTab, isPermissionDenied, FEEDBACK_ERROR_CLASS, FEEDBACK_SUCCESS_CLASS, FEEDBACK_NEUTRAL_CLASS } from './ui.js';
import { buildWmsField, applyFieldAttributes, renderFormFields } from './forms.js';
import { renderOnboarding1RMItem, renderOnboarding1RMList, renderCalcEntry, renderCalcEntries, renderPlanMovementItem, renderPlanMovements, renderMovementChips, renderEmomChips, renderCalendarWorkoutItem, renderVolumeBar, renderMinuteSlotInner, renderShareFriendItem, renderRegistryRow, renderLeaderboardEmptyRow, buildCalendarDayHtml, workoutToLogHtml, renderWorkoutCard, renderStructuredWorkoutCard, renderPlanCard, renderSharedPlanCard, friendToHtml, buildLeaderboardRow } from './rendering.js';
import { computeTotalLoad, pullProfileMetrics, refreshPBForm, processWorkoutSnapshot, updateCaches, logPB, requireAuth } from './auth.js';
import { showOnboarding, hideOnboarding, addOnboarding1RM } from './onboarding.js';
import { computeAndSyncDailyActivity, renderConsistencyUI, calculateChallengeProgress, renderChallengeCards, loadConsistencyConfig, getPreviousPeriodId, calculateStreakFromPeriods, renderStreakUI, updateChallengeStreaks, renderCalendar, updateConsistencyMetrics, getWorkoutsForDate, selectCalendarDay, changeCalendarNav, applyCalendarNav, autoSelectFirstActiveDay, goToCalendarToday, toggleCalendarView, closeCalendarDayDetail } from './calendar.js';
import { renderLogs, getWeekStart, getWeekEnd, computeDailyBuckets, computeWeeklyBuckets, computeMonthlyBuckets, computeYearlyBuckets, computeVolumeHistory, formatRangeLabel, renderVolumeHistory, switchVolumePeriod, shiftVolumePeriod, goToCurrentPeriod, populateVolumeFilter, onVolumeFilterChange } from './volume.js';
import { getProfileDocRef, getProfileDocument, initSocialProfile, copyCyberTag, handleAddFriend, addFriendFromLeaderboard, removeFriend, cacheUncachedProfiles, renderActiveFriendsList, changeFriendsPage, filterLeaderboardProfiles, computeLeaderboardSlice, switchLeaderboardScope, toggleLeaderboardExpand, renderLeaderboardView, syncLeaderboardFeed, switchLeaderboardFormula, updateUserLeaderboardProfile, showQRCode, processFriendRequest, processClaimedPlan, switchShareMode, openShareModal, resolveShareContent, buildSharedPlanDocument, buildQrShareUrl, buildQrCodeConfig, shareWithFriends, shareByQR, listenToSharedPlans, renderSharedPlansUI, changeSharedPlansPage, saveSharedPlanToMyPlans, dismissSharedPlan, toggleFavoriteGeneric, toggleFavorite, togglePlanFavorite, toggleStructuredFavorite, loadSharedPlan, cleanupSocialSubscriptions } from './social.js';
import { handleWorkoutTypeChange, switchEmomMode, addPlanMinuteSlot, refreshPlanForm, handlePlanExerciseChange, togglePlanWms, previewPctMode, previewRpeMode, previewAbsoluteMode, updatePlanCalcPreview, handlePlanAdd, removePlanMovement, populatePlanMovements, formatIntervalLabel, validatePlanInputs, generateAutoPlanName, buildPlanDocument, savePlan, removeMinuteSlot, updateEmomDurationDisplay, updateEmomSummary, getEmomMovementData, updateEmomScorePreview, listenToPlans, renderPlansUI, switchPlansFilter, changePlansPage, deletePlan, deleteStructuredWorkout, loadWorkoutIntoBuilder, loadPlan, redoWorkout, capturePlanStructure, populateAmrapForm, populateEmomForm, populateForTimeForm, populateIntervalForm, populateMovementDropdowns, cleanupWorkoutSubscriptions } from './plans.js';
import { writeStructuredLogEntry, generateContributionsBase, generateAmrapContributions, listenToStructuredWorkouts, renderStructuredWorkoutHistory, changeStructuredPage, setupTrainingTab, doWorkout, doStructuredWorkout, doPlanWorkout, doSharedPlan, submitStructuredWorkout, submitAmrapWorkout, submitEmomWorkout, submitForTimeWorkout, submitIntervalWorkout, resetTrainingTab, submitPendingWorkout, toggleForTimeDnf, updateForTimeScorePreview, updateIntervalScorePreview, recalcForTimeRemaining, logRound, logRep, updateLogScorePreview, updateLogWorkoutButtonState, generateEmomContributions, generateForTimeContributions, generateIntervalContributions, updateAmrapScorePreview } from './workouts.js';
import { update1RMRegistryUI, updateCalcCard, switchCalcMode, updateCalcPreview, handleCalcAdd, handleCalcRemove, handleCalcClear, updateLogSetButtonState, refreshLogSetForm, populateLiftSelectors, populateExerciseDropdown, populateWorkoutFilter, changePage, changeRecordsPage, currentCalcMode } from './calc.js';
import { renderFromWorkouts, listenToDataStream, processAnalytics } from './data.js';

const PASSWORD_ERROR_MAP = {
  'auth/wrong-password': 'Current password is incorrect.',
  'auth/weak-password': 'New password is too weak.',
  'auth/requires-recent-login': 'Please sign out and sign in again, then retry.',
};
const DELETE_ERROR_MAP = {
  'auth/wrong-password': 'Incorrect password. Account not deleted.',
  'auth/requires-recent-login': 'Session expired. Please sign out and sign in again, then retry.',
};
const PASSWORD_RESET_ERROR_MAP = {
  'auth/user-not-found': 'No account found with this email.',
  'auth/invalid-email': 'Invalid email address.',
};
const MSG = {
  SELECT_EXERCISE: 'Please select an exercise.',
  INVALID_SETS_REPS: 'Please enter valid sets and reps.',
};
let currentUser = null;
let unsubscribeLogs = null;
let pendingOnboarding1RMs = [];
let urlParamsProcessed = false;
let listenersAttached = false;

function showForgotPassword() {
  authFormContainer.classList.add('hidden');
  forgotPasswordSection.classList.remove('hidden');
  forgotPasswordEmail.value = emailInput.value || '';
  forgotPasswordEmail.focus();
  forgotPasswordFeedback.textContent = '';
  forgotPasswordFeedback.className = FEEDBACK_NEUTRAL_CLASS;
}

function showAuthForm() {
  forgotPasswordSection.classList.remove('hidden');
  authFormContainer.classList.add('hidden');
  forgotPasswordEmail.value = '';
  forgotPasswordFeedback.textContent = '';
  forgotPasswordFeedback.className = FEEDBACK_NEUTRAL_CLASS;
}

function enableSaveOnDirty() { saveProfileBtn.disabled = false; }
if (typeof lucide !== 'undefined' && lucide.createIcons) {
  lucide.createIcons();
}

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  showFeedback('An unexpected error occurred. Please try again.', 'red');
});

navTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.tab === 'profile') {
      openProfileModal();
    } else {
      switchTab(btn.dataset.tab);
    }
  });
});
const pendingFriendUid = new URLSearchParams(window.location.search).get('addFriend');
const pendingClaimPlanId = new URLSearchParams(window.location.search).get('claimPlan');
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    try {
      await handleSignedIn(user);
    } catch (err) {
      console.error('Auth state handler failed:', err);
      showFeedback('Failed to load your profile. Please try refreshing the page.', 'red');
      handleSignedOut();
    }
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
  try {
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
  } catch (err) {
    console.error('Failed to process URL parameters:', err);
  }
}
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return showFeedback('Please fill out all credential spaces.', 'red', 'auth-feedback');

    try {
        await signInWithEmailAndPassword(auth, email, password);
        emailInput.value = "";
        passwordInput.value = "";
    } catch (error) {
        showFeedback(`Authentication Rejected: ${error.message}`, 'red', 'auth-feedback');
    }
});

signupBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return showFeedback('Please assign an email and password.', 'red', 'auth-feedback');
    if (password.length < 6) return showFeedback('Password security requires at least 6 characters.', 'red', 'auth-feedback');

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        emailInput.value = "";
        passwordInput.value = "";
        showFeedback('Account mapped successfully!', 'emerald', 'auth-feedback');
    } catch (error) {
        showFeedback(`Registration Failed: ${error.message}`, 'red', 'auth-feedback');
    }
});

authBtn.addEventListener('click', () => { if (currentUser && confirm("Sign out?")) signOut(auth); });
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
const forgotPasswordBtn = document.getElementById('forgot-password-btn');
const forgotPasswordSection = document.getElementById('forgot-password-section');
const forgotPasswordEmail = document.getElementById('forgot-password-email');
const forgotPasswordSend = document.getElementById('forgot-password-send');
const forgotPasswordCancel = document.getElementById('forgot-password-cancel');
const forgotPasswordFeedback = document.getElementById('forgot-password-feedback');
const authFormContainer = document.getElementById('auth-form-container');

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
      forgotPasswordFeedback.className = FEEDBACK_ERROR_CLASS;
      return;
    }
    forgotPasswordSend.disabled = true;
    forgotPasswordSend.textContent = 'Sending...';
    try {
      await sendPasswordResetEmail(auth, email);
      forgotPasswordFeedback.textContent = 'Reset link sent! Check your email.';
      forgotPasswordFeedback.className = FEEDBACK_SUCCESS_CLASS;
      setTimeout(showAuthForm, FEEDBACK_DISMISS_DEFAULT_MS);
    } catch (error) {
      const msg = PASSWORD_RESET_ERROR_MAP[error.code] || `Failed: ${error.message}`;
      forgotPasswordFeedback.textContent = msg;
      forgotPasswordFeedback.className = FEEDBACK_ERROR_CLASS;
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
        const batch = writeBatch(db);

        const profileRef = doc(db, "profiles", currentUser.uid);
        const profileData = buildOnboardingProfileData(values, pendingOnboarding1RMs);
        batch.set(profileRef, profileData, { merge: true });

        state.user.userBiometrics.gender = values.gender;
        state.user.userBiometrics.bodyweight = values.bodyweight;
        state.user.userBiometrics.day0TrainingDays = { monthly: values.day0Monthly, yearly: values.day0Yearly, lifetime: values.day0Lifetime };
        state.user.userBiometrics.onboardingComplete = true;

        document.getElementById('profile-gender').value = values.gender;
        document.getElementById('profile-weight').value = values.bodyweight;

        for (const item of pendingOnboarding1RMs) {
            const workoutRef = doc(collection(db, "workouts"));
            batch.set(workoutRef, buildOnboardingLogEntry(item, currentUser.uid));
        }

        await batch.commit();

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
const saveProfileBtn = document.getElementById('save-profile-btn');
const profileFields = ['profile-display-name', 'profile-gender', 'profile-weight'];

profileFields.forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', enableSaveOnDirty);
    el.addEventListener('change', enableSaveOnDirty);
  }
});
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
    cpFeedback.className = FEEDBACK_NEUTRAL_CLASS;
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
      cpFeedback.className = FEEDBACK_ERROR_CLASS;
      return;
    }
    if (newPw.length < 6) {
      cpFeedback.textContent = 'New password must be at least 6 characters.';
      cpFeedback.className = FEEDBACK_ERROR_CLASS;
      return;
    }
    if (newPw !== confirmPw) {
      cpFeedback.textContent = 'New passwords do not match.';
      cpFeedback.className = FEEDBACK_ERROR_CLASS;
      return;
    }
    if (newPw === currentPw) {
      cpFeedback.textContent = 'New password must differ from current.';
      cpFeedback.className = FEEDBACK_ERROR_CLASS;
      return;
    }

    cpUpdate.disabled = true;
    cpUpdate.textContent = 'Updating...';
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPw);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPw);
      cpFeedback.textContent = 'Password updated successfully!';
      cpFeedback.className = FEEDBACK_SUCCESS_CLASS;
      cpCurrent.value = '';
      cpNew.value = '';
      cpConfirm.value = '';
      setTimeout(() => {
        changePasswordForm.classList.add('hidden');
        changePasswordBtn.classList.remove('hidden');
        cpFeedback.textContent = '';
      }, FEEDBACK_DISMISS_DEFAULT_MS);
      haptic(HAPTIC.confirm);
    } catch (err) {
      const msg = PASSWORD_ERROR_MAP[err.code] || `Failed: ${err.message}`;
      cpFeedback.textContent = msg;
      cpFeedback.className = FEEDBACK_ERROR_CLASS;
    } finally {
      cpUpdate.disabled = false;
      cpUpdate.textContent = 'Update Password';
    }
  });
}
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
      const msg = DELETE_ERROR_MAP[err.code] || `Failed to delete account: ${err.message}`;
      showFeedback(msg, 'red', 'profileFeedback');
    } finally {
      deleteAccountBtn.disabled = false;
      deleteAccountBtn.textContent = 'Delete Account';
    }
  });
}
if (onboardingAddBtn) {
    onboardingAddBtn.addEventListener('click', () => addOnboarding1RM(pendingOnboarding1RMs));
}
if (onboardingSaveBtn) {
    onboardingSaveBtn.addEventListener('click', saveOnboarding);
}
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
if (pbLogBtn) {
    pbLogBtn.addEventListener('click', logPB);
}
if (pbLogExercise) {
    pbLogExercise.addEventListener('change', () => refreshPBForm(FORM_SCHEMAS));
    pbLogExercise.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); logPB(); }
    });
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest('#pb-log-fields')) {
        e.preventDefault();
        logPB();
    }
});

if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => changePage('prev'));
}
if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => changePage('next'));
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
if (exerciseSelect) {
  exerciseSelect.addEventListener('change', refreshLogSetForm);
}
populateExerciseDropdown();
populateLiftSelectors();
refreshLogSetForm();
refreshPBForm(FORM_SCHEMAS);
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
const chipPBEl = document.getElementById('chip-pb'); //
const chip1RMEl = document.getElementById('chip-1rm'); //

if (chipPBEl) {
  chipPBEl.dataset.active = 'false'; //
  chipPBEl.addEventListener('click', () => {
    const active = chipPBEl.dataset.active !== 'true'; //
    chipPBEl.dataset.active = active ? 'true' : 'false'; //
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
    chip1RMEl.classList.toggle('is-active', active);
    
    state.pagination.workouts = 1; //
    renderLogs(state.data.lastWorkouts); //
  });
}
function extractWorkoutFormValues() {
    return {
        exercise: document.getElementById('exercise')?.value,
        sets: parseInt(document.getElementById('log-set-sets')?.value, 10),
        reps: parseInt(document.getElementById('log-set-reps')?.value, 10),
        weight: parseFloat(document.getElementById('log-set-weight')?.value) || parseFloat(document.getElementById('log-set-bodyweight')?.value) || 0,
        externalLoad: parseFloat(document.getElementById('log-set-ext-load')?.value) || 0,
    };
}

function validateWorkoutValues(values) {
    if (!values.exercise) return MSG.SELECT_EXERCISE;
    if (isNaN(values.sets) || isNaN(values.reps) || values.sets <= 0 || values.reps <= 0) return MSG.INVALID_SETS_REPS;
    return null;
}

workoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!requireAuth('workoutFeedback')) return;

    const values = extractWorkoutFormValues();
    const validationError = validateWorkoutValues(values);
    if (validationError) return showFeedback(validationError, 'red', 'workoutFeedback');

    const estimatedLoad = computeEffectiveLoad(values.exercise, values.weight, values.externalLoad, state.user.userBiometrics.bodyweight);
    const totalVolume = estimatedLoad * values.reps * values.sets;

    const storedExercise = resolveExerciseVariant(values.exercise, values.externalLoad);

    const log = {
        userId: currentUser.uid,
        exercise: storedExercise,
        sets: values.sets,
        reps: values.reps,
        weight: values.weight,
        externalLoad: values.externalLoad,
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
        if (isPermissionDenied(err)) {
            showFeedback(PERMISSION_ERROR_MAP.saveWorkout, 'red', 'workoutFeedback');
        } else {
            showFeedback(`Failed to save workout: ${err.message}`, 'red', 'workoutFeedback');
        }
    }
});
const amrapRounds = document.getElementById('amrap-rounds');
const amrapAdditional = document.getElementById('amrap-additional-reps');
if (amrapRounds) amrapRounds.addEventListener('input', updateAmrapScorePreview);
if (amrapAdditional) amrapAdditional.addEventListener('input', updateAmrapScorePreview);
const emomRoundsCompleted = document.getElementById('emom-rounds-completed');
const emomRounds = document.getElementById('emom-rounds');
const emomIntervalMin = document.getElementById('emom-interval-min');
const emomIntervalSec = document.getElementById('emom-interval-sec');
if (emomRoundsCompleted) emomRoundsCompleted.addEventListener('input', updateEmomScorePreview);
if (emomRounds) emomRounds.addEventListener('input', () => { updateEmomScorePreview(); updateEmomSummary(); updateEmomDurationDisplay(); });
if (emomIntervalMin) emomIntervalMin.addEventListener('input', () => { updateEmomSummary(); updateEmomDurationDisplay(); });
if (emomIntervalSec) emomIntervalSec.addEventListener('input', () => { updateEmomSummary(); updateEmomDurationDisplay(); });
const fortimeMinutes = document.getElementById('fortime-minutes');
const fortimeSeconds = document.getElementById('fortime-seconds');
const fortimeDnf = document.getElementById('fortime-dnf');
const fortimeCapReps = document.getElementById('fortime-cap-reps');
if (fortimeMinutes) fortimeMinutes.addEventListener('input', updateForTimeScorePreview);
if (fortimeSeconds) fortimeSeconds.addEventListener('input', updateForTimeScorePreview);
if (fortimeDnf) fortimeDnf.addEventListener('change', updateForTimeScorePreview);
if (fortimeCapReps) fortimeCapReps.addEventListener('input', updateForTimeScorePreview);
const logRoundsInput = document.getElementById('log-rounds');
const logPartialInput = document.getElementById('log-partial-reps');
if (logRoundsInput) { logRoundsInput.addEventListener('input', updateLogScorePreview); logRoundsInput.addEventListener('input', updateLogWorkoutButtonState); logRoundsInput.addEventListener('input', recalcForTimeRemaining); }
if (logPartialInput) { logPartialInput.addEventListener('input', updateLogScorePreview); logPartialInput.addEventListener('input', updateLogWorkoutButtonState); logPartialInput.addEventListener('input', recalcForTimeRemaining); }
document.getElementById('fortime-cap-reps')?.addEventListener('input', updateLogScorePreview);
const emomModeSeq = document.getElementById('emom-mode-seq');
const emomModeByRound = document.getElementById('emom-mode-by-round');
if (emomModeSeq) emomModeSeq.addEventListener('click', () => switchEmomMode('sequence'));
if (emomModeByRound) emomModeByRound.addEventListener('click', () => switchEmomMode('by_round'));
const emomMinuteSlots = document.getElementById('emom-minute-slots');
if (emomMinuteSlots) {
  emomMinuteSlots.addEventListener('change', () => {
    updateEmomSummary();
    updateEmomDurationDisplay();
    updateEmomScorePreview();
  });
}

document.addEventListener('input', (e) => {
  const input = e.target;
  if (input.id === 'plan-weight' || input.id === 'plan-reps') {
    updatePlanCalcPreview();
  }
});

populateMovementDropdowns();
refreshPlanForm();
const prevStructuredBtn = document.getElementById('prev-structured-page-btn');
const nextStructuredBtn = document.getElementById('next-structured-page-btn');
if (prevStructuredBtn) prevStructuredBtn.addEventListener('click', () => changeStructuredPage('prev'));
if (nextStructuredBtn) nextStructuredBtn.addEventListener('click', () => changeStructuredPage('next'));
const prevFriendsBtn = document.getElementById('prev-friends-page-btn');
const nextFriendsBtn = document.getElementById('next-friends-page-btn');
if (prevFriendsBtn) prevFriendsBtn.addEventListener('click', () => changeFriendsPage('prev'));
if (nextFriendsBtn) nextFriendsBtn.addEventListener('click', () => changeFriendsPage('next'));
const prevPlansBtn = document.getElementById('prev-plans-page-btn');
const nextPlansBtn = document.getElementById('next-plans-page-btn');
if (prevPlansBtn) prevPlansBtn.addEventListener('click', () => changePlansPage('prev'));
if (nextPlansBtn) nextPlansBtn.addEventListener('click', () => changePlansPage('next'));
const shareSendBtn = document.getElementById('share-plan-send');
const shareCancelBtn = document.getElementById('share-plan-cancel');
if (shareSendBtn) shareSendBtn.addEventListener('click', () => shareWithFriends());
if (shareCancelBtn) shareCancelBtn.addEventListener('click', () => {
  document.getElementById('share-plan-modal').classList.add('hidden');
  document.getElementById('share-plan-feedback').textContent = '';
  clearChildren(document.getElementById('share-qr-display'));
  state.share.sharePlanId = null;
});
const prevSharedPlansBtn = document.getElementById('prev-shared-plans-page-btn');
const nextSharedPlansBtn = document.getElementById('next-shared-plans-page-btn');
if (prevSharedPlansBtn) prevSharedPlansBtn.addEventListener('click', () => changeSharedPlansPage('prev'));
if (nextSharedPlansBtn) nextSharedPlansBtn.addEventListener('click', () => changeSharedPlansPage('next'));

;
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
function initCSPHandlers() {
  const bind = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  };
  bind('cal-prev-month', 'click', () => changeCalendarNav(-1));
  bind('cal-today', 'click', goToCalendarToday);
  bind('cal-next-month', 'click', () => changeCalendarNav(1));
  bind('cal-toggle-view', 'click', toggleCalendarView);
  bind('cal-day-detail-close', 'click', closeCalendarDayDetail);
  bind('plans-filter-mine', 'click', () => switchPlansFilter('mine'));
  bind('plans-filter-shared', 'click', () => switchPlansFilter('shared'));
  bind('plans-filter-favorites', 'click', () => switchPlansFilter('favorites'));
  bind('btnGlobalBoard', 'click', () => switchLeaderboardScope('global'));
  bind('btnFriendsBoard', 'click', () => switchLeaderboardScope('friends'));
  bind('btnFormulaDots', 'click', () => switchLeaderboardFormula('dots'));
  bind('btnFormulaSinclair', 'click', () => switchLeaderboardFormula('sinclair'));
  bind('leaderboard-expand-btn', 'click', toggleLeaderboardExpand);
  bind('log-round-btn', 'click', logRound);
  bind('log-rep-btn', 'click', logRep);
  bind('log-workout-btn', 'click', submitPendingWorkout);
  bind('fortime-dnf', 'change', toggleForTimeDnf);
  bind('share-mode-friends', 'click', () => switchShareMode('friends'));
  bind('share-mode-qr', 'click', () => switchShareMode('qr'));
  bind('share-select-all', 'change', toggleSelectAllFriends);
  bind('calc-mode-pct', 'click', () => switchCalcMode('pct'));
  bind('calc-mode-rpe', 'click', () => switchCalcMode('rpe'));
  bind('workout-type', 'change', handleWorkoutTypeChange);
  bind('emom-mode-seq', 'click', () => switchEmomMode('sequence'));
  bind('emom-mode-by-round', 'click', () => switchEmomMode('by_round'));
  bind('plan-exercise', 'change', handlePlanExerciseChange);
  bind('plan-add-btn', 'click', handlePlanAdd);
  bind('btn-do-workout', 'click', doWorkout);
  bind('btn-save-plan', 'click', savePlan);
  bind('vh-filter', 'change', onVolumeFilterChange);
  bind('vh-period-daily', 'click', () => switchVolumePeriod('daily'));
  bind('vh-period-weekly', 'click', () => switchVolumePeriod('weekly'));
  bind('vh-period-monthly', 'click', () => switchVolumePeriod('monthly'));
  bind('vh-period-yearly', 'click', () => switchVolumePeriod('yearly'));
  bind('vh-prev', 'click', () => shiftVolumePeriod(-1));
  bind('vh-today', 'click', goToCurrentPeriod);
  bind('vh-next', 'click', () => shiftVolumePeriod(1));
  bind('btnCopyCyberTag', 'click', copyCyberTag);
  bind('btnAddFriend', 'click', handleAddFriend);
  initActionDispatcher();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCSPHandlers);
} else {
  initCSPHandlers();
}