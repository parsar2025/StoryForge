/**
 * XP Engine Property-Based Tests
 * 
 * Tests the deterministic XP calculation formula using fast-check to verify
 * correctness properties across many random inputs.
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { computeXP, XP_CONFIG, type XPEngineInput } from './xpEngine';

describe('XP Engine Properties', () => {
  // Feature: storyforge-phase-1-core-crud, Property 1: XP Engine Computation Correctness
  // Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
  it('computes XP with all bonuses correctly and enforces 150 cap', () => {
    fc.assert(
      fc.property(
        // Generate random difficulty (1-5)
        fc.integer({ min: 1, max: 5 }) as fc.Arbitrary<1 | 2 | 3 | 4 | 5>,
        // Generate 1-5 activity logs with varying reflection lengths
        fc.array(
          fc.record({
            durationMin: fc.integer({ min: 1, max: 480 }),
            reflection: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: null })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        // Generate streak days (0-365)
        fc.integer({ min: 0, max: 365 }),
        // Generate 1-11 novelty flags (one per potential tree)
        fc.array(fc.boolean(), { minLength: 1, maxLength: 11 }),
        (difficulty, logs, streak, noveltyFlags) => {
          const result = computeXP({
            difficulty,
            activityLogs: logs,
            currentStreakDays: streak,
            novelTreeFlags: noveltyFlags
          });
          
          // Property 1.1: Base XP matches difficulty lookup table
          const expectedBase = XP_CONFIG.BASE_BY_DIFFICULTY[difficulty];
          expect(result.base).toBe(expectedBase);
          
          // Property 1.2: Reflection bonus triggers on >40 chars in ANY log
          const hasLongReflection = logs.some(
            log => log.reflection && log.reflection.length > XP_CONFIG.REFLECTION_THRESHOLD_CHARS
          );
          if (hasLongReflection) {
            expect(result.reflectionBonus).toBe(XP_CONFIG.REFLECTION_BONUS);
          } else {
            expect(result.reflectionBonus).toBe(0);
          }
          
          // Property 1.3: Difficulty bonus triggers on >=4
          if (difficulty >= XP_CONFIG.HIGH_DIFFICULTY_THRESHOLD) {
            expect(result.difficultyBonus).toBe(XP_CONFIG.HIGH_DIFFICULTY_BONUS);
          } else {
            expect(result.difficultyBonus).toBe(0);
          }
          
          // Property 1.4: Streak bonus is tiered (7→+10, 30→+20, not both)
          if (streak >= XP_CONFIG.STREAK_TIER_2_DAYS) {
            expect(result.streakBonus).toBe(XP_CONFIG.STREAK_TIER_2_BONUS);
          } else if (streak >= XP_CONFIG.STREAK_TIER_1_DAYS) {
            expect(result.streakBonus).toBe(XP_CONFIG.STREAK_TIER_1_BONUS);
          } else {
            expect(result.streakBonus).toBe(0);
          }
          
          // Property 1.5: Novelty bonus triggers on ANY true flag
          const hasNovelTree = noveltyFlags.some(flag => flag);
          if (hasNovelTree) {
            expect(result.noveltyBonus).toBe(XP_CONFIG.NOVELTY_BONUS);
          } else {
            expect(result.noveltyBonus).toBe(0);
          }
          
          // Property 1.6: Total is sum of components (before cap)
          const uncappedTotal = 
            result.base +
            result.reflectionBonus +
            result.difficultyBonus +
            result.streakBonus +
            result.noveltyBonus;
          
          // Property 1.7: Total never exceeds cap
          expect(result.total).toBeLessThanOrEqual(XP_CONFIG.MAX_XP_CAP);
          
          // Property 1.8: Total is min(uncapped, cap)
          expect(result.total).toBe(Math.min(uncappedTotal, XP_CONFIG.MAX_XP_CAP));
          
          // Property 1.9: All components are non-negative
          expect(result.base).toBeGreaterThanOrEqual(0);
          expect(result.reflectionBonus).toBeGreaterThanOrEqual(0);
          expect(result.difficultyBonus).toBeGreaterThanOrEqual(0);
          expect(result.streakBonus).toBeGreaterThanOrEqual(0);
          expect(result.noveltyBonus).toBeGreaterThanOrEqual(0);
          expect(result.total).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('awards maximum bonuses when all conditions are met', () => {
    // Explicit test case: max difficulty, long reflection, long streak, novel tree
    const result = computeXP({
      difficulty: 5,
      activityLogs: [
        {
          durationMin: 120,
          reflection: 'This is a very long reflection that definitely exceeds the 40 character threshold'
        }
      ],
      currentStreakDays: 30,
      novelTreeFlags: [true, false, false]
    });
    
    expect(result.base).toBe(80); // difficulty 5
    expect(result.reflectionBonus).toBe(15);
    expect(result.difficultyBonus).toBe(20);
    expect(result.streakBonus).toBe(20); // 30-day streak
    expect(result.noveltyBonus).toBe(10);
    expect(result.total).toBe(145); // 80+15+20+20+10 = 145 (under cap)
  });

  it('caps XP at 150 even when bonuses would exceed it', () => {
    // Edge case: all max bonuses should still cap at 150
    const result = computeXP({
      difficulty: 5,
      activityLogs: [
        {
          durationMin: 480,
          reflection: 'A' .repeat(100) // Very long reflection
        }
      ],
      currentStreakDays: 365,
      novelTreeFlags: [true, true, true]
    });
    
    const uncapped = 80 + 15 + 20 + 20 + 10; // 145
    expect(result.total).toBe(uncapped); // Still under cap
    expect(result.total).toBeLessThanOrEqual(150);
  });

  it('awards no bonuses when conditions are not met', () => {
    // Minimal case: low difficulty, no reflection, no streak, no novel trees
    const result = computeXP({
      difficulty: 1,
      activityLogs: [
        {
          durationMin: 30,
          reflection: null
        }
      ],
      currentStreakDays: 0,
      novelTreeFlags: [false, false]
    });
    
    expect(result.base).toBe(10);
    expect(result.reflectionBonus).toBe(0);
    expect(result.difficultyBonus).toBe(0);
    expect(result.streakBonus).toBe(0);
    expect(result.noveltyBonus).toBe(0);
    expect(result.total).toBe(10);
  });

  it('triggers reflection bonus only when exceeding threshold', () => {
    // Exactly 40 chars should NOT trigger
    const exactly40 = computeXP({
      difficulty: 3,
      activityLogs: [{ durationMin: 60, reflection: 'A'.repeat(40) }],
      currentStreakDays: 0,
      novelTreeFlags: [false]
    });
    expect(exactly40.reflectionBonus).toBe(0);
    
    // 41 chars should trigger
    const exactly41 = computeXP({
      difficulty: 3,
      activityLogs: [{ durationMin: 60, reflection: 'A'.repeat(41) }],
      currentStreakDays: 0,
      novelTreeFlags: [false]
    });
    expect(exactly41.reflectionBonus).toBe(15);
  });

  it('uses higher streak tier when both thresholds are met', () => {
    // 30 days should give tier 2 bonus (20), not tier 1 (10)
    const result = computeXP({
      difficulty: 3,
      activityLogs: [{ durationMin: 60, reflection: null }],
      currentStreakDays: 30,
      novelTreeFlags: [false]
    });
    expect(result.streakBonus).toBe(20);
    expect(result.streakBonus).not.toBe(10); // Should not give both
  });
});
