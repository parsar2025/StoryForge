/**
 * Status Effect Rules
 *
 * Deterministic buff/debuff rules (PRD Section 9, never AI-judged) computed
 * from character state. Phase 2 defines exactly two effects:
 * - Momentum (BUFF): a healthy logging streak.
 * - Rusty (DEBUFF): a few idle days — framed encouragingly, never shaming.
 *
 * Per Phase 2 Requirements 5.1-5.5, 6.1-6.5.
 */

export const STATUS_EFFECT_CONFIG = {
  /** streakDays >= this grants Momentum. */
  STREAK_THRESHOLD: 7,
  /** days since last entry >= this applies Rusty. */
  RUSTY_THRESHOLD_DAYS: 3
} as const;

export interface StatusEffectState {
  /** Consecutive days with a logged time entry. */
  streakDays: number;
  /** Whole days since the most recent time entry; null if never logged. */
  daysSinceLastEntry: number | null;
  /** Whether the character has any time entries at all. */
  hasAnyEntries: boolean;
}

export interface ComputedEffect {
  type: 'BUFF' | 'DEBUFF';
  name: string;
  description: string;
}

/**
 * Evaluate the active status effects for a character.
 *
 * Momentum and Rusty are mutually exclusive by construction: a current streak
 * implies a recent entry, so Rusty is only considered when Momentum is absent.
 *
 * @param state - Character logging state
 * @returns The active effects (0, or exactly 1 in Phase 2)
 */
export function evaluateStatusEffects(state: StatusEffectState): ComputedEffect[] {
  const effects: ComputedEffect[] = [];

  if (state.streakDays >= STATUS_EFFECT_CONFIG.STREAK_THRESHOLD) {
    effects.push({
      type: 'BUFF',
      name: 'Momentum',
      description: `${state.streakDays}-day logging streak — keep the momentum going.`
    });
    return effects;
  }

  if (
    state.hasAnyEntries &&
    state.daysSinceLastEntry !== null &&
    state.daysSinceLastEntry >= STATUS_EFFECT_CONFIG.RUSTY_THRESHOLD_DAYS
  ) {
    effects.push({
      type: 'DEBUFF',
      name: 'Rusty',
      description: "It's been a few days — a quick log gets you rolling again."
    });
  }

  return effects;
}
