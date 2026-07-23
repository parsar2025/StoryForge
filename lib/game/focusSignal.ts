/**
 * Focus Signal
 *
 * Deterministic rule (PRD Section 5.5, never AI) that names the one CORE tree
 * to focus on next: the tree with the least XP gained in the trailing window.
 * Answers "what should I work on" at a glance.
 *
 * Per Phase 2 Requirements 4.1-4.5.
 */

export const FOCUS_CONFIG = {
  /** Trailing window (days) over which "momentum" XP is measured. */
  TRAILING_DAYS: 7
} as const;

/** One CORE tree's inputs to the focus decision. */
export interface FocusInput {
  treeId: string;
  key: string;
  displayName: string;
  level: number;
  xp: number;
  /** XP gained by this tree in the trailing window. */
  trailingXp: number;
}

export interface FocusSignal {
  treeId: string;
  treeKey: string;
  message: string;
}

/**
 * Select the CORE tree with the least trailing-window momentum.
 *
 * Selection: minimum trailingXp. Ties break deterministically by
 * (trailingXp, level, xp, key) ascending, so identical input always yields
 * the identical result.
 *
 * @param coreTrees - CORE trees only (SUPPORT trees are excluded by the caller)
 * @returns The chosen tree + display message, or null if no trees given
 */
export function computeFocusSignal(coreTrees: FocusInput[]): FocusSignal | null {
  if (coreTrees.length === 0) {
    return null;
  }

  const chosen = [...coreTrees].sort((a, b) => {
    if (a.trailingXp !== b.trailingXp) return a.trailingXp - b.trailingXp;
    if (a.level !== b.level) return a.level - b.level;
    if (a.xp !== b.xp) return a.xp - b.xp;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  })[0];

  return {
    treeId: chosen.treeId,
    treeKey: chosen.key,
    message: `Focus: ${chosen.displayName} — least momentum in the last ${FOCUS_CONFIG.TRAILING_DAYS} days`
  };
}
