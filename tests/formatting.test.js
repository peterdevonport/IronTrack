import { describe, it, expect, vi } from 'vitest';

vi.mock('../state.js', () => ({
  state: { cache: { activeRecords: { 'Back Squat': 150 } } }
}));

vi.mock('../math.js', () => ({
  computeDisplayWeight: vi.fn((m, oneRM) => {
    if (m.weightMode === 'pct' && m.pct) return Math.round(oneRM * m.pct / 100);
    if (m.weightMode === 'rpe' && m.rpe) return Math.round(oneRM * (m.rpe / 10));
    return m.weight || 0;
  })
}));

import {
  formatMovementLoad,
  formatCardDate,
  formatWorkoutType,
  formatDotsScore,
  formatMovementWeight,
  formatMovementDisplay
} from '../formatting.js';

describe('formatMovementLoad', () => {
  it('formats RPE mode', () => {
    expect(formatMovementLoad({ weightMode: 'rpe', rpe: 8 })).toBe(' @ RPE 8');
  });

  it('formats pct mode', () => {
    expect(formatMovementLoad({ weightMode: 'pct', pct: 75 })).toBe(' @ 75%');
  });

  it('formats weight mode', () => {
    expect(formatMovementLoad({ weight: 100 })).toBe(' @ 100kg');
  });

  it('returns empty string when no weight', () => {
    expect(formatMovementLoad({})).toBe('');
  });
});

describe('formatCardDate', () => {
  it('formats a timestamp', () => {
    const ts = new Date(2024, 0, 15, 14, 30).getTime();
    const result = formatCardDate(ts);
    expect(result).toContain('15 Jan');
    expect(result).toContain('14:30');
  });

  it('returns empty string for null', () => {
    expect(formatCardDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatCardDate(undefined)).toBe('');
  });
});

describe('formatWorkoutType', () => {
  it('converts FOR_TIME to "For Time"', () => {
    expect(formatWorkoutType('FOR_TIME')).toBe('For Time');
  });

  it('passes through other types', () => {
    expect(formatWorkoutType('AMRAP')).toBe('AMRAP');
    expect(formatWorkoutType('EMOM')).toBe('EMOM');
    expect(formatWorkoutType('INTERVAL')).toBe('INTERVAL');
  });
});

describe('formatDotsScore', () => {
  it('returns number for valid value', () => {
    expect(formatDotsScore(350.5)).toBe(350.5);
  });

  it('returns 0 for NaN', () => {
    expect(formatDotsScore(NaN)).toBe(0);
  });

  it('returns 0 for Infinity', () => {
    expect(formatDotsScore(Infinity)).toBe(0);
  });

  it('coerces string to number', () => {
    expect(formatDotsScore('350')).toBe(350);
  });
});

describe('formatMovementWeight', () => {
  it('formats weight suffix for standard exercise', () => {
    const result = formatMovementWeight({ exerciseId: 'Back Squat', weight: 100 });
    expect(result).toContain('100kg');
  });

  it('returns empty when no weight info', () => {
    const result = formatMovementWeight({ exerciseId: 'Back Squat' });
    expect(result).toBe('');
  });

  it('formats pct mode with oneRM from cache', () => {
    const result = formatMovementWeight({ exerciseId: 'Back Squat', weightMode: 'pct', pct: 75, weight: 100 });
    expect(result).toContain('75%');
    expect(result).toContain('113kg');
  });
});

describe('formatMovementDisplay', () => {
  it('formats full movement display', () => {
    const result = formatMovementDisplay({ exerciseId: 'Back Squat', reps: 5, weight: 100 }, 150);
    expect(result).toContain('5x');
    expect(result).toContain('Back Squat');
    expect(result).toContain('100kg');
  });

  it('formats rpe mode', () => {
    const result = formatMovementDisplay({ exerciseId: 'Bench Press', reps: 3, weightMode: 'rpe', rpe: 8, weight: 80 }, 100);
    expect(result).toContain('3x');
    expect(result).toContain('RPE 8');
  });
});
