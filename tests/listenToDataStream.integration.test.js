import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  cache: {
    activeRecords: {},
    cachedMaxLoadByExercise: {},
    cachedMax1RMByExercise: {},
    cachedMaxRepsByExercise: {}
  },
  data: { lastWorkouts: [] },
  user: {
    userSignupTs: Date.now(),
    userBiometrics: { bodyweight: 75, gender: 'male' },
    userChallengeStreaks: {
      monthly: { completedPeriods: [], currentStreak: 0, bestStreak: 0 },
      yearly: { completedPeriods: [], currentStreak: 0, bestStreak: 0 }
    }
  }
}));

vi.mock('../firebase.js', () => ({
  auth: { currentUser: null },
  db: {},
  collection: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  Timestamp: { now: vi.fn(() => ({ toMillis: () => Date.now() })) },
  serverTimestamp: vi.fn()
}));

vi.mock('../state.js', () => ({
  state: mockState,
  FIRESTORE_WORKOUTS_LIMIT: 250,
  FIRESTORE_STRUCTURED_LIMIT: 500,
  DEBOUNCE_DELAY_LEADERBOARD: 5000,
  DEBOUNCE_DELAY_SYNC_ACTIVITY: 3000,
  EPLEY_CONSTANT: 30,
  SECONDS_PER_MINUTE: 60,
  PERCENT_DIVISOR: 100,
  HAPTIC: { tap: 15, confirm: 30 },
  entriesPerPage: 5
}));

vi.mock('../math.js', () => ({
  estimate1RM: vi.fn((load, reps) => reps === 1 ? load : load * (1 + reps / 30)),
  getEffectiveLoad: vi.fn(w => parseFloat(w.weight) || 0),
  computeEffectiveLoad: vi.fn((ex, w, ext, bw) => parseFloat(w) || 0),
  estimateWeightForReps: vi.fn((oneRM, reps) => oneRM / (1 + reps / 30)),
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
  computeDotsScore: vi.fn(() => ({ dots: 0, olyTotal: 0 })),
  computeSinclairScore: vi.fn(() => ({ sinclair: 0, olyTotal: 0 })),
  getRankingTier: vi.fn(() => 'Beginner')
}));

vi.mock('../ui.js', () => ({
  showFeedback: vi.fn(),
  clearChildren: vi.fn(),
  updatePagination: vi.fn(),
  updatePaginationControls: vi.fn(),
  renderEmptyState: vi.fn(),
  renderMessage: vi.fn(),
  isPermissionDenied: vi.fn(),
  PERMISSION_ERROR_MAP: {}
}));

vi.mock('../leaderboard.js', () => ({
  updateUserLeaderboardProfile: vi.fn()
}));

vi.mock('../calc.js', () => ({
  update1RMRegistryUI: vi.fn(),
  updateCalcCard: vi.fn(),
  populateWorkoutFilter: vi.fn(),
  populateLiftSelectors: vi.fn(),
  populateExerciseDropdown: vi.fn(),
  changePage: vi.fn(),
  changeRecordsPage: vi.fn()
}));

vi.mock('../volume.js', () => ({
  renderLogs: vi.fn(),
  renderVolumeHistory: vi.fn(),
  populateVolumeFilter: vi.fn()
}));

vi.mock('../workouts.js', () => ({
  debouncedSyncActivity: vi.fn(),
  renderStructuredWorkoutHistory: vi.fn()
}));

vi.mock('../calendar.js', () => ({
  computeAndSyncDailyActivity: vi.fn()
}));

vi.mock('../messages.js', () => ({ MSG: {} }));
vi.mock('../forms.js', () => ({ renderFormFields: vi.fn() }));
vi.mock('../formatting.js', () => ({ formatDotsScore: vi.fn() }));

import { processWorkoutSnapshot, updateCaches } from '../auth.js';
import { renderFromWorkouts } from '../data.js';
import * as calcModule from '../calc.js';
import * as volumeModule from '../volume.js';
import * as workoutsModule from '../workouts.js';

