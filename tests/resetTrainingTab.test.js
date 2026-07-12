import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  builder: {
    pendingPlannedWorkout: { type: 'AMRAP', name: 'Test', structure: {} }
  }
}));

vi.mock('../firebase.js', () => ({
  auth: { currentUser: null },
  db: {},
  collection: vi.fn(),
  addDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  Timestamp: { now: vi.fn(() => 'test-ts') }
}));

vi.mock('../state.js', () => ({
  state: mockState,
  EPLEY_CONSTANT: 30,
  SECONDS_PER_MINUTE: 60,
  PERCENT_DIVISOR: 100,
  HAPTIC: { tap: 15, confirm: 30 },
  FIRESTORE_STRUCTURED_LIMIT: 500,
  DEBOUNCE_DELAY_SYNC_ACTIVITY: 3000
}));

vi.mock('../math.js', () => ({
  estimate1RM: vi.fn(),
  getEffectiveLoad: vi.fn(),
  computeEffectiveLoad: vi.fn(),
  estimateWeightForReps: vi.fn(),
  rpeToRir: vi.fn()
}));

vi.mock('../dom.js', () => ({
  debounce: vi.fn(() => vi.fn()),
  escapeHtml: vi.fn(),
  haptic: vi.fn()
}));

vi.mock('../exercise-data.js', () => ({
  getExerciseInfo: vi.fn(),
  LOAD_FACTORS: {}
}));

vi.mock('../analytics.js', () => ({
  formatScore_ROUNDS_AND_REPS: vi.fn(),
  formatScore_COMPLETED_MINUTES: vi.fn(),
  formatScore_TIME_SECONDS: vi.fn(),
  getRepsPerRound: vi.fn(),
  computeDotsScore: vi.fn(),
  computeSinclairScore: vi.fn(),
  getRankingTier: vi.fn()
}));

vi.mock('../ui.js', () => ({
  showFeedback: vi.fn(),
  clearChildren: vi.fn(),
  PERMISSION_ERROR_MAP: {}
}));

vi.mock('../messages.js', () => ({
  MSG: {}
}));

import { resetTrainingTab } from '../workouts.js';

describe('resetTrainingTab', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.builder.pendingPlannedWorkout = { type: 'AMRAP', name: 'Test', structure: {} };

    document.body.innerHTML = `
      <div id="log-workout-type-badge"></div>
      <div id="log-workout-placeholder"></div>
      <div id="workout-description"></div>
      <div id="log-result-amrap"></div>
      <div id="log-result-emom"></div>
      <input id="log-rounds" />
      <input id="log-partial-reps" />
      <button id="log-round-btn" class="is-primary"></button>
      <button id="log-rep-btn" class="is-primary-ghost"></button>
      <div id="log-score-preview"></div>
      <input id="fortime-dnf" type="checkbox" />
      <input id="fortime-minutes" required />
      <input id="fortime-seconds" required />
      <input id="fortime-cap-reps" />
      <div id="fortime-time-inputs"></div>
      <div id="fortime-cap-reps-container"></div>
      <div id="fortime-score-preview"></div>
      <button id="log-workout-btn" class="is-primary"></button>
    `;
  });

  it('should clear pendingPlannedWorkout', () => {
    resetTrainingTab();

    expect(mockState.builder.pendingPlannedWorkout).toBeNull();
  });

  it('should hide workout type badge', () => {
    resetTrainingTab();

    const badge = document.getElementById('log-workout-type-badge');
    expect(badge.textContent).toBe('');
    expect(badge.style.display).toBe('none');
  });

  it('should show placeholder', () => {
    const placeholder = document.getElementById('log-workout-placeholder');
    placeholder.classList.add('hidden');

    resetTrainingTab();

    expect(placeholder.classList.contains('hidden')).toBe(false);
  });

  it('should hide and clear workout description', () => {
    resetTrainingTab();

    const desc = document.getElementById('workout-description');
    expect(desc.classList.contains('hidden')).toBe(true);
  });

  it('should hide all result sections', () => {
    resetTrainingTab();

    document.querySelectorAll('[id^="log-result-"]').forEach(el => {
      expect(el.classList.contains('hidden')).toBe(true);
    });
  });

  it('should clear round and partial reps inputs', () => {
    document.getElementById('log-rounds').value = '5';
    document.getElementById('log-partial-reps').value = '10';

    resetTrainingTab();

    expect(document.getElementById('log-rounds').value).toBe('');
    expect(document.getElementById('log-partial-reps').value).toBe('');
  });

  it('should reset round and rep button styles', () => {
    resetTrainingTab();

    const roundBtn = document.getElementById('log-round-btn');
    const repBtn = document.getElementById('log-rep-btn');
    expect(roundBtn.classList.contains('is-primary')).toBe(true);
    expect(roundBtn.classList.contains('is-secondary')).toBe(false);
    expect(repBtn.classList.contains('is-primary-ghost')).toBe(true);
    expect(repBtn.classList.contains('is-secondary')).toBe(false);
  });

  it('should clear score preview', () => {
    document.getElementById('log-score-preview').textContent = '5 rounds + 10 reps';

    resetTrainingTab();

    expect(document.getElementById('log-score-preview').textContent).toBe('\u2014');
  });

  it('should reset For Time DNF checkbox', () => {
    document.getElementById('fortime-dnf').checked = true;

    resetTrainingTab();

    expect(document.getElementById('fortime-dnf').checked).toBe(false);
  });

  it('should clear For Time inputs and add required attribute', () => {
    document.getElementById('fortime-minutes').value = '10';
    document.getElementById('fortime-seconds').value = '30';

    resetTrainingTab();

    expect(document.getElementById('fortime-minutes').value).toBe('');
    expect(document.getElementById('fortime-minutes').hasAttribute('required')).toBe(true);
    expect(document.getElementById('fortime-seconds').value).toBe('');
    expect(document.getElementById('fortime-seconds').hasAttribute('required')).toBe(true);
  });

  it('should clear For Time cap reps', () => {
    document.getElementById('fortime-cap-reps').value = '20';

    resetTrainingTab();

    expect(document.getElementById('fortime-cap-reps').value).toBe('');
  });

  it('should reset For Time time inputs visibility', () => {
    resetTrainingTab();

    expect(document.getElementById('fortime-time-inputs').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('fortime-cap-reps-container').classList.contains('hidden')).toBe(true);
  });

  it('should clear For Time score preview', () => {
    document.getElementById('fortime-score-preview').textContent = 'Cap 20';

    resetTrainingTab();

    expect(document.getElementById('fortime-score-preview').textContent).toBe('\u2014');
  });

  it('should disable workout button', () => {
    resetTrainingTab();

    const btn = document.getElementById('log-workout-btn');
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains('is-primary')).toBe(false);
    expect(btn.classList.contains('is-ghost')).toBe(true);
  });
});
