import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../state.js', () => ({
  state: {
    volume: { period: 'daily', offset: 0, filter: 'All' },
    user: { userSignupTs: 0 },
    cache: {},
    data: { lastWorkouts: [] },
    pagination: {}
  },
  entriesPerPage: 5,
  DAYS_IN_WEEK: 7
}));

vi.mock('../math.js', () => ({
  getEffectiveLoad: vi.fn(w => parseFloat(w.weight) || 0),
  estimate1RM: vi.fn((l, r) => l * (1 + r / 30))
}));

vi.mock('../dom.js', () => ({
  escapeHtml: vi.fn(s => String(s))
}));

vi.mock('../exercise-data.js', () => ({
  EXERCISE_CATALOG: []
}));

vi.mock('../date.js', () => ({
  toLocalDateKey: vi.fn(d => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })
}));

vi.mock('../rendering.js', () => ({
  workoutToLogHtml: vi.fn(() => '<div>mock</div>'),
  renderVolumeBar: vi.fn(() => '<div>bar</div>')
}));

vi.mock('../ui.js', () => ({
  updatePagination: vi.fn(),
  updatePaginationControls: vi.fn(),
  updateTodayBtnState: vi.fn(),
  showFeedback: vi.fn(),
  renderMessage: vi.fn(),
  renderEmptyState: vi.fn(),
  setActiveTab: vi.fn(),
  setInactiveTab: vi.fn()
}));

import {
  getWeekStart,
  getWeekEnd,
  formatRangeLabel,
  computeDailyBuckets,
  computeWeeklyBuckets,
  computeMonthlyBuckets,
  computeYearlyBuckets,
  computeVolumeHistory
} from '../volume.js';

describe('getWeekStart', () => {
  it('returns Monday for a Wednesday', () => {
    const result = getWeekStart(new Date(2024, 0, 3));
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(1);
  });

  it('returns Monday for Sunday', () => {
    const result = getWeekStart(new Date(2024, 0, 7));
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(1);
  });

  it('returns same day for Monday', () => {
    const result = getWeekStart(new Date(2024, 0, 1));
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(1);
  });

  it('zeroes out time', () => {
    const result = getWeekStart(new Date(2024, 0, 3, 14, 30, 45));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });
});

describe('getWeekEnd', () => {
  it('returns Sunday of the same week', () => {
    const result = getWeekEnd(new Date(2024, 0, 3));
    expect(result.getDay()).toBe(0);
    expect(result.getDate()).toBe(7);
    expect(result.getHours()).toBe(23);
  });
});

describe('formatRangeLabel', () => {
  it('formats daily range', () => {
    const result = formatRangeLabel('daily', 0);
    expect(typeof result).toBe('string');
    expect(result).toContain('-');
  });

  it('formats weekly range', () => {
    const result = formatRangeLabel('weekly', 0);
    expect(typeof result).toBe('string');
  });

  it('formats monthly range', () => {
    const result = formatRangeLabel('monthly', 0);
    expect(result).toBe(String(new Date().getFullYear()));
  });

  it('formats yearly range', () => {
    const result = formatRangeLabel('yearly', 0);
    expect(result).toContain('-');
  });
});

describe('computeDailyBuckets', () => {
  const now = new Date(2024, 0, 10);

  it('returns 7 buckets for a week', () => {
    const result = computeDailyBuckets([], now, 'All');
    expect(result).toHaveLength(7);
  });

  it('assigns volume to correct days', () => {
    const thursday = new Date(2024, 0, 11).getTime();
    const workouts = [{ timestamp: thursday, totalVolume: '5000' }];
    const result = computeDailyBuckets(workouts, now, 'All');
    const thuBucket = result.find(b => {
      const d = new Date(b.periodStart);
      return d.getDay() === 4;
    });
    expect(thuBucket.volume).toBe(5000);
  });

  it('ignores workouts outside the week', () => {
    const lastMonth = new Date(2023, 11, 15).getTime();
    const workouts = [{ timestamp: lastMonth, totalVolume: '5000' }];
    const result = computeDailyBuckets(workouts, now, 'All');
    const total = result.reduce((s, b) => s + b.volume, 0);
    expect(total).toBe(0);
  });

  it('filters by exercise', () => {
    const thursday = new Date(2024, 0, 11).getTime();
    const workouts = [
      { timestamp: thursday, totalVolume: '5000', exercise: 'Back Squat' }
    ];
    const result = computeDailyBuckets(workouts, now, 'Other');
    const total = result.reduce((s, b) => s + b.volume, 0);
    expect(total).toBe(0);
  });
});

describe('computeWeeklyBuckets', () => {
  const now = new Date(2024, 0, 15);

  it('returns buckets for weeks in the month', () => {
    const result = computeWeeklyBuckets([], now, 'All');
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result.length).toBeLessThanOrEqual(6);
  });

  it('assigns volume to correct week', () => {
    const midMonth = new Date(2024, 0, 15).getTime();
    const workouts = [{ timestamp: midMonth, totalVolume: '3000' }];
    const result = computeWeeklyBuckets(workouts, now, 'All');
    const total = result.reduce((s, b) => s + b.volume, 0);
    expect(total).toBe(3000);
  });
});

describe('computeMonthlyBuckets', () => {
  const now = new Date(2024, 5, 15);

  it('returns 12 buckets for the year', () => {
    const result = computeMonthlyBuckets([], now, 'All');
    expect(result).toHaveLength(12);
  });

  it('assigns volume to correct month', () => {
    const june = new Date(2024, 5, 10).getTime();
    const workouts = [{ timestamp: june, totalVolume: '10000' }];
    const result = computeMonthlyBuckets(workouts, now, 'All');
    const total = result.reduce((s, b) => s + b.volume, 0);
    expect(total).toBe(10000);
  });
});

describe('computeYearlyBuckets', () => {
  const now = new Date(2024, 5, 15);

  it('returns 5 buckets', () => {
    const result = computeYearlyBuckets([], now, 'All');
    expect(result).toHaveLength(5);
  });

  it('assigns volume to correct year', () => {
    const ts = new Date(2024, 5, 10).getTime();
    const workouts = [{ timestamp: ts, totalVolume: '20000' }];
    const result = computeYearlyBuckets(workouts, now, 'All');
    const total = result.reduce((s, b) => s + b.volume, 0);
    expect(total).toBe(20000);
  });
});

describe('computeVolumeHistory', () => {
  it('dispatches to correct period function', () => {
    expect(computeVolumeHistory([], 'daily', 'All')).toBeDefined();
    expect(computeVolumeHistory([], 'weekly', 'All')).toBeDefined();
    expect(computeVolumeHistory([], 'monthly', 'All')).toBeDefined();
    expect(computeVolumeHistory([], 'yearly', 'All')).toBeDefined();
  });
});
