/**
 * Unit Tests for Dashboard Aggregate Service
 *
 * Verifies trailing-XP aggregation, tree grouping/order, loggedToday boundary,
 * and empty-quest handling against a mocked Prisma client.
 *
 * Per Phase 2 Task 2.4.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    character: { findUniqueOrThrow: jest.fn() },
    quest: { findMany: jest.fn() },
    activityLog: { findFirst: jest.fn() }
  }
}));

// Streak cache write and status-effect reconciliation are covered by their own
// tests; stub them here to isolate aggregation logic.
jest.mock('@/lib/game/streakCalculator', () => ({
  updateCachedStreak: jest.fn().mockResolvedValue(0)
}));
jest.mock('@/lib/services/statusEffects', () => ({
  reconcileStatusEffects: jest.fn().mockResolvedValue([])
}));

import { buildDashboard } from './dashboard';
import { prisma } from '@/lib/prisma';
import { updateCachedStreak } from '@/lib/game/streakCalculator';
import { reconcileStatusEffects } from '@/lib/services/statusEffects';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

function tree(id: string, key: string, category: 'CORE' | 'SUPPORT', over: Partial<Record<string, unknown>> = {}) {
  return {
    id, key, category,
    displayName: key, emoji: 'x',
    level: 1, xp: 0, xpToNextLevel: 100,
    ...over
  };
}

// 8 CORE + 3 SUPPORT, intentionally out of key order to test sorting.
const TREES = [
  tree('s2', 'RELATIONSHIPS', 'SUPPORT'),
  tree('c8', 'STRATEGY', 'CORE'),
  tree('c1', 'BUILDER', 'CORE'),
  tree('s1', 'HEALTH', 'SUPPORT'),
  tree('c2', 'FINANCE', 'CORE'),
  tree('c3', 'MARKETING', 'CORE'),
  tree('c4', 'NEGOTIATION_INFLUENCE', 'CORE'),
  tree('c5', 'OPPORTUNITY_HUNTER', 'CORE'),
  tree('c6', 'PERSONAL_MASTERY', 'CORE'),
  tree('c7', 'SALES', 'CORE'),
  tree('s3', 'WISDOM', 'SUPPORT')
];

const NOW = new Date('2026-07-23T12:00:00.000Z');

describe('buildDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (updateCachedStreak as jest.Mock).mockResolvedValue(0);
    (reconcileStatusEffects as jest.Mock).mockResolvedValue([]);
    (mockedPrisma.character.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: 'char1', name: 'Founder', totalXp: 150, currentTitle: 'Novice Builder',
      skillTrees: TREES
    });
    (mockedPrisma.activityLog.findFirst as jest.Mock).mockResolvedValue({ workedOn: NOW });
  });

  it('groups 8 CORE then 3 SUPPORT trees, each sorted by key asc', async () => {
    // first quest.findMany call = recent completed quests; second = active quests
    (mockedPrisma.quest.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const payload = await buildDashboard('char1', NOW);

    expect(payload.trees.core).toHaveLength(8);
    expect(payload.trees.support).toHaveLength(3);
    expect(payload.trees.core.map(t => t.key)).toEqual([
      'BUILDER', 'FINANCE', 'MARKETING', 'NEGOTIATION_INFLUENCE',
      'OPPORTUNITY_HUNTER', 'PERSONAL_MASTERY', 'SALES', 'STRATEGY'
    ]);
    expect(payload.trees.support.map(t => t.key)).toEqual(['HEALTH', 'RELATIONSHIPS', 'WISDOM']);
  });

  it('derives character progress from cumulative totalXp', async () => {
    (mockedPrisma.quest.findMany as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const payload = await buildDashboard('char1', NOW);

    // 150 XP → level 2 (100 consumed), 50 into level 2
    expect(payload.character.level).toBe(2);
    expect(payload.character.xpIntoLevel).toBe(50);
    expect(payload.character.xpToNextLevel).toBeGreaterThan(0);
  });

  it('aggregates trailing XP per tree and picks the least-momentum CORE tree', async () => {
    // One completed quest awarding 100 XP split across BUILDER(c1) + STRATEGY(c8).
    // Every other CORE tree has 0 trailing XP → focus falls to a 0-XP tree by tie-break.
    (mockedPrisma.quest.findMany as jest.Mock)
      .mockResolvedValueOnce([
        { relatedTreeIds: ['c1', 'c8'], activityLogs: [{ xpAwarded: 60 }, { xpAwarded: 40 }] }
      ])
      .mockResolvedValueOnce([]);

    const payload = await buildDashboard('char1', NOW);

    // BUILDER and STRATEGY each got 50; a 0-trailing CORE tree wins focus.
    expect(payload.focusSignal).not.toBeNull();
    expect(['c1', 'c8']).not.toContain(payload.focusSignal!.treeId);
  });

  it('sets loggedToday true when latest entry is today', async () => {
    (mockedPrisma.quest.findMany as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const payload = await buildDashboard('char1', NOW);
    expect(payload.loggedToday).toBe(true);
  });

  it('sets loggedToday false when latest entry is an earlier day', async () => {
    (mockedPrisma.activityLog.findFirst as jest.Mock).mockResolvedValue({
      workedOn: new Date('2026-07-20T00:00:00.000Z')
    });
    (mockedPrisma.quest.findMany as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const payload = await buildDashboard('char1', NOW);

    expect(payload.loggedToday).toBe(false);
    // 3 days idle → status service called with daysSinceLastEntry = 3
    expect(reconcileStatusEffects).toHaveBeenCalledWith('char1', expect.objectContaining({
      daysSinceLastEntry: 3, hasAnyEntries: true
    }));
  });

  it('returns an empty quest array (not null) when none are active', async () => {
    (mockedPrisma.quest.findMany as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const payload = await buildDashboard('char1', NOW);
    expect(payload.quests).toEqual([]);
  });

  it('reports hasAnyEntries false during first use', async () => {
    (mockedPrisma.activityLog.findFirst as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.quest.findMany as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const payload = await buildDashboard('char1', NOW);

    expect(payload.loggedToday).toBe(false);
    expect(reconcileStatusEffects).toHaveBeenCalledWith('char1', expect.objectContaining({
      daysSinceLastEntry: null, hasAnyEntries: false
    }));
  });
});
