/**
 * Typewriter Reveal Core Property-Based Tests
 *
 * Verifies reveal progression is bounded, prefix-only, and monotonic.
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { revealedSubstring } from './typewriter';

describe('Typewriter Reveal Properties', () => {
  // Feature: storyforge-phase-2-dashboard-typewriter, Property 4: Typewriter Reveal Monotonicity and Bounds
  // Validates: Requirements 13.1, 13.2, 13.3
  it('reveals a monotonic prefix bounded by empty and full', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 50_000 }),
        fc.integer({ min: 0, max: 50_000 }),
        (text, speedMs, elapsedA, elapsedB) => {
          // empty at elapsed 0
          expect(revealedSubstring(text, 0, speedMs)).toBe('');

          // full once elapsed covers every character
          expect(revealedSubstring(text, text.length * speedMs, speedMs)).toBe(text);
          expect(revealedSubstring(text, text.length * speedMs + 1000, speedMs)).toBe(text);

          // always a prefix of text
          const revealed = revealedSubstring(text, elapsedA, speedMs);
          expect(text.startsWith(revealed)).toBe(true);

          // monotonic: more elapsed reveals at least as much
          const lo = Math.min(elapsedA, elapsedB);
          const hi = Math.max(elapsedA, elapsedB);
          expect(revealedSubstring(text, lo, speedMs).length)
            .toBeLessThanOrEqual(revealedSubstring(text, hi, speedMs).length);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('reveals characters at the configured cadence', () => {
    expect(revealedSubstring('hello', 0, 18)).toBe('');
    expect(revealedSubstring('hello', 36, 18)).toBe('he');
    expect(revealedSubstring('hello', 999, 18)).toBe('hello');
  });
});
