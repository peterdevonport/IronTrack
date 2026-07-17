import { auth, db, collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, serverTimestamp, orderBy, limit, getDocs, arrayUnion } from './firebase.js';
import { state, HAPTIC, FAVORITE_DEBOUNCE_MS } from './state.js';
import { escapeHtml, haptic } from './dom.js';
import { getDisplayName } from './exercise-data.js';
import { renderShareFriendItem, renderPlanCard, renderSharedPlanCard, renderStructuredWorkoutCard } from './rendering.js';
import { clearChildren, renderEmptyState, showFeedback, showToast, changeGenericPage, paginateAndRender, updateStarIcon, setActiveTab, setInactiveTab } from './ui.js';
import { getProfileDocument, getProfileDocRef } from './friends.js';
import { MSG } from './messages.js';
import { getThemeQrColors } from './theme.js';

let unsubscribeSharedPlans = null;
const _favDebounce = {};

const ITEM_TYPE_STRATEGIES = {
  own: {
    getDate: (item) => item.plan?.createdAt ?? 0,
    render: (item) => renderPlanCard(item.plan),
  },
  shared: {
    getDate: (item) => item.share?.createdAt ?? 0,
    render: (item) => renderSharedPlanCard(item.share),
  },
  structured: {
    getDate: (item) => item.structured?.timestamp ?? 0,
    render: (item) => renderStructuredWorkoutCard(item.structured),
  },
};

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
            showFeedback(MSG.CYBER_TAG_NOT_FOUND_CHECK, 'rose', 'socialAddFriendFeedback');
        }
    } catch (err) {
        console.error("Error linking friend:", err);
    }
}

