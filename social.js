import { auth, db, collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, addDoc, deleteDoc, serverTimestamp, orderBy, limit, getDocs } from './firebase.js';
import { state, HAPTIC, paginationControls } from './state.js';
import { escapeHtml, haptic } from './dom.js';
import { getDisplayName } from './exercise-data.js';
import { renderShareFriendItem, friendToHtml, buildLeaderboardRow, renderLeaderboardEmptyRow, renderPlanCard, renderSharedPlanCard, renderStructuredWorkoutCard } from './rendering.js';
import { clearChildren, renderEmptyState, showFeedback, showToast, updatePagination, changeGenericPage, saveExpandedCardIds, restoreExpandedCardIds, updateStarIcon } from './ui.js';

let leaderboardUnsubscribe = null;
let unsubscribeProfile = null;
let unsubscribeSharedPlans = null;
let _favDebounce = {};

// leaderboard

function getProfileDocRef(uid) {
  return doc(db, "profiles", uid);
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
  if (targetUid === auth.currentUser.uid) {
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

    await setDoc(getProfileDocRef(auth.currentUser.uid), {
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
  if (!friendUid || friendUid === auth.currentUser.uid) {
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

    await setDoc(getProfileDocRef(auth.currentUser.uid), {
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
  if (!auth.currentUser) return showFeedback('Sign in to remove friends.', 'red');
  if (!friendUid) return;
  if (!state.social.userFriendsList.includes(friendUid)) return showFeedback('Athlete not in your friend list.', 'yellow');

  if (!confirm('Remove this friend from your list?')) return;

  try {
    await updateDoc(getProfileDocRef(auth.currentUser.uid), {
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
  changeGenericPage('friends', state.social.userFriendsList, 3, renderActiveFriendsList, direction);
}

function filterLeaderboardProfiles() {
  const filtered = [];
  state.social.leaderboardCache.forEach(profile => {
    const isMe = auth.currentUser && profile.uid === auth.currentUser.uid;
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
      expandBtn.setAttribute('aria-expanded', 'false');
    }
  } else {
    filtered.forEach((f, i) => {
      html += buildLeaderboardRow(f.profile, i + 1, f.isMe, f.isFriend);
    });
    rowsContainer.innerHTML = html || renderLeaderboardEmptyRow();
    if (typeof lucide !== 'undefined') lucide.createIcons();

    if (expandBtn) {
      expandBtn.classList.toggle('hidden', filtered.length <= 3 || !state.social.leaderboardShowAll);
      expandBtn.textContent = state.social.leaderboardShowAll ? 'Show Compact' : 'Show All';
      expandBtn.setAttribute('aria-expanded', String(!!state.social.leaderboardShowAll));
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

function showQRCode() {
    const container = document.getElementById('qrcode-container');
    const qrDiv = document.getElementById('qrcode');

    // Clear previous
    clearChildren(qrDiv);
    
    // Generate QR (assuming `currentUser` is your global auth object)
    const qrUrl = new URL(window.location.href);
    qrUrl.search = `addFriend=${auth.currentUser.uid}`;
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
    if (!auth.currentUser || friendId === auth.currentUser.uid) return;

    // Check if already friends to prevent unnecessary updates
    if (state.social.userFriendsList.includes(friendId)) {
        return;
    }

    try {
        const targetDoc = await getProfileDocument(friendId);
        if (targetDoc.exists()) {
            await setDoc(getProfileDocRef(auth.currentUser.uid), {
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

async function processClaimedPlan(claimId, switchPlansFilter) {
    if (!auth.currentUser) return;

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

        if (data.sharedBy === auth.currentUser.uid) {
            return;
        }

        const existing = await getDocs(query(
            collection(db, "shared_plans"),
            where("sharedWith", "==", auth.currentUser.uid),
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
            sharedWith: auth.currentUser.uid,
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
  clearChildren(document.getElementById('share-qr-display'));
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
    html += renderShareFriendItem(fUid, name);
  });
  list.innerHTML = html;
  modal.classList.remove('hidden');
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
    sharedBy: auth.currentUser.uid,
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
  const base = window.location.pathname.replace(/\/?[^/]*$/, '/');
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
  const sharerSnap = await getDoc(getProfileDocRef(auth.currentUser.uid));
  const sharerData = sharerSnap.exists() ? sharerSnap.data() : {};
  const displayName = sharerData.displayName || auth.currentUser?.email?.split('@')[0] || 'Unknown';

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
    const sharerSnap = await getDoc(getProfileDocRef(auth.currentUser.uid));
    const sharerData = sharerSnap.exists() ? sharerSnap.data() : {};
    const displayName = sharerData.displayName || auth.currentUser?.email?.split('@')[0] || 'Unknown';

    const existing = await getDocs(query(
      collection(db, "shared_plans"),
      where("sharedBy", "==", auth.currentUser.uid),
      where("planId", "==", state.share.sharePlanId),
      where("shareMethod", "==", "qr")
    ));

    let docRef;
    if (!existing.empty) {
      docRef = existing.docs[0].ref;
    } else {
      docRef = await addDoc(collection(db, "shared_plans"), {
        sharedBy: auth.currentUser.uid,
        sharedByDisplayName: displayName,
        sharedWith: '__qr__',
        shareMethod: 'qr',
        planId: state.share.sharePlanId,
        createdAt: serverTimestamp()
      });
    }

    const qrUrl = buildQrShareUrl(docRef.id);
    clearChildren(qrDisplay);
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

  let items;
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

function changeSharedPlansPage(direction) {
  changeGenericPage('sharedPlans', state.data.lastSharedPlans, 3, renderSharedPlansUI, direction);
}

async function saveSharedPlanToMyPlans(shareId) {
  if (!auth.currentUser) return;
  const share = state.data.lastSharedPlans.find(s => s.id === shareId);
  if (!share) return;

  const planDoc = {
    userId: auth.currentUser.uid,
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
  if (!auth.currentUser) return;
  if (!confirm('Dismiss this shared plan?')) return;
  try {
    await updateDoc(doc(db, "shared_plans", shareId), { status: 'dismissed' });
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('Dismiss shared plan failed', err.code, err.message);
    alert('Failed to dismiss: ' + err.message);
  }
}

async function toggleFavoriteGeneric(collection, dataArray, id) {
  if (_favDebounce[id]) return;
  _favDebounce[id] = setTimeout(() => delete _favDebounce[id], 300);
  if (!auth.currentUser) return;
  const item = dataArray.find(i => i.id === id);
  if (!item) return;
  const newVal = !(item.favorite === true);
  item.favorite = newVal;
  updateStarIcon(id, newVal);
  try {
    await updateDoc(doc(db, collection, id), { favorite: newVal });
    haptic(HAPTIC.tap);
    if (state.ui.plansFilter === 'favorites') renderSharedPlansUI();
  } catch (err) {
    item.favorite = !newVal;
    updateStarIcon(id, !newVal);
    clearTimeout(_favDebounce[id]);
    delete _favDebounce[id];
    console.error('Toggle favorite failed', err.code, err.message);
  }
}

function toggleFavorite(shareId) {
  toggleFavoriteGeneric("shared_plans", state.data.lastSharedPlans, shareId);
}

function togglePlanFavorite(planId) {
  toggleFavoriteGeneric("workout_plans", state.data.lastWorkoutPlans, planId);
}

function toggleStructuredFavorite(swId) {
  toggleFavoriteGeneric("structured_workouts", state.data.lastStructuredWorkouts, swId);
}

function loadSharedPlan(shareId, loadWorkoutIntoBuilder) {
  const share = state.data.lastSharedPlans.find(s => s.id === shareId);
  if (!share) return;
  const plan = share.content;
  if (!plan) return;
  loadWorkoutIntoBuilder(plan.type, plan.structure, `Plan "${plan.name}" loaded!`);
}


function cleanupSocialSubscriptions() {
  if (unsubscribeSharedPlans) { unsubscribeSharedPlans(); unsubscribeSharedPlans = null; }
  if (unsubscribeProfile) { unsubscribeProfile(); unsubscribeProfile = null; }
  if (leaderboardUnsubscribe) { leaderboardUnsubscribe(); leaderboardUnsubscribe = null; }
}

export { getProfileDocRef, getProfileDocument, initSocialProfile, copyCyberTag, handleAddFriend, addFriendFromLeaderboard, removeFriend, cacheUncachedProfiles, renderActiveFriendsList, changeFriendsPage, filterLeaderboardProfiles, computeLeaderboardSlice, switchLeaderboardScope, toggleLeaderboardExpand, renderLeaderboardView, syncLeaderboardFeed, switchLeaderboardFormula, updateUserLeaderboardProfile, showQRCode, processFriendRequest, processClaimedPlan, switchShareMode, openShareModal, resolveShareContent, buildSharedPlanDocument, buildQrShareUrl, buildQrCodeConfig, shareWithFriends, shareByQR, listenToSharedPlans, renderSharedPlansUI, changeSharedPlansPage, saveSharedPlanToMyPlans, dismissSharedPlan, toggleFavoriteGeneric, toggleFavorite, togglePlanFavorite, toggleStructuredFavorite, loadSharedPlan, cleanupSocialSubscriptions };
