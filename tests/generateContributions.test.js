import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateContributionsBase,
  generateAmrapContributions,
  generateForTimeContributions,
  generateIntervalContributions
} from './functions.js';

describe('generateContributionsBase', () => {
  let deps, movements;

  beforeEach(() => {
    deps = {
      writeStructuredLogEntry: vi.fn().mockResolvedValue(undefined),
      getExerciseInfo: vi.fn((id) => {
        if (id === 'Row' || id === 'Run') return { category: 'cardio', type: 'cardio' };
        return { category: 'barbell', type: 'weighted' };
      })
    };

    movements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 }
    ];
  });

  it('should call writeStructuredLogEntry for each movement', async () => {
    const processMovement = vi.fn((m) => ({ totalReps: m.reps, sets: 1 }));

    await generateContributionsBase('wid1', movements, processMovement, deps);

    expect(deps.writeStructuredLogEntry).toHaveBeenCalledTimes(2);
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[0],
      sets: 1, totalReps: 5, extraFields: {}
    });
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[1],
      sets: 1, totalReps: 10, extraFields: {}
    });
  });

  it('should skip cardio exercises', async () => {
    const allMovements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 },
      { exerciseId: 'Row', reps: 10 },
      { exerciseId: 'Bench Press', reps: 8, weight: 60 }
    ];
    const processMovement = vi.fn((m) => ({ totalReps: m.reps, sets: 1 }));

    await generateContributionsBase('wid1', allMovements, processMovement, deps);

    // processMovement is NOT called for cardio (filtered by getExerciseInfo first)
    expect(processMovement).toHaveBeenCalledTimes(2);
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledTimes(2);
    expect(deps.writeStructuredLogEntry).not.toHaveBeenCalledWith(
      expect.objectContaining({ movement: allMovements[1] })
    );
  });

  it('should skip movements where totalReps <= 0', async () => {
    const processMovement = vi.fn((m) => {
      if (m.exerciseId === 'Bench Press') return { totalReps: 0, sets: 1 };
      return { totalReps: m.reps, sets: 1 };
    });

    await generateContributionsBase('wid1', movements, processMovement, deps);

    expect(deps.writeStructuredLogEntry).toHaveBeenCalledTimes(1);
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[0],
      sets: 1, totalReps: 5, extraFields: {}
    });
  });

  it('should skip movements where processMovement returns null', async () => {
    const processMovement = vi.fn((m) => {
      if (m.exerciseId === 'Bench Press') return null;
      return { totalReps: m.reps, sets: 1 };
    });

    await generateContributionsBase('wid1', movements, processMovement, deps);

    expect(deps.writeStructuredLogEntry).toHaveBeenCalledTimes(1);
  });

  it('should pass extraFields from processMovement', async () => {
    const processMovement = vi.fn((m, i) => ({
      totalReps: m.reps, sets: 1, extraFields: { index: i }
    }));

    await generateContributionsBase('wid1', movements, processMovement, deps);

    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[0],
      sets: 1, totalReps: 5, extraFields: { index: 0 }
    });
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[1],
      sets: 1, totalReps: 10, extraFields: { index: 1 }
    });
  });

  it('should handle empty movements array', async () => {
    const processMovement = vi.fn();

    await generateContributionsBase('wid1', [], processMovement, deps);

    expect(deps.writeStructuredLogEntry).not.toHaveBeenCalled();
  });

  it('should pass movement index to processMovement', async () => {
    const processMovement = vi.fn((m, i) => ({ totalReps: m.reps, sets: i + 1 }));

    await generateContributionsBase('wid1', movements, processMovement, deps);

    expect(processMovement).toHaveBeenCalledWith(movements[0], 0);
    expect(processMovement).toHaveBeenCalledWith(movements[1], 1);
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({ movement: movements[1], sets: 2 })
    );
  });
});

describe('generateAmrapContributions', () => {
  let deps, movements;

  beforeEach(() => {
    deps = {
      writeStructuredLogEntry: vi.fn().mockResolvedValue(undefined),
      getExerciseInfo: vi.fn(() => ({ category: 'barbell', type: 'weighted' }))
    };

    movements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 }
    ];
  });

  it('should calculate correct reps and add additionalReps', async () => {
    await generateAmrapContributions('wid1', movements, 3, 5, deps);

    expect(deps.writeStructuredLogEntry).toHaveBeenCalledTimes(2);
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[0],
      sets: 3, totalReps: 20, extraFields: { additionalReps: 5 }
    });
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[1],
      sets: 3, totalReps: 35, extraFields: { additionalReps: 5 }
    });
  });

  it('should handle zero additional reps', async () => {
    await generateAmrapContributions('wid1', movements, 5, 0, deps);

    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[0],
      sets: 5, totalReps: 25, extraFields: { additionalReps: 0 }
    });
  });

  it('should handle zero rounds (no entries written)', async () => {
    await generateAmrapContributions('wid1', movements, 0, 0, deps);

    // 0 rounds * 5 reps + 0 = 0 totalReps, which is filtered out
    expect(deps.writeStructuredLogEntry).not.toHaveBeenCalled();
  });

  it('should handle empty movements', async () => {
    await generateAmrapContributions('wid1', [], 3, 5, deps);

    expect(deps.writeStructuredLogEntry).not.toHaveBeenCalled();
  });
});

