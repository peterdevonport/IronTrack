import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockActiveDates = vi.hoisted(() => new Set());

vi.mock('../firebase.js', () => ({
  auth: { currentUser: { uid: 'test-user' } },
  db: {},
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn()
}));

vi.mock('../state.js', () => ({
  state: {
    user: {
      userBiometrics: { bodyweight: 75, gender: 'male', day0TrainingDays: { monthly: 0, yearly: 0, lifetime: 0 } },
      userChallengeStreaks: {
        monthly: { completedPeriods: [], currentStreak: 0, bestStreak: 0 },
        yearly: { completedPeriods: [], currentStreak: 0, bestStreak: 0 }
      }
    },
    data: { lastWorkouts: [], lastStructuredWorkouts: [] },
    cache: { activeRecords: {} },
    calendar: { month: new Date(), selectedDate: null, compact: true, weekOffset: 0 }
  },
  CONSISTENCY_CONFIG: { monthlyUniqueDays: 14, yearlyUniqueDays: 150, lifetimeUniqueDays: 3000 },
  activeDates: mockActiveDates,
  DAYS_IN_WEEK: 7,
  CONSISTENCY_WINDOW_DAYS: 28,
  PERCENT_DIVISOR: 100
}));

vi.mock('../date.js', () => ({
  toLocalDateKey: vi.fn(d => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }),
  getMonday: vi.fn(),
  countActiveDays: vi.fn(() => 0),
  countConsecutiveDays: vi.fn(() => 0)
}));

vi.mock('../rendering.js', () => ({
  buildCalendarDayHtml: vi.fn(() => '<div></div>'),
  renderCalendarWorkoutItem: vi.fn(() => '')
}));

vi.mock('../ui.js', () => ({
  renderEmptyState: vi.fn(),
  updateCalTodayBtnState: vi.fn(),
  setChallengeCard: vi.fn()
}));

import {
  getPreviousPeriodId,
  calculateStreakFromPeriods,
  calculateChallengeProgress
} from '../calendar.js';
import { state } from '../state.js';

describe('getPreviousPeriodId', () => {
  it('returns previous month', () => {
    expect(getPreviousPeriodId('2024-03', 'monthly')).toBe('2024-02');
  });

  it('handles year boundary', () => {
    expect(getPreviousPeriodId('2024-01', 'monthly')).toBe('2023-12');
  });

  it('returns previous year', () => {
    expect(getPreviousPeriodId('2024', 'yearly')).toBe('2023');
  });

  it('handles year 0 boundary', () => {
    expect(getPreviousPeriodId('1', 'yearly')).toBe('0');
  });
});

describe('calculateStreakFromPeriods', () => {
  it('returns 0 for empty array', () => {
    expect(calculateStreakFromPeriods([], 'monthly')).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(calculateStreakFromPeriods(null, 'monthly')).toBe(0);
  });

  it('returns 1 for single period', () => {
    expect(calculateStreakFromPeriods(['2024-03'], 'monthly')).toBe(1);
  });

  it('counts consecutive months', () => {
    expect(calculateStreakFromPeriods(['2024-01', '2024-02', '2024-03'], 'monthly')).toBe(3);
  });

  it('breaks streak on missing month', () => {
    expect(calculateStreakFromPeriods(['2024-01', '2024-03', '2024-04'], 'monthly')).toBe(2);
  });

  it('counts from most recent backward', () => {
    const p = ['2024-01', '2024-02', '2024-03', '2024-05', '2024-06', '2024-07'];
    expect(calculateStreakFromPeriods(p, 'monthly')).toBe(3);
  });

  it('handles yearly periods', () => {
    expect(calculateStreakFromPeriods(['2022', '2023', '2024'], 'yearly')).toBe(3);
  });

  it('handles unsorted input', () => {
    expect(calculateStreakFromPeriods(['2024-03', '2024-01', '2024-02'], 'monthly')).toBe(3);
  });
});

describe('calculateChallengeProgress', () => {
  beforeEach(() => {
    mockActiveDates.clear();
  });

  it('returns 0 for empty activeDates', () => {
    const result = calculateChallengeProgress();
    expect(result.monthly).toBe(0);
    expect(result.yearly).toBe(0);
    expect(result.lifetime).toBe(0);
  });

  it('counts active dates in current month', () => {
    const today = new Date();
    mockActiveDates.add(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`);
    mockActiveDates.add(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-15`);

    const result = calculateChallengeProgress();
    expect(result.monthly).toBe(2);
    expect(result.yearly).toBe(2);
  });

  it('counts only current month when dates span multiple months', () => {
    const today = new Date();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const prevMonth = String(today.getMonth()).padStart(2, '0');

    mockActiveDates.add(`${today.getFullYear()}-${currentMonth}-01`);
    mockActiveDates.add(`${today.getFullYear()}-${currentMonth}-15`);
    if (today.getMonth() > 0) {
      mockActiveDates.add(`${today.getFullYear()}-${prevMonth}-10`);
    }
    mockActiveDates.add(`${today.getFullYear() - 1}-12-25`);

    const result = calculateChallengeProgress();
    expect(result.monthly).toBe(2);
    expect(result.yearly).toBeGreaterThan(0);
    expect(result.lifetime).toBeGreaterThan(0);
  });

  it('includes day0TrainingDays.lifetime', () => {
    state.user.userBiometrics.day0TrainingDays = { monthly: 0, yearly: 0, lifetime: 5 };
    const today = new Date();
    mockActiveDates.add(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`);

    const result = calculateChallengeProgress();
    expect(result.lifetime).toBe(6);
  });
});
