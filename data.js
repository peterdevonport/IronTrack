import { auth, db, collection, query, where, onSnapshot, doc, getDoc, orderBy, limit, Timestamp, serverTimestamp, setDoc } from './firebase.js';
import { state } from './state.js';
import { estimate1RM, getEffectiveLoad } from './math.js';
import { debounce } from './dom.js';
import { computeDotsScore, computeSinclairScore, getRankingTier } from './analytics.js';
import { showFeedback } from './ui.js';
import { updateUserLeaderboardProfile } from './leaderboard.js';
import { update1RMRegistryUI, updateCalcCard, populateLiftSelectors, populateExerciseDropdown, populateWorkoutFilter, changePage, changeRecordsPage } from './calc.js';
import { processWorkoutSnapshot, updateCaches } from './auth.js';
import { renderLogs, renderVolumeHistory, populateVolumeFilter } from './volume.js';
import { renderStructuredWorkoutHistory, debouncedSyncActivity } from './workouts.js';
import { computeAndSyncDailyActivity } from './calendar.js';

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
        limit(250)
    );
    onSnapshot(q, (snapshot) => {
        const processed = processWorkoutSnapshot(snapshot.docs, getEffectiveLoad, estimate1RM);
        updateCaches(processed);
        renderFromWorkouts(state.data.lastWorkouts);
    });
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

    if (auth.currentUser) {
        debouncedUpdateLeaderboard(auth.currentUser.uid, dots, sinclair);
    }
}

const debouncedUpdateLeaderboard = debounce(async (uid, dots, sinclair) => {
    if (!auth.currentUser || auth.currentUser.uid !== uid) return;
    await updateUserLeaderboardProfile(uid, dots, sinclair);
}, 5000);

export { renderFromWorkouts, listenToDataStream, processAnalytics };
