import { describe, it, expect, vi } from 'vitest';

vi.mock('../state.js', () => ({
  state: {
    user: { userBiometrics: { bodyweight: 75 } }
  },
  EPLEY_CONSTANT: 30
}));

vi.mock('../exercise-data.js', () => ({
  LOAD_FACTORS: {
    'Pull Up': 1.0,
    'Chin Up': 1.0,
    'Dip': 0.7
  }
}));

import {
  estimate1RM,
  estimateWeightForReps,
  computeEffectiveLoad,
  getEffectiveLoad,
  computeDisplayWeight,
  rpeToRir
} from '../math.js';

describe('estimate1RM', () => {
  it('returns load when reps is 1', () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it('applies Epley formula for reps > 1', () => {
    expect(estimate1RM(100, 5)).toBe(100 * (1 + 5 / 30));
  });

  it('handles zero load', () => {
    expect(estimate1RM(0, 5)).toBe(0);
  });

  it('handles high reps', () => {
    expect(estimate1RM(60, 20)).toBe(60 * (1 + 20 / 30));
  });

  it('handles fractional load', () => {
    expect(estimate1RM(67.5, 3)).toBe(67.5 * (1 + 3 / 30));
  });
});

describe('estimateWeightForReps', () => {
  it('returns 1RM for reps=0 (inverse of Epley)', () => {
    expect(estimateWeightForReps(100, 0)).toBe(100);
  });

  it('computes lower weight for more reps', () => {
    const oneRM = 120;
    const at5 = estimateWeightForReps(oneRM, 5);
    const at10 = estimateWeightForReps(oneRM, 10);
    expect(at5).toBeGreaterThan(at10);
  });

  it('round-trips with estimate1RM', () => {
    const load = 100;
    const reps = 5;
    const estimatedRm = estimate1RM(load, reps);
    expect(estimateWeightForReps(estimatedRm, reps)).toBeCloseTo(load, 10);
  });
});

describe('rpeToRir', () => {
  it('returns 0 for RPE 10', () => {
    expect(rpeToRir(10)).toBe(0);
  });

  it('returns 3 for RPE 7', () => {
    expect(rpeToRir(7)).toBe(3);
  });

  it('returns 10 for RPE 0', () => {
    expect(rpeToRir(0)).toBe(10);
  });
});

describe('computeEffectiveLoad', () => {
  it('computes bodyweight + external for known load factor', () => {
    expect(computeEffectiveLoad('Pull Up', null, 10, 80)).toBe(80 * 1.0 + 10);
  });

  it('uses weight for exercises without load factor', () => {
    expect(computeEffectiveLoad('Back Squat', 100, null, 80)).toBe(100);
  });

  it('falls back to 0 for missing weight and no load factor', () => {
    expect(computeEffectiveLoad('Back Squat', null, null, 80)).toBe(0);
  });

  it('handles fractional external load', () => {
    expect(computeEffectiveLoad('Pull Up', null, 5.5, 75)).toBe(75 * 1.0 + 5.5);
  });
});

describe('computeDisplayWeight', () => {
  it('uses pct mode when weightMode is pct', () => {
    const movement = { weightMode: 'pct', pct: 75, weight: 100 };
    expect(computeDisplayWeight(movement, 200)).toBe(150);
  });

  it('returns movement.weight when oneRM is 0 in pct mode', () => {
    const movement = { weightMode: 'pct', pct: 75, weight: 100 };
    expect(computeDisplayWeight(movement, 0)).toBe(100);
  });

  it('uses rpe mode when weightMode is rpe', () => {
    const movement = { weightMode: 'rpe', rpe: 8, reps: 5, weight: 80 };
    const rir = 2;
    const totalReps = 5 + rir;
    const expected = Math.round(80 / (1 + totalReps / 30));
    expect(computeDisplayWeight(movement, 80)).toBe(expected);
  });

  it('returns movement.weight when oneRM is 0 in rpe mode', () => {
    const movement = { weightMode: 'rpe', rpe: 8, reps: 5, weight: 80 };
    expect(computeDisplayWeight(movement, 0)).toBe(80);
  });

  it('returns movement.weight in absolute mode', () => {
    const movement = { weight: 100 };
    expect(computeDisplayWeight(movement, 200)).toBe(100);
  });
});

describe('getEffectiveLoad', () => {
  it('returns estimatedLoad if present', () => {
    expect(getEffectiveLoad({ estimatedLoad: 120 })).toBe(120);
  });

  it('computes from weight for standard exercises', () => {
    expect(getEffectiveLoad({ exercise: 'Back Squat', weight: '100' })).toBe(100);
  });

  it('computes from bodyweight for bodyweight exercises', () => {
    expect(getEffectiveLoad({ exercise: 'Pull Up', weight: null })).toBe(75 * 1.0);
  });

  it('handles null estimatedLoad', () => {
    expect(getEffectiveLoad({ exercise: 'Back Squat', weight: '80', estimatedLoad: null })).toBe(80);
  });
});
