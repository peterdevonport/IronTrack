import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../dom.js', () => ({
  escapeHtml: vi.fn(s => String(s).replace(/[&<>"']/g, ''))
}));

vi.mock('../formatting.js', () => ({
  formatMovementLoad: vi.fn(m => m.weight ? ` @ ${m.weight}kg` : ''),
  formatCardDate: vi.fn(ts => ts ? '15 Jan 14:30' : ''),
  formatWorkoutType: vi.fn(t => t === 'FOR_TIME' ? 'For Time' : t),
  formatMovementDisplay: vi.fn((m, r) => `${m.reps}x ${m.exerciseId}`),
  formatDotsScore: vi.fn(v => Number.isFinite(Number(v)) ? Number(v) : 0)
}));

vi.mock('../exercise-data.js', () => ({
  getDisplayName: vi.fn((p, f) => p?.displayName || p?.uid || f || 'Unknown'),
  EXERCISE_CATALOG: []
}));

vi.mock('../analytics.js', () => ({
  buildWorkoutSummaryLine: vi.fn((t, s) => {
    if (t === 'AMRAP') return 'As Many Rounds As Possible in 10:00 mins';
    if (t === 'EMOM') return 'Every 1:00 x 8 rounds';
    if (t === 'FOR_TIME') return '15 min cap \u00B7 3 rounds';
    if (t === 'INTERVAL') return 'Work 2:00 \u00B7 Rest 1:00 \u00B7 5 rounds';
    return '';
  })
}));

vi.mock('../math.js', () => ({
  estimate1RM: vi.fn((l, r) => Math.round(l * (1 + r / 30))),
  estimateWeightForReps: vi.fn((r, reps) => r / (1 + reps / 30)),
  getEffectiveLoad: vi.fn(w => parseFloat(w.weight) || 0),
  rpeToRir: vi.fn(r => 10 - r)
}));

vi.mock('../state.js', () => ({
  state: {
    cache: { activeRecords: {} },
    builder: { workoutMovements: [] },
    social: { currentFormula: 'dots' }
  },
  INPUT_CLASS: '',
  CALC_CLASS: '',
  onboardingList: null
}));

import {
  renderOnboarding1RMItem,
  renderCalcEntry,
  renderPlanMovementItem,
  renderMovementChips,
  renderEmomChips,
  renderVolumeBar,
  renderMinuteSlotInner,
  renderShareFriendItem,
  renderRegistryRow,
  renderLeaderboardEmptyRow,
  buildCalendarDayHtml,
  renderWorkoutCard,
  friendToHtml,
  renderCalendarWorkoutItem,
  renderStructuredWorkoutCard,
  renderPlanCard,
  buildLeaderboardRow,
  workoutToLogHtml
} from '../rendering.js';

describe('renderOnboarding1RMItem', () => {
  it('renders item with weight and reps', () => {
    const result = renderOnboarding1RMItem({ exercise: 'Back Squat', weight: '100', reps: 5 }, 0);
    expect(result).toContain('Back Squat');
    expect(result).toContain('100 kg');
    expect(result).toContain('5 reps');
    expect(result).toContain('data-index="0"');
  });

  it('renders item with single rep', () => {
    const result = renderOnboarding1RMItem({ exercise: 'Bench Press', weight: '80', reps: 1 }, 2);
    expect(result).toContain('80 kg');
    expect(result).not.toContain('reps');
  });
});

describe('renderCalcEntry', () => {
  it('renders calc entry with source and weight', () => {
    const result = renderCalcEntry('Back Squat 75%', 113, 'Back Squat', 0);
    expect(result).toContain('Back Squat 75%');
    expect(result).toContain('113 kg');
    expect(result).toContain('data-index="0"');
  });
});

describe('renderPlanMovementItem', () => {
  it('renders movement item with source', () => {
    const result = renderPlanMovementItem('5x Back Squat @ 100kg', 1);
    expect(result).toContain('5x Back Squat @ 100kg');
    expect(result).toContain('data-index="1"');
  });
});

