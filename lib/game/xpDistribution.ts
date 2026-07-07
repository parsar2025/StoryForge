/**
 * XP Distribution Algorithm
 * 
 * Distributes total XP fairly across multiple skill trees when a quest
 * is completed. Per PRD Section 7 and Requirements 20.1-20.3:
 * - Each tree gets floor(XP/N) or ceiling(XP/N)
 * - Remainder XP distributed to first trees in array
 * - Sum of distributed XP equals original total (no XP lost or created)
 */

export interface XPDistribution {
  treeId: string;
  xp: number;
}

/**
 * Distribute total XP fairly across N skill trees.
 * 
 * Algorithm:
 * 1. Compute base amount per tree: floor(totalXp / treeCount)
 * 2. Compute remainder: totalXp % treeCount
 * 3. Give first `remainder` trees one extra XP point
 * 
 * This ensures:
 * - Each tree gets either floor or ceiling of the fair share
 * - Sum of distributed XP exactly equals input totalXp
 * - Distribution is deterministic (based on array order)
 * 
 * @param totalXp - Total XP to distribute (must be >= 0)
 * @param treeIds - Array of tree IDs to distribute to (must not be empty)
 * @returns Array of {treeId, xp} objects in same order as input
 * 
 * @example
 * distributeXP(100, ['tree1', 'tree2', 'tree3'])
 * // Returns: [
 * //   { treeId: 'tree1', xp: 34 },
 * //   { treeId: 'tree2', xp: 33 },
 * //   { treeId: 'tree3', xp: 33 }
 * // ]
 * // Sum: 34 + 33 + 33 = 100 ✓
 * 
 * @example
 * distributeXP(75, ['tree1', 'tree2'])
 * // Returns: [
 * //   { treeId: 'tree1', xp: 38 },
 * //   { treeId: 'tree2', xp: 37 }
 * // ]
 * // Sum: 38 + 37 = 75 ✓
 */
export function distributeXP(totalXp: number, treeIds: string[]): XPDistribution[] {
  if (totalXp < 0) {
    throw new Error('Total XP must be >= 0');
  }
  
  if (treeIds.length === 0) {
    throw new Error('Must provide at least one tree ID');
  }
  
  const treeCount = treeIds.length;
  const baseXp = Math.floor(totalXp / treeCount);
  const remainder = totalXp % treeCount;
  
  return treeIds.map((treeId, index) => ({
    treeId,
    // First `remainder` trees get one extra XP point
    xp: baseXp + (index < remainder ? 1 : 0)
  }));
}
