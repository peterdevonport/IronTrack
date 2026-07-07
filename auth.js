import { auth, db, doc, getDoc } from './firebase.js';
import { state } from './state.js';
import { getExerciseInfo, LOAD_FACTORS } from './exercise-data.js';
import { renderFormFields } from './forms.js';
import { showFeedback } from './ui.js';

function getSchemaKey(exerciseName) {
  const info = getExerciseInfo(exerciseName);
  if (info.name === 'Pull Up') return 'weighted';
  if (info.type === 'bodyweight') return 'bodyweight';
  if (info.type === 'weighted' && LOAD_FACTORS[exerciseName]) return 'weighted';
  return 'standard';
}

function computeTotalLoad(fieldValues, exerciseName, prefix) {
  const lf = LOAD_FACTORS[exerciseName];
  const bw = parseFloat(fieldValues[prefix + '-bodyweight']) || state.user.userBiometrics.bodyweight || 0;
  const ext = parseFloat(fieldValues[prefix + '-ext-load']) || 0;
  if (lf !== undefined) {
    const est = bw * lf + ext;
    return est > 0 ? Math.round(est).toString() : '\u2014';
  }
  return '\u2014';
}

async function pullProfileMetrics(uid) {
    try {
        const docRef = doc(db, "profiles", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            state.user.userBiometrics = { gender: 'male', bodyweight: 75, displayName: '', ...docSnap.data() };
            if (docSnap.data().challengeStreaks) {
                state.user.userChallengeStreaks = {
                    monthly: { completedPeriods: [], currentStreak: 0, bestStreak: 0, ...docSnap.data().challengeStreaks.monthly },
                    yearly: { completedPeriods: [], currentStreak: 0, bestStreak: 0, ...docSnap.data().challengeStreaks.yearly }
                };
            }
            document.getElementById('profile-gender').value = state.user.userBiometrics.gender;
            document.getElementById('profile-weight').value = state.user.userBiometrics.bodyweight;
            document.getElementById('profile-display-name').value = state.user.userBiometrics.displayName || '';
        }
        const emailEl = document.getElementById('profile-email');
        if (emailEl && auth.currentUser) emailEl.value = auth.currentUser.email || '';
        const saveBtn = document.getElementById('save-profile-btn');
        if (saveBtn) saveBtn.disabled = true;
    } catch (err) {
        console.error('Failed to load profile metrics', err.code, err.message);
        showFeedback('Unable to load profile metrics. Check Firestore rules for profiles.', 'red');
    }
}

function refreshPBForm(formSchemas) {
  const exercise = document.getElementById('pb-log-exercise')?.value;
  if (!exercise) { renderFormFields('pb-log-fields', formSchemas.logPB.standard); return; }
  const schemaKey = getSchemaKey(exercise);
  const schema = (formSchemas.logPB[schemaKey] || formSchemas.logPB.standard);
  const result = renderFormFields('pb-log-fields', schema, {
    initialValues: { 'pb-bodyweight': state.user.userBiometrics.bodyweight || 0 },
    onFieldChange: (values) => {
      const total = document.getElementById('pb-total-load');
      if (total) total.textContent = computeTotalLoad(values, exercise, 'pb');
    }
  });
  if (result && result.fields['pb-bodyweight']) {
    result.fields['pb-bodyweight'].value = state.user.userBiometrics.bodyweight || '';
  }
  if (result && result.fields['pb-total-load']) {
    const initValues = { ...result.fieldValues, 'pb-bodyweight': state.user.userBiometrics.bodyweight || 0 };
    result.fields['pb-total-load'].textContent = computeTotalLoad(initValues, exercise, 'pb');
  }
}

function processWorkoutSnapshot(docs, getEffectiveLoad, estimate1RM) {
  const workouts = [];
  const activeRecords = {};
  const cachedMaxLoadByExercise = {};
  const cachedMax1RMByExercise = {};
  const cachedMaxRepsByExercise = {};

  docs.forEach(doc => {
    const data = doc.data();
    const timestamp = data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp;
    const workout = { id: doc.id, ...data, timestamp };
    workouts.push(workout);

    if (data.source === 'structured') return;

    const effectiveWeight = getEffectiveLoad(workout);
    const reps = parseInt(data.reps, 10);
    const calculated1RM = estimate1RM(effectiveWeight, reps);

    if (!activeRecords[data.exercise] || calculated1RM > activeRecords[data.exercise]) {
      activeRecords[data.exercise] = calculated1RM;
    }

    if (!cachedMaxLoadByExercise[data.exercise] || effectiveWeight > cachedMaxLoadByExercise[data.exercise]) {
      cachedMaxLoadByExercise[data.exercise] = effectiveWeight;
    }
    if (!cachedMax1RMByExercise[data.exercise] || calculated1RM > cachedMax1RMByExercise[data.exercise]) {
      cachedMax1RMByExercise[data.exercise] = calculated1RM;
    }

    if (!cachedMaxRepsByExercise[data.exercise] || reps > cachedMaxRepsByExercise[data.exercise]) {
      cachedMaxRepsByExercise[data.exercise] = reps;
    }
  });

  return { workouts, activeRecords, cachedMaxLoadByExercise, cachedMax1RMByExercise, cachedMaxRepsByExercise };
}

function updateCaches(processed) {
  state.cache.activeRecords = processed.activeRecords;
  state.cache.cachedMaxLoadByExercise = processed.cachedMaxLoadByExercise;
  state.cache.cachedMax1RMByExercise = processed.cachedMax1RMByExercise;
  state.cache.cachedMaxRepsByExercise = processed.cachedMaxRepsByExercise;

  state.data.lastWorkouts = processed.workouts;
  window.__lastWorkouts = state.data.lastWorkouts;
  window.__irontrackWorkoutCount = state.data.lastWorkouts.length;

  if (state.data.lastWorkouts.length > 0) {
    const earliestTs = Math.min(...state.data.lastWorkouts.map(w => w.timestamp));
    if (earliestTs > 0 && earliestTs < state.user.userSignupTs) {
      state.user.userSignupTs = earliestTs;
    }
  }
}

export { getSchemaKey, computeTotalLoad, pullProfileMetrics, refreshPBForm, processWorkoutSnapshot, updateCaches };
