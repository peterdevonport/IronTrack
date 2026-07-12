import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../firebase.js', () => ({
  auth: { currentUser: null },
  db: {},
  collection: vi.fn(),
  addDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  Timestamp: { now: vi.fn(() => 'test-ts') }
}));

vi.mock('../state.js', () => ({ state: { user: { userBiometrics: {} }, cache: {} } }));
vi.mock('../math.js', () => ({ estimate1RM: vi.fn(), getEffectiveLoad: vi.fn() }));
vi.mock('../dom.js', () => ({ debounce: vi.fn(), escapeHtml: vi.fn(), haptic: vi.fn() }));
vi.mock('../exercise-data.js', () => ({ getExerciseInfo: vi.fn(), LOAD_FACTORS: {} }));
vi.mock('../forms.js', () => ({ renderFormFields: vi.fn() }));
vi.mock('../ui.js', () => ({ showFeedback: vi.fn() }));
vi.mock('../messages.js', () => ({ MSG: {} }));

import { processWorkoutSnapshot } from '../auth.js';

describe('processWorkoutSnapshot', () => {
  let getEffectiveLoad, estimate1RM;

  beforeEach(() => {
    getEffectiveLoad = vi.fn();
    estimate1RM = vi.fn();
  });

  it('extracts workout data from Firestore docs', () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, timestamp: { toMillis: () => 1000 } }) },
      { id: 'w2', data: () => ({ exercise: 'Bench Press', weight: 80, reps: 3, timestamp: { toMillis: () => 2000 } }) }
    ];

    const result = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);

    expect(result.workouts).toHaveLength(2);
    expect(result.workouts[0].id).toBe('w1');
    expect(result.workouts[0].exercise).toBe('Back Squat');
    expect(result.workouts[0].timestamp).toBe(1000);
    expect(result.workouts[1].id).toBe('w2');
  });

  it('computes 1RM using Epley formula', () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, estimatedLoad: 100, timestamp: { toMillis: () => 1000 } }) }
    ];

    getEffectiveLoad.mockReturnValue(100);
    estimate1RM.mockReturnValue(116.67);

    const result = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);

    expect(getEffectiveLoad).toHaveBeenCalled();
    expect(estimate1RM).toHaveBeenCalledWith(100, 5);
    expect(result.activeRecords['Back Squat']).toBe(116.67);
  });

  it('skips structured workouts for 1RM tracking', () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, source: 'structured', timestamp: { toMillis: () => 1000 } }) }
    ];

    const result = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);

    expect(result.workouts).toHaveLength(1);
    expect(result.activeRecords['Back Squat']).toBeUndefined();
    expect(getEffectiveLoad).not.toHaveBeenCalled();
  });

  it('tracks max load per exercise', () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, estimatedLoad: 100, timestamp: { toMillis: () => 1000 } }) },
      { id: 'w2', data: () => ({ exercise: 'Back Squat', weight: 120, reps: 3, estimatedLoad: 120, timestamp: { toMillis: () => 2000 } }) }
    ];

    getEffectiveLoad.mockReturnValueOnce(100).mockReturnValueOnce(120);
    estimate1RM.mockReturnValueOnce(116.67).mockReturnValueOnce(132);

    const result = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);

    expect(result.cachedMaxLoadByExercise['Back Squat']).toBe(120);
  });

  it('tracks max 1RM per exercise', () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, estimatedLoad: 100, timestamp: { toMillis: () => 1000 } }) },
      { id: 'w2', data: () => ({ exercise: 'Back Squat', weight: 90, reps: 1, estimatedLoad: 90, timestamp: { toMillis: () => 2000 } }) }
    ];

    getEffectiveLoad.mockReturnValueOnce(100).mockReturnValueOnce(90);
    estimate1RM.mockReturnValueOnce(116.67).mockReturnValueOnce(93);

    const result = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);

    expect(result.cachedMax1RMByExercise['Back Squat']).toBe(116.67);
  });

  it('tracks max reps per exercise', () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, timestamp: { toMillis: () => 1000 } }) },
      { id: 'w2', data: () => ({ exercise: 'Back Squat', weight: 80, reps: 10, timestamp: { toMillis: () => 2000 } }) }
    ];

    getEffectiveLoad.mockReturnValue(100);
    estimate1RM.mockReturnValue(116.67);

    const result = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);

    expect(result.cachedMaxRepsByExercise['Back Squat']).toBe(10);
  });

  it('handles empty snapshot', () => {
    const result = processWorkoutSnapshot([], getEffectiveLoad, estimate1RM);

    expect(result.workouts).toHaveLength(0);
    expect(result.activeRecords).toEqual({});
    expect(result.cachedMaxLoadByExercise).toEqual({});
    expect(result.cachedMax1RMByExercise).toEqual({});
    expect(result.cachedMaxRepsByExercise).toEqual({});
  });

  it('handles missing weight/reps gracefully', () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', timestamp: { toMillis: () => 1000 } }) }
    ];

    getEffectiveLoad.mockReturnValue(0);
    estimate1RM.mockReturnValue(0);

    const result = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);

    expect(result.workouts).toHaveLength(1);
    expect(result.activeRecords['Back Squat']).toBe(0);
  });

  it('handles multiple exercises independently', () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, estimatedLoad: 100, timestamp: { toMillis: () => 1000 } }) },
      { id: 'w2', data: () => ({ exercise: 'Bench Press', weight: 80, reps: 3, estimatedLoad: 80, timestamp: { toMillis: () => 2000 } }) }
    ];

    getEffectiveLoad.mockReturnValueOnce(100).mockReturnValueOnce(80);
    estimate1RM.mockReturnValueOnce(116.67).mockReturnValueOnce(88);

    const result = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);

    expect(result.activeRecords['Back Squat']).toBe(116.67);
    expect(result.activeRecords['Bench Press']).toBe(88);
    expect(result.cachedMaxLoadByExercise['Back Squat']).toBe(100);
    expect(result.cachedMaxLoadByExercise['Bench Press']).toBe(80);
  });

  it('updates activeRecords when new 1RM is higher', () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, estimatedLoad: 100, timestamp: { toMillis: () => 1000 } }) },
      { id: 'w2', data: () => ({ exercise: 'Back Squat', weight: 110, reps: 5, estimatedLoad: 110, timestamp: { toMillis: () => 2000 } }) }
    ];

    getEffectiveLoad.mockReturnValueOnce(100).mockReturnValueOnce(110);
    estimate1RM.mockReturnValueOnce(116.67).mockReturnValueOnce(128.33);

    const result = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);

    expect(result.activeRecords['Back Squat']).toBe(128.33);
  });

  it('does not update activeRecords when new 1RM is lower', () => {
    const mockDocs = [
      { id: 'w1', data: () => ({ exercise: 'Back Squat', weight: 100, reps: 5, estimatedLoad: 100, timestamp: { toMillis: () => 1000 } }) },
      { id: 'w2', data: () => ({ exercise: 'Back Squat', weight: 90, reps: 5, estimatedLoad: 90, timestamp: { toMillis: () => 2000 } }) }
    ];

    getEffectiveLoad.mockReturnValueOnce(100).mockReturnValueOnce(90);
    estimate1RM.mockReturnValueOnce(116.67).mockReturnValueOnce(105);

    const result = processWorkoutSnapshot(mockDocs, getEffectiveLoad, estimate1RM);

    expect(result.activeRecords['Back Squat']).toBe(116.67);
  });
});