function switchShareMode(mode) {
  state.share.shareMode = mode;
  const btnFriends = document.getElementById('share-mode-friends');
  const btnQR = document.getElementById('share-mode-qr');
  const friendsSection = document.getElementById('share-friends-section');
  const qrSection = document.getElementById('share-qr-section');

  if (mode === 'friends') {
    setActiveTab(btnFriends);
    setInactiveTab(btnQR);
    friendsSection.classList.remove('hidden');
    qrSection.classList.add('hidden');
    document.getElementById('share-plan-feedback').textContent = '';
  } else {
    setActiveTab(btnQR);
    setInactiveTab(btnFriends);
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
  const c = getThemeQrColors();
  return {
    type: "canvas",
    shape: "square",
    width: 300,
    height: 300,
    data: url,
    margin: 0,
    qrOptions: { typeNumber: 0, mode: "Byte", errorCorrectionLevel: "Q" },
    imageOptions: { saveAsBlob: true, hideBackgroundDots: true, imageSize: 0.4, margin: 0 },
    dotsOptions: { type: "dots", color: c.dots, roundSize: true, gradient: null },
    backgroundOptions: { round: 0, color: c.bg },
    cornersSquareOptions: { type: "extra-rounded", color: c.accent },
    cornersDotOptions: { type: "", color: c.dots }
  };
}

async function shareWithFriends() {
  const modal = document.getElementById('share-plan-modal');
  const feedback = document.getElementById('share-plan-feedback');
  const checked = document.querySelectorAll('.share-friend-checkbox:checked');
  if (!checked.length) {
    feedback.textContent = MSG.SELECT_FRIEND;
    return;
  }

  const content = resolveShareContent();
  if (!content) {
    feedback.textContent = MSG.PLAN_NOT_FOUND;
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
    showFeedback(`Shared with ${selectedUids.length} friend${selectedUids.length > 1 ? 's' : ''}!`, 'emerald', 'socialFeedback');
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('Share plan failed', err.code, err.message);
    feedback.textContent = MSG.SHARE_FAILED + err.message;
  }
}

async function shareByQR() {
  const feedback = document.getElementById('share-plan-feedback');
  const qrDisplay = document.getElementById('share-qr-display');
  if (!qrDisplay) return;

  const plan = resolveShareContent();
  if (!plan) {
    feedback.textContent = MSG.PLAN_NOT_FOUND;
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
    feedback.textContent = MSG.QR_GENERATE_FAILED + err.message;
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

function getItemDate(item) {
  return ITEM_TYPE_STRATEGIES[item.type]?.getDate(item) ?? 0;
}

function renderSharedPlansUI() {
  let items;
  if (state.ui.plansFilter === 'favorites') {
    const favoritedOwn = state.data.lastWorkoutPlans.filter(p => p.favorite === true).map(p => ({ type: 'own', plan: p }));
    const favoritedShared = state.data.lastSharedPlans.filter(s => s.favorite === true).map(s => ({ type: 'shared', share: s }));
    const favoritedStructured = state.data.lastStructuredWorkouts.filter(w => w.favorite === true).map(w => ({ type: 'structured', structured: w }));
    items = [...favoritedOwn, ...favoritedShared, ...favoritedStructured];
    items.sort((a, b) => {
      const aDate = getItemDate(a);
      const bDate = getItemDate(b);
      return (bDate || 0) - (aDate || 0);
    });
  } else {
    items = state.data.lastSharedPlans.map(s => ({ type: 'shared', share: s }));
  }

  const emptyMessage = state.ui.plansFilter === 'favorites'
    ? 'No favorited plans yet. Star a plan to add it here.'
    : 'No shared plans yet.';

  paginateAndRender({
    stateKey: 'shared-plans',
    list: items,
    containerId: 'shared-plans-inline',
    renderItems: (pageItems) => pageItems.map(item => {
      const strategy = ITEM_TYPE_STRATEGIES[item.type];
      return strategy ? strategy.render(item) : '';
    }).join(''),
    emptyMessage
  });
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
    showFeedback(MSG.PLAN_SAVED_COLLECTION, 'emerald', 'socialFeedback');
    haptic(HAPTIC.confirm);
  } catch (err) {
    console.error('Save shared plan failed', err.code, err.message);
    showFeedback(MSG.SAVE_SHARED_PLAN_FAILED + err.message, 'red', 'socialFeedback');
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
    alert(MSG.DISMISS_FAILED + err.message);
  }
}

async function toggleFavoriteGeneric(collection, dataArray, id) {
  if (_favDebounce[id]) return;
  _favDebounce[id] = setTimeout(() => delete _favDebounce[id], FAVORITE_DEBOUNCE_MS);
  if (!auth.currentUser) return;
  const item = dataArray.find(i => i.id === id);
  if (!item) return;
  const newVal = !(item.favorite === true);
  updateStarIcon(id, newVal);
  try {
    await updateDoc(doc(db, collection, id), { favorite: newVal });
    haptic(HAPTIC.tap);
  } catch (err) {
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

async function processClaimedPlan(claimId, switchPlansFilter) {
    if (!auth.currentUser) return;
    try {
        const shareSnap = await getDoc(doc(db, "shared_plans", claimId));
        if (!shareSnap.exists()) { console.error("Claimed plan not found."); return; }
        const data = shareSnap.data();
        if (data.shareMethod !== 'qr') { console.error("Invalid share method."); return; }
        if (data.sharedBy === auth.currentUser.uid) { return; }
        const existing = await getDocs(query(collection(db, "shared_plans"), where("sharedWith", "==", auth.currentUser.uid), where("planId", "==", data.planId), where("shareMethod", "==", "qr_claimed")));
        if (!existing.empty) { showToast(MSG.PLAN_ALREADY_CLAIMED, 'yellow'); switchPlansFilter('shared'); return; }
        const planSnap = await getDoc(doc(db, "workout_plans", data.planId));
        if (!planSnap.exists()) { console.error("Source plan not found."); return; }
        const plan = planSnap.data();
        await addDoc(collection(db, "shared_plans"), { sharedBy: data.sharedBy, sharedByDisplayName: data.sharedByDisplayName, sharedWith: auth.currentUser.uid, shareMethod: 'qr_claimed', planId: data.planId, contentType: 'plan', content: { name: plan.name, type: plan.type, structure: plan.structure }, status: 'active', createdAt: serverTimestamp() });
        showToast('Plan imported from QR code!', 'emerald');
        switchPlansFilter('shared');
    } catch (err) { console.error("Claim plan failed:", err); showToast(MSG.IMPORT_PLAN_FROM_QR_FAILED, 'red'); }
}

function loadSharedPlan(shareId, loadWorkoutIntoBuilder) {
  const share = state.data.lastSharedPlans.find(s => s.id === shareId);
  if (!share) return;
  const plan = share.content;
  if (!plan) return;
  loadWorkoutIntoBuilder(plan.type, plan.structure, `Plan "${plan.name}" loaded!`);
}


function cleanupSharedPlansSubscriptions() {
  if (unsubscribeSharedPlans) { unsubscribeSharedPlans(); unsubscribeSharedPlans = null; }
}

export { switchShareMode, openShareModal, resolveShareContent, buildSharedPlanDocument, buildQrShareUrl, buildQrCodeConfig, shareWithFriends, shareByQR, listenToSharedPlans, renderSharedPlansUI, changeSharedPlansPage, saveSharedPlanToMyPlans, dismissSharedPlan, toggleFavoriteGeneric, toggleFavorite, togglePlanFavorite, toggleStructuredFavorite, processFriendRequest, processClaimedPlan, loadSharedPlan, cleanupSharedPlansSubscriptions };
