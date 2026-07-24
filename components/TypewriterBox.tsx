'use client';

/**
 * TypewriterBox
 *
 * Reveals already-existing text character by character with a blinking cursor
 * (PRD Section 11). Click / Enter / Space skips to full text.
 * Respects prefers-reduced-motion. Reveal progression comes from the pure
 * revealedSubstring helper so tested logic and rendered behavior can't diverge.
 *
 * Per Phase 2 Requirements 10.x, 11.x, 12.x, 13.4
 */

import * as React from 'react';
import { revealedSubstring } from '@/lib/ui/typewriter';

export interface TypewriterBoxProps {
  text: string;
  speedMs?: number;
  onComplete?: () => void;
  /** When true, renders as a bare <pre> block with blinking cursor. */
  usePre?: boolean;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function TypewriterBox({
  text,
  speedMs = 18,
  onComplete,
  usePre = false
}: TypewriterBoxProps) {
  const [visible, setVisible] = React.useState('');
  const completedRef = React.useRef(false);
  const rafRef = React.useRef<number | null>(null);

  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const fireComplete = React.useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current?.();
  }, []);

  // Reveal loop. Restarts whenever text or speed changes (Requirement 10.6).
  React.useEffect(() => {
    completedRef.current = false;

    if (text.length === 0) {
      setVisible('');
      fireComplete();
      return;
    }

    if (prefersReducedMotion()) {
      setVisible(text);
      fireComplete();
      return;
    }

    setVisible('');
    const start =
      typeof performance !== 'undefined' && performance.now ? performance.now() : 0;

    const tick = (nowTs: number) => {
      const elapsed = nowTs - start;
      const next = revealedSubstring(text, elapsed, speedMs);
      setVisible(next);
      if (next.length >= text.length) {
        fireComplete();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [text, speedMs, fireComplete]);

  const skip = React.useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setVisible(text);
    fireComplete();
  }, [text, fireComplete]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      skip();
    }
  };

  const reduced = prefersReducedMotion();

  // Terminal mode: bare <pre> with cursor
  if (usePre) {
    return (
      <pre
        role="button"
        tabIndex={0}
        aria-label="Text reveal"
        onClick={skip}
        onKeyDown={handleKeyDown}
        className="whitespace-pre-wrap cursor-pointer focus:outline-none"
      >
        {visible}
        {!reduced && (
          <span aria-hidden className="inline-block w-[0.6ch] bg-green-400 animate-terminal-blink" style={{ height: '1em' }}>
            &nbsp;
          </span>
        )}
      </pre>
    );
  }

  // Default mode (kept for backward compat / other uses)
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Text reveal"
      title="Click to reveal"
      onClick={skip}
      onKeyDown={handleKeyDown}
      className="font-mono whitespace-pre-wrap cursor-pointer focus:outline-none"
    >
      {visible}
      {!reduced && (
        <span
          aria-hidden
          className="inline-block w-[0.6ch] bg-green-400 animate-terminal-blink"
          style={{ height: '1em' }}
        >
          &nbsp;
        </span>
      )}
    </div>
  );
}
