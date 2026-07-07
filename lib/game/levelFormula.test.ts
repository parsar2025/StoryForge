/**
 * Level-Up Formula Property-Based Tests
 * 
 * Tests the level-up threshold formula using fast-check to verify
 * mathematical invariants hold across all valid level values.
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { computeXpToNextLevel } from './levelFormula';

describe('Level Formula Properties', () => {
  // Feature: storyforge-phase-1-core-crud, Property 2: Level-Up Threshold Formula Invariants
  // Validates: Requirements 8.2, 8.3, 8.4, 8.5
  it('produces positive integers that increase monotonically', () => {
    fc.assert(
      fc.property(
        // Generate random levels from 1 to 100
        fc.integer({ min: 1, max: 100 }),
        (level) => {
          const xpToNext = computeXpToNextLevel(level);
          
          // Property 2.1: Result is always a positive integer greater than 0
          expect(xpToNext).toBeGreaterThan(0);
          expect(Number.isInteger(xpToNext)).toBe(true);
          
          // Property 2.2: Monotonically increasing (level N+1 requires more XP than level N)
          if (level < 100) {
            const xpToNextPlusOne = computeXpToNextLevel(level + 1);
            expect(xpToNextPlusOne).toBeGreaterThan(xpToNext);
          }
          
          // Property 2.3: Formula produces correct rounding
          const expected = Math.round(100 * Math.pow(level, 1.4));
          expect(xpToNext).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('produces expected values for known levels', () => {
    // Level 1 should require 100 XP (starting threshold)
    expect(computeXpToNextLevel(1)).toBe(100);
    
    // Verify a few known values match the formula
    expect(computeXpToNextLevel(2)).toBe(Math.round(100 * Math.pow(2, 1.4)));
    expect(computeXpToNextLevel(5)).toBe(Math.round(100 * Math.pow(5, 1.4)));
    expect(computeXpToNextLevel(10)).toBe(Math.round(100 * Math.pow(10, 1.4)));
    expect(computeXpToNextLevel(20)).toBe(Math.round(100 * Math.pow(20, 1.4)));
    expect(computeXpToNextLevel(50)).toBe(Math.round(100 * Math.pow(50, 1.4)));
  });

  it('correctly rounds fractional results to nearest integer', () => {
    // Test some levels where fractional rounding matters
    for (let level = 1; level <= 20; level++) {
      const result = computeXpToNextLevel(level);
      const exactValue = 100 * Math.pow(level, 1.4);
      
      // Should be rounded to nearest integer
      const expectedRounded = Math.round(exactValue);
      expect(result).toBe(expectedRounded);
      
      // Should never have decimal places
      expect(result % 1).toBe(0);
    }
  });

  it('throws error for invalid levels', () => {
    expect(() => computeXpToNextLevel(0)).toThrow('Level must be >= 1');
    expect(() => computeXpToNextLevel(-1)).toThrow('Level must be >= 1');
    expect(() => computeXpToNextLevel(-100)).toThrow('Level must be >= 1');
  });

  it('produces strictly increasing sequence for consecutive levels', () => {
    // Generate a sequence of consecutive levels and verify strict monotonicity
    const levels = Array.from({ length: 50 }, (_, i) => i + 1);
    const thresholds = levels.map(computeXpToNextLevel);
    
    for (let i = 1; i < thresholds.length; i++) {
      // Each threshold must be strictly greater than the previous
      expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
    }
  });

  it('scales appropriately at high levels', () => {
    // At level 100, XP requirement should be significantly higher than level 1
    const level1 = computeXpToNextLevel(1);
    const level50 = computeXpToNextLevel(50);
    const level100 = computeXpToNextLevel(100);
    
    // Verify exponential growth
    expect(level50).toBeGreaterThan(level1 * 10); // At least 10x higher
    expect(level100).toBeGreaterThan(level50 * 2); // Continues growing
    
    // Level 100 should require a substantial amount
    expect(level100).toBeGreaterThan(5000);
  });
});
