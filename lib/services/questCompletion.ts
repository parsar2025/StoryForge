/**
 * Quest Completion Service
 * 
 * Handles the complete quest completion flow:
 * - Validates quest status and ownership
 * - Computes XP using XP Engine with all bonuses
 * - Distributes XP across related skill trees
 * - Handles level-ups for both trees and character
 * - Updates character title when character levels up
 * - All operations in single atomic transaction
 * 
 * Per Requirements 6.1-6.5, 9.1-9.5, 20.5, 23.1-23.5
 */

import { prisma } from '@/lib/prisma';
import { computeXP, type XPEngineInput, type XPEngineOutput } from '@/lib/game/xpEngine';
import { computeXpToNextLevel } from '@/lib/game/levelFormula';
import { getTitleForLevel } from '@/lib/game/titles';
import { distributeXP } from '@/lib/game/xpDistribution';
import { computeStreak } from '@/lib/game/streakCalculator';
import { detectNovelTrees } from '@/lib/game/noveltyDetector';
import type { Quest, SkillTree } from '@prisma/client';

/**
 * Compute character level from cumulative total XP.
 * 
 * Character level is derived from totalXp by subtracting thresholds starting from level 1.
 * This ensures level-ups happen at exactly the right cumulative XP values specified by
 * the exponential curve (100, 364, 830, ...) regardless of how XP was gained.
 * 
 * @param cumulativeXp - Lifetime total XP earned
 * @returns Character level (minimum 1)
 */
function computeLevelFromCumulativeXp(cumulativeXp: number): number {
  let level = 1;
  let remaining = cumulativeXp;
  let threshold = computeXpToNextLevel(level);
  
  while (remaining >= threshold) {
    remaining -= threshold;
    level++;
    threshold = computeXpToNextLevel(level);
  }
  
  return level;
}

/**
 * Result of quest completion with all affected entities and XP breakdown.
 */
export interface QuestCompletionResult {
  /** Updated quest with COMPLETED status */
  quest: Quest;
  
  /** All skill trees that received XP */
  affectedTrees: SkillTree[];
  
  /** Total XP awarded (before distribution) */
  xpAwarded: number;
  
  /** XP breakdown showing all bonuses */
  xpBreakdown: XPEngineOutput;
  
  /** Trees that leveled up (empty if none) */
  levelUps: Array<{
    treeId: string;
    treeKey: string;
    oldLevel: number;
    newLevel: number;
  }>;
  
  /** Character level-up if it occurred */
  characterLevelUp?: {
    oldLevel: number;
    newLevel: number;
    newTitle: string;
  };
}

/**
 * Complete a quest and award XP to related skill trees.
 * 
 * This function orchestrates the entire completion flow:
 * 1. Validate quest exists, belongs to character, and is ACTIVE
 * 2. Gather all activity logs and compute bonuses (streak, novelty)
 * 3. Compute total XP using XP Engine
 * 4. Distribute XP across related trees
 * 5. Update all entities in atomic transaction:
 *    - Quest: status = COMPLETED, completedAt = now
 *    - Trees: add XP, check level-ups, update xpToNextLevel
 *    - Character: add totalXp, check level-up, update title
 *    - ActivityLogs: set xpAwarded field
 * 
 * @param questId - ID of quest to complete
 * @param characterId - ID of character completing the quest
 * @returns Quest completion result with breakdown
 * @throws Error if quest not found, not owned, not ACTIVE, or transaction fails
 * 
 * @example
 * const result = await completeQuest('quest123', 'char456');
 * console.log(`Awarded ${result.xpAwarded} XP`);
 * console.log(`${result.levelUps.length} trees leveled up`);
 */
