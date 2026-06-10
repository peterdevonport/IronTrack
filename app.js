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

let currentUser = null;
let unsubscribeLogs = null;
let userBiometrics = { gender: 'male', bodyweight: 75 };
let activeRecords = { "Back Squat": 0, "Bench Press": 0, Deadlift: 0, Snatch: 0, "Clean & Jerk": 0 };

// Authentication State Listener
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        loginView.classList.add('hidden');
        appView.classList.remove('hidden');
        authBtn.innerText = "Sign Out";
        
        const handle = user.email.split('@')[0];
        greeting.innerText = `Athlete: ${handle}`;
        
        const cyberTagEl = document.getElementById('myCyberTag');
        if (cyberTagEl) {
            cyberTagEl.innerText = user.uid;
        }

        await pullProfileMetrics(user.uid);
        await initSocialProfile(user);
        listenToDataStream(user.uid);
    } else {
        loginView.classList.remove('hidden');
        appView.classList.add('hidden');
        authBtn.innerText = "Locked";
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
    const q = query(collection(db, "workouts"), where("userId", "==", uid));
    unsubscribeLogs = onSnapshot(q, async (snapshot) => {
        let workouts = [];
        activeRecords = { "Back Squat": 0, "Bench Press": 0, Deadlift: 0, Snatch: 0, "Clean & Jerk": 0 };

        snapshot.forEach((doc) => {
            const data = doc.data();
            workouts.push({ id: doc.id, ...data });

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
    document.getElementById('1rm-squat').innerText = `${Math.round(activeRecords['Back Squat'] || 0)} kg`;
    document.getElementById('1rm-bench').innerText = `${Math.round(activeRecords['Bench Press'])} kg`;
    document.getElementById('1rm-deadlift').innerText = `${Math.round(activeRecords['Deadlift'])} kg`;
    document.getElementById('1rm-snatch').innerText = `${Math.round(activeRecords['Snatch'])} kg`;
    document.getElementById('1rm-clean').innerText = `${Math.round(activeRecords['Clean & Jerk'])} kg`;
}

// Mathematical Engine Implementations
async function processAnalytics() {
    const bw = userBiometrics.bodyweight;
    const gender = userBiometrics.gender;

    // 1. DOTS Calculation Array
    const plTotal = activeRecords['Back Squat'] + activeRecords['Bench Press'] + activeRecords['Deadlift'];
    let dots = 0;
    if (plTotal > 0 && bw > 0) {
        const c = gender === 'male' 
            ? [47.46178854, 8.472061379, -0.07369410346, 0.0002586110512, -0.0000003634089054, 0.000000001790898013]
            : [-125.4255398, 13.71219419, -0.03307250631, 0.00004809990691, -0.00000003622531999, 0.000000000105123006];
        
        const denominator = c[0] + (c[1] * bw) + (c[2] * Math.pow(bw, 2)) + (c[3] * Math.pow(bw, 3)) + (c[4] * Math.pow(bw, 4)) + (c[5] * Math.pow(bw, 5));
        dots = (plTotal * 500) / denominator;
    }
    document.getElementById('dots-display').innerText = dots > 0 ? dots.toFixed(1) : "0.0";
    document.getElementById('dots-tier').innerText = getRankingTier(dots, 'dots', gender);

    // 2. Sinclair Calculation Array (2025-2028 Olympic Cycle)
    const olyTotal = activeRecords['Snatch'] + activeRecords['Clean & Jerk'];
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
    document.getElementById('sinclair-display').innerText = sinclair > 0 ? sinclair.toFixed(1) : "0.0";
    document.getElementById('sinclair-tier').innerText = getRankingTier(sinclair, 'sinclair', gender);

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
        return;
    }

    // 1. First, establish the true historical maximums for all exercises
    const allTimeMaxes = {};
    workouts.forEach(w => {
        const weight = parseFloat(w.weight);
        if (!allTimeMaxes[w.exercise] || weight > allTimeMaxes[w.exercise]) {
            allTimeMaxes[w.exercise] = weight;
        }
    });

    // 2. Render logic
    logContainer.innerHTML = workouts.map(workout => {
        const weight = parseFloat(workout.weight);
        const reps = parseInt(workout.reps) || 1;
        
        // PB Logic: Only true if this specific log weight is > any previous weight 
        // recorded BEFORE this timestamp.
        const previousLifts = workouts.filter(w => 
            w.exercise === workout.exercise && 
            w.timestamp < workout.timestamp
        );
        const prevMax = Math.max(0, ...previousLifts.map(w => parseFloat(w.weight)));
        const isPB = weight > prevMax;

        // 1RM Calculation
        const oneRM = Math.round(weight / (1.0278 - (0.0278 * reps)));
        
        // 1RM Badge: Is this the highest 1RM ever achieved for this move?
        const isMax1RM = oneRM >= Math.max(...workouts
            .filter(w => w.exercise === workout.exercise)
            .map(w => Math.round(parseFloat(w.weight) / (1.0278 - (0.0278 * (parseInt(w.reps) || 1)))))
        );

        return `
            <div class="bg-slate-800 border-l-4 ${isPB ? 'border-yellow-400' : 'border-emerald-500'} p-4 rounded-lg mb-3 flex justify-between items-center shadow-lg">
                <div>
                    <div class="flex items-center gap-2">
                        <h4 class="text-emerald-400 font-bold uppercase tracking-wider text-sm">${workout.exercise}</h4>
                        ${isPB ? '<span class="bg-yellow-400 text-black text-[9px] px-1.5 rounded font-black">PB</span>' : ''}
                        ${isMax1RM ? '<span class="bg-rose-500 text-white text-[9px] px-1.5 rounded font-black">1RM</span>' : ''}
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
    tagEl.innerText = user.uid;
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
  const tagText = document.getElementById('myCyberTag').innerText;
  navigator.clipboard.writeText(tagText);
  showFeedback('Tag copied to neural clipboard!', 'emerald');
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

  if (!targetUid) return;
  if (!currentUser) return showFeedback('Authenticate to link friends.', 'red');
  if (targetUid === currentUser.uid) return showFeedback("Can't link your own tag.", 'red');
  if (userFriendsList.includes(targetUid)) return showFeedback("Ally already linked.", 'yellow');

  try {
    const targetDoc = await getProfileDocument(targetUid);
    if (!targetDoc.exists()) {
      return showFeedback("Cyber-Tag not found in database.", 'red');
    }

    await setDoc(getProfileDocRef(currentUser.uid), {
      friends: arrayUnion(targetUid)
    }, { merge: true });

    input.value = '';
    showFeedback('Ally link established successfully!', 'emerald');
  } catch (err) {
    console.error('Friend add failed', err.code, err.message);
    if (err.code === 'permission-denied') {
      showFeedback('Permission denied: check Firestore rules for profiles.', 'red');
    } else {
      showFeedback(`Error linking network node: ${err.message}`, 'red');
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
            <span class="font-medium text-slate-300 truncate max-w-[120px]">Locked Ally</span>
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
            <span class="font-medium text-slate-300 truncate max-w-[120px]">Unknown Ally</span>
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
function switchLeaderboardScope(scope) {
  currentScope = scope;
  const btnGlobal = document.getElementById('btnGlobalBoard');
  const btnFriends = document.getElementById('btnFriendsBoard');

  if (scope === 'global') {
    btnGlobal.className = "bg-emerald-500 text-black text-xs font-black uppercase px-3 py-1.5 rounded-md transition-all";
    btnFriends.className = "text-slate-400 hover:text-emerald-400 text-xs font-black uppercase px-3 py-1.5 rounded-md transition-all";
  } else {
    btnFriends.className = "bg-emerald-500 text-black text-xs font-black uppercase px-3 py-1.5 rounded-md transition-all";
    btnGlobal.className = "text-slate-400 hover:text-emerald-400 text-xs font-black uppercase px-3 py-1.5 rounded-md transition-all";
  }
  syncLeaderboardFeed();
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
            ${isFriend ? '<span class="text-[9px] bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wider">Ally</span>' : ''}
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

// Visual Alert helper
function showFeedback(msg, color) {
  const el = document.getElementById('socialFeedback');
  const colorClasses = {
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400'
  };
  el.innerText = msg;
  el.className = `text-[11px] font-medium h-4 ${colorClasses[color] || 'text-slate-400'}`;
}

window.copyCyberTag = copyCyberTag;
window.handleAddFriend = handleAddFriend;
window.switchLeaderboardScope = switchLeaderboardScope;
