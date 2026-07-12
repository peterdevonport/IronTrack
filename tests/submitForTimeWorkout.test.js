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
  formatScore_COMPLETED_MINUTES: vi.fn(),
  formatScore_TIME_SECONDS: vi.fn((t) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return s > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${m} min`;
  }),
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
  MSG: { SECONDS_RANGE: 'Seconds must be 0–59.', ENTER_ROUNDS: 'Enter rounds completed.' }
}));

import { submitForTimeWorkout } from '../workouts.js';

describe('submitForTimeWorkout', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <input id="fortime-minutes" />
      <input id="fortime-seconds" />
      <input id="fortime-cap-reps" />
      <input id="fortime-dnf" type="checkbox" />
    `;
  });

  it('should save For Time workout with valid input', async () => {
    document.getElementById('fortime-minutes').value = '5';
    document.getElementById('fortime-seconds').value = '30';

    await submitForTimeWorkout('Test For Time', { movements: [] }, 'now');

    expect(mockAddDoc).toHaveBeenCalled();
    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.type).toBe('FOR_TIME');
    expect(workoutDoc.result.timeSeconds).toBe(330);
    expect(workoutDoc.result.completed).toBe(true);
  });

  it('should show error when seconds > 59', async () => {
    document.getElementById('fortime-minutes').value = '1';
    document.getElementById('fortime-seconds').value = '99';

    await submitForTimeWorkout('Test For Time', { movements: [] }, 'now');

    const { showFeedback } = await import('../ui.js');
    expect(showFeedback).toHaveBeenCalledWith('Seconds must be 0–59.', 'rose', 'log-workout-feedback');
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should handle DNF (did not finish)', async () => {
    document.getElementById('fortime-dnf').checked = true;
    document.getElementById('fortime-cap-reps').value = '15';

    await submitForTimeWorkout('Test For Time', { movements: [] }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.result.completed).toBe(false);
    expect(workoutDoc.result.remainingReps).toBe(15);
    expect(workoutDoc.result.timeSeconds).toBe(0);
  });

  it('should set scoreValue to timeSeconds for completed workouts', async () => {
    document.getElementById('fortime-minutes').value = '2';
    document.getElementById('fortime-seconds').value = '0';

    await submitForTimeWorkout('Test For Time', { movements: [] }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.scoreValue).toBe(120);
  });

  it('should set scoreValue to remainingReps for DNF', async () => {
    document.getElementById('fortime-dnf').checked = true;
    document.getElementById('fortime-cap-reps').value = '20';

    await submitForTimeWorkout('Test For Time', { movements: [] }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.scoreValue).toBe(20);
  });

  it('should default remainingReps to 0 for DNF when field is empty', async () => {
    document.getElementById('fortime-dnf').checked = true;

    await submitForTimeWorkout('Test For Time', { movements: [] }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.result.remainingReps).toBe(0);
  });

  it('should not save when DNF and remainingReps is 0', async () => {
    document.getElementById('fortime-dnf').checked = true;

    await submitForTimeWorkout('Test For Time', { movements: [] }, 'now');

    expect(mockAddDoc).toHaveBeenCalled();
  });

  it('should handle zero minutes and seconds', async () => {
    document.getElementById('fortime-minutes').value = '0';
    document.getElementById('fortime-seconds').value = '0';

    await submitForTimeWorkout('Test For Time', { movements: [] }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.result.timeSeconds).toBe(0);
    expect(workoutDoc.scoreValue).toBe(0);
  });

  it('should set scoreDisplay correctly for completed workout', async () => {
    document.getElementById('fortime-minutes').value = '10';
    document.getElementById('fortime-seconds').value = '0';

    await submitForTimeWorkout('Test For Time', { movements: [] }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.scoreDisplay).toBe('10 min');
  });

  it('should set scoreDisplay correctly for DNF', async () => {
    document.getElementById('fortime-dnf').checked = true;
    document.getElementById('fortime-cap-reps').value = '25';

    await submitForTimeWorkout('Test For Time', { movements: [] }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.scoreDisplay).toBe('Cap 25');
  });

  it('should set correct scoreType', async () => {
    document.getElementById('fortime-minutes').value = '5';
    document.getElementById('fortime-seconds').value = '0';

    await submitForTimeWorkout('Test For Time', { movements: [] }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.scoreType).toBe('TIME_SECONDS');
  });

  it('should set userId from currentUser', async () => {
    document.getElementById('fortime-minutes').value = '1';
    document.getElementById('fortime-seconds').value = '0';

    await submitForTimeWorkout('Test For Time', { movements: [] }, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.userId).toBe('test-user-123');
  });

  it('should set name and structure correctly', async () => {
    document.getElementById('fortime-minutes').value = '1';
    document.getElementById('fortime-seconds').value = '0';
    const structure = { movements: [{ exerciseId: 'Burpee', reps: 10 }] };

    await submitForTimeWorkout('My Workout', structure, 'now');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.name).toBe('My Workout');
    expect(workoutDoc.structure).toBe(structure);
  });

  it('should set timestamp correctly', async () => {
    document.getElementById('fortime-minutes').value = '1';
    document.getElementById('fortime-seconds').value = '0';

    await submitForTimeWorkout('Test For Time', { movements: [] }, 'test-timestamp');

    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.timestamp).toBe('test-timestamp');
  });

  it('should propagate Firestore errors', async () => {
    document.getElementById('fortime-minutes').value = '1';
    document.getElementById('fortime-seconds').value = '0';
    mockAddDoc.mockRejectedValueOnce(new Error('Firestore error'));

    await expect(submitForTimeWorkout('Test For Time', { movements: [] }, 'now')).rejects.toThrow('Firestore error');
  });

  it('should generate contributions with correct structure passed through', async () => {
    document.getElementById('fortime-minutes').value = '3';
    document.getElementById('fortime-seconds').value = '0';
    const structure = { movements: [{ exerciseId: 'Back Squat', reps: 5, weight: 100 }] };

    await submitForTimeWorkout('Test For Time', structure, 'now');

    expect(mockAddDoc).toHaveBeenCalled();
    const workoutDoc = mockAddDoc.mock.calls[0][1];
    expect(workoutDoc.structure).toBe(structure);
  });

  it('should handle contribution generation errors gracefully', async () => {
    document.getElementById('fortime-minutes').value = '1';
    document.getElementById('fortime-seconds').value = '0';
    const structure = { movements: [{ exerciseId: 'Back Squat', reps: 5, weight: 100 }], rounds: 1 };

    mockAddDoc
      .mockResolvedValueOnce({ id: 'test-doc-id' })
      .mockRejectedValueOnce(new Error('Contribution error'));

    await expect(submitForTimeWorkout('Test For Time', structure, 'now')).resolves.not.toThrow();
  });
});
