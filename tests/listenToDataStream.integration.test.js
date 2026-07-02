import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('listenToDataStream integration', () => {
  let snapshotCallback;

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

    // Reset mocks
    getEffectiveLoad.mockClear();
    estimate1RM.mockClear();
    populateWorkoutFilter.mockClear();
    populateVolumeFilter.mockClear();
    update1RMRegistryUI.mockClear();
    updateCalcCard.mockClear();
    processAnalytics.mockClear();
    renderLogs.mockClear();
    renderVolumeHistory.mockClear();
    debouncedSyncActivity.mockClear();

    // Mock onSnapshot to capture callback
    snapshotCallback = null;
    onSnapshot.mockImplementation((q, callback) => {
      snapshotCallback = callback;
      return vi.fn(); // unsubscribe
    });

    // Mock Firestore functions
    collection.mockReturnValue('workouts-collection');
    query.mockReturnValue('query');
    where.mockReturnValue('where');
    orderBy.mockReturnValue('orderBy');
    limit.mockReturnValue('limit');
  });

  it('processes snapshot and triggers all renders', async () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, estimatedLoad: 100, timestamp: { toMillis: () => 1000 } }) }
    ];

    getEffectiveLoad.mockReturnValue(100);
    estimate1RM.mockReturnValue(116.67);

    listenToDataStream('user123');

    // Simulate Firestore snapshot
    const mockSnapshot = { docs: mockDocs };
    await snapshotCallback(mockSnapshot);

    // Verify caches updated
    expect(activeRecords['Back Squat']).toBe(116.67);
    expect(lastWorkouts).toHaveLength(1);
    expect(window.__irontrackWorkoutCount).toBe(1);

    // Verify renders called
    expect(populateWorkoutFilter).toHaveBeenCalled();
    expect(update1RMRegistryUI).toHaveBeenCalled();
    expect(updateCalcCard).toHaveBeenCalled();
    expect(processAnalytics).toHaveBeenCalled();
    expect(renderLogs).toHaveBeenCalledWith(lastWorkouts);
    expect(renderVolumeHistory).toHaveBeenCalled();
    expect(debouncedSyncActivity).toHaveBeenCalled();
  });

  it('handles multiple workouts correctly', async () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, estimatedLoad: 100, timestamp: { toMillis: () => 1000 } }) },
      { id: 'w2', data: () => ({ exercise: 'Bench Press', weight: 80, reps: 3, estimatedLoad: 80, timestamp: { toMillis: () => 2000 } }) }
    ];

    getEffectiveLoad.mockReturnValueOnce(100).mockReturnValueOnce(80);
    estimate1RM.mockReturnValueOnce(116.67).mockReturnValueOnce(88);

    listenToDataStream('user123');

    const mockSnapshot = { docs: mockDocs };
    await snapshotCallback(mockSnapshot);

    expect(lastWorkouts).toHaveLength(2);
    expect(activeRecords['Back Squat']).toBe(116.67);
    expect(activeRecords['Bench Press']).toBe(88);
    expect(cachedMaxLoadByExercise['Back Squat']).toBe(100);
    expect(cachedMaxLoadByExercise['Bench Press']).toBe(80);
  });

  it('skips structured workouts for 1RM tracking', async () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, source: 'structured', timestamp: { toMillis: () => 1000 } }) }
    ];

    listenToDataStream('user123');

    const mockSnapshot = { docs: mockDocs };
    await snapshotCallback(mockSnapshot);

    expect(lastWorkouts).toHaveLength(1);
    expect(activeRecords['Back Squat']).toBeUndefined();
    expect(getEffectiveLoad).not.toHaveBeenCalled();
  });

  it('handles empty snapshot', async () => {
    listenToDataStream('user123');

    const mockSnapshot = { docs: [] };
    await snapshotCallback(mockSnapshot);

    expect(lastWorkouts).toHaveLength(0);
    expect(window.__irontrackWorkoutCount).toBe(0);
    expect(renderLogs).toHaveBeenCalledWith([]);
  });

  it('updates userSignupTs when workout is earlier', async () => {
    userSignupTs = 5000;
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, timestamp: { toMillis: () => 1000 } }) }
    ];

    getEffectiveLoad.mockReturnValue(100);
    estimate1RM.mockReturnValue(116.67);

    listenToDataStream('user123');

    const mockSnapshot = { docs: mockDocs };
    await snapshotCallback(mockSnapshot);

    expect(userSignupTs).toBe(1000);
  });

  it('handles error in snapshot callback', async () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, timestamp: { toMillis: () => 1000 } }) }
    ];

    getEffectiveLoad.mockImplementation(() => { throw new Error('Test error'); });

    listenToDataStream('user123');

    const mockSnapshot = { docs: mockDocs };

    // Should not throw
    await expect(snapshotCallback(mockSnapshot)).rejects.toThrow('Test error');
  });

  it('handles Firestore permission-denied error', () => {
    const error = { code: 'permission-denied', message: 'Missing or insufficient permissions' };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock getElementById for error display
    const mockElement = { innerHTML: '' };
    global.document = {
      getElementById: vi.fn((id) => {
        if (id === 'workout-list') return mockElement;
        return null;
      })
    };

    onSnapshot.mockImplementation((q, successCallback, errorCallback) => {
      errorCallback(error);
      return vi.fn();
    });

    listenToDataStream('user123');

    expect(consoleError).toHaveBeenCalledWith('Workout stream error', 'permission-denied', 'Missing or insufficient permissions');
    expect(mockElement.innerHTML).toContain('Workouts blocked by Firestore rules');

    consoleError.mockRestore();
  });

  it('calls debouncedSyncActivity after processing', async () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, timestamp: { toMillis: () => 1000 } }) }
    ];

    getEffectiveLoad.mockReturnValue(100);
    estimate1RM.mockReturnValue(116.67);

    listenToDataStream('user123');

    const mockSnapshot = { docs: mockDocs };
    await snapshotCallback(mockSnapshot);

    expect(debouncedSyncActivity).toHaveBeenCalled();
  });

  it('processes workouts in order and maintains data integrity', async () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, estimatedLoad: 100, timestamp: { toMillis: () => 3000 } }) },
      { id: 'w2', data: () => ({ exercise: 'Back Squat', weight: 110, reps: 5, estimatedLoad: 110, timestamp: { toMillis: () => 2000 } }) },
      { id: 'w3', data: () => ({ exercise: 'Back Squat', weight: 120, reps: 5, estimatedLoad: 120, timestamp: { toMillis: () => 1000 } }) }
    ];

    getEffectiveLoad.mockReturnValueOnce(100).mockReturnValueOnce(110).mockReturnValueOnce(120);
    estimate1RM.mockReturnValueOnce(116.67).mockReturnValueOnce(128.33).mockReturnValueOnce(140);

    listenToDataStream('user123');

    const mockSnapshot = { docs: mockDocs };
    await snapshotCallback(mockSnapshot);

    expect(lastWorkouts).toHaveLength(3);
    expect(activeRecords['Back Squat']).toBe(140);
    expect(cachedMaxLoadByExercise['Back Squat']).toBe(120);
    expect(cachedMaxRepsByExercise['Back Squat']).toBe(5);
  });
});
