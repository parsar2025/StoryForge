/**
 * Unit Tests for ValidationService
 * 
 * Tests validation functions with mocked Prisma client to verify:
 * - Tree ID validation (existence and ownership)
 * - Sub-skill tag validation (case sensitivity, empty arrays)
 * - Resource type validation (enum checking)
 * - Difficulty validation (range and integer check)
 * - Quest type validation
 * - Parent quest validation
 * 
 * Per Task 2.2 of storyforge-phase-1-core-crud
 */

import {
  validateTreeIds,
  validateSubSkillTags,
  validateResourceType,
  validateDifficulty,
  validateQuestType,
  validateParentQuest
} from './validation';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    skillTree: {
      findMany: jest.fn()
    },
    quest: {
      findUnique: jest.fn()
    }
  }
}));

import { prisma } from '@/lib/prisma';

// Type the mocked prisma methods
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('ValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateTreeIds', () => {
    it('returns valid:true when all tree IDs exist and belong to character', async () => {
      mockedPrisma.skillTree.findMany.mockResolvedValue([
        { id: 'tree1' },
        { id: 'tree2' }
      ] as any);

      const result = await validateTreeIds(['tree1', 'tree2'], 'char123');

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(mockedPrisma.skillTree.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['tree1', 'tree2'] },
          characterId: 'char123'
        },
        select: { id: true }
      });
    });

    it('returns valid:false when some tree IDs do not exist', async () => {
      mockedPrisma.skillTree.findMany.mockResolvedValue([
        { id: 'tree1' }
      ] as any);

      const result = await validateTreeIds(['tree1', 'tree2', 'tree3'], 'char123');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain("Tree ID 'tree2' does not exist or does not belong to this character");
      expect(result.errors).toContain("Tree ID 'tree3' does not exist or does not belong to this character");
    });

    it('returns valid:false when trees belong to different character', async () => {
      // Simulated by findMany returning empty (no trees found for this character)
      mockedPrisma.skillTree.findMany.mockResolvedValue([]);

      const result = await validateTreeIds(['tree1'], 'char123');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toContain("Tree ID 'tree1' does not exist or does not belong to this character");
    });

    it('returns valid:false when empty tree IDs array provided', async () => {
      const result = await validateTreeIds([], 'char123');

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['At least one tree ID is required']);
      expect(mockedPrisma.skillTree.findMany).not.toHaveBeenCalled();
    });
  });

  describe('validateSubSkillTags', () => {
    it('returns valid:true when empty tags array provided', async () => {
      const result = await validateSubSkillTags([], ['tree1'], 'char123');

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      // Should not query database for empty array
      expect(mockedPrisma.skillTree.findMany).not.toHaveBeenCalled();
    });

    it('returns valid:true when all tags are valid for related trees', async () => {
      // Mock OPPORTUNITY_HUNTER tree
      mockedPrisma.skillTree.findMany.mockResolvedValue([
        { key: 'OPPORTUNITY_HUNTER' }
      ] as any);

      const result = await validateSubSkillTags(
        ['Problem discovery', 'Customer interviews'],
        ['tree1'],
        'char123'
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('returns valid:false when tags do not match any related tree', async () => {
      mockedPrisma.skillTree.findMany.mockResolvedValue([
        { key: 'OPPORTUNITY_HUNTER' }
      ] as any);

      const result = await validateSubSkillTags(
        ['Invalid Tag', 'Another Invalid'],
        ['tree1'],
        'char123'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.includes('Invalid Tag'))).toBe(true);
      expect(result.errors?.some(e => e.includes('Another Invalid'))).toBe(true);
    });

    it('validates case sensitivity of tags', async () => {
      mockedPrisma.skillTree.findMany.mockResolvedValue([
        { key: 'OPPORTUNITY_HUNTER' }
      ] as any);

      // 'problem discovery' (lowercase) should fail, correct is 'Problem discovery'
      const result = await validateSubSkillTags(
        ['problem discovery'],
        ['tree1'],
        'char123'
      );

      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('problem discovery'))).toBe(true);
    });

    it('returns valid:false when no trees found for character', async () => {
      mockedPrisma.skillTree.findMany.mockResolvedValue([]);

      const result = await validateSubSkillTags(
        ['Problem discovery'],
        ['tree1'],
        'char123'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Cannot validate sub-skill tags: no valid trees found']);
    });

    it('validates tags across multiple trees correctly', async () => {
      // Mock multiple trees
      mockedPrisma.skillTree.findMany.mockResolvedValue([
        { key: 'OPPORTUNITY_HUNTER' },
        { key: 'SALES' }
      ] as any);

      // Mix of tags from different trees
      const result = await validateSubSkillTags(
        ['Problem discovery', 'Cold outreach'], // First from OPPORTUNITY_HUNTER, second from SALES
        ['tree1', 'tree2'],
        'char123'
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('validateResourceType', () => {
    it('returns valid:true for all allowed resource types', () => {
      const validTypes = ['BOOK', 'COURSE', 'VIDEO', 'ARTICLE', 'IDEA', 'MENTOR'];

      validTypes.forEach(type => {
        const result = validateResourceType(type);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      });
    });

    it('returns valid:false for invalid resource type', () => {
      const result = validateResourceType('PODCAST');

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain('Invalid resource type');
      expect(result.errors?.[0]).toContain('BOOK, COURSE, VIDEO, ARTICLE, IDEA, or MENTOR');
    });

    it('returns valid:false for empty string', () => {
      const result = validateResourceType('');

      expect(result.valid).toBe(false);
    });

    it('returns valid:false for lowercase valid type', () => {
      const result = validateResourceType('book');

      expect(result.valid).toBe(false);
    });
  });

  describe('validateDifficulty', () => {
    it('returns valid:true for all valid difficulty values (1-5)', () => {
      [1, 2, 3, 4, 5].forEach(difficulty => {
        const result = validateDifficulty(difficulty);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      });
    });

    it('returns valid:false for difficulty below 1', () => {
      const result = validateDifficulty(0);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Difficulty must be an integer between 1 and 5']);
    });

    it('returns valid:false for difficulty above 5', () => {
      const result = validateDifficulty(6);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Difficulty must be an integer between 1 and 5']);
    });

    it('returns valid:false for non-integer difficulty', () => {
      const result = validateDifficulty(3.5);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Difficulty must be an integer between 1 and 5']);
    });

    it('returns valid:false for negative difficulty', () => {
      const result = validateDifficulty(-1);

      expect(result.valid).toBe(false);
    });
  });

  describe('validateQuestType', () => {
    it('returns valid:true for all allowed quest types', () => {
      const validTypes = ['DAILY', 'WEEKLY', 'EPIC', 'BOSS', 'MAINTENANCE'];

      validTypes.forEach(type => {
        const result = validateQuestType(type);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      });
    });

    it('returns valid:false for invalid quest type', () => {
      const result = validateQuestType('MONTHLY');

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain('Invalid quest type');
    });
  });

  describe('validateParentQuest', () => {
    it('returns valid:true when parent quest exists, is EPIC type, and belongs to character', async () => {
      mockedPrisma.quest.findUnique.mockResolvedValue({
        type: 'EPIC',
        characterId: 'char123'
      } as any);

      const result = await validateParentQuest('parent123', 'char123');

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(mockedPrisma.quest.findUnique).toHaveBeenCalledWith({
        where: { id: 'parent123' },
        select: { type: true, characterId: true }
      });
    });

    it('returns valid:false when parent quest does not exist', async () => {
      mockedPrisma.quest.findUnique.mockResolvedValue(null);

      const result = await validateParentQuest('parent123', 'char123');

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Parent quest not found']);
    });

    it('returns valid:false when parent quest belongs to different character', async () => {
      mockedPrisma.quest.findUnique.mockResolvedValue({
        type: 'EPIC',
        characterId: 'different-char'
      } as any);

      const result = await validateParentQuest('parent123', 'char123');

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Parent quest does not belong to this character']);
    });

    it('returns valid:false when parent quest is not EPIC type', async () => {
      mockedPrisma.quest.findUnique.mockResolvedValue({
        type: 'DAILY',
        characterId: 'char123'
      } as any);

      const result = await validateParentQuest('parent123', 'char123');

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Parent quest must be of type EPIC']);
    });
  });
});
