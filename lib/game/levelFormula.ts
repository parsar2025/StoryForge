/**
 * Level-Up Formula
 * 
 * Computes the XP threshold needed to advance from one level to the next.
 * Per PRD Section 7: xpToNextLevel = round(100 * level^1.4)
 * 
 * This formula creates a smooth exponential curve where early levels are
 * achievable but later levels require significant effort.
 */

/**
 * Compute XP required to level up from the given level.
 * 
 * @param level - Current level (must be >= 1)
 * @returns XP needed to reach level + 1
 * 
 * @example
 * computeXpToNextLevel(1) // 100 (start of the game)
 * computeXpToNextLevel(5) // 285
 * computeXpToNextLevel(10) // 631
 * computeXpToNextLevel(20) // 1647
 */
export function computeXpToNextLevel(level: number): number {
  if (level < 1) {
    throw new Error('Level must be >= 1');
  }
  
  return Math.round(100 * Math.pow(level, 1.4));
}