describe('generateForTimeContributions', () => {
  let deps;

  beforeEach(() => {
    deps = {
      writeStructuredLogEntry: vi.fn().mockResolvedValue(undefined),
      getExerciseInfo: vi.fn(() => ({ category: 'barbell', type: 'weighted' }))
    };
  });

  it('should calculate reps for full rounds completed', async () => {
    const movements = [
      { exerciseId: 'Back Squat', reps: 10, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 }
    ];

    await generateForTimeContributions('wid1', movements, 3, 0, deps);

    // 3 full rounds completed = 3 × 10 = 30 each movement
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledTimes(2);
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[0],
      sets: 3, totalReps: 30, extraFields: {}
    });
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[1],
      sets: 3, totalReps: 30, extraFields: {}
    });
  });

  it('should handle partial round with remaining reps', async () => {
    const movements = [
      { exerciseId: 'Back Squat', reps: 10, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 },
      { exerciseId: 'Deadlift', reps: 5, weight: 150 }
    ];

    // 3 rounds planned = 75 total reps. 15 remaining = 60 completed.
    // fullRounds = 2, partialRoundReps = 10
    // Squat gets all 10 partial reps, bench gets 0, deadlift gets 0
    await generateForTimeContributions('wid1', movements, 3, 15, deps);

    expect(deps.writeStructuredLogEntry).toHaveBeenCalledTimes(3);

    // Squat: 2 full rounds + 10 partial = 30 reps, sets = 3 (2+1 for full partial)
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[0],
      sets: 3, totalReps: 30, extraFields: {}
    });

    // Bench: 2 full rounds = 20 reps, sets = 2
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[1],
      sets: 2, totalReps: 20, extraFields: {}
    });

    // Deadlift: 2 full rounds = 10 reps, sets = 2
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[2],
      sets: 2, totalReps: 10, extraFields: {}
    });
  });

  it('should handle zero remaining reps', async () => {
    const movements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 }
    ];

    await generateForTimeContributions('wid1', movements, 1, 0, deps);

    expect(deps.writeStructuredLogEntry).toHaveBeenCalledTimes(1);
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[0],
      sets: 1, totalReps: 5, extraFields: {}
    });
  });

  it('should handle empty movements', async () => {
    await generateForTimeContributions('wid1', [], 3, 0, deps);

    expect(deps.writeStructuredLogEntry).not.toHaveBeenCalled();
  });
});

describe('generateIntervalContributions', () => {
  let deps;

  beforeEach(() => {
    deps = {
      writeStructuredLogEntry: vi.fn().mockResolvedValue(undefined),
      getExerciseInfo: vi.fn(() => ({ category: 'barbell', type: 'weighted' }))
    };
  });

  it('should calculate reps for full rounds completed', async () => {
    const movements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 }
    ];

    await generateIntervalContributions('wid1', movements, 4, 0, deps);

    expect(deps.writeStructuredLogEntry).toHaveBeenCalledTimes(2);
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[0],
      sets: 4, totalReps: 20, extraFields: {}
    });
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[1],
      sets: 4, totalReps: 40, extraFields: {}
    });
  });

  it('should handle partial reps', async () => {
    const movements = [
      { exerciseId: 'Back Squat', reps: 10, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 }
    ];

    // 3 rounds completed + 15 partial reps
    // squat gets 10 (full), bench gets 5 (partial)
    await generateIntervalContributions('wid1', movements, 3, 15, deps);

    expect(deps.writeStructuredLogEntry).toHaveBeenCalledTimes(2);
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[0],
      sets: 4, totalReps: 40, extraFields: {}
    });
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[1],
      sets: 3, totalReps: 35, extraFields: { partialReps: 5 }
    });
  });

  it('should handle zero partial reps', async () => {
    const movements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 }
    ];

    await generateIntervalContributions('wid1', movements, 2, 0, deps);

    expect(deps.writeStructuredLogEntry).toHaveBeenCalledTimes(1);
    expect(deps.writeStructuredLogEntry).toHaveBeenCalledWith({
      workoutId: 'wid1', movement: movements[0],
      sets: 2, totalReps: 10, extraFields: {}
    });
  });

  it('should handle empty movements', async () => {
    await generateIntervalContributions('wid1', [], 3, 0, deps);

    expect(deps.writeStructuredLogEntry).not.toHaveBeenCalled();
  });
});
