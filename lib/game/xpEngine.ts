/**
 * XP Engine - Deterministic Quest Completion XP Calculation
 * 
 * Computes experience points based on quest difficulty, work duration,
 * reflection quality, streak maintenance, and skill tree novelty.
 * 
 * Per PRD Section 7 and Requirements 7.1-7.6:
 * - Base XP from difficulty lookup table
 * - +15 if ANY activity log has reflection >40 chars
 * - +20 if difficulty >= 4
 * - +10 if streak >= 7 days, +20 if >= 30 days (tiered, not cumulative)
 * - +10 if ANY related tree is novel (14+ days since last XP)
 * - Max cap: 150 XP per quest
 * 
 * This is pure computation - never delegates to AI.
 */

/**
 * XP configuration constants - single source of truth for game economy tuning.
 * Per PRD Section 12 (Post-v1): adjust these values to tune XP rewards,
 * log changes in DECISIONS.md, re-run property tests to verify invariants.
 */
export const XP_CONFIG = {
  /** Base XP by difficulty level (1=easiest, 5=hardest) */
  BASE_BY_DIFFICULTY: {
    1: 10,
    2: 20,
    3: 35,
    4: 55,
    5: 80
  } as const,
  
  /** Reflection bonus triggers if reflection.length > this threshold */
  REFLECTION_THRESHOLD_CHARS: 40,
  
  /** Bonus XP for writing a meaningful reflection */
  REFLECTION_BONUS: 15,
  
  /** High difficulty bonus triggers if difficulty >= this threshold */
  HIGH_DIFFICULTY_THRESHOLD: 4,
  
  /** Bonus XP for tackling hard quests (difficulty 4-5) */
  HIGH_DIFFICULTY_BONUS: 20,
  
  /** Streak tier 1: consecutive days to earn first streak bonus */
  STREAK_TIER_1_DAYS: 7,
  
  /** Bonus XP for 7+ day streak */
  STREAK_TIER_1_BONUS: 10,
  
  /** Streak tier 2: consecutive days to earn higher streak bonus */
  STREAK_TIER_2_DAYS: 30,
  
  /** Bonus XP for 30+ day streak (replaces tier 1 bonus, not added) */
  STREAK_TIER_2_BONUS: 20,
  
  /** Novelty triggers if tree hasn't received XP in this many days */
  NOVELTY_THRESHOLD_DAYS: 14,
  
  /** Bonus XP for returning to a neglected tree */
  NOVELTY_BONUS: 10,
  
  /** Maximum XP that can be awarded for a single quest */
  MAX_XP_CAP: 150
} as const;

/**
 * Input to XP computation - gathered from quest, activity logs, and character state.
 */
export interface XPEngineInput {
  /** Quest difficulty (1-5) */
  difficulty: 1 | 2 | 3 | 4 | 5;
  
  /** All activity logs for the quest (time entries) */
  activityLogs: Array<{
    durationMin: number;
    reflection: string | null;
  }>;
  
  /** Current consecutive-day streak (days with at least one logged time entry) */
  currentStreakDays: number;
  
  /** Novelty flags per related tree (true if 14+ days since last XP for that tree) */
  novelTreeFlags: boolean[];
}

/**
 * XP computation result with breakdown of all bonuses.
 */
export interface XPEngineOutput {
  /** Base XP from difficulty */
  base: number;
  
  /** Reflection bonus (0 or REFLECTION_BONUS) */
  reflectionBonus: number;
  
  /** Difficulty bonus (0 or HIGH_DIFFICULTY_BONUS) */
  difficultyBonus: number;
  
  /** Streak bonus (0, STREAK_TIER_1_BONUS, or STREAK_TIER_2_BONUS) */
  streakBonus: number;
  
  /** Novelty bonus (0 or NOVELTY_BONUS) */
  noveltyBonus: number;
  
  /** Total XP (sum of all components, capped at MAX_XP_CAP) */
  total: number;
}

/**
 * Compute XP for a completed quest using deterministic rules.
 * 
 * This function is pure - same inputs always produce same outputs.
 * Never calls AI, never queries database, never has side effects.
 * 
 * @param input - Quest data, activity logs, streak, and novelty flags
 * @returns XP breakdown with all bonuses and final total
 * 
 * @example
 * computeXP({
 *   difficulty: 4,
 *   activityLogs: [
 *     { durationMin: 120, reflection: 'Long reflection exceeding 40 characters goes here' }
 *   ],
 *   currentStreakDays: 10,
 *   novelTreeFlags: [true, false]
 * })
 * // Returns:
 * // {
 * //   base: 55,              // difficulty 4
 * //   reflectionBonus: 15,   // reflection > 40 chars
 * //   difficultyBonus: 20,   // difficulty >= 4
 * //   streakBonus: 10,       // 7-29 day streak
 * //   noveltyBonus: 10,      // at least one novel tree
 * //   total: 110             // sum of all bonuses
 * // }
 */
export function computeXP(input: XPEngineInput): XPEngineOutput {
  const { difficulty, activityLogs, currentStreakDays, novelTreeFlags } = input;
  
  // 1. Base XP from difficulty
  const base = XP_CONFIG.BASE_BY_DIFFICULTY[difficulty];
  
  // 2. Reflection bonus: +15 if ANY activity log has reflection > 40 chars
  const hasLongReflection = activityLogs.some(
    log => log.reflection && log.reflection.length > XP_CONFIG.REFLECTION_THRESHOLD_CHARS
  );
  const reflectionBonus = hasLongReflection ? XP_CONFIG.REFLECTION_BONUS : 0;
  
  // 3. High difficulty bonus: +20 if difficulty >= 4
  const difficultyBonus = difficulty >= XP_CONFIG.HIGH_DIFFICULTY_THRESHOLD
    ? XP_CONFIG.HIGH_DIFFICULTY_BONUS
    : 0;
  
  // 4. Streak bonus: tiered (higher tier replaces lower, not cumulative)
  let streakBonus = 0;
  if (currentStreakDays >= XP_CONFIG.STREAK_TIER_2_DAYS) {
    streakBonus = XP_CONFIG.STREAK_TIER_2_BONUS;
  } else if (currentStreakDays >= XP_CONFIG.STREAK_TIER_1_DAYS) {
    streakBonus = XP_CONFIG.STREAK_TIER_1_BONUS;
  }
  
  // 5. Novelty bonus: +10 if ANY related tree is novel (14+ days since last XP)
  const hasNovelTree = novelTreeFlags.some(isNovel => isNovel);
  const noveltyBonus = hasNovelTree ? XP_CONFIG.NOVELTY_BONUS : 0;
  
  // 6. Sum all components
  const uncapped = base + reflectionBonus + difficultyBonus + streakBonus + noveltyBonus;
  
  // 7. Apply max cap
  const total = Math.min(uncapped, XP_CONFIG.MAX_XP_CAP);
  
  return {
    base,
    reflectionBonus,
    difficultyBonus,
    streakBonus,
    noveltyBonus,
    total
  };
}
