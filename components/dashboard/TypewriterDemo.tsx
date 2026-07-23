'use client';

/**
 * TypewriterDemo — demos the TypewriterBox with placeholder narrative text.
 * Real Daily Briefing content arrives in Phase 5. Click-skippable.
 * Per Phase 2 Requirement 14.6.
 */

import * as React from 'react';
import { TypewriterBox } from '@/components/TypewriterBox';

const DEMO_TEXT =
  'The forge glows. Another day begins, and the ledger of your journey waits ' +
  'to be written. Log your work, complete your quests, and watch the story ' +
  'take shape — one deliberate action at a time.';

export function TypewriterDemo() {
  // Key bump lets the user replay the reveal.
  const [runId, setRunId] = React.useState(0);

  return (
    <div className="space-y-2">
      <TypewriterBox key={runId} text={DEMO_TEXT} />
      <button
        type="button"
        onClick={() => setRunId((n) => n + 1)}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Replay
      </button>
    </div>
  );
}
