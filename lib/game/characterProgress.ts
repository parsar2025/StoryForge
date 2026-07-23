/**
 * Character Progress
 *
 * Derives character level and in-level XP progress from cumulative totalXp,
 * using the same exponential thresholds as quest completion. Single source of
 * truth for "given lifetime XP, what level am I and how far into it."
 *
 * Per Phase 2 Requirements 2.2, 2.3, 2.4.
 */

import { computeXpToNextLevel } from '@/lib/game/levelFormula';

/**
 * Compute character level from cumulative total XP.
 *
 * Walks levels from 1, subtracting each level's threshold from the remaining
 * XP while the remaining XP still covers the next threshold. This matches the
 * exponential curve (100, 364, 830, ...) regardless of how XP was accrued.
 *
 * @param totalXp - Lifetime total XP earned (>= 0)
 * @returns Character level (minimum 1)
 */
export function computeLevelFromCumulativeXp(totalXp: number): number {
  let level = 1;
  let remaining = totalXp;
  let threshold = computeXpToNextLevel(level);

  while (remaining >= threshold) {
    remaining -= threshold;
    level++;
    threshold = computeXpToNextLevel(level);
  }

  return level;
}

export interface CharacterProgress {
  /** Current level (>= 1) */
  level: number;
  /** XP accumulated within the current level, in [0, xpToNextLevel) */
  xpIntoLevel: number;
  /** XP threshold to advance from the current level */
  xpToNextLevel: number;
}

/**
 * Derive level and in-level progress from cumulative total XP.
 *
 * @param totalXp - Lifetime total XP earned (>= 0)
 * @returns Level, XP into the current level, and the current level's threshold
 *
 * @example
 * computeCharacterProgress(0)   // { level: 1, xpIntoLevel: 0, xpToNextLevel: 100 }
 * computeCharacterProgress(150) // { level: 2, xpIntoLevel: 50, xpToNextLevel: 264 }
 */
export function computeCharacterProgress(totalXp: number): CharacterProgress {
  let level = 1;
  let remaining = totalXp;
  let threshold = computeXpToNextLevel(level);

  while (remaining >= threshold) {
    remaining -= threshold;
    level++;
    threshold = computeXpToNextLevel(level);
  }

  return {
    level,
    xpIntoLevel: remaining,
    xpToNextLevel: threshold
  };
}
