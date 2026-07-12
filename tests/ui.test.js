import { describe, it, expect } from 'vitest';
import { isPermissionDenied } from '../ui.js';

describe('isPermissionDenied', () => {
  it('returns true for permission-denied error', () => {
    expect(isPermissionDenied({ code: 'permission-denied' })).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isPermissionDenied({ code: 'not-found' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isPermissionDenied(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isPermissionDenied(undefined)).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(isPermissionDenied('error')).toBe(false);
  });
});
