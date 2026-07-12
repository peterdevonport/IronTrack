import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../firebase.js', () => ({
  auth: { currentUser: { uid: 'test-user' } },
  db: {},
  collection: vi.fn(),
  addDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  Timestamp: { now: vi.fn() }
}));

vi.mock('../state.js', () => ({
  state: {
    user: { userBiometrics: { bodyweight: 75, gender: 'male' } },
    cache: { activeRecords: {} }
  },
  HAPTIC: { confirm: 30 },
  FORM_SCHEMAS: {},
  pbLogExercise: null,
  pbLogBtn: null
}));

vi.mock('../math.js', () => ({
  estimate1RM: vi.fn(),
  getEffectiveLoad: vi.fn(),
  computeEffectiveLoad: vi.fn()
}));

vi.mock('../dom.js', () => ({
  haptic: vi.fn()
}));

vi.mock('../exercise-data.js', () => ({
  getExerciseInfo: vi.fn((name) => {
    if (name === 'Pull Up') return { name: 'Pull Up', type: 'bodyweight', category: 'bodyweight', movement: 'pull' };
    if (name === 'Dip') return { name: 'Dip', type: 'bodyweight', category: 'bodyweight', movement: 'push' };
    if (name === 'Back Squat') return { name: 'Back Squat', type: 'weighted', category: 'barbell', movement: 'squat' };
    return { name, type: 'weighted', category: 'barbell' };
  }),
  LOAD_FACTORS: { 'Pull Up': 1.0, 'Dip': 0.7, 'Chin Up': 1.0 },
  resolveExerciseVariant: vi.fn()
}));

vi.mock('../forms.js', () => ({
  renderFormFields: vi.fn()
}));

vi.mock('../ui.js', () => ({
  showFeedback: vi.fn(),
  PERMISSION_ERROR_MAP: {}
}));

vi.mock('../messages.js', () => ({
  MSG: {}
}));

import { getSchemaKey, computeTotalLoad, requireAuth } from '../auth.js';
import { showFeedback } from '../ui.js';
import { auth } from '../firebase.js';

describe('getSchemaKey', () => {
  it('returns "weighted" for Pull Up', () => {
    expect(getSchemaKey('Pull Up')).toBe('weighted');
  });

  it('returns "bodyweight" for bodyweight exercises', () => {
    expect(getSchemaKey('Dip')).toBe('bodyweight');
  });

  it('returns "weighted" for weighted exercise with LOAD_FACTOR', () => {
    expect(getSchemaKey('Chin Up')).toBe('weighted');
  });

  it('returns "standard" for barbell exercise', () => {
    expect(getSchemaKey('Back Squat')).toBe('standard');
  });
});

describe('computeTotalLoad', () => {
  it('computes bodyweight load for known exercise', () => {
    const result = computeTotalLoad({ 'log-bodyweight': '80', 'log-ext-load': '10' }, 'Pull Up', 'log');
    expect(result).toBe(String(Math.round(80 * 1.0 + 10)));
  });

  it('uses state bodyweight as fallback', () => {
    const result = computeTotalLoad({ 'log-ext-load': '5' }, 'Pull Up', 'log');
    expect(result).toBe(String(Math.round(75 * 1.0 + 5)));
  });

  it('returns em-dash for exercises without load factor', () => {
    const result = computeTotalLoad({ 'log-weight': '100' }, 'Back Squat', 'log');
    expect(result).toBe('\u2014');
  });

  it('handles missing fields', () => {
    const result = computeTotalLoad({}, 'Pull Up', 'log');
    expect(result).toBe(String(Math.round(75 * 1.0 + 0)));
  });
});

describe('requireAuth', () => {
  beforeEach(() => {
    auth.currentUser = { uid: 'test-user' };
    vi.clearAllMocks();
  });

  it('returns currentUser when signed in', () => {
    const user = requireAuth();
    expect(user).toEqual({ uid: 'test-user' });
  });

  it('shows feedback and returns null when not signed in', () => {
    auth.currentUser = null;

    const result = requireAuth('feedback-target');

    expect(result).toBeNull();
    expect(showFeedback).toHaveBeenCalledWith('Please sign in to continue.', 'rose', 'feedback-target');
  });
});
