/**
 * Unit Tests for Status Effect Reconciliation Service
 *
 * Verifies reconciliation against a mocked Prisma client: creates missing
 * effects, deletes stale effects, dedupes, and is idempotent.
 *
 * Per Phase 2 Task 2.2.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    statusEffect: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn()
    },
    $transaction: jest.fn()
  }
}));

import { reconcileStatusEffects } from './statusEffects';
import { prisma } from '@/lib/prisma';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

// Simulate $transaction(cb) by invoking the callback with a tx that reuses the
// same mocked delegate methods.
function wireTransaction() {
  (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({
      statusEffect: {
        deleteMany: mockedPrisma.statusEffect.deleteMany,
        create: mockedPrisma.statusEffect.create
      }
    })
  );
}

describe('reconcileStatusEffects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wireTransaction();
    (mockedPrisma.statusEffect.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (mockedPrisma.statusEffect.create as jest.Mock).mockResolvedValue({});
  });

  it('creates a missing Momentum effect when streak qualifies', async () => {
    (mockedPrisma.statusEffect.findMany as jest.Mock).mockResolvedValue([]);

    const result = await reconcileStatusEffects('char1', {
      streakDays: 7,
      daysSinceLastEntry: 0,
      hasAnyEntries: true
    });

    expect(result.map(e => e.name)).toEqual(['Momentum']);
    expect(mockedPrisma.statusEffect.create).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.statusEffect.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Momentum', type: 'BUFF', characterId: 'char1' }) })
    );
    expect(mockedPrisma.statusEffect.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes a stale effect that no longer applies', async () => {
    (mockedPrisma.statusEffect.findMany as jest.Mock).mockResolvedValue([
      { id: 'e1', characterId: 'char1', name: 'Momentum', type: 'BUFF', description: 'old' }
    ]);

    // streak dropped below threshold, recent entry → no effects desired
    const result = await reconcileStatusEffects('char1', {
      streakDays: 2,
      daysSinceLastEntry: 0,
      hasAnyEntries: true
    });

    expect(result).toEqual([]);
    expect(mockedPrisma.statusEffect.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['e1'] } } });
    expect(mockedPrisma.statusEffect.create).not.toHaveBeenCalled();
  });

  it('is idempotent: existing desired effect is neither recreated nor deleted', async () => {
    (mockedPrisma.statusEffect.findMany as jest.Mock).mockResolvedValue([
      { id: 'e1', characterId: 'char1', name: 'Momentum', type: 'BUFF', description: 'x' }
    ]);

    const result = await reconcileStatusEffects('char1', {
      streakDays: 10,
      daysSinceLastEntry: 0,
      hasAnyEntries: true
    });

    expect(result.map(e => e.name)).toEqual(['Momentum']);
    expect(mockedPrisma.statusEffect.create).not.toHaveBeenCalled();
    expect(mockedPrisma.statusEffect.deleteMany).not.toHaveBeenCalled();
  });

  it('removes duplicate rows of the same desired effect', async () => {
    (mockedPrisma.statusEffect.findMany as jest.Mock).mockResolvedValue([
      { id: 'e1', characterId: 'char1', name: 'Momentum', type: 'BUFF', description: 'x' },
      { id: 'e2', characterId: 'char1', name: 'Momentum', type: 'BUFF', description: 'dup' }
    ]);

    await reconcileStatusEffects('char1', {
      streakDays: 10,
      daysSinceLastEntry: 0,
      hasAnyEntries: true
    });

    // keep e1, delete the duplicate e2
    expect(mockedPrisma.statusEffect.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['e2'] } } });
    expect(mockedPrisma.statusEffect.create).not.toHaveBeenCalled();
  });

  it('applies Rusty when idle past the threshold with prior entries', async () => {
    (mockedPrisma.statusEffect.findMany as jest.Mock).mockResolvedValue([]);

    const result = await reconcileStatusEffects('char1', {
      streakDays: 0,
      daysSinceLastEntry: 4,
      hasAnyEntries: true
    });

    expect(result.map(e => e.name)).toEqual(['Rusty']);
    expect(result[0].type).toBe('DEBUFF');
  });
});
