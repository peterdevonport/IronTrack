import { describe, it, expect, beforeEach } from 'vitest';

describe('updateCaches', () => {
  beforeEach(() => {
    // Reset globals
    global.activeRecords = {};
    global.cachedMaxLoadByExercise = {};
    global.cachedMax1RMByExercise = {};
    global.cachedMaxRepsByExercise = {};
    global.lastWorkouts = [];
    global.userSignupTs = 5000;
    global.window = {
      __lastWorkouts: [],
      __irontrackWorkoutCount: 0
    };
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

    expect(activeRecords).toEqual(processed.activeRecords);
    expect(cachedMaxLoadByExercise).toEqual(processed.cachedMaxLoadByExercise);
    expect(cachedMax1RMByExercise).toEqual(processed.cachedMax1RMByExercise);
    expect(cachedMaxRepsByExercise).toEqual(processed.cachedMaxRepsByExercise);
    expect(lastWorkouts).toEqual(processed.workouts);
    expect(window.__lastWorkouts).toEqual(processed.workouts);
    expect(window.__irontrackWorkoutCount).toBe(1);
  });

  it('updates userSignupTs if workout is earlier', () => {
    userSignupTs = 5000;
    const processed = {
      workouts: [{ id: 'w1', timestamp: 1000 }],
      activeRecords: {},
      cachedMaxLoadByExercise: {},
      cachedMax1RMByExercise: {},
      cachedMaxRepsByExercise: {}
    };

    updateCaches(processed);

    expect(userSignupTs).toBe(1000);
  });

  it('does not update userSignupTs if workout is later', () => {
    userSignupTs = 1000;
    const processed = {
      workouts: [{ id: 'w1', timestamp: 5000 }],
      activeRecords: {},
      cachedMaxLoadByExercise: {},
      cachedMax1RMByExercise: {},
      cachedMaxRepsByExercise: {}
    };

    updateCaches(processed);

    expect(userSignupTs).toBe(1000);
  });

  it('does not update userSignupTs if no workouts', () => {
    userSignupTs = 1000;
    const processed = {
      workouts: [],
      activeRecords: {},
      cachedMaxLoadByExercise: {},
      cachedMax1RMByExercise: {},
      cachedMaxRepsByExercise: {}
    };

    updateCaches(processed);

    expect(userSignupTs).toBe(1000);
  });

  it('handles multiple workouts and finds earliest', () => {
    userSignupTs = 5000;
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

    expect(userSignupTs).toBe(1000);
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
    activeRecords = { 'Old Exercise': 100 };
    cachedMaxLoadByExercise = { 'Old Exercise': 80 };

    const processed = {
      workouts: [{ id: 'w1', timestamp: 1000 }],
      activeRecords: { 'Back Squat': 116.67 },
      cachedMaxLoadByExercise: { 'Back Squat': 100 },
      cachedMax1RMByExercise: { 'Back Squat': 116.67 },
      cachedMaxRepsByExercise: { 'Back Squat': 5 }
    };

    updateCaches(processed);

    expect(activeRecords).toEqual({ 'Back Squat': 116.67 });
    expect(activeRecords['Old Exercise']).toBeUndefined();
  });

  it('handles zero timestamp correctly', () => {
    userSignupTs = 5000;
    const processed = {
      workouts: [{ id: 'w1', timestamp: 0 }],
      activeRecords: {},
      cachedMaxLoadByExercise: {},
      cachedMax1RMByExercise: {},
      cachedMaxRepsByExercise: {}
    };

    updateCaches(processed);

    // Should not update because earliestTs is 0, which is not > 0
    expect(userSignupTs).toBe(5000);
  });
});
