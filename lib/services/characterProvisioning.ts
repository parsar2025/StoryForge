/**
 * Character Provisioning Service
 *
 * Handles automatic character provisioning with skill tree seeding.
 * Creates exactly one Character per User with all 11 skill trees
 * on first login (no user-facing creation UI).
 * 
 * Per Requirements 1.1-1.6, 25.1-25.5
 */

import { prisma } from '@/lib/prisma';
import { SKILL_TREES } from '@/lib/game/skillTrees';
import { computeXpToNextLevel } from '@/lib/game/levelFormula';
import type { Character, SkillTree } from '@prisma/client';

/**
 * Character with all 11 skill trees included.
 */
export interface CharacterWithTrees extends Character {
  skillTrees: SkillTree[];
}

/**
 * Get existing character or create new character with all 11 skill trees.
 * 
 * This function is idempotent - safe to call multiple times with same userId.
 * If character already exists, returns it immediately without creating duplicates.
 * 
 * Creation process:
 * 1. Check for existing character with trees
 * 2. If exists with 11 trees → return immediately
 * 3. If missing → create Character + 11 SkillTree records in single transaction
 * 4. Handle unique constraint violations by retrying query once
 * 
 * @param userId - Supabase user ID from authenticated session
 * @returns Character with all 11 skill trees
 * @throws Error if transaction fails or trees cannot be seeded
 * 
 * @example
 * const character = await getOrCreateCharacter(session.user.id);
 * // character.skillTrees.length === 11
 * // character.name === "Founder" (default, user can rename later)
 */
export async function getOrCreateCharacter(userId: string): Promise<CharacterWithTrees> {
  // 1. Check for existing character (idempotency)
  const existing = await prisma.character.findUnique({
    where: { userId },
    include: {
      skillTrees: true
    }
  });
  
  if (existing) {
    // Verify we have all 11 trees (safety check)
    if (existing.skillTrees.length === 11) {
      return existing as CharacterWithTrees;
    }
    
    // If we have a character but not all trees, something is wrong
    // This should never happen, but log and continue to fix it
    console.warn(
      `Character ${existing.id} for user ${userId} has ${existing.skillTrees.length} trees instead of 11. Will attempt to seed missing trees.`
    );
  }
  
  // 2. Create character + 11 trees in transaction
  try {
    const character = await prisma.$transaction(async (tx) => {
      // Create or use existing character
      let char: Character;
      
      if (existing) {
        char = existing;
      } else {
        char = await tx.character.create({
          data: {
            userId,
            name: 'Founder',
            campaign: 'Become Entrepreneur',
            level: 1,
            totalXp: 0,
            currentTitle: 'Novice Builder',
            streakDays: 0
          }
        });
      }
      
      // Find which trees are missing (if any)
      const existingTreeKeys = new Set(
        existing?.skillTrees.map(t => t.key) || []
      );
      
      const treesToCreate = SKILL_TREES.filter(
        config => !existingTreeKeys.has(config.key)
      );
      
      // Create missing skill trees
      if (treesToCreate.length > 0) {
        await tx.skillTree.createMany({
          data: treesToCreate.map(config => ({
            characterId: char.id,
            key: config.key,
            displayName: config.displayName,
            emoji: config.emoji,
            category: config.category,
            level: 1,
            xp: 0,
            xpToNextLevel: computeXpToNextLevel(1)
          }))
        });
      }
      
      // Fetch complete character with all trees
      const completeChar = await tx.character.findUniqueOrThrow({
        where: { id: char.id },
        include: {
          skillTrees: {
            orderBy: [
              { category: 'asc' }, // CORE first, then SUPPORT
              { key: 'asc' }
            ]
          }
        }
      });
      
      return completeChar;
    });
    
    // Verify we have exactly 11 trees
    if (character.skillTrees.length !== 11) {
      throw new Error(
        `Character creation failed: expected 11 trees, got ${character.skillTrees.length}`
      );
    }
    
    return character as CharacterWithTrees;
  } catch (error) {
    // Handle unique constraint violation (race condition)
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint') &&
      error.message.includes('userId')
    ) {
      // Another request created the character first - retry query
      console.log(
        `Race condition detected for user ${userId}, retrying query...`
      );
      
      const retried = await prisma.character.findUnique({
        where: { userId },
        include: {
          skillTrees: true
        }
      });
      
      if (retried && retried.skillTrees.length === 11) {
        return retried as CharacterWithTrees;
      }
      
      // If retry also fails, give up
      throw new Error(
        `Character creation race condition: failed to retrieve character after unique constraint violation`
      );
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Verify a character has all 11 expected skill trees.
 * Used for health checks and debugging.
 * 
 * @param characterId - Character ID to check
 * @returns Object with verification status and details
 */
export async function verifyCharacterTrees(characterId: string): Promise<{
  valid: boolean;
  treeCount: number;
  missingKeys: string[];
}> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { skillTrees: true }
  });
  
  if (!character) {
    return {
      valid: false,
      treeCount: 0,
      missingKeys: SKILL_TREES.map(t => t.key)
    };
  }
  
  const existingKeys = new Set(character.skillTrees.map(t => t.key));
  const expectedKeys = SKILL_TREES.map(t => t.key);
  const missingKeys = expectedKeys.filter(key => !existingKeys.has(key));
  
  return {
    valid: character.skillTrees.length === 11 && missingKeys.length === 0,
    treeCount: character.skillTrees.length,
    missingKeys
  };
}
