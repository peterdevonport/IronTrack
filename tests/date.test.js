import { describe, it, expect } from 'vitest';
import { toLocalDateKey, getMonday, countActiveDays, countConsecutiveDays } from '../date.js';

describe('toLocalDateKey', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toLocalDateKey(new Date(2024, 0, 15))).toBe('2024-01-15');
  });

  it('pads single-digit month and day', () => {
    expect(toLocalDateKey(new Date(2024, 2, 5))).toBe('2024-03-05');
  });

  it('handles December date', () => {
    expect(toLocalDateKey(new Date(2024, 11, 1))).toBe('2024-12-01');
  });
});

describe('getMonday', () => {
  it('returns same day for Monday', () => {
    const monday = new Date(2024, 0, 1);
    const result = getMonday(monday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(1);
  });

  it('returns previous Monday for Wednesday', () => {
    const wednesday = new Date(2024, 0, 3);
    const result = getMonday(wednesday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(1);
  });

  it('returns previous Monday for Sunday', () => {
    const sunday = new Date(2024, 0, 7);
    const result = getMonday(sunday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(1);
  });

  it('does not mutate the input date', () => {
    const input = new Date(2024, 0, 10);
    const original = new Date(input);
    getMonday(input);
    expect(input.getTime()).toBe(original.getTime());
  });

  it('zeroes out time components', () => {
    const date = new Date(2024, 0, 3, 15, 30, 45);
    const result = getMonday(date);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

describe('countActiveDays', () => {
  const today = new Date(2024, 0, 10);

  it('returns 0 for empty set', () => {
    expect(countActiveDays(7, today, new Set())).toBe(0);
  });

  it('returns 0 when daysBack is 0', () => {
    expect(countActiveDays(0, today, new Set(['2024-01-10']))).toBe(0);
  });

  it('counts active days within the window', () => {
    const active = new Set(['2024-01-10', '2024-01-08', '2024-01-05']);
    expect(countActiveDays(7, today, active)).toBe(3);
  });

  it('ignores days outside the window', () => {
    const active = new Set(['2024-01-10', '2024-01-01']);
    expect(countActiveDays(5, today, active)).toBe(1);
  });
});

describe('countConsecutiveDays', () => {
  const today = new Date(2024, 0, 10);

  it('returns 0 for empty set', () => {
    expect(countConsecutiveDays(today, new Set())).toBe(0);
  });

  it('returns 0 when today and yesterday are not active', () => {
    expect(countConsecutiveDays(today, new Set(['2024-01-07']))).toBe(0);
  });

  it('returns 1 when only today is active', () => {
    expect(countConsecutiveDays(today, new Set(['2024-01-10']))).toBe(1);
  });

  it('counts streak starting today going backwards', () => {
    const active = new Set(['2024-01-10', '2024-01-09', '2024-01-08']);
    expect(countConsecutiveDays(today, active)).toBe(3);
  });

  it('starts from yesterday if today is not active', () => {
    const active = new Set(['2024-01-09', '2024-01-08', '2024-01-07']);
    expect(countConsecutiveDays(today, active)).toBe(3);
  });

  it('breaks streak when a day is missing', () => {
    const active = new Set(['2024-01-10', '2024-01-09', '2024-01-07']);
    expect(countConsecutiveDays(today, active)).toBe(2);
  });

  it('does not count today if streak starts from yesterday and today is in set', () => {
    const active = new Set(['2024-01-10', '2024-01-09']);
    expect(countConsecutiveDays(today, active)).toBe(2);
  });
});
