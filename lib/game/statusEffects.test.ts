/**
 * Status Effect Rule Property-Based Tests
 *
 * Verifies Momentum/Rusty rules and their mutual exclusivity across arbitrary
 * character state.
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { evaluateStatusEffects, STATUS_EFFECT_CONFIG, type StatusEffectState } from './statusEffects';

const { STREAK_THRESHOLD, RUSTY_THRESHOLD_DAYS } = STATUS_EFFECT_CONFIG;

describe('Status Effect Rule Properties', () => {
  // Feature: storyforge-phase-2-dashboard-typewriter, Property 2: Status Effect Rule Correctness and Exclusivity
  // Validates: Requirements 5.1, 5.3, 6.1, 6.3, 6.4
  it('applies Momentum/Rusty per rule with mutual exclusivity', () => {
    fc.assert(
      fc.property(
        fc.record<StatusEffectState>({
          streakDays: fc.integer({ min: 0, max: 365 }),
          daysSinceLastEntry: fc.option(fc.integer({ min: 0, max: 365 }), { nil: null }),
          hasAnyEntries: fc.boolean()
        }),
        (state) => {
          const effects = evaluateStatusEffects(state);
          const names = effects.map(e => e.name);

          const hasMomentum = names.includes('Momentum');
          const hasRusty = names.includes('Rusty');

          // Momentum iff streak >= threshold
          expect(hasMomentum).toBe(state.streakDays >= STREAK_THRESHOLD);

          // Rusty iff no Momentum AND hasAnyEntries AND daysSinceLastEntry >= threshold
          const expectRusty =
            !hasMomentum &&
            state.hasAnyEntries &&
            state.daysSinceLastEntry !== null &&
            state.daysSinceLastEntry >= RUSTY_THRESHOLD_DAYS;
          expect(hasRusty).toBe(expectRusty);

          // never both
          expect(hasMomentum && hasRusty).toBe(false);

          // at most one row per name
          expect(new Set(names).size).toBe(names.length);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('withholds Rusty during first-use (no entries)', () => {
    const effects = evaluateStatusEffects({
      streakDays: 0,
      daysSinceLastEntry: null,
      hasAnyEntries: false
    });
    expect(effects).toEqual([]);
  });

  it('grants Momentum exactly at the streak threshold', () => {
    const effects = evaluateStatusEffects({
      streakDays: STREAK_THRESHOLD,
      daysSinceLastEntry: 0,
      hasAnyEntries: true
    });
    expect(effects.map(e => e.name)).toEqual(['Momentum']);
    expect(effects[0].type).toBe('BUFF');
  });

  it('applies Rusty exactly at the inactivity threshold', () => {
    const effects = evaluateStatusEffects({
      streakDays: 0,
      daysSinceLastEntry: RUSTY_THRESHOLD_DAYS,
      hasAnyEntries: true
    });
    expect(effects.map(e => e.name)).toEqual(['Rusty']);
    expect(effects[0].type).toBe('DEBUFF');
  });
});
