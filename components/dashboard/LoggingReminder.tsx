/**
 * LoggingReminder — encouraging same-day logging nudge (PRD Section 15).
 * Never streak-shaming. Only shown when nothing is logged for today.
 * Per Phase 2 Requirements 9.2, 9.3.
 */

export function LoggingReminder({ loggedToday }: { loggedToday: boolean }) {
  if (loggedToday) return null;

  return (
    <div className="rounded-md border border-primary/40 bg-primary/10 p-3 font-mono text-sm text-primary">
      Nothing logged today yet — a quick entry keeps your story up to date.
    </div>
  );
}
