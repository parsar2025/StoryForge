/**
 * Character Progress Property-Based Tests
 *
 * Verifies that deriving level + in-level XP from cumulative totalXp holds its
 * invariants across arbitrary XP values.
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { computeCharacterProgress, computeLevelFromCumulativeXp } from './characterProgress';
import { computeXpToNextLevel } from './levelFormula';

describe('Character Progress Properties', () => {
  // Feature: storyforge-phase-2-dashboard-typewriter, Property 3: Character Progress Invariants
  // Validates: Requirements 2.2, 2.3, 2.4
  it('derives level and in-level progress consistently from cumulative XP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5_000_000 }),
        (totalXp) => {
          const { level, xpIntoLevel, xpToNextLevel } = computeCharacterProgress(totalXp);

          // level is at least 1
          expect(level).toBeGreaterThanOrEqual(1);

          // xpIntoLevel is within [0, xpToNextLevel)
          expect(xpIntoLevel).toBeGreaterThanOrEqual(0);
          expect(xpIntoLevel).toBeLessThan(xpToNextLevel);

          // threshold matches the formula for the derived level
          expect(xpToNextLevel).toBe(computeXpToNextLevel(level));

          // reconstruct total: sum of thresholds for levels 1..level-1 + xpIntoLevel
          let consumed = 0;
          for (let l = 1; l < level; l++) {
            consumed += computeXpToNextLevel(l);
          }
          expect(consumed + xpIntoLevel).toBe(totalXp);

          // derived level agrees with the standalone helper
          expect(computeLevelFromCumulativeXp(totalXp)).toBe(level);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('produces expected values at level boundaries', () => {
    expect(computeCharacterProgress(0)).toEqual({ level: 1, xpIntoLevel: 0, xpToNextLevel: 100 });
    // 100 XP exactly crosses into level 2
    expect(computeCharacterProgress(100)).toEqual({
      level: 2,
      xpIntoLevel: 0,
      xpToNextLevel: computeXpToNextLevel(2)
    });
    // 99 XP stays in level 1
    expect(computeCharacterProgress(99)).toEqual({ level: 1, xpIntoLevel: 99, xpToNextLevel: 100 });
  });
});
