/**
 * Typewriter Reveal Core
 *
 * Pure progression logic for the terminal typewriter effect (PRD Section 11),
 * extracted so it is unit-testable without React or a DOM. The TypewriterBox
 * component consumes this so tested logic and rendered behavior cannot diverge.
 *
 * Per Phase 2 Requirements 13.1-13.4.
 */

/**
 * How much of `text` is revealed after `elapsedMs` at `speedMs` per character.
 *
 * @param text - The full text being revealed
 * @param elapsedMs - Milliseconds elapsed since the reveal started
 * @param speedMs - Milliseconds per character (must be > 0)
 * @returns The revealed prefix of `text`
 *
 * @example
 * revealedSubstring('hello', 0, 18)   // ''
 * revealedSubstring('hello', 36, 18)  // 'he'
 * revealedSubstring('hello', 999, 18) // 'hello'
 */
export function revealedSubstring(text: string, elapsedMs: number, speedMs: number): string {
  if (speedMs <= 0) {
    return text;
  }

  const charsVisible = Math.max(
    0,
    Math.min(text.length, Math.floor(elapsedMs / speedMs))
  );

  return text.slice(0, charsVisible);
}
