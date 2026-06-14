import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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
window.__irontrackAppLoaded = true;
window.__irontrackAuthState = 'pending';
window.__irontrackWorkoutCount = 0;

// UI Selectors
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const authBtn = document.getElementById('auth-btn');
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

let currentUser = null;
let unsubscribeLogs = null;
let userBiometrics = { gender: 'male', bodyweight: 75 };
let activeRecords = { "Back Squat": 0, "Bench Press": 0, Deadlift: 0, Snatch: 0, "Clean & Jerk": 0 };
let currentPage = 1;
let urlParamsProcessed = false; // Add this flag

let paginatedWorkouts = [];
let lastWorkouts = [];
// Global state variables for social & leaderboards
let currentScope = 'global'; // 'global' or 'friends'
let currentFormula = 'dots';  // 'dots' or 'sinclair'
let userFriendsList = [];    // Array of friend UIDs
let leaderboardUnsubscribe = null; //
let leaderboardCache = [];

// Extract pending friend request from URL before any auth redirect clears it
const pendingFriendUid = new URLSearchParams(window.location.search).get('addFriend');

// Authentication State Listener
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        loginView.classList.add('hidden');
        appView.classList.remove('hidden');
        authBtn.innerText = "Sign Out";
        window.__irontrackAuthState = 'signed-in';
        
        // ... (existing code: handle, greeting, cyberTag, pullProfileMetrics) ...
        const handle = (user.email || user.uid).split('@')[0];
        greeting.innerText = `Athlete: ${handle}`;
        
        await pullProfileMetrics(user.uid);
        await initSocialProfile(user);
        syncLeaderboardFeed();
        listenToDataStream(user.uid);

        showQRCode()

        if (pendingFriendUid && !urlParamsProcessed) {
            urlParamsProcessed = true;
            await processFriendRequest(pendingFriendUid);
            window.history.replaceState({}, document.title, "/");
        }

    } else {
        if (unsubscribeLogs) { unsubscribeLogs(); unsubscribeLogs = null; }
        if (leaderboardUnsubscribe) { leaderboardUnsubscribe(); leaderboardUnsubscribe = null; }
        loginView.classList.remove('hidden');
        appView.classList.add('hidden');
        authBtn.innerText = "Sign In";
        greeting.innerText = "Analytics Dashboard";
        document.getElementById('workout-list').innerHTML = '';
        document.getElementById('registry-table-body').innerHTML = '';
        document.getElementById('dots-display').innerText = '0.0';
        document.getElementById('dots-tier').innerText = '-';
        document.getElementById('sinclair-display').innerText = '0.0';
        document.getElementById('sinclair-tier').innerText = '-';
        userFriendsList = [];
        document.getElementById('friendsListContainer').innerHTML = '';
        document.getElementById('leaderboardRows').innerHTML = '';
        currentUser = null;
        urlParamsProcessed = false;
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

// Profile Management Sync
async function pullProfileMetrics(uid) {
    try {
        const docRef = doc(db, "profiles", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            userBiometrics = docSnap.data();
            document.getElementById('profile-gender').value = userBiometrics.gender;
            document.getElementById('profile-weight').value = userBiometrics.bodyweight;
        }
    } catch (err) {
        console.error('Failed to load profile metrics', err.code, err.message);
        showFeedback('Unable to load profile metrics. Check Firestore rules for profiles.', 'red');
    }
}

profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    userBiometrics = {
        gender: document.getElementById('profile-gender').value,
        bodyweight: parseFloat(document.getElementById('profile-weight').value)
    };

    try {
        await setDoc(doc(db, "profiles", currentUser.uid), userBiometrics, { merge: true });
        processAnalytics();
        alert("Biometrics updated successfully!");
    } catch (err) {
        console.error('Failed to save biometrics', err.code, err.message);
        alert(`Unable to update profile: ${err.message}`);
    }
});



