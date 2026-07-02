import { describe, it, expect, beforeEach, vi } from 'vitest';
import { submitForTimeWorkout } from './functions.js';

describe('submitForTimeWorkout', () => {
  let deps, mockElements;

  beforeEach(() => {
    mockElements = {};
    
    deps = {
      document: {
        getElementById: vi.fn((id) => mockElements[id] || { value: '', checked: false })
      },
      currentUser: { uid: 'test-user-123' },
      addDoc: vi.fn().mockResolvedValue({ id: 'test-doc-id' }),
      collection: vi.fn(),
      db: {},
      formatScore_TIME_SECONDS: vi.fn((s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`),
      generateForTimeContributions: vi.fn().mockResolvedValue(undefined),
      showFeedback: vi.fn()
    };
  });

  it('should save FOR_TIME workout with valid completion', async () => {
    mockElements['fortime-dnf'] = { checked: false };
    mockElements['fortime-minutes'] = { value: '5' };
    mockElements['fortime-seconds'] = { value: '30' };
    mockElements['fortime-cap-reps'] = { value: '0' };

    await submitForTimeWorkout('Test FOR_TIME', { movements: [], rounds: 3 }, 'now', deps);

    expect(deps.addDoc).toHaveBeenCalled();
    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.type).toBe('FOR_TIME');
    expect(doc.result.timeSeconds).toBe(330);
    expect(doc.result.completed).toBe(true);
  });

  it('should save FOR_TIME workout with DNF', async () => {
    mockElements['fortime-dnf'] = { checked: true };
    mockElements['fortime-cap-reps'] = { value: '15' };
    mockElements['fortime-minutes'] = { value: '0' };
    mockElements['fortime-seconds'] = { value: '0' };

    await submitForTimeWorkout('Test FOR_TIME', { movements: [], rounds: 3 }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.result.timeSeconds).toBe(0);
    expect(doc.result.completed).toBe(false);
    expect(doc.result.remainingReps).toBe(15);
  });

  it('should show feedback and not save when seconds > 59', async () => {
    mockElements['fortime-dnf'] = { checked: false };
    mockElements['fortime-minutes'] = { value: '5' };
    mockElements['fortime-seconds'] = { value: '60' };
    mockElements['fortime-cap-reps'] = { value: '0' };

    await submitForTimeWorkout('Test FOR_TIME', { movements: [], rounds: 3 }, 'now', deps);

    expect(deps.showFeedback).toHaveBeenCalledWith('Seconds must be 0–59.', 'rose', 'log-workout-feedback');
    expect(deps.addDoc).not.toHaveBeenCalled();
  });

  it('should calculate timeSeconds correctly', async () => {
    mockElements['fortime-dnf'] = { checked: false };
    mockElements['fortime-minutes'] = { value: '10' };
    mockElements['fortime-seconds'] = { value: '45' };
    mockElements['fortime-cap-reps'] = { value: '0' };

    await submitForTimeWorkout('Test FOR_TIME', { movements: [], rounds: 3 }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.result.timeSeconds).toBe(645); // 10*60 + 45
  });

  it('should set scoreValue to timeSeconds when completed', async () => {
    mockElements['fortime-dnf'] = { checked: false };
    mockElements['fortime-minutes'] = { value: '3' };
    mockElements['fortime-seconds'] = { value: '20' };
    mockElements['fortime-cap-reps'] = { value: '0' };

    await submitForTimeWorkout('Test FOR_TIME', { movements: [], rounds: 3 }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.scoreValue).toBe(200); // 3*60 + 20
  });

  it('should set scoreValue to remainingReps when DNF', async () => {
    mockElements['fortime-dnf'] = { checked: true };
    mockElements['fortime-cap-reps'] = { value: '25' };
    mockElements['fortime-minutes'] = { value: '0' };
    mockElements['fortime-seconds'] = { value: '0' };

    await submitForTimeWorkout('Test FOR_TIME', { movements: [], rounds: 3 }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.scoreValue).toBe(25);
  });

  it('should set correct scoreType', async () => {
    mockElements['fortime-dnf'] = { checked: false };
    mockElements['fortime-minutes'] = { value: '5' };
    mockElements['fortime-seconds'] = { value: '0' };
    mockElements['fortime-cap-reps'] = { value: '0' };

    await submitForTimeWorkout('Test FOR_TIME', { movements: [], rounds: 3 }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.scoreType).toBe('TIME_SECONDS');
  });

  it('should call formatScore_TIME_SECONDS when completed', async () => {
    mockElements['fortime-dnf'] = { checked: false };
    mockElements['fortime-minutes'] = { value: '4' };
    mockElements['fortime-seconds'] = { value: '15' };
    mockElements['fortime-cap-reps'] = { value: '0' };

    await submitForTimeWorkout('Test FOR_TIME', { movements: [], rounds: 3 }, 'now', deps);

    expect(deps.formatScore_TIME_SECONDS).toHaveBeenCalledWith(255);
  });

  it('should use "Cap X" format for scoreDisplay when DNF', async () => {
    mockElements['fortime-dnf'] = { checked: true };
    mockElements['fortime-cap-reps'] = { value: '20' };
    mockElements['fortime-minutes'] = { value: '0' };
    mockElements['fortime-seconds'] = { value: '0' };

    await submitForTimeWorkout('Test FOR_TIME', { movements: [], rounds: 3 }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.scoreDisplay).toBe('Cap 20');
  });

  it('should generate contributions with correct args', async () => {
    mockElements['fortime-dnf'] = { checked: false };
    mockElements['fortime-minutes'] = { value: '5' };
    mockElements['fortime-seconds'] = { value: '0' };
    mockElements['fortime-cap-reps'] = { value: '0' };
    const structure = { movements: [{ exercise: 'squat' }], rounds: 3 };

    await submitForTimeWorkout('Test FOR_TIME', structure, 'now', deps);

    expect(deps.generateForTimeContributions).toHaveBeenCalledWith(
      'test-doc-id',
      structure.movements,
      3,
      0
    );
  });

  it('should pass remainingReps to contributions when DNF', async () => {
    mockElements['fortime-dnf'] = { checked: true };
    mockElements['fortime-cap-reps'] = { value: '10' };
    mockElements['fortime-minutes'] = { value: '0' };
    mockElements['fortime-seconds'] = { value: '0' };
    const structure = { movements: [], rounds: 3 };

    await submitForTimeWorkout('Test FOR_TIME', structure, 'now', deps);

    expect(deps.generateForTimeContributions).toHaveBeenCalledWith(
      'test-doc-id',
      structure.movements,
      3,
      10
    );
  });

  it('should set userId from currentUser', async () => {
    mockElements['fortime-dnf'] = { checked: false };
    mockElements['fortime-minutes'] = { value: '1' };
    mockElements['fortime-seconds'] = { value: '0' };
    mockElements['fortime-cap-reps'] = { value: '0' };

    await submitForTimeWorkout('Test FOR_TIME', { movements: [], rounds: 3 }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.userId).toBe('test-user-123');
  });

  it('should set name and structure correctly', async () => {
    mockElements['fortime-dnf'] = { checked: false };
    mockElements['fortime-minutes'] = { value: '1' };
    mockElements['fortime-seconds'] = { value: '0' };
    mockElements['fortime-cap-reps'] = { value: '0' };
    const structure = { movements: [], rounds: 3 };

    await submitForTimeWorkout('My Workout', structure, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.name).toBe('My Workout');
    expect(doc.structure).toBe(structure);
  });

  it('should set timestamp correctly', async () => {
    mockElements['fortime-dnf'] = { checked: false };
    mockElements['fortime-minutes'] = { value: '1' };
    mockElements['fortime-seconds'] = { value: '0' };
    mockElements['fortime-cap-reps'] = { value: '0' };

    await submitForTimeWorkout('Test FOR_TIME', { movements: [], rounds: 3 }, 'test-timestamp', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.timestamp).toBe('test-timestamp');
  });

  it('should handle zero time (0:00)', async () => {
    mockElements['fortime-dnf'] = { checked: false };
    mockElements['fortime-minutes'] = { value: '0' };
    mockElements['fortime-seconds'] = { value: '0' };
    mockElements['fortime-cap-reps'] = { value: '0' };

    await submitForTimeWorkout('Test FOR_TIME', { movements: [], rounds: 3 }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.result.timeSeconds).toBe(0);
    expect(doc.scoreValue).toBe(0);
  });

  it('should handle DNF with zero remaining reps', async () => {
    mockElements['fortime-dnf'] = { checked: true };
    mockElements['fortime-cap-reps'] = { value: '0' };
    mockElements['fortime-minutes'] = { value: '0' };
    mockElements['fortime-seconds'] = { value: '0' };

    await submitForTimeWorkout('Test FOR_TIME', { movements: [], rounds: 3 }, 'now', deps);

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.result.remainingReps).toBe(0);
    expect(doc.scoreValue).toBe(0);
  });

  it('should propagate Firestore errors', async () => {
    mockElements['fortime-dnf'] = { checked: false };
    mockElements['fortime-minutes'] = { value: '1' };
    mockElements['fortime-seconds'] = { value: '0' };
    mockElements['fortime-cap-reps'] = { value: '0' };
    deps.addDoc.mockRejectedValue(new Error('Firestore error'));

    await expect(submitForTimeWorkout('Test FOR_TIME', { movements: [], rounds: 3 }, 'now', deps)).rejects.toThrow('Firestore error');
  });

  it('should propagate contribution generation errors', async () => {
    mockElements['fortime-dnf'] = { checked: false };
    mockElements['fortime-minutes'] = { value: '1' };
    mockElements['fortime-seconds'] = { value: '0' };
    mockElements['fortime-cap-reps'] = { value: '0' };
    deps.generateForTimeContributions.mockRejectedValue(new Error('Contribution error'));

    await expect(submitForTimeWorkout('Test FOR_TIME', { movements: [], rounds: 3 }, 'now', deps)).rejects.toThrow('Contribution error');
  });
});
