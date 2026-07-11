import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  submitAmrapWorkout,
  submitEmomWorkout,
  submitForTimeWorkout,
  submitIntervalWorkout,
  resetTrainingTab
} from './functions.js';
import { isPermissionDenied } from '../ui.js';

// Integration test for submitPendingWorkout logic
// Since the actual function is tightly coupled to app.js globals,
// we test the orchestration logic by simulating the handler pattern

describe('submitPendingWorkout integration', () => {
  let deps, mockElements, globals, currentUserMock;

  beforeEach(() => {
    currentUserMock = { uid: 'test-user-123' };
    mockElements = {};
    globals = {
      pendingPlannedWorkout: null,
      isSubmittingWorkout: false
    };

    const createMockElement = (props = {}) => ({
      value: '',
      checked: false,
      disabled: false,
      textContent: '',
      innerHTML: '',
      style: { display: '' },
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn()
      },
      toggleAttribute: vi.fn(),
      ...props
    });
    const requireAuthMock = vi.fn((feedbackTarget = 'socialFeedback') => {
      if (!currentUserMock) {
        deps.showFeedback('Please sign in to continue.', 'rose', feedbackTarget);
        return null;
      }
      return currentUserMock;
    });

    deps = {
      document: {
        getElementById: vi.fn((id) => mockElements[id] || createMockElement()),
        querySelectorAll: vi.fn(() => [])
      },
      requireAuth: requireAuthMock,
      addDoc: vi.fn().mockResolvedValue({ id: 'test-doc-id' }),
      collection: vi.fn(),
      db: {},
      formatScore_ROUNDS_AND_REPS: vi.fn((r, a) => `${r}R ${a}r`),
      formatScore_COMPLETED_MINUTES: vi.fn((c, t) => `${c}/${t}`),
      formatScore_TIME_SECONDS: vi.fn((s) => `${s}s`),
      generateAmrapContributions: vi.fn().mockResolvedValue(undefined),
      generateEmomContributions: vi.fn().mockResolvedValue(undefined),
      generateForTimeContributions: vi.fn().mockResolvedValue(undefined),
      generateIntervalContributions: vi.fn().mockResolvedValue(undefined),
      showFeedback: vi.fn(),
      haptic: vi.fn(),
      HAPTIC: { confirm: 'confirm' },
      Timestamp: { now: vi.fn().mockReturnValue('test-timestamp') },
      currentUser: currentUserMock,
      globals
    };
  });

  // Simulate the submitPendingWorkout orchestration
  async function simulateSubmitPendingWorkout(type, name, structure) {
    globals.pendingPlannedWorkout = { type, name, structure };
    
    if (globals.isSubmittingWorkout) return;
    if (!deps.requireAuth('log-workout-feedback')) return;
    if (!globals.pendingPlannedWorkout) {
      deps.showFeedback('No planned workout to log.', 'rose', 'log-workout-feedback');
      return;
    }

    globals.isSubmittingWorkout = true;
    const now = deps.Timestamp.now();

    try {
      const handlers = {
        'AMRAP': submitAmrapWorkout,
        'EMOM': submitEmomWorkout,
        'FOR_TIME': submitForTimeWorkout,
        'INTERVAL': submitIntervalWorkout
      };

      if (!handlers[type]) {
        deps.showFeedback('Unknown workout type.', 'rose', 'log-workout-feedback');
        return;
      }

      await handlers[type](name, structure, now, deps);
      resetTrainingTab(deps);
      deps.showFeedback('Workout logged!', 'emerald', 'log-workout-feedback');
      deps.haptic(deps.HAPTIC.confirm);
    } catch (err) {
      if (isPermissionDenied(err)) {
        deps.showFeedback('Save blocked by Firestore rules.', 'rose', 'log-workout-feedback');
      } else {
        deps.showFeedback('Failed to log workout: ' + err.message, 'rose', 'log-workout-feedback');
      }
    } finally {
      globals.isSubmittingWorkout = false;
    }
  }

  it('should handle AMRAP workout flow', async () => {
    mockElements['log-rounds'] = { value: '3' };
    mockElements['log-partial-reps'] = { value: '5' };

    await simulateSubmitPendingWorkout('AMRAP', 'Test AMRAP', { movements: [] });

    expect(deps.addDoc).toHaveBeenCalled();
    expect(deps.generateAmrapContributions).toHaveBeenCalled();
    expect(deps.showFeedback).toHaveBeenCalledWith('Workout logged!', 'emerald', 'log-workout-feedback');
    expect(deps.haptic).toHaveBeenCalledWith('confirm');
    expect(globals.pendingPlannedWorkout).toBeNull();
  });

  it('should handle EMOM workout flow', async () => {
    mockElements['log-rounds'] = { value: '10' };

    await simulateSubmitPendingWorkout('EMOM', 'Test EMOM', { rounds: 12, minutes: [], mode: 'by_round' });

    expect(deps.addDoc).toHaveBeenCalled();
    expect(deps.generateEmomContributions).toHaveBeenCalled();
    expect(deps.showFeedback).toHaveBeenCalledWith('Workout logged!', 'emerald', 'log-workout-feedback');
    expect(globals.pendingPlannedWorkout).toBeNull();
  });

  it('should handle FOR_TIME workout flow', async () => {
    mockElements['fortime-dnf'] = { checked: false };
    mockElements['fortime-minutes'] = { value: '5', toggleAttribute: vi.fn() };
    mockElements['fortime-seconds'] = { value: '30', toggleAttribute: vi.fn() };
    mockElements['fortime-cap-reps'] = { value: '0' };
    mockElements['log-workout-type-badge'] = { textContent: '', style: { display: '' } };
    mockElements['log-workout-placeholder'] = { classList: { remove: vi.fn() } };
    mockElements['workout-description'] = { classList: { add: vi.fn() }, innerHTML: '' };
    mockElements['log-rounds'] = { value: '' };
    mockElements['log-partial-reps'] = { value: '' };
    mockElements['log-round-btn'] = { classList: { remove: vi.fn(), add: vi.fn() } };
    mockElements['log-rep-btn'] = { classList: { remove: vi.fn(), add: vi.fn() } };
    mockElements['log-score-preview'] = { textContent: '' };
    mockElements['fortime-time-inputs'] = { classList: { remove: vi.fn() } };
    mockElements['fortime-cap-reps-container'] = { classList: { add: vi.fn() } };
    mockElements['fortime-score-preview'] = { textContent: '' };
    mockElements['log-workout-btn'] = { disabled: false, classList: { remove: vi.fn(), add: vi.fn() } };

    await simulateSubmitPendingWorkout('FOR_TIME', 'Test FOR_TIME', { movements: [], rounds: 3 });

    expect(deps.addDoc).toHaveBeenCalled();
    expect(deps.generateForTimeContributions).toHaveBeenCalled();
    expect(deps.showFeedback).toHaveBeenCalledWith('Workout logged!', 'emerald', 'log-workout-feedback');
    expect(globals.pendingPlannedWorkout).toBeNull();
  });

  it('should handle INTERVAL workout flow', async () => {
    mockElements['log-rounds'] = { value: '4' };
    mockElements['log-partial-reps'] = { value: '8' };

    await simulateSubmitPendingWorkout('INTERVAL', 'Test INTERVAL', { movements: [], rounds: 5 });

    expect(deps.addDoc).toHaveBeenCalled();
    expect(deps.generateIntervalContributions).toHaveBeenCalled();
    expect(deps.showFeedback).toHaveBeenCalledWith('Workout logged!', 'emerald', 'log-workout-feedback');
    expect(globals.pendingPlannedWorkout).toBeNull();
  });

  it('should show error for unknown workout type', async () => {
    await simulateSubmitPendingWorkout('UNKNOWN', 'Test', {});

    expect(deps.showFeedback).toHaveBeenCalledWith('Unknown workout type.', 'rose', 'log-workout-feedback');
    expect(deps.addDoc).not.toHaveBeenCalled();
    expect(globals.pendingPlannedWorkout).not.toBeNull();
  });

  it('should prevent double submission', async () => {
    globals.isSubmittingWorkout = true;
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };

    await simulateSubmitPendingWorkout('AMRAP', 'Test', { movements: [] });

    expect(deps.addDoc).not.toHaveBeenCalled();
  });

  it('should show error when no user logged in', async () => {
    currentUserMock = null;

    await simulateSubmitPendingWorkout('AMRAP', 'Test', { movements: [] });

    expect(deps.requireAuth).toHaveBeenCalledWith('log-workout-feedback');
    expect(deps.showFeedback).toHaveBeenCalledWith('Please sign in to continue.', 'rose', 'log-workout-feedback');
    expect(deps.addDoc).not.toHaveBeenCalled();
  });

  it('should handle permission-denied error', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };
    deps.addDoc.mockRejectedValue({ code: 'permission-denied', message: 'Permission denied' });

    await simulateSubmitPendingWorkout('AMRAP', 'Test', { movements: [] });

    expect(deps.showFeedback).toHaveBeenCalledWith('Save blocked by Firestore rules.', 'rose', 'log-workout-feedback');
  });

  it('should handle other Firestore errors', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };
    deps.addDoc.mockRejectedValue({ code: 'other', message: 'Some error' });

    await simulateSubmitPendingWorkout('AMRAP', 'Test', { movements: [] });

    expect(deps.showFeedback).toHaveBeenCalledWith('Failed to log workout: Some error', 'rose', 'log-workout-feedback');
  });

  it('should reset isSubmittingWorkout flag on success', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };

    await simulateSubmitPendingWorkout('AMRAP', 'Test', { movements: [] });

    expect(globals.isSubmittingWorkout).toBe(false);
  });

  it('should reset isSubmittingWorkout flag on error', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };
    deps.addDoc.mockRejectedValue(new Error('Test error'));

    await simulateSubmitPendingWorkout('AMRAP', 'Test', { movements: [] });

    expect(globals.isSubmittingWorkout).toBe(false);
  });

  it('should reset isSubmittingWorkout flag on unknown type', async () => {
    globals.isSubmittingWorkout = false;
    await simulateSubmitPendingWorkout('UNKNOWN', 'Test', {});

    // The flag should still be false since we returned early
    expect(globals.isSubmittingWorkout).toBe(false);
  });

  it('should call Timestamp.now() for timestamp', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };

    await simulateSubmitPendingWorkout('AMRAP', 'Test', { movements: [] });

    expect(deps.Timestamp.now).toHaveBeenCalled();
  });

  it('should pass correct timestamp to workout doc', async () => {
    mockElements['log-rounds'] = { value: '1' };
    mockElements['log-partial-reps'] = { value: '0' };
    deps.Timestamp.now.mockReturnValue('my-timestamp');

    await simulateSubmitPendingWorkout('AMRAP', 'Test', { movements: [] });

    const doc = deps.addDoc.mock.calls[0][1];
    expect(doc.timestamp).toBe('my-timestamp');
  });
});
