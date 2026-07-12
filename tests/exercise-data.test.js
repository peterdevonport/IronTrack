import { describe, it, expect } from 'vitest';
import {
  EXERCISE_CATALOG,
  LOAD_FACTORS,
  getExerciseInfo,
  getDisplayName,
  resolveExerciseVariant
} from '../exercise-data.js';

describe('EXERCISE_CATALOG', () => {
  it('is an array', () => {
    expect(Array.isArray(EXERCISE_CATALOG)).toBe(true);
  });

  it('contains expected exercises', () => {
    const names = EXERCISE_CATALOG.map(ex => ex.name);
    expect(names).toContain('Back Squat');
    expect(names).toContain('Deadlift');
    expect(names).toContain('Pull Up');
    expect(names).toContain('Run');
  });

  it('has required fields on each entry', () => {
    EXERCISE_CATALOG.forEach(ex => {
      expect(ex).toHaveProperty('name');
      expect(ex).toHaveProperty('category');
      expect(ex).toHaveProperty('type');
      expect(ex).toHaveProperty('movement');
    });
  });
});

describe('LOAD_FACTORS', () => {
  it('is derived from EXERCISE_CATALOG', () => {
    const bwExercises = EXERCISE_CATALOG.filter(ex => ex.loadFactor);
    bwExercises.forEach(ex => {
      expect(LOAD_FACTORS[ex.name]).toBe(ex.loadFactor);
    });
  });

  it('does not include barbell exercises', () => {
    expect(LOAD_FACTORS['Back Squat']).toBeUndefined();
  });

  it('includes bodyweight exercises', () => {
    expect(LOAD_FACTORS['Pull Up']).toBe(1.0);
    expect(LOAD_FACTORS['Dip']).toBe(0.95);
  });
});

describe('getExerciseInfo', () => {
  it('returns the catalog entry for a known exercise', () => {
    const info = getExerciseInfo('Back Squat');
    expect(info).toEqual({
      name: 'Back Squat',
      category: 'barbell',
      type: 'weighted',
      movement: 'squat'
    });
  });

  it('returns default for unknown exercise', () => {
    const info = getExerciseInfo('NonExistent');
    expect(info).toEqual({ category: 'barbell', type: 'weighted' });
  });

  it('finds bodyweight exercises', () => {
    const info = getExerciseInfo('Pull Up');
    expect(info.type).toBe('bodyweight');
    expect(info.category).toBe('bodyweight');
  });
});

describe('getDisplayName', () => {
  it('returns displayName when present', () => {
    expect(getDisplayName({ displayName: 'John' }, 'uid123')).toBe('John');
  });

  it('falls back to profile uid', () => {
    expect(getDisplayName({ uid: 'uid123' }, 'fallback')).toBe('uid123');
  });

  it('falls back to fallbackUid', () => {
    expect(getDisplayName(null, 'fallback')).toBe('fallback');
  });

  it('returns Unknown when nothing available', () => {
    expect(getDisplayName(null, null)).toBe('Unknown');
  });

  it('returns Unknown for empty profile', () => {
    expect(getDisplayName({}, null)).toBe('Unknown');
  });
});

describe('resolveExerciseVariant', () => {
  it('returns weighted variant for Pull Up with external load', () => {
    expect(resolveExerciseVariant('Pull Up', 10)).toBe('Pull Up (Weighted)');
  });

  it('returns name for Pull Up without external load', () => {
    expect(resolveExerciseVariant('Pull Up', 0)).toBe('Pull Up');
  });

  it('returns name for unknown exercise', () => {
    expect(resolveExerciseVariant('Back Squat', 10)).toBe('Back Squat');
  });

  it('handles undefined external load', () => {
    expect(resolveExerciseVariant('Pull Up', undefined)).toBe('Pull Up');
  });
});
