import { auth, db, doc, getDoc, addDoc, collection, Timestamp } from './firebase.js';
import { state, HAPTIC, FORM_SCHEMAS, pbLogExercise, pbLogBtn } from './state.js';
import { estimate1RM, getEffectiveLoad, computeEffectiveLoad } from './math.js';
import { haptic } from './dom.js';
import { getExerciseInfo, LOAD_FACTORS, resolveExerciseVariant } from './exercise-data.js';
import { renderFormFields } from './forms.js';
import { PERMISSION_ERROR_MAP, showFeedback } from './ui.js';
import { MSG } from './messages.js';

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
        showFeedback(PERMISSION_ERROR_MAP.loadProfileMetrics, 'red');
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

async function logPB() {
    if (!auth.currentUser) return;
    const exercise = pbLogExercise?.value;
    if (!exercise) {
        showFeedback(MSG.SELECT_EXERCISE, 'red', 'pb-log-feedback');
        return;
    }
    const schemaKey = getSchemaKey(exercise);
    let weight, externalLoad = 0, estimatedLoad;
    const bw = state.user.userBiometrics.bodyweight || 0;
    if (schemaKey === 'bodyweight') {
      weight = parseFloat(document.getElementById('pb-bodyweight')?.value) || bw;
      estimatedLoad = computeEffectiveLoad(exercise, weight, 0, bw);
    } else if (schemaKey === 'weighted') {
      weight = parseFloat(document.getElementById('pb-bodyweight')?.value) || bw;
      externalLoad = parseFloat(document.getElementById('pb-ext-load')?.value) || 0;
      estimatedLoad = computeEffectiveLoad(exercise, weight, externalLoad, bw);
      weight += externalLoad;
    } else {
      weight = parseFloat(document.getElementById('pb-weight')?.value);
      estimatedLoad = computeEffectiveLoad(exercise, weight, 0, bw);
    }
    const reps = parseInt(document.getElementById('pb-reps')?.value, 10) || 1;

    const storedExercise = resolveExerciseVariant(exercise, externalLoad);

    if (!weight || weight <= 0) {
        showFeedback(MSG.ENTER_VALID_WEIGHT, 'red', 'pb-log-feedback');
        return;
    }

    if (pbLogBtn) pbLogBtn.disabled = true;

    try {
        const logEntry = {
            userId: auth.currentUser.uid,
            exercise: storedExercise,
            sets: 1,
            reps,
            weight,
            externalLoad,
            estimatedLoad,
            totalVolume: estimatedLoad * reps,
            timestamp: Timestamp.now(),
            source: 'pb-log',
            isInitialMax: false
        };
        await addDoc(collection(db, "workouts"), logEntry);

        pbLogExercise.value = '';
        refreshPBForm(FORM_SCHEMAS);
        showFeedback(MSG.RECORD_LOGGED, 'emerald', 'pb-log-feedback');
        haptic(HAPTIC.confirm);
    } catch (err) {
        console.error('Failed to log record', err.code, err.message);
        showFeedback(MSG.RECORD_LOG_FAILED + err.message, 'red', 'pb-log-feedback');
    } finally {
        if (pbLogBtn) pbLogBtn.disabled = false;
    }
}

function requireAuth(feedbackTarget = 'socialFeedback') {
  if (!auth.currentUser) {
    showFeedback('Please sign in to continue.', 'rose', feedbackTarget);
    return null;
  }
  return auth.currentUser;
}

export { getSchemaKey, computeTotalLoad, pullProfileMetrics, refreshPBForm, processWorkoutSnapshot, updateCaches, logPB, requireAuth };
