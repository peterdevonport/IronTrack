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
  formatScore_ROUNDS_AND_REPS: vi.fn(),
  formatScore_COMPLETED_MINUTES: vi.fn((c, t) => `${c}/${t} min`),
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

import { submitEmomWorkout } from '../workouts.js';
import * as analyticsModule from '../analytics.js';

describe('submitEmomWorkout', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <input id="log-rounds" />
    `;
  });

  it('should save EMOM workout with valid input', async () => {
    document.getElementById('log-rounds').value = '10';
    const structure = { rounds: 12, minutes: [], mode: 'by_round' };

    await submitEmomWorkout('Test EMOM', structure, 'now');

    expect(mockAddDoc).toHaveBeenCalled();
    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.type).toBe('EMOM');
    expect(workoutDoc.result.roundsCompleted).toBe(10);
  });

  it('should show feedback and not save when rounds is negative', async () => {
    document.getElementById('log-rounds').value = '-1';

    await submitEmomWorkout('Test EMOM', { rounds: 10, minutes: [], mode: 'by_round' }, 'now');

    const { showFeedback } = await import('../ui.js');
    expect(showFeedback).toHaveBeenCalledWith('Enter rounds completed.', 'rose', 'log-workout-feedback');
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should set scoreValue to roundsCompleted', async () => {
    document.getElementById('log-rounds').value = '8';

    await submitEmomWorkout('Test EMOM', { rounds: 10, minutes: [], mode: 'by_round' }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.scoreValue).toBe(8);
  });

  it('should set correct scoreType', async () => {
    document.getElementById('log-rounds').value = '5';

    await submitEmomWorkout('Test EMOM', { rounds: 10, minutes: [], mode: 'by_round' }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.scoreType).toBe('COMPLETED_MINUTES');
  });

  it('should call formatScore_COMPLETED_MINUTES with correct args', async () => {
    document.getElementById('log-rounds').value = '7';
    const structure = { rounds: 10, minutes: [], mode: 'by_round' };

    await submitEmomWorkout('Test EMOM', structure, 'now');

    expect(analyticsModule.formatScore_COMPLETED_MINUTES).toHaveBeenCalledWith(7, 10);
  });

  it('should generate contributions with correct args', async () => {
    document.getElementById('log-rounds').value = '5';
    const structure = { rounds: 10, minutes: [{ exerciseId: 'Back Squat', reps: 5 }], mode: 'by_time' };

    await submitEmomWorkout('Test EMOM', structure, 'now');

    expect(mockAddDoc).toHaveBeenCalled();
    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.name).toBe('Test EMOM');
    expect(workoutDoc.structure).toBe(structure);
  });

  it('should set userId from currentUser', async () => {
    document.getElementById('log-rounds').value = '1';

    await submitEmomWorkout('Test EMOM', { rounds: 10, minutes: [], mode: 'by_round' }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.userId).toBe('test-user-123');
  });

  it('should set name and structure correctly', async () => {
    document.getElementById('log-rounds').value = '1';
    const structure = { rounds: 10, minutes: [], mode: 'by_round' };

    await submitEmomWorkout('My EMOM', structure, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.name).toBe('My EMOM');
    expect(workoutDoc.structure).toBe(structure);
  });

  it('should set timestamp correctly', async () => {
    document.getElementById('log-rounds').value = '1';

    await submitEmomWorkout('Test EMOM', { rounds: 10, minutes: [], mode: 'by_round' }, 'test-timestamp');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.timestamp).toBe('test-timestamp');
  });

  it('should handle zero rounds', async () => {
    document.getElementById('log-rounds').value = '0';

    await submitEmomWorkout('Test EMOM', { rounds: 10, minutes: [], mode: 'by_round' }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.result.roundsCompleted).toBe(0);
    expect(workoutDoc.scoreValue).toBe(0);
  });

  it('should propagate Firestore errors', async () => {
    document.getElementById('log-rounds').value = '1';
    mockAddDoc.mockRejectedValueOnce(new Error('Firestore error'));

    await expect(submitEmomWorkout('Test EMOM', { rounds: 10, minutes: [], mode: 'by_round' }, 'now')).rejects.toThrow('Firestore error');
  });

  it('should handle contribution generation errors gracefully', async () => {
    document.getElementById('log-rounds').value = '1';
    const structure = { rounds: 10, minutes: [{ exerciseId: 'Back Squat', reps: 5, weight: 100 }], mode: 'by_time' };

    mockAddDoc
      .mockResolvedValueOnce({ id: 'test-doc-id' })
      .mockRejectedValueOnce(new Error('Contribution error'));

    await expect(submitEmomWorkout('Test EMOM', structure, 'now')).resolves.not.toThrow();
  });
});
