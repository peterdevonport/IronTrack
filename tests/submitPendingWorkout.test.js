import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockAddDoc = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'test-doc-id' }));

vi.mock('../firebase.js', () => ({
  auth: { currentUser: { uid: 'test-user-123' } },
  db: {},
  addDoc: mockAddDoc,
  collection: vi.fn(() => ({})),
  Timestamp: { now: vi.fn(() => ({ toMillis: () => Date.now() })) },
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn()
}));

const mockState = vi.hoisted(() => ({
  builder: {
    pendingPlannedWorkout: null,
    workoutMovements: [],
    emomMode: 'sequence'
  },
  user: {
    userBiometrics: { bodyweight: 75, gender: 'male' },
    userChallengeStreaks: {},
    userSignupTs: 0
  },
  cache: {
    activeRecords: {},
    cachedMaxLoadByExercise: {},
    cachedMax1RMByExercise: {},
    cachedMaxRepsByExercise: {}
  },
  data: {
    lastWorkouts: []
  }
}));

vi.mock('../state.js', () => ({
  state: mockState,
  EPLEY_CONSTANT: 30,
  SECONDS_PER_MINUTE: 60,
  PERCENT_DIVISOR: 100,
  HAPTIC: { tap: 15, confirm: 30, achievement: [50, 30, 50], error: [40, 50, 40] },
  FIRESTORE_STRUCTURED_LIMIT: 500,
  DEBOUNCE_DELAY_SYNC_ACTIVITY: 3000
}));

vi.mock('../math.js', () => ({
  estimate1RM: vi.fn((load, reps) => reps === 1 ? load : load * (1 + reps / 30)),
  estimateWeightForReps: vi.fn((oneRM, reps) => oneRM / (1 + reps / 30)),
  getEffectiveLoad: vi.fn(w => parseFloat(w.weight) || 0),
  computeEffectiveLoad: vi.fn((ex, w, ext, bw) => parseFloat(w) || 0),
  computeDisplayWeight: vi.fn((m, oneRM) => m.weight),
  rpeToRir: vi.fn(rpe => 10 - rpe)
}));

vi.mock('../dom.js', () => ({
  debounce: vi.fn(() => vi.fn()),
  escapeHtml: vi.fn(),
  haptic: vi.fn()
}));

vi.mock('../exercise-data.js', () => ({
  getExerciseInfo: vi.fn(() => ({ category: 'barbell', type: 'weighted' })),
  LOAD_FACTORS: {},
  EXERCISE_CATALOG: [],
  resolveExerciseVariant: vi.fn()
}));

vi.mock('../analytics.js', () => ({
  formatScore_ROUNDS_AND_REPS: vi.fn((r, a) => `${r} rounds + ${a} reps`),
  formatScore_COMPLETED_MINUTES: vi.fn((c, t) => `${c}/${t} min`),
  formatScore_TIME_SECONDS: vi.fn(t => `${t}s`),
  getRepsPerRound: vi.fn(),
  computeDotsScore: vi.fn(() => ({ dots: 0, olyTotal: 0 })),
  computeSinclairScore: vi.fn(() => ({ sinclair: 0, olyTotal: 0 })),
  getRankingTier: vi.fn(() => 'Beginner'),
  buildWorkoutDescription: vi.fn(),
  buildWorkoutSummaryLine: vi.fn(),
  describeAmrap: vi.fn(),
  describeEmom: vi.fn(),
  describeForTime: vi.fn(),
  describeInterval: vi.fn()
}));

vi.mock('../ui.js', () => ({
  showFeedback: vi.fn(),
  clearChildren: vi.fn(),
  isPermissionDenied: vi.fn(err => err?.code === 'permission-denied'),
  PERMISSION_ERROR_MAP: {
    saveWorkout: 'You do not have permission to save this workout.',
    loadLeaderboard: 'Unable to load the leaderboard.',
    loadProfile: 'Unable to load profile.',
    loadSocialProfile: 'Unable to load social profile.',
    permissionDenied: 'Permission denied.',
    loadProfileMetrics: 'Unable to load profile metrics.',
    renderFriends: 'Unable to display friends list.',
  }
}));

