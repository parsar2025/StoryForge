/**
 * XP Distribution Property-Based Tests
 * 
 * Tests the XP distribution algorithm using fast-check to verify
 * fairness properties across many random inputs.
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { distributeXP } from './xpDistribution';

describe('XP Distribution Properties', () => {
  // Feature: storyforge-phase-1-core-crud, Property 3: XP Distribution Fairness
  // Validates: Requirements 20.1, 20.2, 20.3
  it('distributes XP fairly across trees with no loss or gain', () => {
    fc.assert(
      fc.property(
        // Generate random total XP (1-150, matching XP_CONFIG.MAX_XP_CAP)
        fc.integer({ min: 1, max: 150 }),
        // Generate 1-11 tree IDs (matching the 11 skill trees)
        fc.integer({ min: 1, max: 11 }).chain(count =>
          fc.tuple(
            fc.constant(count),
            fc.array(fc.uuid(), { minLength: count, maxLength: count })
          )
        ),
        (totalXp, [treeCount, treeIds]) => {
          const distribution = distributeXP(totalXp, treeIds);
          
          // Property 3.1: Each tree gets floor(XP/N) or ceiling(XP/N)
          const baseXp = Math.floor(totalXp / treeCount);
          const ceilingXp = Math.ceil(totalXp / treeCount);
          
          for (const { xp } of distribution) {
            expect(xp === baseXp || xp === ceilingXp).toBe(true);
          }
          
          // Property 3.2: Sum equals original total (no XP lost or created)
          const sum = distribution.reduce((acc, { xp }) => acc + xp, 0);
          expect(sum).toBe(totalXp);
          
          // Property 3.3: Distribution length matches input tree count
          expect(distribution).toHaveLength(treeCount);
          
          // Property 3.4: Tree IDs preserved in same order
          distribution.forEach((item, index) => {
            expect(item.treeId).toBe(treeIds[index]);
          });
          
          // Property 3.5: Difference between max and min is at most 1
          const xpValues = distribution.map(d => d.xp);
          const maxXp = Math.max(...xpValues);
          const minXp = Math.min(...xpValues);
          expect(maxXp - minXp).toBeLessThanOrEqual(1);
          
          // Property 3.6: Remainder distributed correctly
          // When totalXp % treeCount === 0, all trees get baseXp (floor === ceiling)
          // When totalXp % treeCount > 0, first `remainder` trees get ceiling, rest get floor
          const remainder = totalXp % treeCount;
          
          if (remainder === 0) {
            // All trees should get exactly baseXp when evenly divisible
            expect(xpValues.every(xp => xp === baseXp)).toBe(true);
          } else {
            // First `remainder` trees get ceiling, rest get floor
            const treesWithExtra = distribution.filter(d => d.xp === ceilingXp).length;
            expect(treesWithExtra).toBe(remainder);
          }
          
          // Property 3.7: First `remainder` trees get ceiling, rest get floor (when not evenly divisible)
          if (remainder > 0) {
            for (let i = 0; i < treeCount; i++) {
              if (i < remainder) {
                expect(distribution[i].xp).toBe(ceilingXp);
              } else {
                expect(distribution[i].xp).toBe(baseXp);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('distributes evenly when XP divides perfectly', () => {
    // When XP is evenly divisible, all trees should get the same amount
    const distribution = distributeXP(100, ['tree1', 'tree2', 'tree3', 'tree4']);
    
    expect(distribution).toHaveLength(4);
    expect(distribution.every(d => d.xp === 25)).toBe(true);
    expect(distribution.reduce((sum, d) => sum + d.xp, 0)).toBe(100);
  });

  it('distributes remainder to first trees when not evenly divisible', () => {
    // 100 XP across 3 trees: should be [34, 33, 33]
    const distribution = distributeXP(100, ['tree1', 'tree2', 'tree3']);
    
    expect(distribution[0].xp).toBe(34); // First tree gets remainder
    expect(distribution[1].xp).toBe(33);
    expect(distribution[2].xp).toBe(33);
    expect(distribution.reduce((sum, d) => sum + d.xp, 0)).toBe(100);
  });

  it('handles single tree (all XP goes to one tree)', () => {
    const distribution = distributeXP(75, ['tree1']);
    
    expect(distribution).toHaveLength(1);
    expect(distribution[0].treeId).toBe('tree1');
    expect(distribution[0].xp).toBe(75);
  });

  it('handles small XP amounts across many trees', () => {
    // 5 XP across 11 trees: some get 1, others get 0
    const treeIds = Array.from({ length: 11 }, (_, i) => `tree${i + 1}`);
    const distribution = distributeXP(5, treeIds);
    
    expect(distribution).toHaveLength(11);
    
    // First 5 trees should get 1 XP, rest should get 0
    for (let i = 0; i < 5; i++) {
      expect(distribution[i].xp).toBe(1);
    }
    for (let i = 5; i < 11; i++) {
      expect(distribution[i].xp).toBe(0);
    }
    
    expect(distribution.reduce((sum, d) => sum + d.xp, 0)).toBe(5);
  });

  it('handles maximum XP cap (150) across all 11 trees', () => {
    const treeIds = Array.from({ length: 11 }, (_, i) => `tree${i + 1}`);
    const distribution = distributeXP(150, treeIds);
    
    // 150 / 11 = 13.636... → floor=13, ceiling=14, remainder=7
    expect(distribution).toHaveLength(11);
    
    // First 7 trees get 14, remaining 4 get 13
    for (let i = 0; i < 7; i++) {
      expect(distribution[i].xp).toBe(14);
    }
    for (let i = 7; i < 11; i++) {
      expect(distribution[i].xp).toBe(13);
    }
    
    expect(distribution.reduce((sum, d) => sum + d.xp, 0)).toBe(150);
  });

  it('throws error for negative XP', () => {
    expect(() => distributeXP(-10, ['tree1', 'tree2'])).toThrow('Total XP must be >= 0');
  });

  it('throws error for empty tree array', () => {
    expect(() => distributeXP(100, [])).toThrow('Must provide at least one tree ID');
  });

  it('handles zero XP (all trees get 0)', () => {
    const distribution = distributeXP(0, ['tree1', 'tree2', 'tree3']);
    
    expect(distribution).toHaveLength(3);
    expect(distribution.every(d => d.xp === 0)).toBe(true);
  });

  it('preserves tree ID order deterministically', () => {
    const treeIds = ['alpha', 'beta', 'gamma', 'delta'];
    const distribution = distributeXP(100, treeIds);
    
    distribution.forEach((item, index) => {
      expect(item.treeId).toBe(treeIds[index]);
    });
  });
});
