import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processWorkoutSnapshot, updateCaches, renderFromWorkouts } from './functions.js';

describe('listenToDataStream integration', () => {
  let globals, functions, getEffectiveLoad, estimate1RM;

  beforeEach(() => {
    globals = {
      activeRecords: {},
      cachedMaxLoadByExercise: {},
      cachedMax1RMByExercise: {},
      cachedMaxRepsByExercise: {},
      lastWorkouts: [],
      userSignupTs: 5000,
      window: {
        __lastWorkouts: [],
        __irontrackWorkoutCount: 0
      }
    };

    functions = {
      populateWorkoutFilter: vi.fn(),
      populateVolumeFilter: vi.fn(),
      update1RMRegistryUI: vi.fn(),
      updateCalcCard: vi.fn(),
      processAnalytics: vi.fn(),
      renderLogs: vi.fn(),
      renderVolumeHistory: vi.fn(),
      debouncedSyncActivity: vi.fn()
    };

    getEffectiveLoad = vi.fn();
    estimate1RM = vi.fn();
  });

  it('processes snapshot and triggers all renders', async () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, estimatedLoad: 100, timestamp: { toMillis: () => 1000 } }) }
    ];

    getEffectiveLoad.mockReturnValue(100);
    estimate1RM.mockReturnValue(116.67);

    // Simulate the full flow
    const processed = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);
    updateCaches(processed, globals);
    renderFromWorkouts(processed.workouts, functions);

    // Verify caches updated
    expect(globals.activeRecords['Back Squat']).toBe(116.67);
    expect(globals.lastWorkouts).toHaveLength(1);
    expect(globals.window.__irontrackWorkoutCount).toBe(1);

    // Verify renders called
    expect(functions.populateWorkoutFilter).toHaveBeenCalled();
    expect(functions.update1RMRegistryUI).toHaveBeenCalled();
    expect(functions.updateCalcCard).toHaveBeenCalled();
    expect(functions.processAnalytics).toHaveBeenCalled();
    expect(functions.renderLogs).toHaveBeenCalledWith(globals.lastWorkouts);
    expect(functions.renderVolumeHistory).toHaveBeenCalled();
    expect(functions.debouncedSyncActivity).toHaveBeenCalled();
  });

  it('handles multiple workouts correctly', async () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, estimatedLoad: 100, timestamp: { toMillis: () => 1000 } }) },
      { id: 'w2', data: () => ({ exercise: 'Bench Press', weight: 80, reps: 3, estimatedLoad: 80, timestamp: { toMillis: () => 2000 } }) }
    ];

    getEffectiveLoad.mockReturnValueOnce(100).mockReturnValueOnce(80);
    estimate1RM.mockReturnValueOnce(116.67).mockReturnValueOnce(88);

    const processed = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);
    updateCaches(processed, globals);
    renderFromWorkouts(processed.workouts, functions);

    expect(globals.lastWorkouts).toHaveLength(2);
    expect(globals.activeRecords['Back Squat']).toBe(116.67);
    expect(globals.activeRecords['Bench Press']).toBe(88);
    expect(globals.cachedMaxLoadByExercise['Back Squat']).toBe(100);
    expect(globals.cachedMaxLoadByExercise['Bench Press']).toBe(80);
  });

  it('skips structured workouts for 1RM tracking', async () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, source: 'structured', timestamp: { toMillis: () => 1000 } }) }
    ];

    const processed = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);
    updateCaches(processed, globals);

    expect(globals.lastWorkouts).toHaveLength(1);
    expect(globals.activeRecords['Back Squat']).toBeUndefined();
    expect(getEffectiveLoad).not.toHaveBeenCalled();
  });

  it('handles empty snapshot', async () => {
    const processed = processWorkoutSnapshot([], getEffectiveLoad, estimate1RM);
    updateCaches(processed, globals);
    renderFromWorkouts(processed.workouts, functions);

    expect(globals.lastWorkouts).toHaveLength(0);
    expect(globals.window.__irontrackWorkoutCount).toBe(0);
    expect(functions.renderLogs).toHaveBeenCalledWith([]);
  });

  it('updates userSignupTs when workout is earlier', async () => {
    globals.userSignupTs = 5000;
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, timestamp: { toMillis: () => 1000 } }) }
    ];

    getEffectiveLoad.mockReturnValue(100);
    estimate1RM.mockReturnValue(116.67);

    const processed = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);
    updateCaches(processed, globals);

    expect(globals.userSignupTs).toBe(1000);
  });

  it('calls debouncedSyncActivity after processing', async () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, timestamp: { toMillis: () => 1000 } }) }
    ];

    getEffectiveLoad.mockReturnValue(100);
    estimate1RM.mockReturnValue(116.67);

    const processed = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);
    updateCaches(processed, globals);
    renderFromWorkouts(processed.workouts, functions);

    expect(functions.debouncedSyncActivity).toHaveBeenCalled();
  });

  it('processes workouts in order and maintains data integrity', async () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, estimatedLoad: 100, timestamp: { toMillis: () => 3000 } }) },
      { id: 'w2', data: () => ({ exercise: 'Back Squat', weight: 110, reps: 5, estimatedLoad: 110, timestamp: { toMillis: () => 2000 } }) },
      { id: 'w3', data: () => ({ exercise: 'Back Squat', weight: 120, reps: 5, estimatedLoad: 120, timestamp: { toMillis: () => 1000 } }) }
    ];

    getEffectiveLoad.mockReturnValueOnce(100).mockReturnValueOnce(110).mockReturnValueOnce(120);
    estimate1RM.mockReturnValueOnce(116.67).mockReturnValueOnce(128.33).mockReturnValueOnce(140);

    const processed = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);
    updateCaches(processed, globals);

    expect(globals.lastWorkouts).toHaveLength(3);
    expect(globals.activeRecords['Back Squat']).toBe(140);
    expect(globals.cachedMaxLoadByExercise['Back Squat']).toBe(120);
    expect(globals.cachedMaxRepsByExercise['Back Squat']).toBe(5);
  });
});