describe('renderMovementChips', () => {
  it('returns empty string for null', () => {
    expect(renderMovementChips(null)).toBe('');
  });

  it('renders chips for movements', () => {
    const movements = [
      { exerciseId: 'Back Squat', reps: 5, weight: 100 },
      { exerciseId: 'Bench Press', reps: 10, weight: 60 }
    ];
    const result = renderMovementChips(movements);
    expect(result).toContain('Back Squat');
    expect(result).toContain('5');
    expect(result).toContain('100kg');
    expect(result).toContain('Bench Press');
    expect(result).toContain('60kg');
  });
});

describe('renderEmomChips', () => {
  it('returns empty string for null', () => {
    expect(renderEmomChips(null)).toBe('');
  });

  it('renders EMOM chips with label function', () => {
    const minutes = [
      { movements: [{ exerciseId: 'Back Squat', reps: 5, weight: 100 }] }
    ];
    const result = renderEmomChips(minutes, (m, idx) => `Round ${idx + 1}: `);
    expect(result).toContain('Round 1:');
    expect(result).toContain('Back Squat');
    expect(result).toContain('5');
  });

  it('skips empty minute slots', () => {
    const minutes = [
      { movements: [] }
    ];
    const result = renderEmomChips(minutes, () => '');
    expect(result).toBe('');
  });
});

describe('renderVolumeBar', () => {
  it('renders bar for positive volume', () => {
    const result = renderVolumeBar({ volume: 5000, label: 'Mon' }, 10000, 100);
    expect(result).toContain('vh-bar');
    expect(result).toContain('kg');
    expect(result).toContain('Mon');
    expect(result).toContain('height:');
  });

  it('renders zero bar for zero volume', () => {
    const result = renderVolumeBar({ volume: 0, label: 'Tue' }, 10000, 100);
    expect(result).toContain('is-zero');
    expect(result).not.toContain('5,000 kg');
  });
});

describe('renderMinuteSlotInner', () => {
  it('renders label and content', () => {
    const result = renderMinuteSlotInner('Min 1', '<span>Back Squat</span>');
    expect(result).toContain('Min 1');
    expect(result).toContain('Back Squat');
  });
});

describe('renderShareFriendItem', () => {
  it('renders friend checkbox', () => {
    const result = renderShareFriendItem('uid-123', 'John');
    expect(result).toContain('uid-123');
    expect(result).toContain('John');
    expect(result).toContain('share-friend-checkbox');
  });
});

describe('renderRegistryRow', () => {
  it('renders bodyweight row', () => {
    const result = renderRegistryRow('Pull Up', true, 15, 0, 0);
    expect(result).toContain('Pull Up');
    expect(result).toContain('15 reps');
  });

  it('renders weighted row', () => {
    const result = renderRegistryRow('Back Squat', false, 5, 150, 120);
    expect(result).toContain('Back Squat');
    expect(result).toContain('150 kg');
    expect(result).toContain('120 kg');
  });
});

describe('renderLeaderboardEmptyRow', () => {
  it('returns static HTML', () => {
    const result = renderLeaderboardEmptyRow();
    expect(result).toContain('No network entries visible');
  });
});

describe('buildCalendarDayHtml', () => {
  it('renders other-month day', () => {
    const result = buildCalendarDayHtml('2024-01-01', 1, false, false, false, false);
    expect(result).toContain('cal-day-other-month');
    expect(result).toContain('1');
  });

  it('renders active day', () => {
    const result = buildCalendarDayHtml('2024-01-15', 15, true, false, false, true);
    expect(result).toContain('cal-day-active');
    expect(result).toContain('data-date="2024-01-15"');
  });

  it('renders today', () => {
    const result = buildCalendarDayHtml('2024-01-15', 15, false, true, false, true);
    expect(result).toContain('cal-day-today');
  });

  it('renders selected day', () => {
    const result = buildCalendarDayHtml('2024-01-15', 15, false, false, true, true);
    expect(result).toContain('cal-day-selected');
  });

  it('renders all modifiers together', () => {
    const result = buildCalendarDayHtml('2024-01-15', 15, true, true, true, true);
    expect(result).toContain('cal-day-active');
    expect(result).toContain('cal-day-today');
    expect(result).toContain('cal-day-selected');
  });
});

