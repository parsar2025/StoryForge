/**
 * Dashboard Aggregate Service
 *
 * Assembles everything the dashboard renders in one round trip: character
 * summary, 11-tree snapshot grouped Core/Support, deterministic focus signal,
 * active quests, reconciled status effects, and the same-day-logging flag.
 *
 * No AI calls (all AI roles are later phases). The dashboard page and the
 * GET /api/dashboard endpoint both call buildDashboard — one code path.
 *
 * Per Phase 2 Requirements 1.x, 2.x, 3.x, 8.x, 9.1.
 */

import { prisma } from '@/lib/prisma';
import { computeCharacterProgress } from '@/lib/game/characterProgress';
import { computeFocusSignal, FOCUS_CONFIG, type FocusInput } from '@/lib/game/focusSignal';
import { distributeXP } from '@/lib/game/xpDistribution';
import { updateCachedStreak } from '@/lib/game/streakCalculator';
import { reconcileStatusEffects, type ActiveEffect } from '@/lib/services/statusEffects';

export interface TreeSnapshot {
  id: string;
  key: string;
  displayName: string;
  emoji: string;
  category: 'CORE' | 'SUPPORT';
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export interface DashboardQuest {
  id: string;
  title: string;
  type: string;
  status: string;
  difficulty: number;
  estimatedMinutes: number;
  relatedTreeIds: string[];
}

export interface DashboardPayload {
  character: {
    id: string;
    name: string;
    level: number;
    totalXp: number;
    currentTitle: string;
    streakDays: number;
    xpIntoLevel: number;
    xpToNextLevel: number;
  };
  trees: {
    core: TreeSnapshot[];
    support: TreeSnapshot[];
  };
  focusSignal: { treeId: string; treeKey: string; message: string } | null;
  quests: DashboardQuest[];
  statusEffects: ActiveEffect[];
  loggedToday: boolean;
}

/** UTC calendar-day string (YYYY-MM-DD) — matches Phase 1 streak boundary. */
function dayKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Whole days between two calendar days (a - b), using UTC day boundaries. */
function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const da = Date.parse(`${dayKey(a)}T00:00:00.000Z`);
  const db = Date.parse(`${dayKey(b)}T00:00:00.000Z`);
  return Math.round((da - db) / msPerDay);
}

/**
 * Build the full dashboard payload for a character.
 *
 * @param characterId - Provisioned character id
 * @param now - Reference time (defaults to current time); injectable for tests
 * @returns The aggregate payload
 */
export async function buildDashboard(
  characterId: string,
  now: Date = new Date()
): Promise<DashboardPayload> {
  // 1. Character + 11 trees
  const character = await prisma.character.findUniqueOrThrow({
    where: { id: characterId },
    include: { skillTrees: true }
  });

  // 2. Trailing-window XP per tree, derived from completed quests.
  //    awarded(quest) = sum(activityLogs.xpAwarded), distributed across
  //    relatedTreeIds with the same rounding quest completion used.
  const windowStart = new Date(now.getTime() - FOCUS_CONFIG.TRAILING_DAYS * 24 * 60 * 60 * 1000);
  const recentQuests = await prisma.quest.findMany({
    where: { characterId, status: 'COMPLETED', completedAt: { gte: windowStart } },
    select: { relatedTreeIds: true, activityLogs: { select: { xpAwarded: true } } }
  });

  const trailingXpByTreeId = new Map<string, number>();
  for (const quest of recentQuests) {
    if (quest.relatedTreeIds.length === 0) continue;
    const awarded = quest.activityLogs.reduce((sum, log) => sum + log.xpAwarded, 0);
    if (awarded <= 0) continue;
    for (const { treeId, xp } of distributeXP(awarded, quest.relatedTreeIds)) {
      trailingXpByTreeId.set(treeId, (trailingXpByTreeId.get(treeId) ?? 0) + xp);
    }
  }

  // 3. Character progress from cumulative XP
  const progress = computeCharacterProgress(character.totalXp);

  // 4. Split + sort trees (CORE then SUPPORT, each by key asc)
  const toSnapshot = (t: (typeof character.skillTrees)[number]): TreeSnapshot => ({
    id: t.id,
    key: t.key,
    displayName: t.displayName,
    emoji: t.emoji,
    category: t.category as 'CORE' | 'SUPPORT',
    level: t.level,
    xp: t.xp,
    xpToNextLevel: t.xpToNextLevel
  });
  const byKey = (a: TreeSnapshot, b: TreeSnapshot) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  const core = character.skillTrees.filter(t => t.category === 'CORE').map(toSnapshot).sort(byKey);
  const support = character.skillTrees.filter(t => t.category === 'SUPPORT').map(toSnapshot).sort(byKey);

  // 5. Focus signal over CORE trees
  const focusInputs: FocusInput[] = core.map(t => ({
    treeId: t.id,
    key: t.key,
    displayName: t.displayName,
    level: t.level,
    xp: t.xp,
    trailingXp: trailingXpByTreeId.get(t.id) ?? 0
  }));
  const focusSignal = computeFocusSignal(focusInputs);

  // 6. Logging state: most recent + today's entry
  const latestEntry = await prisma.activityLog.findFirst({
    where: { characterId },
    orderBy: { workedOn: 'desc' },
    select: { workedOn: true }
  });
  const hasAnyEntries = latestEntry !== null;
  const daysSinceLastEntry = latestEntry ? daysBetween(now, latestEntry.workedOn) : null;
  const loggedToday = latestEntry ? dayKey(latestEntry.workedOn) === dayKey(now) : false;

  // 7. Refresh cached streak, then reconcile status effects
  const streakDays = await updateCachedStreak(characterId);
  const statusEffects = await reconcileStatusEffects(characterId, {
    streakDays,
    daysSinceLastEntry,
    hasAnyEntries
  });

  // 8. Active + available quests, newest first
  const questRows = await prisma.quest.findMany({
    where: { characterId, status: { in: ['ACTIVE', 'AVAILABLE'] } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      difficulty: true,
      estimatedMinutes: true,
      relatedTreeIds: true
    }
  });
  const quests: DashboardQuest[] = questRows.map(q => ({
    id: q.id,
    title: q.title,
    type: q.type,
    status: q.status,
    difficulty: q.difficulty,
    estimatedMinutes: q.estimatedMinutes,
    relatedTreeIds: q.relatedTreeIds
  }));

  return {
    character: {
      id: character.id,
      name: character.name,
      level: progress.level,
      totalXp: character.totalXp,
      currentTitle: character.currentTitle,
      streakDays,
      xpIntoLevel: progress.xpIntoLevel,
      xpToNextLevel: progress.xpToNextLevel
    },
    trees: { core, support },
    focusSignal,
    quests,
    statusEffects,
    loggedToday
  };
}
