import { describe, it, expect, beforeEach, vi } from 'vitest';
import { submitIntervalWorkout } from './functions.js';

describe('submitIntervalWorkout', () => {
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
      formatScore_ROUNDS_AND_REPS: vi.fn((r, p) => `${r} rounds + ${p} reps`),
      generateIntervalContributions: vi.fn().mockResolvedValue(undefined),
      showFeedback: vi.fn()
    };
  });

  it('should save INTERVAL workout with valid input', async () => {
    mockElements['log-rounds'] = { value: '5' };
    mockElements['log-partial-reps'] = { value: '10' };
    const structure = { movements: [], rounds: 6 };

    await submitIntervalWorkout('Test INTERVAL', structure, 'now', deps);

    expect(deps.addDoc).toHaveBeenCalled();
    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.type).toBe('INTERVAL');
    expect(doc.result.roundsCompleted).toBe(5);
    expect(doc.result.partialReps).toBe(10);
  });

  it('should default partialReps to 0 when field is empty', async () => {
    mockElements['log-rounds'] = { value: '3' };
    mockElements['log-partial-reps'] = { value: '' };

    await submitIntervalWorkout('Test INTERVAL', { movements: [], rounds: 5 }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.result.partialReps).toBe(0);
  });

  it('should show feedback and not save when rounds is negative', async () => {
    mockElements['log-rounds'] = { value: '-1' };
    mockElements['log-partial-reps'] = { value: '5' };

    await submitIntervalWorkout('Test INTERVAL', { movements: [], rounds: 5 }, 'now', deps);

    expect(deps.showFeedback).toHaveBeenCalledWith('Enter rounds completed.', 'red', 'log-workout-feedback');
    expect(deps.addDoc).not.toHaveBeenCalled();
  });

  it('should calculate scoreValue correctly', async () => {
    mockElements['log-rounds'] = { value: '4' };
    mockElements['log-partial-reps'] = { value: '8' };

    await submitIntervalWorkout('Test INTERVAL', { movements: [], rounds: 5 }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.scoreValue).toBe(4008); // 4 * 1000 + 8
  });

  it('should set correct scoreType', async () => {
    mockElements['log-rounds'] = { value: '2' };
    mockElements['log-partial-reps'] = { value: '0' };

    await submitIntervalWorkout('Test INTERVAL', { movements: [], rounds: 5 }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.scoreType).toBe('ROUNDS_AND_REPS');
  });

  it('should set completed to true when rounds >= structure.rounds', async () => {
    mockElements['log-rounds'] = { value: '5' };
    mockElements['log-partial-reps'] = { value: '0' };
    const structure = { movements: [], rounds: 5 };

    await submitIntervalWorkout('Test INTERVAL', structure, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.result.completed).toBe(true);
  });

  it('should set completed to false when rounds < structure.rounds', async () => {
    mockElements['log-rounds'] = { value: '4' };
    mockElements['log-partial-reps'] = { value: '0' };
    const structure = { movements: [], rounds: 5 };

    await submitIntervalWorkout('Test INTERVAL', structure, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.result.completed).toBe(false);
  });

  it('should call formatScore_ROUNDS_AND_REPS with correct args', async () => {
    mockElements['log-rounds'] = { value: '3' };
    mockElements['log-partial-reps'] = { value: '12' };

    await submitIntervalWorkout('Test INTERVAL', { movements: [], rounds: 5 }, 'now', deps);

    expect(deps.formatScore_ROUNDS_AND_REPS).toHaveBeenCalledWith(3, 12);
  });

  it('should generate contributions with correct args', async () => {
    mockElements['log-rounds'] = { value: '2' };
    mockElements['log-partial-reps'] = { value: '5' };
    const structure = { movements: [{ exercise: 'squat' }], rounds: 5 };

    await submitIntervalWorkout('Test INTERVAL', structure, 'now', deps);

    expect(deps.generateIntervalContributions).toHaveBeenCalledWith(
      'test-doc-id',
      structure.movements,
      2,
      5
    );
  });

  it('should set userId from currentUser', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };

    await submitIntervalWorkout('Test INTERVAL', { movements: [], rounds: 5 }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.userId).toBe('test-user-123');
  });

  it('should set name and structure correctly', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };
    const structure = { movements: [{ exercise: 'pushup' }], rounds: 5 };

    await submitIntervalWorkout('My Workout', structure, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.name).toBe('My Workout');
    expect(doc.structure).toBe(structure);
  });

  it('should set timestamp correctly', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };

    await submitIntervalWorkout('Test INTERVAL', { movements: [], rounds: 5 }, 'test-timestamp', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.timestamp).toBe('test-timestamp');
  });

  it('should handle zero rounds', async () => {
    mockElements['log-rounds'] = { value: '0' };
    mockElements['log-partial-reps'] = { value: '0' };

    await submitIntervalWorkout('Test INTERVAL', { movements: [], rounds: 5 }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.result.roundsCompleted).toBe(0);
    expect(doc.scoreValue).toBe(0);
    expect(doc.result.completed).toBe(false);
  });

  it('should propagate Firestore errors', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };
    deps.addDoc.mockRejectedValue(new Error('Firestore error'));

    await expect(submitIntervalWorkout('Test INTERVAL', { movements: [], rounds: 5 }, 'now', deps)).rejects.toThrow('Firestore error');
  });

  it('should propagate contribution generation errors', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };
    deps.generateIntervalContributions.mockRejectedValue(new Error('Contribution error'));

    await expect(submitIntervalWorkout('Test INTERVAL', { movements: [], rounds: 5 }, 'now', deps)).rejects.toThrow('Contribution error');
  });
});
