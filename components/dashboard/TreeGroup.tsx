/**
 * TreeGroup — a heading + the tree bars for one category (Core or Support).
 * Per Phase 2 Requirement 3.6.
 */

import { SkillTreeBar } from './SkillTreeBar';
import type { TreeSnapshot } from '@/lib/services/dashboard';

export function TreeGroup({ title, trees }: { title: string; trees: TreeSnapshot[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-3">
        {trees.map((t) => (
          <SkillTreeBar key={t.id} tree={t} />
        ))}
      </div>
    </div>
  );
}
