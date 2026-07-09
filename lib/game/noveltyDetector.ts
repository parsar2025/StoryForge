/**
 * Novelty Detector
 * 
 * Detects "novel" skill trees (14+ days since last XP award) to encourage
 * breadth across all 11 trees rather than over-specialization.
 * 
 * Per Requirements 19.1-19.5
 */

import { prisma } from '@/lib/prisma';
import { XP_CONFIG } from './xpEngine';

/**
 * Detect which skill trees are novel (haven't received XP in 14+ days).
 * 
 * A tree is "novel" if:
 * - It has at least one completed quest AND
 * - The most recent quest completion that awarded XP to this tree was 14+ days ago
 * 
 * A tree with zero completed quests is NOT novel (not penalized for being new).
 * 
 * @param treeIds - Array of tree IDs to check for novelty
 * @param characterId - Character ID (for query scoping)
 * @returns Boolean array matching order of input tree IDs (true = novel)
 * 
 * @example
 * await detectNovelTrees(['tree1', 'tree2'], 'char123');
 * // Returns [true, false] if tree1 is novel and tree2 was used recently
 */
export async function detectNovelTrees(
  treeIds: string[],
  characterId: string
): Promise<boolean[]> {
  if (treeIds.length === 0) {
    return [];
  }
  
  const now = new Date();
  const noveltyThresholdMs = XP_CONFIG.NOVELTY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  
  // For each tree, find the most recent quest completion that awarded XP to it
  const noveltyResults = await Promise.all(
    treeIds.map(async (treeId) => {
      // Find most recent completed quest that includes this tree in relatedTreeIds
      const recentQuest = await prisma.quest.findFirst({
        where: {
          characterId,
          status: 'COMPLETED',
          relatedTreeIds: {
            has: treeId
          }
        },
        orderBy: {
          completedAt: 'desc'
        },
        select: {
          completedAt: true
        }
      });
      
      // If no completed quests for this tree, it's not novel (not penalized for being new)
      if (!recentQuest || !recentQuest.completedAt) {
        return false;
      }
      
      // Check if last completion was 14+ days ago
      const daysSinceLastXp = (now.getTime() - recentQuest.completedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      return daysSinceLastXp >= XP_CONFIG.NOVELTY_THRESHOLD_DAYS;
    })
  );
  
  return noveltyResults;
}

/**
 * Check if a single tree is novel.
 * Convenience wrapper around detectNovelTrees for single-tree checks.
 * 
 * @param treeId - Tree ID to check
 * @param characterId - Character ID
 * @returns True if tree is novel (14+ days since last XP)
 */
export async function isTreeNovel(
  treeId: string,
  characterId: string
): Promise<boolean> {
  const results = await detectNovelTrees([treeId], characterId);
  return results[0] ?? false;
}

/**
 * Get novelty status for all of a character's skill trees.
 * Useful for dashboard display or analytics.
 * 
 * @param characterId - Character ID
 * @returns Map of tree ID to novelty status
 */
export async function getAllTreeNoveltyStatus(
  characterId: string
): Promise<Map<string, boolean>> {
  // Fetch all trees for character
  const trees = await prisma.skillTree.findMany({
    where: { characterId },
    select: { id: true }
  });
  
  const treeIds = trees.map(t => t.id);
  const noveltyStatuses = await detectNovelTrees(treeIds, characterId);
  
  const statusMap = new Map<string, boolean>();
  treeIds.forEach((id, index) => {
    statusMap.set(id, noveltyStatuses[index] ?? false);
  });
  
  return statusMap;
}
