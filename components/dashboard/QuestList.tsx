/**
 * QuestList — active + available quests. Empty state when none.
 * Per Phase 2 Requirements 8.x.
 */

import { Badge } from '@/components/ui/badge';
import type { DashboardQuest } from '@/lib/services/dashboard';

export function QuestList({ quests }: { quests: DashboardQuest[] }) {
  if (quests.length === 0) {
    return (
      <p className="font-mono text-sm text-muted-foreground">
        No active quests. Create one to start earning XP.
      </p>
    );
  }

  return (
    <ul className="space-y-2 font-sans">
      {quests.map((q) => (
        <li
          key={q.id}
          className="flex items-center justify-between rounded-md border border-border bg-card p-3"
        >
          <div>
            <p className="font-medium text-foreground">{q.title}</p>
            <p className="text-xs text-muted-foreground">
              {q.type} · difficulty {q.difficulty} · ~{q.estimatedMinutes} min
            </p>
          </div>
          <Badge variant={q.status === 'ACTIVE' ? 'default' : 'secondary'}>{q.status}</Badge>
        </li>
      ))}
    </ul>
  );
}
