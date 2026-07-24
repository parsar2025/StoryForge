'use client';

/**
 * DashboardTerminal — one TypewriterBox reveals the full dashboard text.
 * Edge-to-edge green-on-black terminal. No cards, no chrome.
 */

import * as React from 'react';
import { TypewriterBox } from '@/components/TypewriterBox';
import type { DashboardPayload } from '@/lib/services/dashboard';

export function DashboardTerminal({ data }: { data: DashboardPayload }) {
  const ascii = buildTerminalText(data);

  return (
    <div className="flex flex-col min-h-screen bg-black text-green-400 font-mono">
      <div className="flex-1 overflow-y-auto px-1 py-1">
        <TypewriterBox speedMs={3} text={ascii} usePre={true} />
      </div>
      <div className="border-t border-green-800 px-1 py-2">
        <form action="/api/auth/sign-out" method="post">
          <button
            type="submit"
            className="text-green-600 hover:text-green-400 text-sm underline underline-offset-2"
          >
            $ sign_out
          </button>
        </form>
      </div>
    </div>
  );
}

const BAR_W = 20;

function xpBar(num: number, den: number): string {
  if (den <= 0) return `[${'='.repeat(BAR_W)}]`;
  const f = Math.round((num / den) * BAR_W);
  return `[${'='.repeat(Math.min(f, BAR_W))}${'.'.repeat(BAR_W - Math.min(f, BAR_W))}]`;
}

function treeLine(tree: DashboardPayload['trees']['core'][0]): string {
  const pct = tree.xpToNextLevel > 0 ? Math.round((tree.xp / tree.xpToNextLevel) * 100) : 0;
  const bar = xpBar(tree.xp, tree.xpToNextLevel);
  const name = `${tree.emoji} ${tree.displayName}`.padEnd(28);
  return `  ${name} ${bar}  Lv${String(tree.level).padStart(2)}  ${String(pct).padStart(2)}%  ${String(tree.xp).padStart(4)}/${tree.xpToNextLevel}`;
}

function buildTerminalText(data: DashboardPayload): string {
  const lines: string[] = [];

  // Title banner
  lines.push(
    '┌─────────────────────────────────────────────────────────────┐',
    '│  STORYFORGE                                                 │',
    '│  Become the protagonist of your own entrepreneurial journey │',
    '└─────────────────────────────────────────────────────────────┘',
    '',
  );

  // Character header
  const c = data.character;
  const xpPct = c.xpToNextLevel > 0 ? Math.round((c.xpIntoLevel / c.xpToNextLevel) * 100) : 0;
  const xpBarStr = xpBar(c.xpIntoLevel, c.xpToNextLevel);
  const effects = data.statusEffects.map(e => `${e.type === 'BUFF' ? '+' : '-'}${e.name}`).join('  ');
  const effectsStr = effects ? `  [[ ${effects} ]]` : '';

  lines.push(
    `${c.name}  |  ${c.currentTitle}  |  Level ${c.level}`,
    `${xpBarStr}  ${xpPct}%  (${c.xpIntoLevel}/${c.xpToNextLevel} XP)`,
    `Streak: ${c.streakDays} day${c.streakDays === 1 ? '' : 's'}${effectsStr}`,
    '',
  );

  // Focus signal
  if (data.focusSignal) {
    lines.push(`== ${data.focusSignal.message} ==`);
    lines.push('');
  }

  // Same-day logging reminder
  if (!data.loggedToday) {
    lines.push('!  Nothing logged today yet — a quick entry keeps your story up to date.');
    lines.push('');
  }

  // Tree groups
  lines.push('── Core ─────────────────────────────────────────────────');
  for (const t of data.trees.core) {
    lines.push(treeLine(t));
  }
  lines.push('');
  lines.push('── Support ──────────────────────────────────────────────');
  for (const t of data.trees.support) {
    lines.push(treeLine(t));
  }
  lines.push('');

  // Quest list
  lines.push('── Active Quests ────────────────────────────────────────');
  if (data.quests.length === 0) {
    lines.push('  No active quests. Create one to start earning XP.');
  } else {
    for (const q of data.quests) {
      const bullet = q.status === 'ACTIVE' ? '▶' : '○';
      lines.push(`  ${bullet} ${q.title}  [${q.type}]  diff ${q.difficulty}  ~${q.estimatedMinutes}min`);
    }
  }
  lines.push('');

  // Daily Briefing placeholder
  lines.push('── Daily Briefing ────────────────────────────────────────');
  lines.push('  The forge glows. Another day begins, and the ledger of your');
  lines.push('  journey waits to be written. Log your work, complete your');
  lines.push('  quests, and watch the story take shape — one deliberate');
  lines.push('  action at a time.');
  lines.push('');

  return lines.join('\n');
}
