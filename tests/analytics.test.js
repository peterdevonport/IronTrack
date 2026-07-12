import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../formatting.js', () => ({
  formatMovementWeight: vi.fn(() => ' @ +20kg'),
  formatWorkoutType: vi.fn(t => t === 'FOR_TIME' ? 'For Time' : t)
}));

import {
  computeDotsScore,
  computeSinclairScore,
  getRankingTier,
  formatScore_ROUNDS_AND_REPS,
  formatScore_COMPLETED_MINUTES,
  formatScore_TIME_SECONDS,
  buildWorkoutSummaryLine,
  getRepsPerRound,
  buildWorkoutDescription,
  describeAmrap,
  describeEmom,
  describeForTime,
  describeInterval
} from '../analytics.js';

describe('computeDotsScore', () => {
  it('returns 0 when total is 0', () => {
    expect(computeDotsScore(0, 0, 0, 80, 'male')).toEqual({ dots: 0, plTotal: 0 });
  });

  it('returns 0 when bw is 0', () => {
    expect(computeDotsScore(100, 80, 150, 0, 'male')).toEqual({ dots: 0, plTotal: 0 });
  });

  it('computes DOTS for male', () => {
    const result = computeDotsScore(200, 150, 250, 80, 'male');
    expect(result.plTotal).toBe(600);
    expect(result.dots).toBeGreaterThan(0);
    expect(result.dots).toBeLessThan(1000);
  });

  it('computes DOTS for female', () => {
    const result = computeDotsScore(150, 100, 200, 60, 'female');
    expect(result.plTotal).toBe(450);
    expect(result.dots).toBeGreaterThan(0);
  });
});

describe('computeSinclairScore', () => {
  it('returns 0 when total is 0', () => {
    expect(computeSinclairScore(0, 0, 80, 'male')).toEqual({ sinclair: 0, olyTotal: 0 });
  });

  it('returns 0 when bw is 0', () => {
    expect(computeSinclairScore(100, 80, 0, 'male')).toEqual({ sinclair: 0, olyTotal: 0 });
  });

  it('returns olyTotal when bw >= threshold', () => {
    const result = computeSinclairScore(120, 100, 200, 'male');
    expect(result.olyTotal).toBe(220);
    expect(result.sinclair).toBe(220);
  });

  it('applies coefficient when bw < threshold', () => {
    const result = computeSinclairScore(120, 100, 60, 'male');
    expect(result.olyTotal).toBe(220);
    expect(result.sinclair).toBeGreaterThan(220);
  });

  it('handles female thresholds', () => {
    const result = computeSinclairScore(100, 80, 50, 'female');
    expect(result.olyTotal).toBe(180);
    expect(result.sinclair).toBeGreaterThan(180);
  });
});

describe('getRankingTier', () => {
  it('returns "-" for score <= 0', () => {
    expect(getRankingTier(0, 'dots', 'male')).toBe('-');
    expect(getRankingTier(-1, 'dots', 'male')).toBe('-');
  });

  describe('dots system', () => {
    it('returns Beginner for low score', () => {
      expect(getRankingTier(200, 'dots', 'male')).toBe('Beginner');
    });

    it('returns Intermediate', () => {
      expect(getRankingTier(350, 'dots', 'male')).toBe('Intermediate');
    });

    it('returns Advanced', () => {
      expect(getRankingTier(450, 'dots', 'male')).toBe('Advanced');
    });

    it('returns Elite', () => {
      expect(getRankingTier(600, 'dots', 'male')).toBe('Elite');
    });

    it('uses female cutoffs', () => {
      expect(getRankingTier(200, 'dots', 'female')).toBe('Beginner');
      expect(getRankingTier(300, 'dots', 'female')).toBe('Intermediate');
    });
  });

  describe('sinclair system', () => {
    it('returns Beginner', () => {
      expect(getRankingTier(200, 'sinclair', 'male')).toBe('Beginner');
    });

    it('returns Intermediate', () => {
      expect(getRankingTier(300, 'sinclair', 'male')).toBe('Intermediate');
    });

    it('returns Advanced', () => {
      expect(getRankingTier(350, 'sinclair', 'male')).toBe('Advanced');
    });

    it('returns Elite', () => {
      expect(getRankingTier(420, 'sinclair', 'male')).toBe('Elite');
    });

    it('returns World Class', () => {
      expect(getRankingTier(500, 'sinclair', 'male')).toBe('World Class');
    });
  });
});

describe('formatScore_ROUNDS_AND_REPS', () => {
  it('formats rounds and reps', () => {
    expect(formatScore_ROUNDS_AND_REPS(5, 10)).toBe('5+10');
  });

  it('returns "—" when both are 0', () => {
    expect(formatScore_ROUNDS_AND_REPS(0, 0)).toBe('\u2014');
  });

  it('returns "—" when both are empty', () => {
    expect(formatScore_ROUNDS_AND_REPS('', '')).toBe('\u2014');
  });

  it('returns just rounds when reps is 0', () => {
    expect(formatScore_ROUNDS_AND_REPS(3, 0)).toBe('3+0');
  });
});

