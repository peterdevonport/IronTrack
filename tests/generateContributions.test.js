import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockAddDoc = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'test-log-id' }));

vi.mock('../firebase.js', () => ({
  auth: { currentUser: { uid: 'test-user' } },
  db: {},
  addDoc: mockAddDoc,
  collection: vi.fn(() => ({})),
  Timestamp: { now: vi.fn(() => ({ toMillis: () => Date.now() })) },
  doc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn()
}));

vi.mock('../state.js', () => ({
  state: {
    user: { userBiometrics: { bodyweight: 75, gender: 'male' } },
    cache: { activeRecords: {} },
    data: { lastWorkouts: [] }
  },
  PERCENT_DIVISOR: 100,
  EPLEY_CONSTANT: 30,
  SECONDS_PER_MINUTE: 60,
  HAPTIC: { tap: 15, confirm: 30 },
  FIRESTORE_STRUCTURED_LIMIT: 500,
  DEBOUNCE_DELAY_SYNC_ACTIVITY: 3000
}));

vi.mock('../math.js', () => ({
  estimate1RM: vi.fn((load, reps) => reps === 1 ? load : load * (1 + reps / 30)),
  estimateWeightForReps: vi.fn((oneRM, reps) => oneRM / (1 + reps / 30)),
  getEffectiveLoad: vi.fn(w => parseFloat(w.weight) || 0),
  computeEffectiveLoad: vi.fn((ex, w, ext, bw) => parseFloat(w) || 0),
  computeDisplayWeight: vi.fn((m, oneRM) => m.weight),
  rpeToRir: vi.fn(rpe => 10 - rpe)
}));

vi.mock('../dom.js', () => ({
  debounce: vi.fn(() => vi.fn()),
  escapeHtml: vi.fn(),
  haptic: vi.fn()
}));

vi.mock('../exercise-data.js', () => ({
  getExerciseInfo: vi.fn((id) => {
    if (['Row', 'Run', 'SkiErg', 'BikeErg'].includes(id)) return { category: 'cardio', type: 'cardio' };
    return { category: 'barbell', type: 'weighted' };
  }),
  LOAD_FACTORS: { 'Pull Up': 1.0, 'Chin Up': 1.0, 'Dip': 0.7 },
  EXERCISE_CATALOG: [],
  resolveExerciseVariant: vi.fn()
}));

vi.mock('../ui.js', () => ({
  showFeedback: vi.fn(),
  clearChildren: vi.fn(),
  PERMISSION_ERROR_MAP: {}
}));

vi.mock('../messages.js', () => ({
  MSG: {}
}));

import {
  generateContributionsBase,
  generateAmrapContributions,
  generateForTimeContributions,
  generateIntervalContributions
} from '../workouts.js';

