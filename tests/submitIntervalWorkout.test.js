import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockAddDoc = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'test-doc-id' }));

vi.mock('../firebase.js', () => ({
  auth: { currentUser: { uid: 'test-user-123' } },
  db: {},
  addDoc: mockAddDoc,
  collection: vi.fn(() => ({})),
  Timestamp: { now: vi.fn(() => 'now') },
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

vi.mock('../state.js', () => ({
  state: {
    user: { userBiometrics: { bodyweight: 75, gender: 'male' }, userSignupTs: 0 },
    cache: { activeRecords: {} },
    data: { lastWorkouts: [] }
  },
  EPLEY_CONSTANT: 30,
  SECONDS_PER_MINUTE: 60,
  PERCENT_DIVISOR: 100,
  HAPTIC: { tap: 15, confirm: 30 },
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
  formatScore_ROUNDS_AND_REPS: vi.fn((r, p) => `${r} rounds + ${p} reps`),
  formatScore_COMPLETED_MINUTES: vi.fn(),
  formatScore_TIME_SECONDS: vi.fn(),
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
  isPermissionDenied: vi.fn(),
  PERMISSION_ERROR_MAP: {}
}));

vi.mock('../messages.js', () => ({
  MSG: { ENTER_ROUNDS: 'Enter rounds completed.' }
}));

import { submitIntervalWorkout } from '../workouts.js';
import * as analyticsModule from '../analytics.js';

describe('submitIntervalWorkout', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <input id="log-rounds" />
      <input id="log-partial-reps" />
    `;
  });

  it('should save Interval workout with valid input', async () => {
    document.getElementById('log-rounds').value = '5';
    document.getElementById('log-partial-reps').value = '3';

    await submitIntervalWorkout('Test Interval', { movements: [] }, 'now');

    expect(mockAddDoc).toHaveBeenCalled();
    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.type).toBe('INTERVAL');
    expect(workoutDoc.result.roundsCompleted).toBe(5);
    expect(workoutDoc.result.partialReps).toBe(3);
  });

  it('should default partialReps to 0 when field is empty', async () => {
    document.getElementById('log-rounds').value = '3';
    document.getElementById('log-partial-reps').value = '';

    await submitIntervalWorkout('Test Interval', { movements: [] }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.result.partialReps).toBe(0);
  });

  it('should show feedback and not save when rounds is negative', async () => {
    document.getElementById('log-rounds').value = '-1';
    document.getElementById('log-partial-reps').value = '5';

    await submitIntervalWorkout('Test Interval', { movements: [] }, 'now');

    const { showFeedback } = await import('../ui.js');
    expect(showFeedback).toHaveBeenCalledWith('Enter rounds completed.', 'rose', 'log-workout-feedback');
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should calculate scoreValue correctly', async () => {
    document.getElementById('log-rounds').value = '4';
    document.getElementById('log-partial-reps').value = '10';

    await submitIntervalWorkout('Test Interval', { movements: [] }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.scoreValue).toBe(4010);
  });

  it('should set correct scoreType', async () => {
    document.getElementById('log-rounds').value = '2';
    document.getElementById('log-partial-reps').value = '0';

    await submitIntervalWorkout('Test Interval', { movements: [] }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.scoreType).toBe('ROUNDS_AND_REPS');
  });

  it('should call formatScore_ROUNDS_AND_REPS with correct args', async () => {
    document.getElementById('log-rounds').value = '6';
    document.getElementById('log-partial-reps').value = '2';

    await submitIntervalWorkout('Test Interval', { movements: [] }, 'now');

    expect(analyticsModule.formatScore_ROUNDS_AND_REPS).toHaveBeenCalledWith(6, 2);
  });

  it('should set completed = false when rounds < structure rounds', async () => {
    document.getElementById('log-rounds').value = '4';
    document.getElementById('log-partial-reps').value = '0';
    const structure = { rounds: 5, movements: [] };

    await submitIntervalWorkout('Test Interval', structure, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.result.completed).toBe(false);
  });

  it('should set completed = true when rounds >= structure rounds', async () => {
    document.getElementById('log-rounds').value = '5';
    document.getElementById('log-partial-reps').value = '0';
    const structure = { rounds: 5, movements: [] };

    await submitIntervalWorkout('Test Interval', structure, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.result.completed).toBe(true);
  });

  it('should set userId from currentUser', async () => {
    document.getElementById('log-rounds').value = '1';
    document.getElementById('log-partial-reps').value = '0';

    await submitIntervalWorkout('Test Interval', { movements: [] }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.userId).toBe('test-user-123');
  });

  it('should set name and structure correctly', async () => {
    document.getElementById('log-rounds').value = '1';
    document.getElementById('log-partial-reps').value = '0';
    const structure = { rounds: 3, movements: [{ exerciseId: 'Thruster', reps: 10 }] };

    await submitIntervalWorkout('My Workout', structure, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.name).toBe('My Workout');
    expect(workoutDoc.structure).toBe(structure);
  });

  it('should set timestamp correctly', async () => {
    document.getElementById('log-rounds').value = '1';
    document.getElementById('log-partial-reps').value = '0';

    await submitIntervalWorkout('Test Interval', { movements: [] }, 'test-timestamp');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.timestamp).toBe('test-timestamp');
  });

  it('should handle zero rounds', async () => {
    document.getElementById('log-rounds').value = '0';
    document.getElementById('log-partial-reps').value = '0';

    await submitIntervalWorkout('Test Interval', { movements: [] }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.result.roundsCompleted).toBe(0);
    expect(workoutDoc.scoreValue).toBe(0);
  });

  it('should propagate Firestore errors', async () => {
    document.getElementById('log-rounds').value = '1';
    document.getElementById('log-partial-reps').value = '0';
    mockAddDoc.mockRejectedValueOnce(new Error('Firestore error'));

    await expect(submitIntervalWorkout('Test Interval', { movements: [] }, 'now')).rejects.toThrow('Firestore error');
  });

  it('should handle contribution generation errors gracefully', async () => {
    document.getElementById('log-rounds').value = '1';
    document.getElementById('log-partial-reps').value = '0';
    const structure = { rounds: 3, movements: [{ exerciseId: 'Back Squat', reps: 5, weight: 100 }] };

    mockAddDoc
      .mockResolvedValueOnce({ id: 'test-doc-id' })
      .mockRejectedValueOnce(new Error('Contribution error'));

    await expect(submitIntervalWorkout('Test Interval', structure, 'now')).resolves.not.toThrow();
  });
});
