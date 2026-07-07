/**
 * Validation Service
 * 
 * Provides validation functions for quest and resource creation.
 * Validates tree IDs, sub-skill tags, and resource types against
 * database state and game configuration.
 * 
 * Per Requirements 3.2, 3.3, 4.3, 4.4, 17.1-17.5, 28.1-28.2
 */

import { prisma } from '@/lib/prisma';
import { isValidSubSkillTag, getAllSubSkillTagsForTrees, SKILL_TREES } from '@/lib/game/skillTrees';

/**
 * Validation result with optional error details.
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Allowed resource types (from Prisma schema).
 */
const VALID_RESOURCE_TYPES = [
  'BOOK',
  'COURSE',
  'VIDEO',
  'ARTICLE',
  'IDEA',
  'MENTOR'
] as const;

/**
 * Validate that all tree IDs reference existing SkillTree records for a character.
 * 
 * Checks:
 * 1. All tree IDs exist in the database
 * 2. All trees belong to the specified character
 * 
 * @param treeIds - Array of tree IDs to validate
 * @param characterId - Character ID that should own the trees
 * @returns Validation result with list of invalid IDs if any
 * 
 * @example
 * const result = await validateTreeIds(['tree1', 'tree2'], 'char123');
 * if (!result.valid) {
 *   // result.errors contains ['tree2'] if tree2 doesn't exist or belongs to another character
 * }
 */
export async function validateTreeIds(
  treeIds: string[],
  characterId: string
): Promise<ValidationResult> {
  if (treeIds.length === 0) {
    return {
      valid: false,
      errors: ['At least one tree ID is required']
    };
  }
  
  // Query for all provided tree IDs that belong to this character
  const foundTrees = await prisma.skillTree.findMany({
    where: {
      id: { in: treeIds },
      characterId
    },
    select: { id: true }
  });
  
  const foundTreeIds = new Set(foundTrees.map(t => t.id));
  
  // Find which tree IDs were not found
  const invalidIds = treeIds.filter(id => !foundTreeIds.has(id));
  
  if (invalidIds.length > 0) {
    return {
      valid: false,
      errors: invalidIds.map(id => `Tree ID '${id}' does not exist or does not belong to this character`)
    };
  }
  
  return { valid: true };
}

/**
 * Validate that all sub-skill tags exist in at least one related tree's configuration.
 * 
 * Checks:
 * 1. Each tag exists in the SKILL_TREES config
 * 2. Each tag is valid for at least one of the related trees
 * 3. Case-sensitive matching
 * 
 * @param tags - Array of sub-skill tags to validate
 * @param treeIds - Array of related tree IDs (tags must be valid for at least one of these)
 * @param characterId - Character ID (used to fetch tree keys from database)
 * @returns Validation result with list of invalid tags if any
 * 
 * @example
 * const result = await validateSubSkillTags(
 *   ['Cold outreach', 'InvalidTag'],
 *   ['salesTreeId'],
 *   'char123'
 * );
 * if (!result.valid) {
 *   // result.errors contains ['InvalidTag']
 * }
 */
export async function validateSubSkillTags(
  tags: string[],
  treeIds: string[],
  characterId: string
): Promise<ValidationResult> {
  // Empty tag array is allowed (sub-skill tags are optional)
  if (tags.length === 0) {
    return { valid: true };
  }
  
  // Fetch the tree keys from database to get their config
  const trees = await prisma.skillTree.findMany({
    where: {
      id: { in: treeIds },
      characterId
    },
    select: { key: true }
  });
  
  if (trees.length === 0) {
    return {
      valid: false,
      errors: ['Cannot validate sub-skill tags: no valid trees found']
    };
  }
  
  const treeKeys = trees.map(t => t.key);
  
  // Validate each tag against the tree configurations
  const invalidTags: string[] = [];
  
  for (const tag of tags) {
    if (!isValidSubSkillTag(tag, treeKeys)) {
      invalidTags.push(tag);
    }
  }
  
  if (invalidTags.length > 0) {
    // Get all valid tags for helpful error message
    const validTags = getAllSubSkillTagsForTrees(treeKeys);
    
    return {
      valid: false,
      errors: [
        ...invalidTags.map(tag => `Sub-skill tag '${tag}' is not valid for the selected trees`),
        `Valid tags for selected trees: ${Array.from(validTags).join(', ')}`
      ]
    };
  }
  
  return { valid: true };
}

/**
 * Validate that a resource type is one of the allowed enum values.
 * 
 * Checks against: BOOK, COURSE, VIDEO, ARTICLE, IDEA, MENTOR
 * 
 * @param type - Resource type string to validate
 * @returns Validation result with error message if invalid
 * 
 * @example
 * const result = validateResourceType('BOOK');
 * // result.valid === true
 * 
 * const invalid = validateResourceType('PODCAST');
 * // invalid.valid === false
 * // invalid.errors === ['Invalid resource type: must be BOOK, COURSE, VIDEO, ARTICLE, IDEA, or MENTOR']
 */
export function validateResourceType(type: string): ValidationResult {
  if (VALID_RESOURCE_TYPES.includes(type as any)) {
    return { valid: true };
  }
  
  return {
    valid: false,
    errors: [
      `Invalid resource type: must be ${VALID_RESOURCE_TYPES.slice(0, -1).join(', ')}, or ${VALID_RESOURCE_TYPES[VALID_RESOURCE_TYPES.length - 1]}`
    ]
  };
}

/**
 * Validate that a difficulty value is within the valid range (1-5).
 * 
 * @param difficulty - Difficulty value to validate
 * @returns Validation result with error message if invalid
 */
export function validateDifficulty(difficulty: number): ValidationResult {
  if (difficulty < 1 || difficulty > 5 || !Number.isInteger(difficulty)) {
    return {
      valid: false,
      errors: ['Difficulty must be an integer between 1 and 5']
    };
  }
  
  return { valid: true };
}

/**
 * Validate that a quest type is one of the allowed enum values.
 * 
 * @param type - Quest type string to validate
 * @returns Validation result with error message if invalid
 */
export function validateQuestType(type: string): ValidationResult {
  const validTypes = ['DAILY', 'WEEKLY', 'EPIC', 'BOSS', 'MAINTENANCE'];
  
  if (validTypes.includes(type)) {
    return { valid: true };
  }
  
  return {
    valid: false,
    errors: [`Invalid quest type: must be ${validTypes.join(', ')}`]
  };
}

/**
 * Validate that parentQuestId references an EPIC-type quest owned by the character.
 * 
 * @param parentQuestId - Parent quest ID to validate
 * @param characterId - Character ID that should own the parent quest
 * @returns Validation result with error message if invalid
 */
export async function validateParentQuest(
  parentQuestId: string,
  characterId: string
): Promise<ValidationResult> {
  const parentQuest = await prisma.quest.findUnique({
    where: { id: parentQuestId },
    select: { type: true, characterId: true }
  });
  
  if (!parentQuest) {
    return {
      valid: false,
      errors: ['Parent quest not found']
    };
  }
  
  if (parentQuest.characterId !== characterId) {
    return {
      valid: false,
      errors: ['Parent quest does not belong to this character']
    };
  }
  
  if (parentQuest.type !== 'EPIC') {
    return {
      valid: false,
      errors: ['Parent quest must be of type EPIC']
    };
  }
  
  return { valid: true };
}