describe('generateContributionsBase', () => {
  let movements;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call addDoc for each movement', async () => {
    const processMovement = vi.fn((m) => ({ totalReps: m.reps, sets: 1 }));
    movements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 }
    ];

    await generateContributionsBase('wid1', movements, processMovement);

    expect(mockAddDoc).toHaveBeenCalledTimes(2);
    const [, logEntry0] = mockAddDoc.mock.calls[0];
    expect(logEntry0.exercise).toBe('Back Squat');
    expect(logEntry0.totalWorkReps).toBe(5);
    expect(logEntry0.reps).toBe(5);
    const [, logEntry1] = mockAddDoc.mock.calls[1];
    expect(logEntry1.exercise).toBe('Bench Press');
    expect(logEntry1.totalWorkReps).toBe(10);
    expect(logEntry1.reps).toBe(10);
  });

  it('should skip cardio exercises', async () => {
    const allMovements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 },
      { exerciseId: 'Row', reps: 10 },
      { exerciseId: 'Bench Press', reps: 8, weight: 60 }
    ];
    const processMovement = vi.fn((m) => ({ totalReps: m.reps, sets: 1 }));

    await generateContributionsBase('wid1', allMovements, processMovement);

    expect(processMovement).toHaveBeenCalledTimes(2);
    expect(mockAddDoc).toHaveBeenCalledTimes(2);
  });

  it('should skip movements where totalReps <= 0', async () => {
    movements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 }
    ];
    const processMovement = vi.fn((m) => {
      if (m.exerciseId === 'Bench Press') return { totalReps: 0, sets: 1 };
      return { totalReps: m.reps, sets: 1 };
    });

    await generateContributionsBase('wid1', movements, processMovement);

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });

  it('should skip movements where processMovement returns null', async () => {
    movements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 }
    ];
    const processMovement = vi.fn((m) => {
      if (m.exerciseId === 'Bench Press') return null;
      return { totalReps: m.reps, sets: 1 };
    });

    await generateContributionsBase('wid1', movements, processMovement);

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });

  it('should pass extraFields from processMovement', async () => {
    movements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 }
    ];
    const processMovement = vi.fn((m, i) => ({
      totalReps: m.reps, sets: 1, extraFields: { index: i }
    }));

    await generateContributionsBase('wid1', movements, processMovement);

    expect(mockAddDoc).toHaveBeenCalledTimes(2);
    const [, logEntry0] = mockAddDoc.mock.calls[0];
    expect(logEntry0.index).toBe(0);
    const [, logEntry1] = mockAddDoc.mock.calls[1];
    expect(logEntry1.index).toBe(1);
  });

  it('should handle empty movements array', async () => {
    const processMovement = vi.fn();

    await generateContributionsBase('wid1', [], processMovement);

    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should pass movement index to processMovement', async () => {
    movements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 }
    ];
    const processMovement = vi.fn((m, i) => ({ totalReps: m.reps, sets: i + 1 }));

    await generateContributionsBase('wid1', movements, processMovement);

    expect(processMovement).toHaveBeenCalledWith(movements[0], 0);
    expect(processMovement).toHaveBeenCalledWith(movements[1], 1);
    const [, logEntry] = mockAddDoc.mock.calls[1];
    expect(logEntry.sets).toBe(2);
  });
});

describe('generateAmrapContributions', () => {
  let movements;

  beforeEach(() => {
    vi.clearAllMocks();
    movements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 }
    ];
  });

  it('should calculate correct reps and add additionalReps', async () => {
    await generateAmrapContributions('wid1', movements, 3, 5);

    expect(mockAddDoc).toHaveBeenCalledTimes(2);
    const [, logEntry0] = mockAddDoc.mock.calls[0];
    expect(logEntry0.sets).toBe(3);
    expect(logEntry0.reps).toBe(5);
    expect(logEntry0.totalWorkReps).toBe(20);
    expect(logEntry0.additionalReps).toBe(5);
    const [, logEntry1] = mockAddDoc.mock.calls[1];
    expect(logEntry1.reps).toBe(10);
    expect(logEntry1.totalWorkReps).toBe(35);
  });

  it('should handle zero additional reps', async () => {
    await generateAmrapContributions('wid1', movements, 5, 0);

    expect(mockAddDoc).toHaveBeenCalledTimes(2);
    const [, logEntry] = mockAddDoc.mock.calls[0];
    expect(logEntry.reps).toBe(5);
    expect(logEntry.totalWorkReps).toBe(25);
    expect(logEntry.additionalReps).toBe(0);
  });

  it('should handle zero rounds (no entries written)', async () => {
    await generateAmrapContributions('wid1', movements, 0, 0);

    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should handle empty movements', async () => {
    await generateAmrapContributions('wid1', [], 3, 5);

    expect(mockAddDoc).not.toHaveBeenCalled();
  });
});

