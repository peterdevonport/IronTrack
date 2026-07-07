import { cleanupFriendsSubscriptions } from './friends.js';
import { cleanupLeaderboardSubscriptions } from './leaderboard.js';
import { cleanupSharedPlansSubscriptions } from './sharing.js';

export { getProfileDocRef, getProfileDocument, initSocialProfile, copyCyberTag, handleAddFriend, addFriendFromLeaderboard, removeFriend, cacheUncachedProfiles, renderActiveFriendsList, changeFriendsPage } from './friends.js';
export { filterLeaderboardProfiles, computeLeaderboardSlice, switchLeaderboardScope, toggleLeaderboardExpand, renderLeaderboardView, syncLeaderboardFeed, switchLeaderboardFormula, updateUserLeaderboardProfile, showQRCode } from './leaderboard.js';
export { switchShareMode, openShareModal, resolveShareContent, buildSharedPlanDocument, buildQrShareUrl, buildQrCodeConfig, shareWithFriends, shareByQR, listenToSharedPlans, renderSharedPlansUI, changeSharedPlansPage, saveSharedPlanToMyPlans, dismissSharedPlan, toggleFavoriteGeneric, toggleFavorite, togglePlanFavorite, toggleStructuredFavorite, processFriendRequest, processClaimedPlan, loadSharedPlan } from './sharing.js';

function cleanupSocialSubscriptions() {
  cleanupFriendsSubscriptions();
  cleanupLeaderboardSubscriptions();
  cleanupSharedPlansSubscriptions();
}

export { cleanupSocialSubscriptions };