vi.mock('../messages.js', () => ({
  MSG: {
    NO_PLANNED_WORKOUT: 'No planned workout to log.',
    WORKOUT_LOGGED: 'Workout logged!',
    WORKOUT_LOG_FAILED: 'Failed to log workout: ',
    UNKNOWN_WORKOUT_TYPE: 'Unknown workout type.',
    ENTER_ROUNDS: 'Enter rounds completed.',
    SECONDS_RANGE: 'Seconds must be 0\u201359.',
    STRUCTURED_WORKOUTS_UNAVAILABLE: 'Structured workouts unavailable.',
    SIGN_IN_BEFORE_LOG: 'Please sign in before logging a workout.',
  }
}));

vi.mock('../auth.js', () => ({
  requireAuth: vi.fn(() => ({ uid: 'test-user-123' })),
  processWorkoutSnapshot: vi.fn(),
  updateCaches: vi.fn(),
  pullProfileMetrics: vi.fn(),
  refreshPBForm: vi.fn(),
  logPB: vi.fn(),
  getSchemaKey: vi.fn(),
  computeTotalLoad: vi.fn()
}));

vi.mock('../calendar.js', () => ({
  computeAndSyncDailyActivity: vi.fn()
}));

import { submitPendingWorkout } from '../workouts.js';
import { showFeedback, isPermissionDenied } from '../ui.js';
import { haptic } from '../dom.js';
import { requireAuth } from '../auth.js';

