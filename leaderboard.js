import { auth, db, collection, query, orderBy, limit, onSnapshot, setDoc, serverTimestamp } from './firebase.js';
import { state, FIRESTORE_LEADERBOARD_LIMIT } from './state.js';
import { formatDotsScore } from './formatting.js';
import { getDisplayName } from './exercise-data.js';
import { buildLeaderboardRow, renderLeaderboardEmptyRow } from './rendering.js';
import { PERMISSION_ERROR_MAP, showFeedback, clearChildren, setActiveTab, setInactiveTab } from './ui.js';
import { getProfileDocRef } from './friends.js';
import { MSG } from './messages.js';

let leaderboardUnsubscribe = null;

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

  if (scope === 'global') {
    setActiveTab(btnGlobal);
    setInactiveTab(btnFriends);
  } else {
    setActiveTab(btnFriends);
    setInactiveTab(btnGlobal);
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

  const leaderboardQuery = query(collection(db, "profiles"), orderBy(sortField, "desc"), limit(FIRESTORE_LEADERBOARD_LIMIT));
  
  leaderboardUnsubscribe = onSnapshot(leaderboardQuery, (snapshot) => {
    state.social.leaderboardCache = [];
    snapshot.forEach((doc) => {
      state.social.leaderboardCache.push(doc.data());
    });
    renderLeaderboardView();
  }, (error) => {
    console.error('Leaderboard snapshot failed', error.code, error.message);
    showFeedback(PERMISSION_ERROR_MAP.loadLeaderboard, 'red', 'socialFeedback');
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
    if (btnDots) setActiveTab(btnDots);
    if (btnSinclair) setInactiveTab(btnSinclair);
    if (tableHeaderScore) tableHeaderScore.innerText = "DOTS";
    if (descEl) descEl.innerText = "Pound-for-pound DOTS standings live.";
  } else {
    if (btnSinclair) setActiveTab(btnSinclair);
    if (btnDots) setInactiveTab(btnDots);
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

function getThemeQrColors() {
  const html = document.documentElement;
  const isDark = html.classList.contains('mdui-theme-dark') ||
    (!html.classList.contains('mdui-theme-light') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return isDark
    ? { dots: "#f8fafc", bg: "#0f172a", accent: "#34d399" }
    : { dots: "#1e293b", bg: "#ffffff", accent: "#10b981" };
}

function showQRCode() {
    const container = document.getElementById('qrcode-container');
    const qrDiv = document.getElementById('qrcode');

    clearChildren(qrDiv);

    const qrUrl = new URL(window.location.href);
    qrUrl.search = `addFriend=${auth.currentUser.uid}`;
    const qrData = qrUrl.toString();
    const c = getThemeQrColors();
    const qrConfig = {
      type: "canvas",
      shape: "square",
      width: 300,
      height: 300,
      data: qrData,
      margin: 0,
      qrOptions: { typeNumber: 0, mode: "Byte", errorCorrectionLevel: "Q" },
      imageOptions: { saveAsBlob: true, hideBackgroundDots: true, imageSize: 0.4, margin: 0 },
      dotsOptions: { type: "dots", color: c.dots, roundSize: true, gradient: null },
      backgroundOptions: { round: 0, color: c.bg },
      image: "data:image/png;base64,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",
      cornersSquareOptions: { type: "extra-rounded", color: c.accent },
      cornersDotOptions: { type: "", color: c.dots }
    };
    
    const qrCode = new QRCodeStyling(qrConfig);
    qrCode.append(qrDiv);
    container.classList.remove('hidden');
}

function cleanupLeaderboardSubscriptions() {
  if (leaderboardUnsubscribe) { leaderboardUnsubscribe(); leaderboardUnsubscribe = null; }
}

export { filterLeaderboardProfiles, computeLeaderboardSlice, switchLeaderboardScope, toggleLeaderboardExpand, renderLeaderboardView, syncLeaderboardFeed, switchLeaderboardFormula, updateUserLeaderboardProfile, showQRCode, cleanupLeaderboardSubscriptions };
