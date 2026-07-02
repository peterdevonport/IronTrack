import { describe, it, expect, beforeEach, vi } from 'vitest';
import { submitAmrapWorkout } from './functions.js';

describe('submitAmrapWorkout', () => {
  let deps, mockElements;

  beforeEach(() => {
    mockElements = {};
    
    deps = {
      document: {
        getElementById: vi.fn((id) => mockElements[id] || { value: '' })
      },
      currentUser: { uid: 'test-user-123' },
      addDoc: vi.fn().mockResolvedValue({ id: 'test-doc-id' }),
      collection: vi.fn(),
      db: {},
      formatScore_ROUNDS_AND_REPS: vi.fn((r, a) => `${r} rounds + ${a} reps`),
      generateAmrapContributions: vi.fn().mockResolvedValue(undefined),
      showFeedback: vi.fn()
    };
  });

  it('should save AMRAP workout with valid input', async () => {
    mockElements['log-rounds'] = { value: '5' };
    mockElements['log-partial-reps'] = { value: '10' };

    await submitAmrapWorkout('Test AMRAP', { movements: [] }, 'now', deps);

    expect(deps.addDoc).toHaveBeenCalled();
    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.type).toBe('AMRAP');
    expect(doc.result.roundsCompleted).toBe(5);
    expect(doc.result.additionalReps).toBe(10);
  });

  it('should default additionalReps to 0 when field is empty', async () => {
    mockElements['log-rounds'] = { value: '3' };
    mockElements['log-partial-reps'] = { value: '' };

    await submitAmrapWorkout('Test AMRAP', { movements: [] }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.result.additionalReps).toBe(0);
  });

  it('should show feedback and not save when rounds is negative', async () => {
    mockElements['log-rounds'] = { value: '-1' };
    mockElements['log-partial-reps'] = { value: '5' };

    await submitAmrapWorkout('Test AMRAP', { movements: [] }, 'now', deps);

    expect(deps.showFeedback).toHaveBeenCalledWith('Enter rounds completed.', 'rose', 'log-workout-feedback');
    expect(deps.addDoc).not.toHaveBeenCalled();
  });

  it('should calculate scoreValue correctly', async () => {
    mockElements['log-rounds'] = { value: '3' };
    mockElements['log-partial-reps'] = { value: '15' };

    await submitAmrapWorkout('Test AMRAP', { movements: [] }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.scoreValue).toBe(3015); // 3 * 1000 + 15
  });

  it('should set correct scoreType', async () => {
    mockElements['log-rounds'] = { value: '2' };
    mockElements['log-partial-reps'] = { value: '0' };

    await submitAmrapWorkout('Test AMRAP', { movements: [] }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.scoreType).toBe('ROUNDS_AND_REPS');
  });

  it('should call formatScore_ROUNDS_AND_REPS with correct args', async () => {
    mockElements['log-rounds'] = { value: '4' };
    mockElements['log-partial-reps'] = { value: '8' };

    await submitAmrapWorkout('Test AMRAP', { movements: [] }, 'now', deps);

    expect(deps.formatScore_ROUNDS_AND_REPS).toHaveBeenCalledWith(4, 8);
  });

  it('should generate contributions with correct args', async () => {
    mockElements['log-rounds'] = { value: '2' };
    mockElements['log-partial-reps'] = { value: '5' };
    const structure = { movements: [{ exercise: 'squat' }] };

    await submitAmrapWorkout('Test AMRAP', structure, 'now', deps);

    expect(deps.generateAmrapContributions).toHaveBeenCalledWith(
      'test-doc-id',
      structure.movements,
      2,
      5
    );
  });

  it('should set userId from currentUser', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };

    await submitAmrapWorkout('Test AMRAP', { movements: [] }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.userId).toBe('test-user-123');
  });

  it('should set name and structure correctly', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };
    const structure = { movements: [{ exercise: 'pushup' }] };

    await submitAmrapWorkout('My Workout', structure, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.name).toBe('My Workout');
    expect(doc.structure).toBe(structure);
  });

  it('should set timestamp correctly', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };

    await submitAmrapWorkout('Test AMRAP', { movements: [] }, 'test-timestamp', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.timestamp).toBe('test-timestamp');
  });

  it('should handle zero rounds', async () => {
    mockElements['log-rounds'] = { value: '0' };
    mockElements['log-partial-reps'] = { value: '0' };

    await submitAmrapWorkout('Test AMRAP', { movements: [] }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.result.roundsCompleted).toBe(0);
    expect(doc.scoreValue).toBe(0);
  });

  it('should handle NaN rounds (empty string)', async () => {
    mockElements['log-rounds'] = { value: '' };
    mockElements['log-partial-reps'] = { value: '0' };

    await submitAmrapWorkout('Test AMRAP', { movements: [] }, 'now', deps);

    // NaN < 0 is false, so it should proceed
    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.result.roundsCompleted).toBeNaN();
  });

  it('should propagate Firestore errors', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };
    deps.addDoc.mockRejectedValue(new Error('Firestore error'));

    await expect(submitAmrapWorkout('Test AMRAP', { movements: [] }, 'now', deps)).rejects.toThrow('Firestore error');
  });

  it('should propagate contribution generation errors', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };
    deps.generateAmrapContributions.mockRejectedValue(new Error('Contribution error'));

    await expect(submitAmrapWorkout('Test AMRAP', { movements: [] }, 'now', deps)).rejects.toThrow('Contribution error');
  });

  it('should handle large round values', async () => {
    mockElements['log-rounds'] = { value: '100' };
    mockElements['log-partial-reps'] = { value: '999' };

    await submitAmrapWorkout('Test AMRAP', { movements: [] }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.scoreValue).toBe(100999);
  });
});