describe('listenToDataStream integration', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.cache.activeRecords = {};
    mockState.cache.cachedMaxLoadByExercise = {};
    mockState.cache.cachedMax1RMByExercise = {};
    mockState.cache.cachedMaxRepsByExercise = {};
    mockState.data.lastWorkouts = [];
    mockState.user.userSignupTs = Date.now();
    window.__lastWorkouts = [];
    window.__irontrackWorkoutCount = 0;
  });

  it('should compose all three functions correctly end-to-end', () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, estimatedLoad: 100, timestamp: { toMillis: () => 1000 } }) },
      { id: 'w2', data: () => ({ exercise: 'Bench Press', weight: 80, reps: 3, estimatedLoad: 80, timestamp: { toMillis: () => 2000 } }) }
    ];

    const getEffectiveLoad = (w) => w.estimatedLoad;
    const estimate1RM = (load, reps) => reps === 1 ? load : load * (1 + reps / 30);

    const processed = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);
    updateCaches(processed);
    renderFromWorkouts(mockState.data.lastWorkouts);

    expect(mockState.cache.activeRecords['Back Squat']).toBeCloseTo(116.67, 2);
    expect(mockState.cache.cachedMaxLoadByExercise['Bench Press']).toBe(80);
    expect(mockState.data.lastWorkouts).toHaveLength(2);
    expect(calcModule.populateWorkoutFilter).toHaveBeenCalled();
    expect(calcModule.update1RMRegistryUI).toHaveBeenCalled();
    expect(calcModule.updateCalcCard).toHaveBeenCalled();
    expect(volumeModule.renderLogs).toHaveBeenCalledWith(mockState.data.lastWorkouts);
    expect(volumeModule.renderVolumeHistory).toHaveBeenCalled();
    expect(workoutsModule.debouncedSyncActivity).toHaveBeenCalled();
  });

  it('should set active records correctly', () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, estimatedLoad: 100, timestamp: { toMillis: () => 1000 } }) }
    ];

    const processed = processWorkoutSnapshot(mockDocs, (w) => w.estimatedLoad, (l, r) => l * (1 + r / 30));
    updateCaches(processed);

    expect(mockState.cache.activeRecords['Back Squat']).toBeCloseTo(116.67, 2);
  });

  it('should handle empty snapshot gracefully', () => {
    const processed = processWorkoutSnapshot([], () => 0, () => 0);
    updateCaches(processed);
    renderFromWorkouts([]);

    expect(mockState.cache.activeRecords).toEqual({});
    expect(mockState.data.lastWorkouts).toEqual([]);
    expect(calcModule.populateWorkoutFilter).toHaveBeenCalledWith([]);
    expect(volumeModule.renderLogs).toHaveBeenCalledWith([]);
  });

  it('should update userSignupTs correctly', () => {
    const initialTs = mockState.user.userSignupTs;
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, timestamp: { toMillis: () => 100 } }) }
    ];

    const processed = processWorkoutSnapshot(mockDocs, (w) => 100, (l, r) => l * (1 + r / 30));
    updateCaches(processed);

    expect(mockState.user.userSignupTs).toBe(100);
    expect(mockState.user.userSignupTs).not.toBe(initialTs);
  });

  it('should handle multiple workouts', () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, estimatedLoad: 100, timestamp: { toMillis: () => 1000 } }) },
      { id: 'w2', data: () => ({ exercise: 'Bench Press', weight: 80, reps: 3, estimatedLoad: 80, timestamp: { toMillis: () => 2000 } }) },
      { id: 'w3', data: () => ({ exercise: 'Deadlift', weight: 150, reps: 1, estimatedLoad: 150, timestamp: { toMillis: () => 3000 } }) }
    ];

    const processed = processWorkoutSnapshot(mockDocs, (w) => w.estimatedLoad, (l, r) => l * (1 + r / 30));
    updateCaches(processed);

    expect(mockState.cache.activeRecords).toEqual({
      'Back Squat': expect.closeTo(116.67, 2),
      'Bench Press': 88,
      'Deadlift': expect.closeTo(155, 2)
    });
    expect(mockState.data.lastWorkouts).toHaveLength(3);
  });

  it('should render with unique exercises', () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, timestamp: { toMillis: () => 1000 } }) },
      { id: 'w2', data: () => ({ exercise: 'Back Squat', weight: 110, reps: 3, timestamp: { toMillis: () => 2000 } }) }
    ];

    const processed = processWorkoutSnapshot(mockDocs, () => 0, () => 0);
    updateCaches(processed);
    renderFromWorkouts(mockState.data.lastWorkouts);

    expect(mockState.data.lastWorkouts).toHaveLength(2);
    expect(calcModule.populateWorkoutFilter).toHaveBeenCalled();
    expect(volumeModule.populateVolumeFilter).toHaveBeenCalled();
  });

  it('should preserve workout order', () => {
    const mockDocs = [
      { id: 'w3', data: () => ({ exercise: 'Deadlift', weight: 150, reps: 1, timestamp: { toMillis: () => 3000 } }) },
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, timestamp: { toMillis: () => 1000 } }) },
      { id: 'w2', data: () => ({ exercise: 'Bench Press', weight: 80, reps: 3, timestamp: { toMillis: () => 2000 } }) }
    ];

    const processed = processWorkoutSnapshot(mockDocs, (w) => w.estimatedLoad || 0, (l, r) => l);
    updateCaches(processed);

    expect(mockState.data.lastWorkouts[0].id).toBe('w3');
    expect(mockState.data.lastWorkouts[1].id).toBe('w1');
    expect(mockState.data.lastWorkouts[2].id).toBe('w2');
  });
});
