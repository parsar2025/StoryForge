/**
 * Status Effect Reconciliation Service
 *
 * Persists the deterministic status-effect set (lib/game/statusEffects.ts) for
 * a character: creates effects that should exist, removes ones that no longer
 * apply, and dedupes. Idempotent — evaluating twice with unchanged state leaves
 * exactly one row per active effect.
 *
 * The StatusEffect model has no unique constraint on (characterId, name), so
 * matching and dedupe are done in application code.
 *
 * Per Phase 2 Requirements 7.1-7.6.
 */

import { prisma } from '@/lib/prisma';
import {
  evaluateStatusEffects,
  type StatusEffectState,
  type ComputedEffect
} from '@/lib/game/statusEffects';

export type ActiveEffect = ComputedEffect;

/**
 * Reconcile persisted StatusEffect rows to match the computed effect set.
 *
 * @param characterId - Character whose effects are being reconciled
 * @param state - Logging state fed to the pure rules
 * @returns The active effects (the computed set is the source of truth)
 */
export async function reconcileStatusEffects(
  characterId: string,
  state: StatusEffectState
): Promise<ActiveEffect[]> {
  const desired = evaluateStatusEffects(state);
  const desiredByName = new Map(desired.map(e => [e.name, e]));

  const existing = await prisma.statusEffect.findMany({
    where: { characterId }
  });

  // Rows to delete: any whose name is not desired, plus duplicate rows sharing
  // a desired name (keep exactly one per desired name).
  const seenDesiredNames = new Set<string>();
  const idsToDelete: string[] = [];

  for (const row of existing) {
    if (!desiredByName.has(row.name)) {
      idsToDelete.push(row.id);
    } else if (seenDesiredNames.has(row.name)) {
      idsToDelete.push(row.id); // duplicate of an already-kept desired effect
    } else {
      seenDesiredNames.add(row.name);
    }
  }

  // Rows to create: desired effects with no surviving existing row.
  const toCreate = desired.filter(e => !seenDesiredNames.has(e.name));

  await prisma.$transaction(async (tx) => {
    if (idsToDelete.length > 0) {
      await tx.statusEffect.deleteMany({ where: { id: { in: idsToDelete } } });
    }
    for (const effect of toCreate) {
      await tx.statusEffect.create({
        data: {
          characterId,
          type: effect.type,
          name: effect.name,
          description: effect.description
        }
      });
    }
  });

  return desired;
}
