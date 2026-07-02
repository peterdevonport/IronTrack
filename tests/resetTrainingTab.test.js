import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetTrainingTab } from './functions.js';

describe('resetTrainingTab', () => {
  let deps, mockElements, globals;

  beforeEach(() => {
    mockElements = {};
    globals = {
      pendingPlannedWorkout: { type: 'AMRAP', name: 'Test' }
    };

    const createMockElement = (props = {}) => ({
      textContent: '',
      style: { display: '' },
      innerHTML: '',
      checked: false,
      value: '',
      disabled: false,
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn()
      },
      toggleAttribute: vi.fn(),
      ...props
    });

    deps = {
      document: {
        getElementById: vi.fn((id) => mockElements[id] || createMockElement()),
        querySelectorAll: vi.fn(() => [])
      },
      globals
    };
  });

  it('should clear pendingPlannedWorkout', () => {
    resetTrainingTab(deps);
    expect(globals.pendingPlannedWorkout).toBeNull();
  });

  it('should hide workout type badge', () => {
    const badge = { textContent: 'AMRAP', style: { display: 'block' } };
    mockElements['log-workout-type-badge'] = badge;

    resetTrainingTab(deps);

    expect(badge.textContent).toBe('');
    expect(badge.style.display).toBe('none');
  });

  it('should show workout placeholder', () => {
    const placeholder = { classList: { add: vi.fn(), remove: vi.fn() } };
    mockElements['log-workout-placeholder'] = placeholder;

    resetTrainingTab(deps);

    expect(placeholder.classList.remove).toHaveBeenCalledWith('hidden');
  });

  it('should hide workout description and clear content', () => {
    const desc = { classList: { add: vi.fn() }, innerHTML: 'Some description' };
    mockElements['workout-description'] = desc;

    resetTrainingTab(deps);

    expect(desc.classList.add).toHaveBeenCalledWith('hidden');
    expect(desc.innerHTML).toBe('');
  });

  it('should hide all log-result elements', () => {
    const resultElements = [
      { classList: { add: vi.fn() } },
      { classList: { add: vi.fn() } }
    ];
    deps.document.querySelectorAll.mockReturnValue(resultElements);

    resetTrainingTab(deps);

    expect(deps.document.querySelectorAll).toHaveBeenCalledWith('[id^="log-result-"]');
    resultElements.forEach(el => {
      expect(el.classList.add).toHaveBeenCalledWith('hidden');
    });
  });

  it('should clear log-rounds input', () => {
    const roundsInput = { value: '5' };
    mockElements['log-rounds'] = roundsInput;

    resetTrainingTab(deps);

    expect(roundsInput.value).toBe('');
  });

  it('should clear log-partial-reps input', () => {
    const partialInput = { value: '10' };
    mockElements['log-partial-reps'] = partialInput;

    resetTrainingTab(deps);

    expect(partialInput.value).toBe('');
  });

  it('should reset round button styling', () => {
    const roundBtn = { classList: { remove: vi.fn(), add: vi.fn() } };
    mockElements['log-round-btn'] = roundBtn;

    resetTrainingTab(deps);

    expect(roundBtn.classList.remove).toHaveBeenCalledWith('is-secondary');
    expect(roundBtn.classList.add).toHaveBeenCalledWith('is-primary');
  });

  it('should reset rep button styling', () => {
    const repBtn = { classList: { remove: vi.fn(), add: vi.fn() } };
    mockElements['log-rep-btn'] = repBtn;

    resetTrainingTab(deps);

    expect(repBtn.classList.remove).toHaveBeenCalledWith('is-secondary');
    expect(repBtn.classList.add).toHaveBeenCalledWith('is-primary-ghost');
  });

  it('should reset score preview to dash', () => {
    const scorePreview = { textContent: '5 rounds' };
    mockElements['log-score-preview'] = scorePreview;

    resetTrainingTab(deps);

    expect(scorePreview.textContent).toBe('—');
  });

  it('should uncheck FOR_TIME DNF checkbox', () => {
    const dnfCheckbox = { checked: true };
    mockElements['fortime-dnf'] = dnfCheckbox;

    resetTrainingTab(deps);

    expect(dnfCheckbox.checked).toBe(false);
  });

  it('should clear FOR_TIME time inputs', () => {
    const minsInput = { value: '5', toggleAttribute: vi.fn() };
    const secsInput = { value: '30', toggleAttribute: vi.fn() };
    mockElements['fortime-minutes'] = minsInput;
    mockElements['fortime-seconds'] = secsInput;

    resetTrainingTab(deps);

    expect(minsInput.value).toBe('');
    expect(secsInput.value).toBe('');
    expect(minsInput.toggleAttribute).toHaveBeenCalledWith('required', true);
    expect(secsInput.toggleAttribute).toHaveBeenCalledWith('required', true);
  });

  it('should clear FOR_TIME cap reps input', () => {
    const capRepsInput = { value: '15' };
    mockElements['fortime-cap-reps'] = capRepsInput;

    resetTrainingTab(deps);

    expect(capRepsInput.value).toBe('');
  });

  it('should show FOR_TIME time inputs and hide cap container', () => {
    const timeInputs = { classList: { remove: vi.fn() } };
    const capContainer = { classList: { add: vi.fn() } };
    mockElements['fortime-time-inputs'] = timeInputs;
    mockElements['fortime-cap-reps-container'] = capContainer;

    resetTrainingTab(deps);

    expect(timeInputs.classList.remove).toHaveBeenCalledWith('hidden');
    expect(capContainer.classList.add).toHaveBeenCalledWith('hidden');
  });

  it('should reset FOR_TIME score preview', () => {
    const ftScore = { textContent: '5:30' };
    mockElements['fortime-score-preview'] = ftScore;

    resetTrainingTab(deps);

    expect(ftScore.textContent).toBe('—');
  });

  it('should disable and restyle log-workout-btn', () => {
    const btn = { disabled: false, classList: { remove: vi.fn(), add: vi.fn() } };
    mockElements['log-workout-btn'] = btn;

    resetTrainingTab(deps);

    expect(btn.disabled).toBe(true);
    expect(btn.classList.remove).toHaveBeenCalledWith('is-primary');
    expect(btn.classList.add).toHaveBeenCalledWith('is-ghost');
  });

  it('should handle missing elements gracefully', () => {
    // No elements set in mockElements
    expect(() => resetTrainingTab(deps)).not.toThrow();
  });

  it('should handle null pendingPlannedWorkout', () => {
    globals.pendingPlannedWorkout = null;
    expect(() => resetTrainingTab(deps)).not.toThrow();
    expect(globals.pendingPlannedWorkout).toBeNull();
  });
});
