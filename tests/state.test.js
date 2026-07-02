import { describe, it, expect, beforeEach } from 'vitest';
import { state } from './state.js';

describe('state.user', () => {
  it('should have correct initial values', () => {
    expect(state.user.currentUser).toBeNull();
    expect(state.user.userBiometrics).toEqual({ gender: 'male', bodyweight: 75 });
    expect(state.user.userSignupTs).toBe(0);
    expect(state.user.pendingOnboarding1RMs).toEqual([]);
    expect(state.user.userChallengeStreaks.monthly.currentStreak).toBe(0);
    expect(state.user.userChallengeStreaks.yearly.bestStreak).toBe(0);
  });

  it('should be mutable', () => {
    state.user.currentUser = { uid: 'test' };
    expect(state.user.currentUser.uid).toBe('test');
  });
});

describe('state.cache', () => {
  it('should have correct initial values', () => {
    expect(state.cache.activeRecords).toEqual({});
    expect(state.cache.cachedMaxLoadByExercise).toEqual({});
    expect(state.cache.cachedMax1RMByExercise).toEqual({});
    expect(state.cache.cachedMaxRepsByExercise).toEqual({});
  });

  it('should be mutable', () => {
    state.cache.activeRecords['Back Squat'] = 150;
    expect(state.cache.activeRecords['Back Squat']).toBe(150);
  });
});

describe('state.data', () => {
  it('should have correct initial values', () => {
    expect(state.data.lastWorkouts).toEqual([]);
    expect(state.data.lastStructuredWorkouts).toEqual([]);
    expect(state.data.lastWorkoutPlans).toEqual([]);
    expect(state.data.lastSharedPlans).toEqual([]);
    expect(state.data.paginatedWorkouts).toEqual([]);
    expect(state.data.calcEntriesByLift).toEqual({});
  });
});

describe('state.pagination', () => {
  it('should have correct initial values', () => {
    expect(state.pagination.workouts).toBe(1);
    expect(state.pagination.structured).toBe(1);
    expect(state.pagination.plans).toBe(1);
    expect(state.pagination.sharedPlans).toBe(1);
    expect(state.pagination.records).toBe(1);
    expect(state.pagination.friends).toBe(1);
  });

  it('should be mutable', () => {
    state.pagination.structured = 3;
    expect(state.pagination.structured).toBe(3);
  });
});

describe('state.calendar', () => {
  it('should have correct initial values', () => {
    expect(state.calendar.month).toBeInstanceOf(Date);
    expect(state.calendar.selectedDate).toBeNull();
    expect(state.calendar.compact).toBe(true);
    expect(state.calendar.weekOffset).toBe(0);
  });

  it('should be mutable', () => {
    state.calendar.compact = false;
    expect(state.calendar.compact).toBe(false);
  });
});

describe('state.volume', () => {
  it('should have correct initial values', () => {
    expect(state.volume.period).toBe('daily');
    expect(state.volume.offset).toBe(0);
    expect(state.volume.filter).toBe('All');
  });

  it('should be mutable', () => {
    state.volume.period = 'weekly';
    expect(state.volume.period).toBe('weekly');
  });
});

describe('state.builder', () => {
  it('should have correct initial values', () => {
    expect(state.builder.workoutMovements).toEqual([]);
    expect(state.builder.pendingPlannedWorkout).toBeNull();
    expect(state.builder.emomMode).toBe('sequence');
  });

  it('should be mutable', () => {
    state.builder.emomMode = 'by_round';
    expect(state.builder.emomMode).toBe('by_round');
  });
});

describe('state.social', () => {
  it('should have correct initial values', () => {
    expect(state.social.currentScope).toBe('global');
    expect(state.social.currentFormula).toBe('dots');
    expect(state.social.userFriendsList).toEqual([]);
    expect(state.social.friendDisplayCache).toEqual({});
    expect(state.social.leaderboardCache).toEqual([]);
    expect(state.social.leaderboardShowAll).toBe(false);
  });

  it('should be mutable', () => {
    state.social.currentScope = 'friends';
    expect(state.social.currentScope).toBe('friends');
  });
});

describe('state.share', () => {
  it('should have correct initial values', () => {
    expect(state.share.sharePlanId).toBeNull();
    expect(state.share.shareIsWorkout).toBe(false);
    expect(state.share.shareMode).toBe('friends');
  });

  it('should be mutable', () => {
    state.share.sharePlanId = 'plan-123';
    state.share.shareMode = 'qr';
    expect(state.share.sharePlanId).toBe('plan-123');
    expect(state.share.shareMode).toBe('qr');
  });
});

describe('state.ui', () => {
  it('should have correct initial values', () => {
    expect(state.ui.plansFilter).toBe('mine');
    expect(state.ui.currentTab).toBe('dashboard');
    expect(state.ui.urlParamsProcessed).toBe(false);
  });

  it('should be mutable', () => {
    state.ui.currentTab = 'training';
    expect(state.ui.currentTab).toBe('training');
  });
});