describe('renderWorkoutCard', () => {
  it('renders card with favorite star filled', () => {
    const result = renderWorkoutCard('id-1', 'Test AMRAP', 'AMRAP', 'amrap', 'Desc', '<span>meta</span>', '<span>movements</span>', '<button>action</button>', true, 'toggle-fav');
    expect(result).toContain('id-1');
    expect(result).toContain('Test AMRAP');
    expect(result).toContain('★');
    expect(result).not.toContain('☆');
    expect(result).toContain('amrap');
    expect(result).toContain('toggle-fav');
  });

  it('renders card with empty star when not favorite', () => {
    const result = renderWorkoutCard('id-2', 'Test EMOM', 'EMOM', 'emom', 'Desc', '', '', '', false, 'toggle-fav');
    expect(result).toContain('☆');
    expect(result).not.toContain('★');
  });
});

describe('friendToHtml', () => {
  it('renders friend with display name', () => {
    const result = friendToHtml('uid-1', { displayName: 'Alice', uid: 'uid-1' });
    expect(result).toContain('Alice');
    expect(result).toContain('data-uid="uid-1"');
    expect(result).toContain('remove-friend');
  });

  it('renders friend with uid fallback', () => {
    const result = friendToHtml('uid-2', { uid: 'uid-2' });
    expect(result).toContain('uid-2');
  });

  it('renders unknown friend without data', () => {
    const result = friendToHtml('uid-3', null);
    expect(result).toContain('Unknown Friend');
    expect(result).toContain('uid-3');
  });
});

describe('renderCalendarWorkoutItem', () => {
  it('renders structured workouts with type', () => {
    const item = { type: 'AMRAP', structure: { durationSeconds: 300, movements: [] }, scoreDisplay: '5+10' };
    const result = renderCalendarWorkoutItem(item);
    expect(result).toContain('AMRAP');
    expect(result).toContain('5+10');
  });

  it('renders regular workout items', () => {
    const item = { exercise: 'Back Squat', reps: 5, weight: 100, sets: 2, timestamp: 1700000000000 };
    const result = renderCalendarWorkoutItem(item);
    expect(result).toContain('Back Squat');
    expect(result).toContain('2');
  });
});

describe('renderStructuredWorkoutCard', () => {
  it('renders AMRAP card', () => {
    const sw = { id: 's1', name: 'Test AMRAP', type: 'AMRAP', structure: {}, timestamp: 1700000000000 };
    const result = renderStructuredWorkoutCard(sw);
    expect(result).toContain('Test AMRAP');
    expect(result).toContain('AMRAP');
  });

  it('renders EMOM card', () => {
    const sw = { id: 's2', name: 'Test EMOM', type: 'EMOM', structure: { mode: 'by_round', minutes: [] } };
    const result = renderStructuredWorkoutCard(sw);
    expect(result).toContain('Test EMOM');
    expect(result).toContain('EMOM');
  });
});

describe('renderPlanCard', () => {
  it('renders plan card', () => {
    const plan = { id: 'p1', name: 'My Plan', type: 'AMRAP', structure: { movements: [] } };
    const result = renderPlanCard(plan);
    expect(result).toContain('My Plan');
    expect(result).toContain('AMRAP');
  });
});

describe('buildLeaderboardRow', () => {
  it('renders my row', () => {
    const result = buildLeaderboardRow({ uid: 'me', dotsScore: 400, sinclairScore: 350, displayName: 'Me' }, 1, true, false);
    expect(result).toContain('Me');
    expect(result).toContain('#1');
  });
});

describe('workoutToLogHtml', () => {
  it('renders PB badge for PB workout', () => {
    const workout = { exercise: 'Back Squat', reps: 5, weight: 100, sets: 3, _isPB: true, _isMax1RM: false, timestamp: 1700000000000 };
    const result = workoutToLogHtml(workout, false, false);
    expect(result).toContain('PB');
    expect(result).toContain('Back Squat');
  });

  it('renders 1RM badge for 1RM workout', () => {
    const workout = { exercise: 'Deadlift', reps: 1, weight: 200, sets: 1, _isPB: false, _isMax1RM: true, timestamp: 1700000000000 };
    const result = workoutToLogHtml(workout, false, false);
    expect(result).toContain('1RM');
  });
});