describe('submitPendingWorkout', () => {

  beforeEach(() => {
    vi.resetAllMocks();
    mockAddDoc.mockResolvedValue({ id: 'test-doc-id' });
    requireAuth.mockReturnValue({ uid: 'test-user-123' });
    isPermissionDenied.mockImplementation(err => err?.code === 'permission-denied');
    document.body.innerHTML = `
      <input id="log-rounds" />
      <input id="log-partial-reps" />
      <button id="log-workout-btn" class="is-primary"></button>
      <div id="log-workout-type-badge"></div>
      <div id="log-workout-placeholder"></div>
      <div id="workout-description"></div>
    `;
  });

  it('should submit AMRAP pending workout', async () => {
    mockState.builder.pendingPlannedWorkout = {
      type: 'AMRAP',
      name: 'Test AMRAP',
      structure: { movements: [] }
    };
    document.getElementById('log-rounds').value = '5';
    document.getElementById('log-partial-reps').value = '10';

    await submitPendingWorkout();

    expect(mockAddDoc).toHaveBeenCalled();
    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.type).toBe('AMRAP');
    expect(workoutDoc.result.roundsCompleted).toBe(5);
    expect(showFeedback).toHaveBeenCalledWith('Workout logged!', 'emerald', 'log-workout-feedback');
    expect(haptic).toHaveBeenCalled();
  });

  it('should submit EMOM pending workout', async () => {
    mockState.builder.pendingPlannedWorkout = {
      type: 'EMOM',
      name: 'Test EMOM',
      structure: { rounds: 10, minutes: [], mode: 'by_round' }
    };
    document.getElementById('log-rounds').value = '8';

    await submitPendingWorkout();

    expect(mockAddDoc).toHaveBeenCalled();
    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.type).toBe('EMOM');
    expect(workoutDoc.result.roundsCompleted).toBe(8);
    expect(showFeedback).toHaveBeenCalledWith('Workout logged!', 'emerald', 'log-workout-feedback');
  });

  it('should submit FOR_TIME pending workout', async () => {
    mockState.builder.pendingPlannedWorkout = {
      type: 'FOR_TIME',
      name: 'Test For Time',
      structure: { movements: [] }
    };
    document.body.innerHTML += `
      <input id="fortime-minutes" value="5" />
      <input id="fortime-seconds" value="0" />
      <input id="fortime-cap-reps" />
      <input id="fortime-dnf" type="checkbox" />
      <div id="fortime-time-inputs"></div>
      <div id="fortime-cap-reps-container"></div>
      <div id="fortime-score-preview"></div>
    `;

    await submitPendingWorkout();

    expect(mockAddDoc).toHaveBeenCalled();
    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.type).toBe('FOR_TIME');
    expect(workoutDoc.result.timeSeconds).toBe(300);
    expect(showFeedback).toHaveBeenCalledWith('Workout logged!', 'emerald', 'log-workout-feedback');
  });

  it('should submit INTERVAL pending workout', async () => {
    mockState.builder.pendingPlannedWorkout = {
      type: 'INTERVAL',
      name: 'Test Interval',
      structure: { rounds: 5, movements: [] }
    };
    document.getElementById('log-rounds').value = '4';
    document.getElementById('log-partial-reps').value = '2';

    await submitPendingWorkout();

    expect(mockAddDoc).toHaveBeenCalled();
    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.type).toBe('INTERVAL');
    expect(workoutDoc.result.roundsCompleted).toBe(4);
    expect(showFeedback).toHaveBeenCalledWith('Workout logged!', 'emerald', 'log-workout-feedback');
  });

  it('should show feedback when no pending workout exists', async () => {
    mockState.builder.pendingPlannedWorkout = null;

    await submitPendingWorkout();

    expect(showFeedback).toHaveBeenCalledWith('No planned workout to log.', 'rose', 'log-workout-feedback');
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should show feedback when requireAuth fails', async () => {
    const { requireAuth } = await import('../auth.js');
    requireAuth.mockReturnValue(null);

    mockState.builder.pendingPlannedWorkout = {
      type: 'AMRAP',
      name: 'Test',
      structure: { movements: [] }
    };

    await submitPendingWorkout();

    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should show permission error on permission-denied', async () => {
    mockState.builder.pendingPlannedWorkout = {
      type: 'AMRAP',
      name: 'Test AMRAP',
      structure: { movements: [] }
    };
    document.getElementById('log-rounds').value = '5';
    document.getElementById('log-partial-reps').value = '10';
    mockAddDoc.mockRejectedValueOnce({ code: 'permission-denied', message: 'Permission denied' });

    await submitPendingWorkout();

    expect(showFeedback).toHaveBeenCalledWith(
      'You do not have permission to save this workout.',
      'rose',
      'log-workout-feedback'
    );
  });

  it('should show generic error on other Firestore errors', async () => {
    mockState.builder.pendingPlannedWorkout = {
      type: 'AMRAP',
      name: 'Test AMRAP',
      structure: { movements: [] }
    };
    document.getElementById('log-rounds').value = '5';
    document.getElementById('log-partial-reps').value = '10';
    mockAddDoc.mockRejectedValueOnce(new Error('Network error'));

    await submitPendingWorkout();

    expect(showFeedback).toHaveBeenCalledWith(
      'Failed to log workout: Network error',
      'rose',
      'log-workout-feedback'
    );
  });

  it('should re-enable button after error', async () => {
    mockState.builder.pendingPlannedWorkout = {
      type: 'AMRAP',
      name: 'Test',
      structure: { movements: [] }
    };
    document.getElementById('log-rounds').value = '5';
    document.getElementById('log-partial-reps').value = '10';
    mockAddDoc.mockRejectedValueOnce(new Error('Network error'));

    await submitPendingWorkout();

    const btn = document.getElementById('log-workout-btn');
    expect(btn.disabled).toBe(false);
  });

  it('should re-enable button after success', async () => {
    mockState.builder.pendingPlannedWorkout = {
      type: 'AMRAP',
      name: 'Test',
      structure: { movements: [] }
    };
    document.getElementById('log-rounds').value = '5';
    document.getElementById('log-partial-reps').value = '10';

    await submitPendingWorkout();

    const btn = document.getElementById('log-workout-btn');
    expect(btn.disabled).toBe(false);
  });
});