describe('formatScore_COMPLETED_MINUTES', () => {
  it('formats completed/total', () => {
    expect(formatScore_COMPLETED_MINUTES(8, 10)).toBe('8/10');
  });

  it('returns "—" when both are 0', () => {
    expect(formatScore_COMPLETED_MINUTES(0, 0)).toBe('\u2014');
  });

  it('handles completed exceeding total', () => {
    expect(formatScore_COMPLETED_MINUTES(12, 10)).toBe('12/10');
  });
});

describe('formatScore_TIME_SECONDS', () => {
  it('formats seconds as m:ss', () => {
    expect(formatScore_TIME_SECONDS(330)).toBe('5:30');
  });

  it('zero-pads seconds', () => {
    expect(formatScore_TIME_SECONDS(120)).toBe('2:00');
  });

  it('handles 0', () => {
    expect(formatScore_TIME_SECONDS(0)).toBe('0:00');
  });

  it('returns "—" for null', () => {
    expect(formatScore_TIME_SECONDS(null)).toBe('\u2014');
  });

  it('returns "—" for undefined', () => {
    expect(formatScore_TIME_SECONDS(undefined)).toBe('\u2014');
  });
});

describe('buildWorkoutSummaryLine', () => {
  it('describes AMRAP', () => {
    const result = buildWorkoutSummaryLine('AMRAP', { durationSeconds: 600 });
    expect(result).toContain('As Many Rounds As Possible');
    expect(result).toContain('10:00');
  });

  it('describes EMOM', () => {
    const result = buildWorkoutSummaryLine('EMOM', { rounds: 8, intervalSeconds: 60 });
    expect(result).toContain('Every 1:00 x 8 rounds');
  });

  it('describes FOR_TIME', () => {
    const result = buildWorkoutSummaryLine('FOR_TIME', { durationMinutes: 15, rounds: 3 });
    expect(result).toContain('15 min cap');
    expect(result).toContain('3 rounds');
  });

  it('describes FOR_TIME without cap', () => {
    const result = buildWorkoutSummaryLine('FOR_TIME', { rounds: 3 });
    expect(result).toContain('3 rounds');
    expect(result).not.toContain('cap');
  });

  it('describes INTERVAL', () => {
    const result = buildWorkoutSummaryLine('INTERVAL', { workSeconds: 120, restSeconds: 60, rounds: 5 });
    expect(result).toContain('Work 2:00');
    expect(result).toContain('Rest 1:00');
    expect(result).toContain('5 rounds');
  });

  it('returns empty string for unknown type', () => {
    expect(buildWorkoutSummaryLine('UNKNOWN', {})).toBe('');
  });
});

describe('getRepsPerRound', () => {
  it('sums reps from movements for non-EMOM', () => {
    const structure = { movements: [{ reps: 10 }, { reps: 5 }] };
    expect(getRepsPerRound('AMRAP', structure)).toBe(15);
  });

  it('returns 0 for EMOM with no minutes', () => {
    expect(getRepsPerRound('EMOM', {})).toBe(0);
  });

  it('sums reps from first minute movements for EMOM', () => {
    const structure = { minutes: [{ movements: [{ reps: 5 }, { reps: 5 }] }] };
    expect(getRepsPerRound('EMOM', structure)).toBe(10);
  });

  it('handles string reps', () => {
    const structure = { movements: [{ reps: '8' }] };
    expect(getRepsPerRound('AMRAP', structure)).toBe(8);
  });

  it('handles empty movements', () => {
    expect(getRepsPerRound('AMRAP', { movements: [] })).toBe(0);
  });
});

describe('buildWorkoutDescription', () => {
  it('dispatches AMRAP', () => {
    const result = buildWorkoutDescription({ type: 'AMRAP', structure: { durationSeconds: 300, movements: [] } });
    expect(result).toContain('5:00');
  });

  it('dispatches EMOM', () => {
    const result = buildWorkoutDescription({ type: 'EMOM', structure: { intervalSeconds: 60, rounds: 5, minutes: [] } });
    expect(result).toContain('5 rounds');
  });

  it('dispatches FOR_TIME', () => {
    const result = buildWorkoutDescription({ type: 'FOR_TIME', structure: { rounds: 3, movements: [] } });
    expect(result).toContain('3 rounds');
  });

  it('dispatches INTERVAL', () => {
    const result = buildWorkoutDescription({ type: 'INTERVAL', structure: { workSeconds: 120, restSeconds: 60, rounds: 4, movements: [] } });
    expect(result).toContain('Work 2:00');
  });

  it('returns empty string for unknown type', () => {
    expect(buildWorkoutDescription({ type: 'UNKNOWN', structure: {} })).toBe('');
  });
});
