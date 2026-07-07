/**
 * Character Title Progression
 * 
 * Maps character level ranges to narrative titles. Titles update automatically
 * when the character levels up, providing a sense of narrative progression
 * alongside numeric XP.
 * 
 * Per PRD Section 7: at least 10 distinct titles covering levels 1-50.
 */

/**
 * Title lookup table: level threshold → title string.
 * A character's title is the highest-level title they've achieved.
 */
export const TITLE_BY_LEVEL: Record<number, string> = {
  1: 'Novice Builder',
  5: 'Aspiring Founder',
  10: 'Emerging Entrepreneur',
  15: 'Proven Builder',
  20: 'Seasoned Founder',
  25: 'Master Operator',
  30: 'Visionary Leader',
  35: 'Strategic Architect',
  40: 'Industry Veteran',
  45: 'Luminary',
  50: 'Legendary Founder'
};

/**
 * Get the appropriate title for a given character level.
 * 
 * Returns the highest title the character has earned (the highest title
 * level that is <= their current level).
 * 
 * @param level - Character's current level
 * @returns Title string (defaults to "Novice Builder" for level 1)
 * 
 * @example
 * getTitleForLevel(1)   // "Novice Builder"
 * getTitleForLevel(7)   // "Aspiring Founder" (reached level 5 threshold)
 * getTitleForLevel(22)  // "Seasoned Founder" (reached level 20 threshold)
 * getTitleForLevel(100) // "Legendary Founder" (highest available title)
 */
export function getTitleForLevel(level: number): string {
  // Get all title levels in descending order
  const titleLevels = Object.keys(TITLE_BY_LEVEL)
    .map(Number)
    .sort((a, b) => b - a);
  
  // Find the highest title level the character has reached
  for (const titleLevel of titleLevels) {
    if (level >= titleLevel) {
      return TITLE_BY_LEVEL[titleLevel];
    }
  }
  
  // Fallback to level 1 title (should never happen with valid input)
  return TITLE_BY_LEVEL[1];
}
