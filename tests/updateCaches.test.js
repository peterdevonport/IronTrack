import { describe, it, expect, beforeEach } from 'vitest';

const mockState = vi.hoisted(() => ({
  cache: {
    activeRecords: {},
    cachedMaxLoadByExercise: {},
    cachedMax1RMByExercise: {},
    cachedMaxRepsByExercise: {}
  },
  data: {
    lastWorkouts: []
  },
  user: {
    userSignupTs: 5000,
    userBiometrics: { gender: 'male', bodyweight: 75 },
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
  doc: vi.fn(),
  getDoc: vi.fn(),
  Timestamp: { now: vi.fn(() => 'test-ts') }
}));

vi.mock('../state.js', () => ({
  state: mockState,
  HAPTIC: { tap: 15, confirm: 30, achievement: [50, 30, 50], error: [40, 50, 40] },
  FORM_SCHEMAS: {},
  pbLogExercise: null,
  pbLogBtn: null
}));

vi.mock('../math.js', () => ({
  estimate1RM: vi.fn(),
  getEffectiveLoad: vi.fn(),
  computeEffectiveLoad: vi.fn()
}));

vi.mock('../dom.js', () => ({
  debounce: vi.fn(),
  escapeHtml: vi.fn(),
  haptic: vi.fn()
}));

vi.mock('../exercise-data.js', () => ({
  getExerciseInfo: vi.fn(),
  LOAD_FACTORS: {},
  resolveExerciseVariant: vi.fn()
}));

vi.mock('../forms.js', () => ({
  renderFormFields: vi.fn()
}));

vi.mock('../ui.js', () => ({
  showFeedback: vi.fn()
}));

vi.mock('../messages.js', () => ({
  MSG: {}
}));

import { updateCaches } from '../auth.js';

describe('updateCaches', () => {

  beforeEach(() => {
    mockState.cache.activeRecords = {};
    mockState.cache.cachedMaxLoadByExercise = {};
    mockState.cache.cachedMax1RMByExercise = {};
    mockState.cache.cachedMaxRepsByExercise = {};
    mockState.data.lastWorkouts = [];
    mockState.user.userSignupTs = 5000;
    window.__lastWorkouts = [];
    window.__irontrackWorkoutCount = 0;
  });

  it('updates global caches from processed data', () => {
    const processed = {
      workouts: [{ id: 'w1', exercise: 'Back Squat', timestamp: 1000 }],
      activeRecords: { 'Back Squat': 116.67 },
      cachedMaxLoadByExercise: { 'Back Squat': 100 },
      cachedMax1RMByExercise: { 'Back Squat': 116.67 },
      cachedMaxRepsByExercise: { 'Back Squat': 5 }
    };

    updateCaches(processed);

    expect(mockState.cache.activeRecords).toEqual(processed.activeRecords);
    expect(mockState.cache.cachedMaxLoadByExercise).toEqual(processed.cachedMaxLoadByExercise);
    expect(mockState.cache.cachedMax1RMByExercise).toEqual(processed.cachedMax1RMByExercise);
    expect(mockState.cache.cachedMaxRepsByExercise).toEqual(processed.cachedMaxRepsByExercise);
    expect(mockState.data.lastWorkouts).toEqual(processed.workouts);
    expect(window.__lastWorkouts).toEqual(processed.workouts);
    expect(window.__irontrackWorkoutCount).toBe(1);
  });

  it('updates userSignupTs if workout is earlier', () => {
    mockState.user.userSignupTs = 5000;
    const processed = {
      workouts: [{ id: 'w1', timestamp: 1000 }],
      activeRecords: {},
      cachedMaxLoadByExercise: {},
      cachedMax1RMByExercise: {},
      cachedMaxRepsByExercise: {}
    };

    updateCaches(processed);

    expect(mockState.user.userSignupTs).toBe(1000);
  });

  it('does not update userSignupTs if workout is later', () => {
    mockState.user.userSignupTs = 1000;
    const processed = {
      workouts: [{ id: 'w1', timestamp: 5000 }],
      activeRecords: {},
      cachedMaxLoadByExercise: {},
      cachedMax1RMByExercise: {},
      cachedMaxRepsByExercise: {}
    };

    updateCaches(processed);

    expect(mockState.user.userSignupTs).toBe(1000);
  });

  it('does not update userSignupTs if no workouts', () => {
    mockState.user.userSignupTs = 1000;
    const processed = {
      workouts: [],
      activeRecords: {},
      cachedMaxLoadByExercise: {},
      cachedMax1RMByExercise: {},
      cachedMaxRepsByExercise: {}
    };

    updateCaches(processed);

    expect(mockState.user.userSignupTs).toBe(1000);
  });

  it('handles multiple workouts and finds earliest', () => {
    mockState.user.userSignupTs = 5000;
    const processed = {
      workouts: [
        { id: 'w1', timestamp: 3000 },
        { id: 'w2', timestamp: 1000 },
        { id: 'w3', timestamp: 2000 }
      ],
      activeRecords: {},
      cachedMaxLoadByExercise: {},
      cachedMax1RMByExercise: {},
      cachedMaxRepsByExercise: {}
    };

    updateCaches(processed);

    expect(mockState.user.userSignupTs).toBe(1000);
  });

  it('sets window.__irontrackWorkoutCount correctly', () => {
    const processed = {
      workouts: [
        { id: 'w1', timestamp: 1000 },
        { id: 'w2', timestamp: 2000 },
        { id: 'w3', timestamp: 3000 }
      ],
      activeRecords: {},
      cachedMaxLoadByExercise: {},
      cachedMax1RMByExercise: {},
      cachedMaxRepsByExercise: {}
    };

    updateCaches(processed);

    expect(window.__irontrackWorkoutCount).toBe(3);
  });

  it('overwrites previous cache values', () => {
    mockState.cache.activeRecords = { 'Old Exercise': 100 };
    mockState.cache.cachedMaxLoadByExercise = { 'Old Exercise': 80 };

    const processed = {
      workouts: [{ id: 'w1', timestamp: 1000 }],
      activeRecords: { 'Back Squat': 116.67 },
      cachedMaxLoadByExercise: { 'Back Squat': 100 },
      cachedMax1RMByExercise: { 'Back Squat': 116.67 },
      cachedMaxRepsByExercise: { 'Back Squat': 5 }
    };

    updateCaches(processed);

    expect(mockState.cache.activeRecords).toEqual({ 'Back Squat': 116.67 });
    expect(mockState.cache.activeRecords['Old Exercise']).toBeUndefined();
  });

  it('handles zero timestamp correctly', () => {
    mockState.user.userSignupTs = 5000;
    const processed = {
      workouts: [{ id: 'w1', timestamp: 0 }],
      activeRecords: {},
      cachedMaxLoadByExercise: {},
      cachedMax1RMByExercise: {},
      cachedMaxRepsByExercise: {}
    };

    updateCaches(processed);

    expect(mockState.user.userSignupTs).toBe(5000);
  });
});