describe('generateForTimeContributions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate reps for full rounds completed', async () => {
    const movements = [
      { exerciseId: 'Back Squat', reps: 10, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 }
    ];

    await generateForTimeContributions('wid1', movements, 3, 0);

    expect(mockAddDoc).toHaveBeenCalledTimes(2);
    const [, logEntry0] = mockAddDoc.mock.calls[0];
    expect(logEntry0.sets).toBe(3);
    expect(logEntry0.reps).toBe(10);
    expect(logEntry0.totalWorkReps).toBe(30);
    const [, logEntry1] = mockAddDoc.mock.calls[1];
    expect(logEntry1.reps).toBe(10);
    expect(logEntry1.totalWorkReps).toBe(30);
  });

  it('should handle partial round with remaining reps', async () => {
    const movements = [
      { exerciseId: 'Back Squat', reps: 10, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 },
      { exerciseId: 'Deadlift', reps: 5, weight: 150 }
    ];

    await generateForTimeContributions('wid1', movements, 3, 15);

    expect(mockAddDoc).toHaveBeenCalledTimes(3);

    const [, squatEntry] = mockAddDoc.mock.calls[0];
    expect(squatEntry.sets).toBe(3);
    expect(squatEntry.reps).toBe(10);
    expect(squatEntry.totalWorkReps).toBe(30);

    const [, benchEntry] = mockAddDoc.mock.calls[1];
    expect(benchEntry.sets).toBe(2);
    expect(benchEntry.reps).toBe(10);
    expect(benchEntry.totalWorkReps).toBe(20);

    const [, deadliftEntry] = mockAddDoc.mock.calls[2];
    expect(deadliftEntry.reps).toBe(5);
    expect(deadliftEntry.totalWorkReps).toBe(10);
  });

  it('should handle zero remaining reps', async () => {
    const movements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 }
    ];

    await generateForTimeContributions('wid1', movements, 1, 0);

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [, logEntry] = mockAddDoc.mock.calls[0];
    expect(logEntry.sets).toBe(1);
    expect(logEntry.reps).toBe(5);
    expect(logEntry.totalWorkReps).toBe(5);
  });

  it('should handle empty movements', async () => {
    await generateForTimeContributions('wid1', [], 3, 0);

    expect(mockAddDoc).not.toHaveBeenCalled();
  });
});

describe('generateIntervalContributions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate reps for full rounds completed', async () => {
    const movements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 }
    ];

    await generateIntervalContributions('wid1', movements, 4, 0);

    expect(mockAddDoc).toHaveBeenCalledTimes(2);
    const [, logEntry0] = mockAddDoc.mock.calls[0];
    expect(logEntry0.sets).toBe(4);
    expect(logEntry0.reps).toBe(5);
    expect(logEntry0.totalWorkReps).toBe(20);
    const [, logEntry1] = mockAddDoc.mock.calls[1];
    expect(logEntry1.reps).toBe(10);
    expect(logEntry1.totalWorkReps).toBe(40);
  });

  it('should handle partial reps', async () => {
    const movements = [
      { exerciseId: 'Back Squat', reps: 10, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 }
    ];

    await generateIntervalContributions('wid1', movements, 3, 15);

    expect(mockAddDoc).toHaveBeenCalledTimes(2);
    const [, squatEntry] = mockAddDoc.mock.calls[0];
    expect(squatEntry.sets).toBe(4);
    expect(squatEntry.reps).toBe(10);
    expect(squatEntry.totalWorkReps).toBe(40);

    const [, benchEntry] = mockAddDoc.mock.calls[1];
    expect(benchEntry.sets).toBe(3);
    expect(benchEntry.reps).toBe(10);
    expect(benchEntry.totalWorkReps).toBe(35);
  });

  it('should handle zero partial reps', async () => {
    const movements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 }
    ];

    await generateIntervalContributions('wid1', movements, 2, 0);

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [, logEntry] = mockAddDoc.mock.calls[0];
    expect(logEntry.sets).toBe(2);
    expect(logEntry.reps).toBe(5);
    expect(logEntry.totalWorkReps).toBe(10);
  });

  it('should handle empty movements', async () => {
    await generateIntervalContributions('wid1', [], 3, 0);

    expect(mockAddDoc).not.toHaveBeenCalled();
  });
});
