import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, deleteDoc, doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

let paginatedWorkouts = [];
let lastWorkouts = [];
let chipPB = false;
let chip1RM = false;

// Authentication State Listener
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        loginView.classList.add('hidden');
        appView.classList.remove('hidden');

        authBtn.innerText = "Sign Out";

        window.__irontrackAuthState = 'signed-in';
        
        const handle = user.email.split('@')[0];
        greeting.innerText = `Athlete: ${handle}`;
        
        const cyberTagEl = document.getElementById('myCyberTag');
        if (cyberTagEl) {
            cyberTagEl.value = user.uid;
        }

        currentPage = 1;
        await pullProfileMetrics(user.uid);
        await initSocialProfile(user);
        listenToDataStream(user.uid);
    } else {
        currentPage = 1;
        paginatedWorkouts = [];
        loginView.classList.remove('hidden');
        appView.classList.add('hidden');
        
        authBtn.innerText = "Signed Out";

        window.__irontrackAuthState = 'signed-out';
        if (unsubscribeLogs) unsubscribeLogs();
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
            const reps = parseInt(data.reps);
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
            const reps = parseInt(w.reps || 1);
            // Using Epley 1RM Formula matching your real-time data stream logic
            return reps === 1 ? weight : weight * (1 + reps / 30);
        }));

        // Append the 3 grid components that represent one full layout row
        html += `
            <span class="text-slate-400 font-medium truncate">${exercise}</span>
            <span class="text-slate-200 font-mono text-right">${Math.round(maxEstimated1RM)} kg</span>
            <span class="text-slate-200 font-mono text-right">${Math.round(absolutePB)} kg</span>
        `;
    });

    tableBody.innerHTML = html;
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
        await updateUserLeaderboardProfile(currentUser.uid, dots);
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

    // Precompute PB / 1RM flags for chip filtering and rendering
    workouts.forEach(workout => {
        const weight = parseFloat(workout.weight);
        const reps = parseInt(workout.reps) || 1;
        const previousLifts = workouts.filter(w => w.exercise === workout.exercise && w.timestamp < workout.timestamp);
        const prevMax = Math.max(0, ...previousLifts.map(w => parseFloat(w.weight)));
        workout._isPB = weight > prevMax;
        const oneRM = Math.round(weight / (1.0278 - (0.0278 * reps)));
        const maxOneRMForExercise = Math.max(...workouts.filter(w => w.exercise === workout.exercise).map(w => Math.round(parseFloat(w.weight) / (1.0278 - (0.0278 * (parseInt(w.reps) || 1))))));
        workout._isMax1RM = oneRM >= maxOneRMForExercise;
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

    // 1. First, establish the true historical maximums for all exercises
    const allTimeMaxes = {};
    workouts.forEach(w => {
        const weight = parseFloat(w.weight);
        if (!allTimeMaxes[w.exercise] || weight > allTimeMaxes[w.exercise]) {
            allTimeMaxes[w.exercise] = weight;
        }
    });

    // 2. Render logic
    logContainer.innerHTML = pageItems.map(workout => {
        const weight = parseFloat(workout.weight);
        const reps = parseInt(workout.reps) || 1;
        const isPB = !!workout._isPB;
        const isMax1RM = !!workout._isMax1RM;
        const is1RMOnly = isMax1RM && !isPB;
        const oneRM = Math.round(weight / (1.0278 - (0.0278 * reps)));
        const borderClass = isPB ? 'log-entry-pb' : is1RMOnly ? 'log-entry-1rm' : 'log-entry';
        return `
<div class="${borderClass} p-4 rounded-2xl mb-3 flex justify-between items-center shadow-2xl shadow-slate-950/60 transition-all duration-200" style="background-color: var(--slate-900);">
    <div>
        <div class="flex items-center gap-2">
            <h4 class="text-emerald-300 font-bold uppercase tracking-wider text-sm">${workout.exercise}</h4>
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
        sets: parseInt(document.getElementById('sets').value),
        reps: parseInt(document.getElementById('reps').value),
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

// Global state variables
let currentScope = 'global'; // 'global' or 'friends'
let userFriendsList = [];    // Array of friend UIDs
let leaderboardUnsubscribe = null;

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
    syncLeaderboardFeed();
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
    let html = '';
    for (let fUid of userFriendsList) {
      let fDoc;
      try {
        fDoc = await getProfileDocument(fUid);
      } catch (err) {
        console.error('Friend profile fetch failed', fUid, err.code, err.message);
        html += `
          <div class="flex justify-between items-center bg-slate-900/50 p-2 border border-slate-800 rounded">
            <span class="font-medium text-slate-300 truncate max-w-[120px]">Locked Friend</span>
            <span class="text-xs font-mono text-yellow-400">Permission denied</span>
          </div>`;
        continue;
      }

      if (fDoc && fDoc.exists()) {
        const data = fDoc.data();
        html += `
          <div class="flex justify-between items-center bg-slate-900/50 p-2 border border-slate-800 rounded">
            <span class="font-medium text-slate-300 truncate max-w-[120px]">${getDisplayName(data, fUid)}</span>
            <span class="text-xs font-mono text-emerald-400 font-bold">${formatDotsScore(data.dotsScore).toFixed(2)} pts</span>
          </div>`;
      } else {
        html += `
          <div class="flex justify-between items-center bg-slate-900/50 p-2 border border-slate-800 rounded">
            <span class="font-medium text-slate-300 truncate max-w-[120px]">Unknown Friend</span>
            <span class="text-xs font-mono text-slate-500">${fUid}</span>
          </div>`;
      }
    }

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
  syncLeaderboardFeed(); //
}

/**
 * Fetch and Render Leaderboard Standings depending on Filter Scope
 */
function syncLeaderboardFeed() {
  const currentUser = auth.currentUser;
  if (leaderboardUnsubscribe) {
    leaderboardUnsubscribe();
    leaderboardUnsubscribe = null;
  }

  const leaderboardQuery = query(collection(db, "profiles"), orderBy("dotsScore", "desc"), limit(50));
  leaderboardUnsubscribe = onSnapshot(leaderboardQuery, (snapshot) => {
    const rowsContainer = document.getElementById('leaderboardRows');
    let html = '';
    let rankCounter = 1;

    snapshot.forEach((doc) => {
      const profile = doc.data();
      const isMe = currentUser && profile.uid === currentUser.uid;
      const isFriend = userFriendsList.includes(profile.uid);

      if (currentScope === 'friends' && !isMe && !isFriend) {
        return;
      }

      html += `
        <tr class="border-b border-slate-800/60 ${isMe ? 'bg-emerald-500/10 font-bold' : ''}">
          <td class="py-3 font-mono text-slate-500">#${rankCounter++}</td>
          <td class="py-3 flex items-center gap-2">
            <span class="${isMe ? 'text-emerald-400' : 'text-slate-200'}">${getDisplayName(profile, profile.uid)}</span>
            ${isFriend ? '<span class="text-[9px] bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wider">Friend</span>' : ''}
          </td>
          <td class="py-3 text-right font-mono font-bold text-emerald-400">${formatDotsScore(profile.dotsScore).toFixed(2)}</td>
        </tr>`;
    });

    rowsContainer.innerHTML = html || `<tr><td colspan="3" class="py-4 text-center text-xs text-slate-500 italic">No network entries visible in this grid scope.</td></tr>`;
  }, (error) => {
    console.error('Leaderboard snapshot failed', error.code, error.message);
    showFeedback('Leaderboard access denied: update Firestore rules for profiles.', 'red');
  });
}

async function updateUserLeaderboardProfile(uid, dotsScore) {
  await setDoc(getProfileDocRef(uid), {
    dotsScore: parseFloat(dotsScore) || 0,
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
      clearTimeout(parseInt(el.dataset.timeoutId));
    }

    const timeoutId = setTimeout(() => {
      // Smoothly fade out using CSS opacity before clearing text
      el.classList.replace('opacity-100', 'opacity-0');
      
      // Wait for the 500ms transition animation to finish, then clear the text completely
      setTimeout(() => {
        el.innerText = '&nbsp;';
      }, 500);
    }, delay);

    // Save the timeout ID on the element's dataset so we can track it
    el.dataset.timeoutId = timeoutId.toString();
  }
}

window.copyCyberTag = copyCyberTag;
window.handleAddFriend = handleAddFriend;
window.switchLeaderboardScope = switchLeaderboardScope;
