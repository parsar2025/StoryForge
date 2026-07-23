/**
 * Focus Signal Property-Based Tests
 *
 * Verifies the CORE-tree selection minimizes trailing momentum and breaks ties
 * deterministically.
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { computeFocusSignal, type FocusInput } from './focusSignal';

const treeArb = fc.record<FocusInput>({
  treeId: fc.string({ minLength: 1, maxLength: 8 }),
  key: fc.string({ minLength: 1, maxLength: 8 }),
  displayName: fc.string({ minLength: 1, maxLength: 12 }),
  level: fc.integer({ min: 1, max: 50 }),
  xp: fc.integer({ min: 0, max: 5000 }),
  trailingXp: fc.integer({ min: 0, max: 1000 })
});

describe('Focus Signal Properties', () => {
  // Feature: storyforge-phase-2-dashboard-typewriter, Property 1: Focus Signal Determinism and Selection
  // Validates: Requirements 4.1, 4.2, 4.3, 4.4
  it('selects a member tree with minimum trailing XP, deterministically', () => {
    fc.assert(
      fc.property(
        fc.array(treeArb, { minLength: 1, maxLength: 8 }),
        (trees) => {
          const result = computeFocusSignal(trees);
          expect(result).not.toBeNull();

          // chosen tree is a member of the input
          const chosen = trees.find(t => t.treeId === result!.treeId && t.key === result!.treeKey);
          expect(chosen).toBeDefined();

          // chosen tree has the minimum trailingXp
          const minTrailing = Math.min(...trees.map(t => t.trailingXp));
          expect(chosen!.trailingXp).toBe(minTrailing);

          // deterministic: identical input yields identical result
          const again = computeFocusSignal(trees);
          expect(again).toEqual(result);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('breaks ties by (trailingXp, level, xp, key) ascending', () => {
    const trees: FocusInput[] = [
      { treeId: 'c', key: 'CHARLIE', displayName: 'Charlie', level: 3, xp: 10, trailingXp: 0 },
      { treeId: 'a', key: 'ALPHA', displayName: 'Alpha', level: 2, xp: 50, trailingXp: 0 },
      { treeId: 'b', key: 'BRAVO', displayName: 'Bravo', level: 2, xp: 20, trailingXp: 0 }
    ];
    // all trailingXp 0 → lowest level (2) → lowest xp (20) → BRAVO
    expect(computeFocusSignal(trees)!.treeKey).toBe('BRAVO');
  });

  it('returns null for empty input', () => {
    expect(computeFocusSignal([])).toBeNull();
  });
});
