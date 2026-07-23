/**
 * FocusSignalBanner — the single deterministic "what to work on" line.
 * Narrative voice → mono font. Per Phase 2 Requirement 4.6.
 */

import type { DashboardPayload } from '@/lib/services/dashboard';

export function FocusSignalBanner({ focusSignal }: Pick<DashboardPayload, 'focusSignal'>) {
  if (!focusSignal) return null;

  return (
    <div className="rounded-md border border-accent/40 bg-accent/10 p-3 font-mono text-sm text-accent">
      {focusSignal.message}
    </div>
  );
}