export async function completeQuest(
  questId: string,
  characterId: string
): Promise<QuestCompletionResult> {
  // 1. Fetch quest with activity logs and validate
  const quest = await prisma.quest.findUnique({
    where: { id: questId },
    include: {
      activityLogs: {
        orderBy: { workedOn: 'asc' }
      }
    }
  });
  
  if (!quest) {
    throw new Error('Quest not found');
  }
  
  if (quest.characterId !== characterId) {
    throw new Error('Quest does not belong to this character');
  }
  
  if (quest.status !== 'ACTIVE') {
    throw new Error(
      `Quest must be in ACTIVE status to complete (current status: ${quest.status})`
    );
  }
  
  if (quest.activityLogs.length === 0) {
    throw new Error('Cannot complete quest with no activity logs');
  }
  
  // 2. Compute current streak
  const currentStreak = await computeStreak(characterId);
  
  // 3. Detect novel trees (14+ days since last XP)
  const noveltyFlags = await detectNovelTrees(quest.relatedTreeIds, characterId);
  
  // 4. Prepare input for XP Engine
  const xpInput: XPEngineInput = {
    difficulty: quest.difficulty as 1 | 2 | 3 | 4 | 5,
    activityLogs: quest.activityLogs.map(log => ({
      durationMin: log.durationMin,
      reflection: log.reflection
    })),
    currentStreakDays: currentStreak,
    novelTreeFlags: noveltyFlags
  };
  
  // 5. Compute total XP with bonuses
  const xpBreakdown = computeXP(xpInput);
  const totalXP = xpBreakdown.total;
  
  // 6. Distribute XP across related trees
  const xpPerTree = distributeXP(totalXP, quest.relatedTreeIds);
  
  // 7. Execute all updates in atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update quest status
    const updatedQuest = await tx.quest.update({
      where: { id: questId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });
    
    // Track level-ups
    const levelUps: QuestCompletionResult['levelUps'] = [];
    
    // Update each related tree
    const updatedTrees: SkillTree[] = [];
    
    for (let i = 0; i < quest.relatedTreeIds.length; i++) {
      const treeId = quest.relatedTreeIds[i];
      const xpToAdd = xpPerTree[i].xp;
      
      // Fetch current tree state
      const tree = await tx.skillTree.findUniqueOrThrow({
        where: { id: treeId }
      });
      
      const oldLevel = tree.level;
      let newXp = tree.xp + xpToAdd;
      let newLevel = tree.level;
      let newXpToNextLevel = tree.xpToNextLevel;
      
      // Check for level-up(s)
      while (newXp >= newXpToNextLevel) {
        newXp -= newXpToNextLevel;
        newLevel++;
        newXpToNextLevel = computeXpToNextLevel(newLevel);
      }
      
      // Update tree
      const updatedTree = await tx.skillTree.update({
        where: { id: treeId },
        data: {
          xp: newXp,
          level: newLevel,
          xpToNextLevel: newXpToNextLevel
        }
      });
      
      updatedTrees.push(updatedTree);
      
      // Record level-up if it occurred
      if (newLevel > oldLevel) {
        levelUps.push({
          treeId: tree.id,
          treeKey: tree.key,
          oldLevel,
          newLevel
        });
      }
    }
    
    // Update character totalXp and recompute level from cumulative XP
    const character = await tx.character.findUniqueOrThrow({
      where: { id: characterId }
    });
    
    const oldCharLevel = character.level;
    const newTotalXp = character.totalXp + totalXP;
    const newCharLevel = computeLevelFromCumulativeXp(newTotalXp);
    
    // Update character title if level changed
    const newTitle = newCharLevel > oldCharLevel
      ? getTitleForLevel(newCharLevel)
      : character.currentTitle;
    
    await tx.character.update({
      where: { id: characterId },
      data: {
        totalXp: newTotalXp,
        level: newCharLevel,
        currentTitle: newTitle
      }
    });
    
    // Update all activity logs with xpAwarded (distribute fairly like trees)
    const activityLogIds = quest.activityLogs.map(log => log.id);
    const xpPerLogDistribution = distributeXP(totalXP, activityLogIds);
    
    for (let i = 0; i < activityLogIds.length; i++) {
      await tx.activityLog.update({
        where: { id: activityLogIds[i] },
        data: { xpAwarded: xpPerLogDistribution[i].xp }
      });
    }
    
    // Build character level-up result if it occurred
    const characterLevelUp: QuestCompletionResult['characterLevelUp'] = 
      newCharLevel > oldCharLevel
        ? {
            oldLevel: oldCharLevel,
            newLevel: newCharLevel,
            newTitle
          }
        : undefined;
    
    return {
      quest: updatedQuest,
      affectedTrees: updatedTrees,
      xpAwarded: totalXP,
      xpBreakdown,
      levelUps,
      characterLevelUp
    };
  });
  
  return result;
}

/**
 * Validate that a quest can be completed.
 * Used by API endpoints before calling completeQuest().
 * 
 * @param questId - Quest ID to validate
 * @param characterId - Character ID
 * @returns Validation result with error message if invalid
 */
export async function validateQuestCompletion(
  questId: string,
  characterId: string
): Promise<{ valid: boolean; error?: string }> {
  const quest = await prisma.quest.findUnique({
    where: { id: questId },
    include: {
      activityLogs: {
        select: { id: true }
      }
    }
  });
  
  if (!quest) {
    return { valid: false, error: 'Quest not found' };
  }
  
  if (quest.characterId !== characterId) {
    return { valid: false, error: 'Quest does not belong to this character' };
  }
  
  if (quest.status !== 'ACTIVE') {
    return {
      valid: false,
      error: `Quest must be in ACTIVE status to complete (current: ${quest.status})`
    };
  }
  
  if (quest.activityLogs.length === 0) {
    return { valid: false, error: 'Cannot complete quest with no activity logs' };
  }
  
  return { valid: true };
}
