import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderFromWorkouts } from './functions.js';

describe('renderFromWorkouts', () => {
  let functions;

  beforeEach(() => {
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
  });

  it('calls all render functions', () => {
    const workouts = [{ id: 'w1', exercise: 'Back Squat' }];

    renderFromWorkouts(workouts, functions);

    expect(functions.populateWorkoutFilter).toHaveBeenCalledWith(['Back Squat']);
    expect(functions.populateVolumeFilter).toHaveBeenCalledWith(['Back Squat']);
    expect(functions.update1RMRegistryUI).toHaveBeenCalled();
    expect(functions.updateCalcCard).toHaveBeenCalled();
    expect(functions.processAnalytics).toHaveBeenCalled();
    expect(functions.renderLogs).toHaveBeenCalledWith(workouts);
    expect(functions.renderVolumeHistory).toHaveBeenCalled();
    expect(functions.debouncedSyncActivity).toHaveBeenCalled();
  });

  it('extracts unique exercises from workouts', () => {
    const workouts = [
      { id: 'w1', exercise: 'Back Squat' },
      { id: 'w2', exercise: 'Bench Press' },
      { id: 'w3', exercise: 'Back Squat' },
      { id: 'w4', exercise: 'Deadlift' }
    ];

    renderFromWorkouts(workouts, functions);

    expect(functions.populateWorkoutFilter).toHaveBeenCalledWith(['Back Squat', 'Bench Press', 'Deadlift']);
    expect(functions.populateVolumeFilter).toHaveBeenCalledWith(['Back Squat', 'Bench Press', 'Deadlift']);
  });

  it('handles empty workouts array', () => {
    renderFromWorkouts([], functions);

    expect(functions.populateWorkoutFilter).toHaveBeenCalledWith([]);
    expect(functions.populateVolumeFilter).toHaveBeenCalledWith([]);
    expect(functions.renderLogs).toHaveBeenCalledWith([]);
  });

  it('handles errors in populateWorkoutFilter gracefully', () => {
    functions.populateWorkoutFilter.mockImplementation(() => { throw new Error('Test error'); });

    expect(() => renderFromWorkouts([], functions)).not.toThrow();
    expect(functions.renderLogs).toHaveBeenCalled();
  });

  it('handles errors in populateVolumeFilter gracefully', () => {
    functions.populateVolumeFilter.mockImplementation(() => { throw new Error('Test error'); });

    expect(() => renderFromWorkouts([], functions)).not.toThrow();
    expect(functions.renderLogs).toHaveBeenCalled();
  });

  it('passes workouts to renderLogs', () => {
    const workouts = [
      { id: 'w1', exercise: 'Back Squat', weight: 100, reps: 5 },
      { id: 'w2', exercise: 'Bench Press', weight: 80, reps: 3 }
    ];

    renderFromWorkouts(workouts, functions);

    expect(functions.renderLogs).toHaveBeenCalledWith(workouts);
    expect(functions.renderLogs).toHaveBeenCalledTimes(1);
  });

  it('calls render functions in correct order', () => {
    const callOrder = [];
    functions.populateWorkoutFilter.mockImplementation(() => callOrder.push('populateWorkoutFilter'));
    functions.populateVolumeFilter.mockImplementation(() => callOrder.push('populateVolumeFilter'));
    functions.update1RMRegistryUI.mockImplementation(() => callOrder.push('update1RMRegistryUI'));
    functions.updateCalcCard.mockImplementation(() => callOrder.push('updateCalcCard'));
    functions.processAnalytics.mockImplementation(() => callOrder.push('processAnalytics'));
    functions.renderLogs.mockImplementation(() => callOrder.push('renderLogs'));
    functions.renderVolumeHistory.mockImplementation(() => callOrder.push('renderVolumeHistory'));
    functions.debouncedSyncActivity.mockImplementation(() => callOrder.push('debouncedSyncActivity'));

    renderFromWorkouts([], functions);

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

    renderFromWorkouts(workouts, functions);

    // Should include undefined in the unique exercises
    expect(functions.populateWorkoutFilter).toHaveBeenCalled();
  });

  it('continues rendering even if populateWorkoutFilter throws', () => {
    functions.populateWorkoutFilter.mockImplementation(() => { throw new Error('Filter error'); });

    renderFromWorkouts([{ id: 'w1', exercise: 'Back Squat' }], functions);

    expect(functions.update1RMRegistryUI).toHaveBeenCalled();
    expect(functions.updateCalcCard).toHaveBeenCalled();
    expect(functions.processAnalytics).toHaveBeenCalled();
    expect(functions.renderLogs).toHaveBeenCalled();
    expect(functions.renderVolumeHistory).toHaveBeenCalled();
    expect(functions.debouncedSyncActivity).toHaveBeenCalled();
  });
});
