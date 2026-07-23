/**
 * SkillTreeBar — one tree rendered as a labeled progress bar.
 * Structured data → sans font. Per Phase 2 Requirement 3.5.
 */

import { Progress } from '@/components/ui/progress';
import type { TreeSnapshot } from '@/lib/services/dashboard';

export function SkillTreeBar({ tree }: { tree: TreeSnapshot }) {
  const pct = tree.xpToNextLevel > 0 ? Math.round((tree.xp / tree.xpToNextLevel) * 100) : 0;

  return (
    <div className="space-y-1 font-sans">
      <div className="flex items-baseline justify-between text-sm">
        <span className="flex items-center gap-2">
          <span aria-hidden>{tree.emoji}</span>
          <span className="font-medium text-foreground">{tree.displayName}</span>
        </span>
        <span className="text-muted-foreground tabular-nums">
          Lv {tree.level} · {tree.xp}/{tree.xpToNextLevel}
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}
