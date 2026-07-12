import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../firebase.js', () => ({
  auth: { currentUser: null },
  db: {},
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  Timestamp: { now: vi.fn(() => 'test-ts') }
}));

vi.mock('../state.js', () => ({
  state: {
    cache: { activeRecords: {} },
    user: { userBiometrics: { bodyweight: 75, gender: 'male' } },
    data: { lastWorkouts: [] }
  },
  FIRESTORE_WORKOUTS_LIMIT: 250,
  DEBOUNCE_DELAY_LEADERBOARD: 5000
}));

vi.mock('../math.js', () => ({
  estimate1RM: vi.fn(),
  getEffectiveLoad: vi.fn(),
  computeEffectiveLoad: vi.fn()
}));

vi.mock('../dom.js', () => ({
  debounce: vi.fn(() => vi.fn()),
  escapeHtml: vi.fn(),
  haptic: vi.fn()
}));

vi.mock('../exercise-data.js', () => ({
  getExerciseInfo: vi.fn(),
  LOAD_FACTORS: {},
  EXERCISE_CATALOG: []
}));

vi.mock('../analytics.js', () => ({
  computeDotsScore: vi.fn(() => ({ dots: 0, olyTotal: 0 })),
  computeSinclairScore: vi.fn(() => ({ sinclair: 0, olyTotal: 0 })),
  getRankingTier: vi.fn(() => 'Beginner')
}));

vi.mock('../ui.js', () => ({
  showFeedback: vi.fn()
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

vi.mock('../auth.js', () => ({
  processWorkoutSnapshot: vi.fn(),
  updateCaches: vi.fn()
}));

vi.mock('../calendar.js', () => ({
  computeAndSyncDailyActivity: vi.fn()
}));

import { renderFromWorkouts } from '../data.js';
import * as calcModule from '../calc.js';
import * as volumeModule from '../volume.js';
import * as workoutsModule from '../workouts.js';

describe('renderFromWorkouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls all render functions', () => {
    const workouts = [{ id: 'w1', exercise: 'Back Squat' }];

    renderFromWorkouts(workouts);

    expect(calcModule.populateWorkoutFilter).toHaveBeenCalledWith(['Back Squat']);
    expect(volumeModule.populateVolumeFilter).toHaveBeenCalledWith(['Back Squat']);
    expect(calcModule.update1RMRegistryUI).toHaveBeenCalled();
    expect(calcModule.updateCalcCard).toHaveBeenCalled();
    expect(volumeModule.renderLogs).toHaveBeenCalledWith(workouts);
    expect(volumeModule.renderVolumeHistory).toHaveBeenCalled();
    expect(workoutsModule.debouncedSyncActivity).toHaveBeenCalled();
  });

  it('extracts unique exercises from workouts', () => {
    const workouts = [
      { id: 'w1', exercise: 'Back Squat' },
      { id: 'w2', exercise: 'Bench Press' },
      { id: 'w3', exercise: 'Back Squat' },
      { id: 'w4', exercise: 'Deadlift' }
    ];

    renderFromWorkouts(workouts);

    expect(calcModule.populateWorkoutFilter).toHaveBeenCalledWith(['Back Squat', 'Bench Press', 'Deadlift']);
    expect(volumeModule.populateVolumeFilter).toHaveBeenCalledWith(['Back Squat', 'Bench Press', 'Deadlift']);
  });

  it('handles empty workouts array', () => {
    renderFromWorkouts([]);

    expect(calcModule.populateWorkoutFilter).toHaveBeenCalledWith([]);
    expect(volumeModule.populateVolumeFilter).toHaveBeenCalledWith([]);
    expect(volumeModule.renderLogs).toHaveBeenCalledWith([]);
  });

  it('handles errors in populateWorkoutFilter gracefully', () => {
    calcModule.populateWorkoutFilter.mockImplementation(() => { throw new Error('Test error'); });

    expect(() => renderFromWorkouts([])).not.toThrow();
    expect(volumeModule.renderLogs).toHaveBeenCalled();
  });

  it('handles errors in populateVolumeFilter gracefully', () => {
    volumeModule.populateVolumeFilter.mockImplementation(() => { throw new Error('Test error'); });

    expect(() => renderFromWorkouts([])).not.toThrow();
    expect(volumeModule.renderLogs).toHaveBeenCalled();
  });

  it('passes workouts to renderLogs', () => {
    const workouts = [
      { id: 'w1', exercise: 'Back Squat', weight: 100, reps: 5 },
      { id: 'w2', exercise: 'Bench Press', weight: 80, reps: 3 }
    ];

    renderFromWorkouts(workouts);

    expect(volumeModule.renderLogs).toHaveBeenCalledWith(workouts);
    expect(volumeModule.renderLogs).toHaveBeenCalledTimes(1);
  });

  it('calls render functions in correct order', () => {
    const callOrder = [];
    calcModule.populateWorkoutFilter.mockImplementation(() => callOrder.push('populateWorkoutFilter'));
    volumeModule.populateVolumeFilter.mockImplementation(() => callOrder.push('populateVolumeFilter'));
    calcModule.update1RMRegistryUI.mockImplementation(() => callOrder.push('update1RMRegistryUI'));
    calcModule.updateCalcCard.mockImplementation(() => callOrder.push('updateCalcCard'));
    volumeModule.renderLogs.mockImplementation(() => callOrder.push('renderLogs'));
    volumeModule.renderVolumeHistory.mockImplementation(() => callOrder.push('renderVolumeHistory'));
    workoutsModule.debouncedSyncActivity.mockImplementation(() => callOrder.push('debouncedSyncActivity'));

    renderFromWorkouts([]);

    expect(callOrder).toEqual([
      'populateWorkoutFilter',
      'populateVolumeFilter',
      'update1RMRegistryUI',
      'updateCalcCard',
      'renderLogs',
      'renderVolumeHistory',
      'debouncedSyncActivity'
    ]);
  });

  it('handles workouts with missing exercise field', () => {
    const workouts = [
      { id: 'w1', exercise: 'Back Squat' },
      { id: 'w2' },
      { id: 'w3', exercise: 'Deadlift' }
    ];

    renderFromWorkouts(workouts);

    expect(calcModule.populateWorkoutFilter).toHaveBeenCalled();
  });

  it('continues rendering even if populateWorkoutFilter throws', () => {
    calcModule.populateWorkoutFilter.mockImplementation(() => { throw new Error('Filter error'); });

    renderFromWorkouts([{ id: 'w1', exercise: 'Back Squat' }]);

    expect(calcModule.update1RMRegistryUI).toHaveBeenCalled();
    expect(calcModule.updateCalcCard).toHaveBeenCalled();
    expect(volumeModule.renderLogs).toHaveBeenCalled();
    expect(volumeModule.renderVolumeHistory).toHaveBeenCalled();
    expect(workoutsModule.debouncedSyncActivity).toHaveBeenCalled();
  });
});
