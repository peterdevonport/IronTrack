import { describe, it, expect, beforeEach, vi } from 'vitest';
import { submitEmomWorkout } from './functions.js';

describe('submitEmomWorkout', () => {
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
      formatScore_COMPLETED_MINUTES: vi.fn((c, t) => `${c}/${t} min`),
      generateEmomContributions: vi.fn().mockResolvedValue(undefined),
      showFeedback: vi.fn()
    };
  });

  it('should save EMOM workout with valid input', async () => {
    mockElements['log-rounds'] = { value: '10' };
    const structure = { rounds: 12, minutes: [], mode: 'by_round' };

    await submitEmomWorkout('Test EMOM', structure, 'now', deps);

    expect(deps.addDoc).toHaveBeenCalled();
    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.type).toBe('EMOM');
    expect(doc.result.roundsCompleted).toBe(10);
  });

  it('should show feedback and not save when rounds is negative', async () => {
    mockElements['log-rounds'] = { value: '-1' };

    await submitEmomWorkout('Test EMOM', { rounds: 10, minutes: [], mode: 'by_round' }, 'now', deps);

    expect(deps.showFeedback).toHaveBeenCalledWith('Enter rounds completed.', 'red', 'log-workout-feedback');
    expect(deps.addDoc).not.toHaveBeenCalled();
  });

  it('should set scoreValue to roundsCompleted', async () => {
    mockElements['log-rounds'] = { value: '8' };

    await submitEmomWorkout('Test EMOM', { rounds: 10, minutes: [], mode: 'by_round' }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.scoreValue).toBe(8);
  });

  it('should set correct scoreType', async () => {
    mockElements['log-rounds'] = { value: '5' };

    await submitEmomWorkout('Test EMOM', { rounds: 10, minutes: [], mode: 'by_round' }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.scoreType).toBe('COMPLETED_MINUTES');
  });

  it('should call formatScore_COMPLETED_MINUTES with correct args', async () => {
    mockElements['log-rounds'] = { value: '7' };
    const structure = { rounds: 10, minutes: [], mode: 'by_round' };

    await submitEmomWorkout('Test EMOM', structure, 'now', deps);

    expect(deps.formatScore_COMPLETED_MINUTES).toHaveBeenCalledWith(7, 10);
  });

  it('should generate contributions with correct args', async () => {
    mockElements['log-rounds'] = { value: '5' };
    const structure = { rounds: 10, minutes: [{ exercise: 'squat' }], mode: 'by_time' };

    await submitEmomWorkout('Test EMOM', structure, 'now', deps);

    expect(deps.generateEmomContributions).toHaveBeenCalledWith(
      'test-doc-id',
      structure.minutes,
      5,
      'by_time'
    );
  });

  it('should set userId from currentUser', async () => {
    mockElements['log-rounds'] = { value: '1' };

    await submitEmomWorkout('Test EMOM', { rounds: 10, minutes: [], mode: 'by_round' }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.userId).toBe('test-user-123');
  });

  it('should set name and structure correctly', async () => {
    mockElements['log-rounds'] = { value: '1' };
    const structure = { rounds: 10, minutes: [], mode: 'by_round' };

    await submitEmomWorkout('My EMOM', structure, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.name).toBe('My EMOM');
    expect(doc.structure).toBe(structure);
  });

  it('should set timestamp correctly', async () => {
    mockElements['log-rounds'] = { value: '1' };

    await submitEmomWorkout('Test EMOM', { rounds: 10, minutes: [], mode: 'by_round' }, 'test-timestamp', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.timestamp).toBe('test-timestamp');
  });

  it('should handle zero rounds', async () => {
    mockElements['log-rounds'] = { value: '0' };

    await submitEmomWorkout('Test EMOM', { rounds: 10, minutes: [], mode: 'by_round' }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.result.roundsCompleted).toBe(0);
    expect(doc.scoreValue).toBe(0);
  });

  it('should propagate Firestore errors', async () => {
    mockElements['log-rounds'] = { value: '1' };
    deps.addDoc.mockRejectedValue(new Error('Firestore error'));

    await expect(submitEmomWorkout('Test EMOM', { rounds: 10, minutes: [], mode: 'by_round' }, 'now', deps)).rejects.toThrow('Firestore error');
  });

  it('should propagate contribution generation errors', async () => {
    mockElements['log-rounds'] = { value: '1' };
    deps.generateEmomContributions.mockRejectedValue(new Error('Contribution error'));

    await expect(submitEmomWorkout('Test EMOM', { rounds: 10, minutes: [], mode: 'by_round' }, 'now', deps)).rejects.toThrow('Contribution error');
  });
});
