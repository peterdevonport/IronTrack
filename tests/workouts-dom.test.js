import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../firebase.js', () => ({
  auth: { currentUser: null },
  db: {},
  collection: vi.fn(),
  addDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  Timestamp: { now: vi.fn() }
}));

vi.mock('../state.js', () => ({
  state: {
    builder: {
      pendingPlannedWorkout: { type: 'FOR_TIME', structure: { rounds: 5, movements: [{ exerciseId: 'Back Squat', reps: 10 }] } }
    },
    user: { userBiometrics: { bodyweight: 75 } },
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
  getExerciseInfo: vi.fn(() => ({ category: 'barbell', type: 'weighted' })),
  LOAD_FACTORS: {}
}));

vi.mock('../analytics.js', () => ({
  formatScore_ROUNDS_AND_REPS: vi.fn((r, a) => `${r}+${a}`),
  formatScore_COMPLETED_MINUTES: vi.fn(),
  formatScore_TIME_SECONDS: vi.fn(t => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }),
  getRepsPerRound: vi.fn((t, s) => (s?.movements || []).reduce((sum, m) => sum + (parseInt(m.reps, 10) || 0), 0)),
  computeDotsScore: vi.fn(),
  computeSinclairScore: vi.fn(),
  getRankingTier: vi.fn()
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

import {
  updateForTimeScorePreview,
  updateIntervalScorePreview,
  updateAmrapScorePreview,
  toggleForTimeDnf
} from '../workouts.js';
import * as analyticsModule from '../analytics.js';

describe('updateForTimeScorePreview', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="fortime-minutes" />
      <input id="fortime-seconds" />
      <input id="fortime-cap-reps" />
      <input id="fortime-dnf" type="checkbox" />
      <div id="fortime-score-preview"></div>
    `;
  });

  it('shows cap reps for DNF', () => {
    document.getElementById('fortime-dnf').checked = true;
    document.getElementById('fortime-cap-reps').value = '15';

    updateForTimeScorePreview();

    expect(document.getElementById('fortime-score-preview').textContent).toBe('Cap 15');
  });

  it('shows formatted time for non-DNF', () => {
    document.getElementById('fortime-minutes').value = '5';
    document.getElementById('fortime-seconds').value = '30';

    updateForTimeScorePreview();

    expect(document.getElementById('fortime-score-preview').textContent).toBe('5:30');
  });

  it('shows em-dash when no input', () => {
    updateForTimeScorePreview();

    expect(document.getElementById('fortime-score-preview').textContent).toBe('\u2014');
  });

  it('handles missing preview element', () => {
    document.getElementById('fortime-score-preview').remove();
    expect(() => updateForTimeScorePreview()).not.toThrow();
  });
});

describe('updateIntervalScorePreview', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="interval-rounds-completed" />
      <input id="interval-partial-reps" />
      <div id="interval-score-preview"></div>
    `;
  });

  it('shows formatted score', () => {
    document.getElementById('interval-rounds-completed').value = '4';
    document.getElementById('interval-partial-reps').value = '2';

    updateIntervalScorePreview();

    expect(analyticsModule.formatScore_ROUNDS_AND_REPS).toHaveBeenCalledWith(4, 2);
  });

  it('shows em-dash when no input', () => {
    updateIntervalScorePreview();

    expect(document.getElementById('interval-score-preview').textContent).toBe('\u2014');
  });
});

describe('updateAmrapScorePreview', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="amrap-rounds" />
      <input id="amrap-additional-reps" />
      <div id="amrap-score-preview"></div>
    `;
  });

  it('shows formatted score', () => {
    document.getElementById('amrap-rounds').value = '3';
    document.getElementById('amrap-additional-reps').value = '5';

    updateAmrapScorePreview();

    expect(analyticsModule.formatScore_ROUNDS_AND_REPS).toHaveBeenCalledWith(3, 5);
  });

  it('shows em-dash when no input', () => {
    updateAmrapScorePreview();

    expect(document.getElementById('amrap-score-preview').textContent).toBe('\u2014');
  });
});

describe('toggleForTimeDnf', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="fortime-dnf" type="checkbox" />
      <div id="fortime-time-inputs"></div>
      <div id="fortime-cap-reps-container"></div>
      <input id="fortime-minutes" />
      <input id="fortime-seconds" />
      <input id="fortime-cap-reps" />
      <div id="fortime-score-preview">—</div>
      <input id="log-rounds" />
      <input id="log-partial-reps" />
      <div id="log-score-preview">—</div>
    `;
  });

  it('hides time inputs and shows cap reps container when DNF checked', () => {
    document.getElementById('fortime-dnf').checked = true;

    toggleForTimeDnf();

    expect(document.getElementById('fortime-time-inputs').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('fortime-cap-reps-container').classList.contains('hidden')).toBe(false);
  });

  it('shows time inputs and hides cap reps container when DNF unchecked', () => {
    document.getElementById('fortime-dnf').checked = false;
    document.getElementById('fortime-time-inputs').classList.add('hidden');
    document.getElementById('fortime-cap-reps-container').classList.remove('hidden');

    toggleForTimeDnf();

    expect(document.getElementById('fortime-time-inputs').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('fortime-cap-reps-container').classList.contains('hidden')).toBe(true);
  });

  it('toggles required attribute on time inputs', () => {
    document.getElementById('fortime-dnf').checked = true;

    toggleForTimeDnf();

    expect(document.getElementById('fortime-minutes').hasAttribute('required')).toBe(false);
    expect(document.getElementById('fortime-seconds').hasAttribute('required')).toBe(false);

    document.getElementById('fortime-dnf').checked = false;
    toggleForTimeDnf();

    expect(document.getElementById('fortime-minutes').hasAttribute('required')).toBe(true);
    expect(document.getElementById('fortime-seconds').hasAttribute('required')).toBe(true);
  });
});
