import { auth, db, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, onSnapshot } from './firebase.js';
import { state, HAPTIC, FRIEND_SUCCESS_CLEAR_MS } from './state.js';
import { escapeHtml, haptic } from './dom.js';
import { getDisplayName } from './exercise-data.js';
import { friendToHtml } from './rendering.js';
import { PERMISSION_ERROR_MAP, renderEmptyState, showFeedback, updatePagination, changeGenericPage, isPermissionDenied } from './ui.js';
import { renderLeaderboardView, syncLeaderboardFeed } from './leaderboard.js';
import { MSG } from './messages.js';

let unsubscribeProfile = null;

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
  try {
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
      showFeedback(PERMISSION_ERROR_MAP.loadProfile, 'red');
    });
  } catch (err) {
    console.error('Failed to initialize social profile:', err);
    showFeedback(PERMISSION_ERROR_MAP.loadSocialProfile, 'red');
  }
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
    return showFeedback(MSG.AUTHENTICATE_TO_LINK, 'red', feedbackTarget);
  }
  if (targetUid === auth.currentUser.uid) {
    return showFeedback(MSG.CANT_LINK_OWN_TAG, 'red', feedbackTarget);
  }
  if (state.social.userFriendsList.includes(targetUid)) {
    return showFeedback(MSG.FRIEND_ALREADY_LINKED, 'yellow', feedbackTarget);
  }

  try {
    const targetDoc = await getProfileDocument(targetUid);
    if (!targetDoc.exists()) {
      return showFeedback(MSG.CYBER_TAG_NOT_FOUND, 'red', feedbackTarget);
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
    }, FRIEND_SUCCESS_CLEAR_MS);

  } catch (err) {
    console.error('Friend add failed', err.code, err.message);
    if (isPermissionDenied(err)) {
      showFeedback(PERMISSION_ERROR_MAP.permissionDenied, 'red', feedbackTarget);
    } else {
      showFeedback(MSG.LINK_NETWORK_NODE_FAILED + err.message, 'red', feedbackTarget);
    }
  }
}

async function addFriendFromLeaderboard(friendUid) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return showFeedback(MSG.SIGN_IN_TO_ADD_FRIEND, 'red');
  }
  if (!friendUid || friendUid === auth.currentUser.uid) {
    return;
  }
  if (state.social.userFriendsList.includes(friendUid)) {
    return showFeedback(MSG.ALREADY_CONNECTED, 'yellow');
  }

  try {
    const targetDoc = await getProfileDocument(friendUid);
    if (!targetDoc.exists()) {
      return showFeedback(MSG.ADD_ATHLETE_FAILED, 'red');
    }

    await setDoc(getProfileDocRef(auth.currentUser.uid), {
      friends: arrayUnion(friendUid)
    }, { merge: true });
    showFeedback(MSG.FRIEND_ADDED, 'emerald');
    haptic(HAPTIC.tap);
  } catch (err) {
    console.error('Leaderboard friend add failed', err.code, err.message);
    if (isPermissionDenied(err)) {
      showFeedback(PERMISSION_ERROR_MAP.permissionDenied, 'red');
    } else {
      showFeedback(MSG.ADD_FRIEND_FAILED + err.message, 'red');
    }
  }
}

async function removeFriend(friendUid) {
  const currentUser = auth.currentUser;
  if (!auth.currentUser) return showFeedback(MSG.SIGN_IN_TO_REMOVE_FRIEND, 'red');
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
    showFeedback(MSG.FRIEND_REMOVED, 'slate');
  } catch (err) {
    console.error('Remove friend failed', err.code, err.message || err);
    showFeedback(MSG.REMOVE_FRIEND_FAILED, 'red');
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
    container.innerHTML = `<p class="text-xs text-red-400">${PERMISSION_ERROR_MAP.renderFriends}</p>`;
  }
}

function changeFriendsPage(direction) {
  changeGenericPage('friends', state.social.userFriendsList, 3, renderActiveFriendsList, direction);
}


function cleanupFriendsSubscriptions() {
  if (unsubscribeProfile) { unsubscribeProfile(); unsubscribeProfile = null; }
}

export { getProfileDocRef, getProfileDocument, initSocialProfile, copyCyberTag, handleAddFriend, addFriendFromLeaderboard, removeFriend, cacheUncachedProfiles, renderActiveFriendsList, changeFriendsPage, cleanupFriendsSubscriptions };
