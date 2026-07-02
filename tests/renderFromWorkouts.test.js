import { describe, it, expect, beforeEach } from 'vitest';

describe('renderFromWorkouts', () => {
  beforeEach(() => {
    // Reset mocks
    populateWorkoutFilter.mockClear();
    populateVolumeFilter.mockClear();
    update1RMRegistryUI.mockClear();
    updateCalcCard.mockClear();
    processAnalytics.mockClear();
    renderLogs.mockClear();
    renderVolumeHistory.mockClear();
    debouncedSyncActivity.mockClear();
  });

  it('calls all render functions', () => {
    const workouts = [{ id: 'w1', exercise: 'Back Squat' }];

    renderFromWorkouts(workouts);

    expect(populateWorkoutFilter).toHaveBeenCalledWith(['Back Squat']);
    expect(populateVolumeFilter).toHaveBeenCalledWith(['Back Squat']);
    expect(update1RMRegistryUI).toHaveBeenCalled();
    expect(updateCalcCard).toHaveBeenCalled();
    expect(processAnalytics).toHaveBeenCalled();
    expect(renderLogs).toHaveBeenCalledWith(workouts);
    expect(renderVolumeHistory).toHaveBeenCalled();
    expect(debouncedSyncActivity).toHaveBeenCalled();
  });

  it('extracts unique exercises from workouts', () => {
    const workouts = [
      { id: 'w1', exercise: 'Back Squat' },
      { id: 'w2', exercise: 'Bench Press' },
      { id: 'w3', exercise: 'Back Squat' },
      { id: 'w4', exercise: 'Deadlift' }
    ];

    renderFromWorkouts(workouts);

    expect(populateWorkoutFilter).toHaveBeenCalledWith(['Back Squat', 'Bench Press', 'Deadlift']);
    expect(populateVolumeFilter).toHaveBeenCalledWith(['Back Squat', 'Bench Press', 'Deadlift']);
  });

  it('handles empty workouts array', () => {
    renderFromWorkouts([]);

    expect(populateWorkoutFilter).toHaveBeenCalledWith([]);
    expect(populateVolumeFilter).toHaveBeenCalledWith([]);
    expect(renderLogs).toHaveBeenCalledWith([]);
  });

  it('handles errors in populateWorkoutFilter gracefully', () => {
    populateWorkoutFilter.mockImplementation(() => { throw new Error('Test error'); });

    expect(() => renderFromWorkouts([])).not.toThrow();
    expect(renderLogs).toHaveBeenCalled();
  });

  it('handles errors in populateVolumeFilter gracefully', () => {
    populateVolumeFilter.mockImplementation(() => { throw new Error('Test error'); });

    expect(() => renderFromWorkouts([])).not.toThrow();
    expect(renderLogs).toHaveBeenCalled();
  });

  it('passes workouts to renderLogs', () => {
    const workouts = [
      { id: 'w1', exercise: 'Back Squat', weight: 100, reps: 5 },
      { id: 'w2', exercise: 'Bench Press', weight: 80, reps: 3 }
    ];

    renderFromWorkouts(workouts);

    expect(renderLogs).toHaveBeenCalledWith(workouts);
    expect(renderLogs).toHaveBeenCalledTimes(1);
  });

  it('calls render functions in correct order', () => {
    const callOrder = [];
    populateWorkoutFilter.mockImplementation(() => callOrder.push('populateWorkoutFilter'));
    populateVolumeFilter.mockImplementation(() => callOrder.push('populateVolumeFilter'));
    update1RMRegistryUI.mockImplementation(() => callOrder.push('update1RMRegistryUI'));
    updateCalcCard.mockImplementation(() => callOrder.push('updateCalcCard'));
    processAnalytics.mockImplementation(() => callOrder.push('processAnalytics'));
    renderLogs.mockImplementation(() => callOrder.push('renderLogs'));
    renderVolumeHistory.mockImplementation(() => callOrder.push('renderVolumeHistory'));
    debouncedSyncActivity.mockImplementation(() => callOrder.push('debouncedSyncActivity'));

    renderFromWorkouts([]);

    expect(callOrder).toEqual([
      'populateWorkoutFilter',
      'populateVolumeFilter',
      'update1RMRegistryUI',
      'updateCalcCard',
      'processAnalytics',
      'renderLogs',
      'renderVolumeHistory',
      'debouncedSyncActivity'
    ]);
  });

  it('handles workouts with missing exercise field', () => {
    const workouts = [
      { id: 'w1', exercise: 'Back Squat' },
      { id: 'w2' }, // missing exercise
      { id: 'w3', exercise: 'Deadlift' }
    ];

    renderFromWorkouts(workouts);

    // Should include undefined in the unique exercises
    expect(populateWorkoutFilter).toHaveBeenCalled();
  });

  it('continues rendering even if populateWorkoutFilter throws', () => {
    populateWorkoutFilter.mockImplementation(() => { throw new Error('Filter error'); });

    renderFromWorkouts([{ id: 'w1', exercise: 'Back Squat' }]);

    expect(update1RMRegistryUI).toHaveBeenCalled();
    expect(updateCalcCard).toHaveBeenCalled();
    expect(processAnalytics).toHaveBeenCalled();
    expect(renderLogs).toHaveBeenCalled();
    expect(renderVolumeHistory).toHaveBeenCalled();
    expect(debouncedSyncActivity).toHaveBeenCalled();
  });
});
