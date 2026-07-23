'use client';

/**
 * TypewriterBox
 *
 * Reveals already-existing server-side text character by character with a
 * blinking cursor (PRD Section 11). Click / Enter / Space skips to full text.
 * Respects prefers-reduced-motion. Reveal progression comes from the pure
 * revealedSubstring helper so tested logic and rendered behavior can't diverge.
 *
 * Per Phase 2 Requirements 10.x, 11.x, 12.x, 13.4
 */

import * as React from 'react';
import { revealedSubstring } from '@/lib/ui/typewriter';
import { cn } from '@/lib/utils';

export interface TypewriterBoxProps {
  text: string;
  speedMs?: number;
  onComplete?: () => void;
  className?: string;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function TypewriterBox({ text, speedMs = 18, onComplete, className }: TypewriterBoxProps) {
  const [visible, setVisible] = React.useState('');
  const [done, setDone] = React.useState(false);
  const completedRef = React.useRef(false);
  const rafRef = React.useRef<number | null>(null);

  // Latest onComplete without retriggering the reveal effect.
  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const fireComplete = React.useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setDone(true);
    onCompleteRef.current?.();
  }, []);

  // Reveal loop. Restarts whenever text or speed changes (Requirement 10.6).
  React.useEffect(() => {
    completedRef.current = false;
    setDone(false);

    if (text.length === 0) {
      setVisible('');
      fireComplete();
      return;
    }

    if (prefersReducedMotion()) {
      // Reduced motion: full text immediately, no animation (Requirement 12).
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

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={done ? undefined : 'Skip typing animation'}
      title={done ? undefined : 'Click to reveal'}
      onClick={skip}
      onKeyDown={handleKeyDown}
      className={cn(
        'font-mono whitespace-pre-wrap rounded-md border border-border bg-card p-4 text-sm leading-relaxed text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring',
        className
      )}
    >
      {visible}
      <span
        aria-hidden
        className={cn(
          'inline-block w-[0.6ch] -mb-[2px] bg-primary',
          reduced ? 'opacity-0' : 'animate-pulse'
        )}
        style={{ height: '1em' }}
      >
        &nbsp;
      </span>
    </div>
  );
}

export default TypewriterBox;
