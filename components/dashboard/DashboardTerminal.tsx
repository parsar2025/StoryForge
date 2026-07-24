'use client';

/**
 * DashboardTerminal — full-page terminal-styled dashboard.
 * Proper CSS layout (no ASCII blob), responsive, real progress bars.
 * Only the Daily Briefing section uses the typewriter reveal.
 */

import * as React from 'react';
import { TypewriterBox } from '@/components/TypewriterBox';
import type { DashboardPayload } from '@/lib/services/dashboard';

// ── helpers ────────────────────────────────────────────────────

function pct(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const color =
    clamped >= 60 ? 'bg-green-500' : clamped >= 25 ? 'bg-yellow-600' : 'bg-red-700';
  return (
    <div className={`h-2 bg-green-950 ${className}`}>
      <div
        className={`h-full ${color} transition-all duration-700`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function TreeRow({ tree }: { tree: DashboardPayload['trees']['core'][0] }) {
  const p = pct(tree.xp, tree.xpToNextLevel);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-green-400 truncate mr-2">
          {tree.emoji} {tree.displayName}
        </span>
        <span className="text-green-500 shrink-0">
          Lv{tree.level}  {p}%  {tree.xp}/{tree.xpToNextLevel} XP
        </span>
      </div>
      <ProgressBar value={p} />
    </div>
  );
}

// ── main component ─────────────────────────────────────────────

export function DashboardTerminal({ data }: { data: DashboardPayload }) {
  const c = data.character;
  const effects = data.statusEffects
    .map(e => (e.type === 'BUFF' ? '+' : '-') + e.name)
    .join('  ');

  return (
    <div className="flex flex-col min-h-screen bg-black text-green-400/90 font-mono text-sm">
      {/* ── header bar ── */}
      <header className="border-b border-green-900 px-3 sm:px-5 py-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-green-300 font-bold tracking-wider text-sm sm:text-base">
          STORYFORGE v0.3
        </span>
        <div className="text-xs sm:text-sm text-green-500 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span>Lv{c.level}</span>
          <span className="text-green-600">{c.currentTitle}</span>
          <span>◆ {c.streakDays}d streak</span>
          {effects && <span className="text-green-400">[[ {effects} ]]</span>}
        </div>
      </header>

      {/* ── main content (scrollable) ── */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-5">
        {/* Focus signal */}
        {data.focusSignal && (
          <div className="text-green-400 border-l-2 border-green-600 pl-3 py-1">
            ⚡ {data.focusSignal.message}
          </div>
        )}

        {/* Same-day reminder */}
        {!data.loggedToday && (
          <div className="text-yellow-600 border-l-2 border-yellow-700 pl-3 py-1">
            ! Nothing logged today yet — a quick entry keeps your story up to date.
          </div>
        )}

        {/* ── Core trees ── */}
        <section>
          <h2 className="text-green-700 text-xs tracking-widest mb-3 border-b border-green-900 pb-1">
            // CORE
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {data.trees.core.map(t => (
              <TreeRow key={t.id} tree={t} />
            ))}
          </div>
        </section>

        {/* ── Support trees ── */}
        <section>
          <h2 className="text-green-700 text-xs tracking-widest mb-3 border-b border-green-900 pb-1">
            // SUPPORT
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {data.trees.support.map(t => (
              <TreeRow key={t.id} tree={t} />
            ))}
          </div>
        </section>

        {/* ── Active quests ── */}
        <section>
          <h2 className="text-green-700 text-xs tracking-widest mb-3 border-b border-green-900 pb-1">
            // ACTIVE QUESTS
          </h2>
          {data.quests.length === 0 ? (
            <div className="text-green-800 text-xs">
              No active quests. Create one to start earning XP.
            </div>
          ) : (
            <ul className="space-y-1">
              {data.quests.map(q => (
                <li key={q.id} className="flex items-baseline gap-2 text-xs sm:text-sm">
                  <span className="text-green-600">{q.status === 'ACTIVE' ? '▶' : '○'}</span>
                  <span className="truncate">{q.title}</span>
                  <span className="text-green-700 shrink-0">[{q.type}]</span>
                  <span className="text-green-800 shrink-0">d{q.difficulty}</span>
                  <span className="text-green-800 shrink-0">~{q.estimatedMinutes}m</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Daily Briefing (typewriter reveal) ── */}
        <section className="border border-green-900 p-3 sm:p-4">
          <h3 className="text-green-700 text-xs tracking-widest mb-2">
            // DAILY BRIEFING
          </h3>
          <TypewriterBox
            text="The forge glows. Another day begins, and the ledger of your journey waits to be written. Log your work, complete your quests, and watch the story take shape — one deliberate action at a time."
            speedMs={18}
          />
        </section>
      </main>

      {/* ── footer command bar ── */}
      <footer className="border-t border-green-900 px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex gap-3 text-green-700">
          <span>[Q] Quests</span>
          <span>[S] Skills</span>
          <span>[R] Resources</span>
        </div>
        <form action="/api/auth/sign-out" method="post">
          <button
            type="submit"
            className="text-green-600 hover:text-green-400 underline underline-offset-2"
          >
            $ sign_out
          </button>
        </form>
      </footer>
    </div>
  );
}
