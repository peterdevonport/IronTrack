const MSG = {};

MSG.UNEXPECTED_ERROR = 'An unexpected error occurred. Please try again.';

MSG.SIGN_IN_REQUIRED = 'Please sign in first.';
MSG.SIGN_IN_BEFORE_LOG = 'Please sign in before logging a workout.';
MSG.FILL_CREDENTIALS = 'Please fill out all credential spaces.';
MSG.FILL_EMAIL_PASSWORD = 'Please assign an email and password.';
MSG.PASSWORD_MIN_LENGTH = 'Password security requires at least 6 characters.';
MSG.ACCOUNT_CREATED = 'Account mapped successfully!';
MSG.ENTER_EMAIL = 'Enter your email address.';
MSG.RESET_LINK_SENT = 'Reset link sent! Check your email.';
MSG.PASSWORD_UPDATED = 'Password updated successfully!';
MSG.FILL_PASSWORD_FIELDS = 'Fill in all password fields.';
MSG.NEW_PASSWORD_MIN_LENGTH = 'New password must be at least 6 characters.';
MSG.PASSWORDS_MISMATCH = 'New passwords do not match.';
MSG.PASSWORD_SAME = 'New password must differ from current.';

MSG.PROFILE_LOAD_FAILED = 'Failed to load your profile. Please try refreshing the page.';
MSG.PROFILE_SAVE_FAILED = 'Failed to save profile: ';
MSG.PROFILE_UPDATE_FAILED = 'Failed to update profile: ';
MSG.PROFILE_UPDATED = 'Profile updated successfully!';
MSG.PROFILE_METRICS_FAILED = 'Failed to load profile metrics. Check Firestore rules for profiles.';
MSG.ONBOARDING_SUCCESS = 'Profile initialized! Welcome to IronTrack.';

MSG.WORKOUT_SAVED = 'Workout saved. Keep crushing it!';
MSG.WORKOUT_SAVE_FAILED = 'Failed to save workout: ';
MSG.WORKOUT_LOG_FAILED = 'Failed to log workout: ';
MSG.WORKOUT_LOGGED = 'Workout logged!';
MSG.SELECT_EXERCISE = 'Please select an exercise.';
MSG.SELECT_WORKOUT_TYPE = 'Select a workout type first.';
MSG.UNKNOWN_WORKOUT_TYPE = 'Unknown workout type.';
MSG.ADD_MOVEMENT = 'Add at least one movement before starting the workout.';
MSG.ENTER_ROUNDS = 'Enter rounds completed.';
MSG.SECONDS_RANGE = 'Seconds must be 0–59.';
MSG.NO_PLANNED_WORKOUT = 'No planned workout to log.';
MSG.STRUCTURED_WORKOUTS_UNAVAILABLE = 'Structured workouts unavailable — check browser console for index link.';

MSG.PERMISSION_FIRESTORE_RULES = 'Permission denied: Check Firestore rules for profiles.';
MSG.SAVE_BLOCKED = 'Permission denied: Save blocked by Firestore rules.';
MSG.PERMISSION_LEADERBOARD = 'Permission denied: Update Firestore rules for profiles.';

MSG.RECORD_LOGGED = 'Record logged! It will appear in your records.';
MSG.RECORD_LOG_FAILED = 'Failed to log record: ';
MSG.ENTER_VALID_WEIGHT = 'Please enter a valid weight.';

MSG.AUTHENTICATE_TO_LINK = 'Authenticate to link friends.';
MSG.CANT_LINK_OWN_TAG = "Can't link your own tag.";
MSG.FRIEND_ALREADY_LINKED = 'Friend already linked.';
MSG.CYBER_TAG_NOT_FOUND = 'Cyber-Tag not found in database.';
MSG.FRIEND_LINK_SUCCESS = 'Friend link established successfully!';
MSG.LINK_NETWORK_NODE_FAILED = 'Failed to link network node: ';
MSG.SIGN_IN_TO_ADD_FRIEND = 'Sign in to add friends from leaderboard.';
MSG.ALREADY_CONNECTED = 'Already connected with this athlete.';
MSG.ADD_ATHLETE_FAILED = 'Failed to add athlete: Cyber-Tag missing.';
MSG.ADD_FRIEND_FAILED = 'Failed to add friend: ';
MSG.FRIEND_ADDED = 'Friend added from leaderboard!';
MSG.SIGN_IN_TO_REMOVE_FRIEND = 'Sign in to remove friends.';
MSG.ATHLETE_NOT_IN_LIST = 'Athlete not in your friend list.';
MSG.REMOVE_FRIEND_FAILED = 'Failed to remove friend. Check permissions.';
MSG.FRIEND_REMOVED = 'Friend removed.';
MSG.RENDER_FRIENDS_FAILED = 'Failed to render active grid context. Check Firestore rules for profiles.';
MSG.CYBER_TAG_NOT_FOUND_CHECK = 'Cyber-Tag not found. Check the ID and try again.';

MSG.SELECT_FRIEND = 'Select at least one friend.';
MSG.PLAN_NOT_FOUND = 'Plan/workout not found.';
MSG.SHARE_FAILED = 'Failed to share: ';
MSG.QR_GENERATE_FAILED = 'Failed to generate QR: ';
MSG.QR_GENERATED = 'QR code generated! Friend scans to import.';
MSG.PLAN_SAVED_COLLECTION = 'Plan saved to your collection!';
MSG.SAVE_SHARED_PLAN_FAILED = 'Failed to save plan: ';
MSG.DISMISS_FAILED = 'Failed to dismiss: ';
MSG.PLAN_ALREADY_CLAIMED = 'Plan already claimed!';
MSG.IMPORT_PLAN_FROM_QR_FAILED = 'Failed to import plan from QR.';

MSG.PLAN_SAVED = 'Plan saved!';
MSG.SAVE_PLAN_FAILED = 'Failed to save plan: ';
MSG.ENTER_VALID_DURATION = 'Enter a valid duration.';
MSG.ENTER_VALID_INTERVAL = 'Enter a valid interval.';
MSG.ENTER_VALID_ROUNDS = 'Enter a valid number of rounds.';
MSG.ENTER_VALID_ROUND_COUNT = 'Enter a valid round count.';
MSG.SELECT_EXERCISE_ALL_INTERVALS = 'Select an exercise for all intervals.';
MSG.ENTER_REPS_ALL_INTERVALS = 'Enter reps for all intervals.';
MSG.DELETE_PLAN_FAILED = 'Failed to delete plan: ';
MSG.DELETE_WORKOUT_FAILED = 'Failed to delete workout: ';

MSG.LOAD_SOCIAL_PROFILE_FAILED = 'Failed to load social profile. Check Firestore rules.';

export { MSG };
