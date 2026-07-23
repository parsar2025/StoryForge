/**
 * CharacterHeader — name, title, level, overall XP bar, streak, status effects.
 * Per Phase 2 Requirements 2.x, 9.x.
 */

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { DashboardPayload } from '@/lib/services/dashboard';

type Props = Pick<DashboardPayload, 'character' | 'statusEffects'>;

export function CharacterHeader({ character, statusEffects }: Props) {
  const pct = character.xpToNextLevel > 0
    ? Math.round((character.xpIntoLevel / character.xpToNextLevel) * 100)
    : 0;

  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{character.name}</h2>
          <p className="text-sm text-accent">{character.currentTitle}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-primary">Level {character.level}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            🔥 {character.streakDays}-day streak
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <Progress value={pct} />
        <p className="text-xs text-muted-foreground tabular-nums">
          {character.xpIntoLevel}/{character.xpToNextLevel} XP to next level
        </p>
      </div>

      {statusEffects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {statusEffects.map((e) => (
            <Badge
              key={e.name}
              variant={e.type === 'BUFF' ? 'default' : 'destructive'}
              title={e.description}
            >
              {e.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