// Realtime Data Mining
function listenToDataStream(uid) {
    const q = query(
        collection(db, "workouts"),
        where("userId", "==", uid)
    );
    unsubscribeLogs = onSnapshot(q, async (snapshot) => {
        let workouts = [];
        activeRecords = { "Back Squat": 0, "Bench Press": 0, Deadlift: 0, Snatch: 0, "Clean & Jerk": 0 };

        snapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp;
            workouts.push({ id: doc.id, ...data, timestamp });

            // Epley 1RM Estimation Formula
            const weight = parseFloat(data.weight);
            const reps = parseInt(data.reps, 10);
            const calculated1RM = reps === 1 ? weight : weight * (1 + reps / 30);

            if (activeRecords[data.exercise] !== undefined) {
                if (calculated1RM > activeRecords[data.exercise]) {
                    activeRecords[data.exercise] = calculated1RM;
                }
            }
        });

        workouts.sort((a, b) => b.timestamp - a.timestamp);
        window.__irontrackWorkoutCount = workouts.length;
        lastWorkouts = workouts;
        // dynamicFriend populate filter options from live exercise names
        try {
          const uniqueExercises = Array.from(new Set(workouts.map(w => w.exercise)));
          populateWorkoutFilter(uniqueExercises);
        } catch (e) {
          // ignore if populate not available
        }
        update1RMRegistryUI();
        await processAnalytics();
        renderLogs(workouts);
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

    // 1. Find all unique exercises currently logged by the user
    const uniqueExercises = Array.from(new Set(lastWorkouts.map(w => w.exercise))).filter(Boolean).sort();

    if (uniqueExercises.length === 0) {
        tableBody.innerHTML = `<p class="col-span-3 text-xs text-slate-500 italic py-2 text-center">No logs recorded yet.</p>`;
        return;
    }

    // 2. Generate grid tracking elements dynamically for each logged lift
    let html = '';
    
    uniqueExercises.forEach(exercise => {
        // Filter historical entries just for this specific exercise
        const exerciseHistory = lastWorkouts.filter(w => w.exercise === exercise);

        // Calculate Absolute PB: The heaviest actual weight successfully logged
        const absolutePB = Math.max(0, ...exerciseHistory.map(w => parseFloat(w.weight || 0)));

        // Calculate Highest Estimated 1RM across all historical entries for this lift
        const maxEstimated1RM = Math.max(0, ...exerciseHistory.map(w => {
            const weight = parseFloat(w.weight || 0);
            const reps = parseInt(w.reps || 1, 10);
            // Using Epley 1RM Formula matching your real-time data stream logic
            return reps === 1 ? weight : weight * (1 + reps / 30);
        }));

        // Append the 3 grid components that represent one full layout row
        html += `
            <span class="text-slate-400 font-medium truncate">${escapeHtml(exercise)}</span>
            <span class="text-slate-200 font-mono text-right">${Math.round(maxEstimated1RM)} kg</span>
            <span class="text-slate-200 font-mono text-right">${Math.round(absolutePB)} kg</span>
        `;
    });

    tableBody.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
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
if (workoutFilter) {
  workoutFilter.addEventListener('change', () => {
    currentPage = 1;
    renderLogs(lastWorkouts);
  });
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
        await updateUserLeaderboardProfile(currentUser.uid, dots, sinclair);
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

// Render Existing Logs
function renderLogs(workouts) {
    const logContainer = document.getElementById('workout-list');
    if (!logContainer) return;

    if (!workouts.length) {
        logContainer.innerHTML = `<div class="bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-500 text-sm text-center">No workout logs yet. Add a set to start tracking your training history.</div>`;
        if (paginationControls) paginationControls.classList.add('hidden');
        return;
    }

    // keep the full set for analytics/state, but apply a display filter
    paginatedWorkouts = workouts;
    const selected = workoutFilter ? workoutFilter.value : 'All';

    // Precompute PB / 1RM flags for chip filtering and rendering (O(n))
    const maxWeightByExercise = {};
    const max1RMByExercise = {};
    workouts.forEach(w => {
        const weight = parseFloat(w.weight);
        const reps = parseInt(w.reps, 10) || 1;
        const oneRM = Math.round(weight * (1 + reps / 30));
        if (!maxWeightByExercise[w.exercise] || weight > maxWeightByExercise[w.exercise]) {
            maxWeightByExercise[w.exercise] = weight;
        }
        if (!max1RMByExercise[w.exercise] || oneRM > max1RMByExercise[w.exercise]) {
            max1RMByExercise[w.exercise] = oneRM;
        }
    });
    workouts.forEach(workout => {
        const weight = parseFloat(workout.weight);
        const reps = parseInt(workout.reps, 10) || 1;
        workout._isPB = weight >= maxWeightByExercise[workout.exercise] && weight > 0;
        const oneRM = Math.round(weight * (1 + reps / 30));
        workout._isMax1RM = oneRM >= max1RMByExercise[workout.exercise] && oneRM > 0;
    });

    let displayList = (selected === 'All') ? workouts : workouts.filter(w => w.exercise === selected);

    // Apply PB / 1RM chip filters if enabled (read state from DOM dataset)
    const chipPBActive = document.getElementById('chip-pb')?.dataset?.active === 'true';
    const chip1RMActive = document.getElementById('chip-1rm')?.dataset?.active === 'true';
    if (chipPBActive || chip1RMActive) {
      displayList = displayList.filter(w => (chipPBActive && w._isPB) || (chip1RMActive && w._isMax1RM));
    }

    // Expose render debug info for testing
    try { window.__lastRenderInfo = { chipPBActive, chip1RMActive, displayListLength: displayList.length, totalWorkouts: workouts.length }; } catch (e) {}

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
        const weight = parseFloat(workout.weight);
        const reps = parseInt(workout.reps, 10) || 1;
        const isPB = !!workout._isPB;
        const isMax1RM = !!workout._isMax1RM;
        const is1RMOnly = isMax1RM && !isPB;
        const oneRM = Math.round(weight * (1 + reps / 30));
        const borderClass = isPB ? 'log-entry-pb' : is1RMOnly ? 'log-entry-1rm' : 'log-entry';
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
            ${workout.sets || 1} x ${workout.reps || 1} 
            <span class="text-slate-500 text-xs">@</span> 
            ${workout.weight}kg
        </span>
        <p class="text-slate-400 text-xs font-mono mt-0.5">
            Est. 1RM: ${oneRM}kg
        </p>
    </div>
</div>
        `;
    }).join('');
}

// Add Log Submission
workoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return alert('Please sign in before logging a workout.');

    const log = {
        userId: currentUser.uid,
        exercise: document.getElementById('exercise').value,
        sets: parseInt(document.getElementById('sets').value, 10),
        reps: parseInt(document.getElementById('reps').value, 10),
        weight: parseFloat(document.getElementById('weight').value),
        timestamp: Date.now()
    };

    try {
        await addDoc(collection(db, "workouts"), log);
        workoutForm.reset();
        showFeedback('Workout saved. Keep crushing it!', 'emerald');
    } catch (err) {
        console.error('Workout submission failed', err.code, err.message);
        if (err.code === 'permission-denied') {
            showFeedback('Save blocked by Firestore rules: update workouts permissions.', 'red');
        }
        alert(`Failed to save workout: ${err.message}`);
    }
});

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

  await setDoc(profileRef, {
    uid: user.uid,
    displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous Cyber-Lifter',
    dotsScore: parseFloat(dotsScore) || 0,
    lastActive: serverTimestamp()
  }, { merge: true });

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
 * Render the side panel showing friends' names and current scores
 */
async function renderActiveFriendsList() {
  const container = document.getElementById('friendsListContainer');
  if (userFriendsList.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500 italic">No allies linked yet. Share your Cyber-Tag!</p>`;
    return;
  }

  try {
    // Fetch all friend profiles in parallel
    const friendResults = await Promise.allSettled(
      userFriendsList.map(fUid => getProfileDocument(fUid))
    );

    let html = '';
    userFriendsList.forEach((fUid, i) => {
      const result = friendResults[i];

      if (result.status === 'rejected') {
        console.error('Friend profile fetch failed', fUid, result.reason);
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
              Remove
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

    if (!html) {
      container.innerHTML = `<p class="text-xs text-slate-500 italic">No valid allies found for the linked Cyber-Tags.</p>`;
    } else {
      container.innerHTML = html;
    }
  } catch (error) {
    console.error('Active friends render failed', error.code, error.message);
    container.innerHTML = `<p class="text-xs text-red-400">Failed to render active grid context. Check Firestore rules for profiles.</p>`;
  }
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
 * Re-render leaderboard table from cached data applying current scope, formula, and friends list
 */
function renderLeaderboardView() {
  const rowsContainer = document.getElementById('leaderboardRows');
  if (!rowsContainer) return;
  const currentUser = auth.currentUser;

  let html = '';
  let rankCounter = 1;

  leaderboardCache.forEach(profile => {
    const isMe = currentUser && profile.uid === currentUser.uid;
    const isFriend = userFriendsList.includes(profile.uid);

    if (currentScope === 'friends' && !isMe && !isFriend) {
      return;
    }

    const rawScore = currentFormula === 'dots' ? profile.dotsScore : (profile.sinclairScore || 0);
    const displayScore = formatDotsScore(rawScore);

    const badgeBaseClasses = 'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider w-20';
    const actionCell = isMe
      ? `<span class="${badgeBaseClasses} bg-slate-700/60 text-slate-400">You</span>`
      : isFriend
        ? `<span class="${badgeBaseClasses} bg-emerald-500/10 text-emerald-300">Friend</span>`
        : `<button type="button" class="${badgeBaseClasses} border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-slate-800" 
        onclick="addFriendFromLeaderboard('${profile.uid}')">
        + Add
        </button>`;

    html += `
      <tr class="border-b border-slate-800/60 ${isMe ? 'bg-emerald-500/10 font-bold' : ''}">
        <td class="py-3 font-mono text-slate-500">#${rankCounter++}</td>
        <td class="py-3 flex items-center gap-2">
          <span class="${isMe ? 'text-emerald-400' : 'text-slate-200'}">${getDisplayName(profile, profile.uid)}</span>
        </td>
        <td class="py-3 text-right font-mono font-bold text-emerald-400">${displayScore.toFixed(2)}</td>
        <td class="py-3 text-right">${actionCell}</td>
      </tr>`;
  });

  rowsContainer.innerHTML = html || `<tr><td colspan="4" class="py-4 text-center text-xs text-slate-500 italic">No network entries visible in this grid scope.</td></tr>`;
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

function showQRCode() {
    const container = document.getElementById('qrcode-container');
    const qrDiv = document.getElementById('qrcode');

    // Clear previous
    qrDiv.innerHTML = "";
    
    // Generate QR (assuming `currentUser` is your global auth object)
    const qrData = `${window.location.origin}/?addFriend=${currentUser.uid}`;
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
    image: "data:image/png;base64,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",
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
        } else {
            console.error("Cyber-Tag not found.");
        }
    } catch (err) {
        console.error("Error linking friend:", err);
    }
}

window.copyCyberTag = copyCyberTag;
window.handleAddFriend = handleAddFriend;
window.addFriendFromLeaderboard = addFriendFromLeaderboard;
window.removeFriend = removeFriend;
window.switchLeaderboardScope = switchLeaderboardScope;
window.switchLeaderboardFormula = switchLeaderboardFormula;
window.showQRCode = showQRCode;