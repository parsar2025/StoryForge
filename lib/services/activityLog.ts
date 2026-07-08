/**
 * Activity Log Service (Manual Time Entry)
 *
 * Plain CRUD over manually-entered time entries. No live timer: multi-session
 * work is expressed as multiple entries, summed by the XP Engine at completion.
 *
 * Side effects per design:
 * - First entry flips its quest AVAILABLE → ACTIVE
 * - Cached Character.streakDays is recomputed on create/update/delete
 * - Edits/deletes are rejected once the quest is COMPLETED (XP already awarded)
 *
 * Per Requirements 5.1-5.8, 14.1-14.6, 15.1-15.5, 18.5
 */

import { prisma } from '@/lib/prisma';
import { updateCachedStreak } from '@/lib/game/streakCalculator';
import type { ActivityLog } from '@prisma/client';

/**
 * Error carrying an HTTP status hint for the route layer to map.
 */
export class ActivityLogError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404
  ) {
    super(message);
    this.name = 'ActivityLogError';
  }
}

export interface TimeEntryInput {
  questId: string;
  durationMin: number;
  workedOn?: string | Date;
  notes?: string;
  mood?: string;
  difficulty?: number;
  reflection?: string;
}

export type TimeEntryUpdate = Partial<Omit<TimeEntryInput, 'questId'>>;

function assertDuration(durationMin: unknown): void {
  if (!Number.isInteger(durationMin) || (durationMin as number) <= 0) {
    throw new ActivityLogError('durationMin must be a positive integer', 400);
  }
}

function assertDifficulty(difficulty: unknown): void {
  if (
    difficulty !== undefined &&
    difficulty !== null &&
    (!Number.isInteger(difficulty) || (difficulty as number) < 1 || (difficulty as number) > 5)
  ) {
    throw new ActivityLogError('difficulty must be an integer between 1 and 5', 400);
  }
}

/**
 * Recompute the streak from logged entries and cache it on the character.
 */
async function refreshStreak(characterId: string): Promise<void> {
  await updateCachedStreak(characterId);
}

/**
 * Create a time entry for a quest owned by the character.
 *
 * Sets the quest ACTIVE if it was AVAILABLE, then refreshes the cached streak.
 */
export async function createTimeEntry(
  characterId: string,
  input: TimeEntryInput
): Promise<ActivityLog> {
  assertDuration(input.durationMin);
  assertDifficulty(input.difficulty);

  const quest = await prisma.quest.findUnique({
    where: { id: input.questId },
    select: { id: true, characterId: true, status: true }
  });

  if (!quest || quest.characterId !== characterId) {
    throw new ActivityLogError('Quest not found', 404);
  }

  const workedOn = input.workedOn ? new Date(input.workedOn) : new Date();

  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.activityLog.create({
      data: {
        characterId,
        questId: input.questId,
        durationMin: input.durationMin,
        workedOn,
        notes: input.notes ?? null,
        mood: input.mood ?? null,
        difficulty: input.difficulty ?? null,
        reflection: input.reflection ?? null,
        xpAwarded: 0
      }
    });

    if (quest.status === 'AVAILABLE') {
      await tx.quest.update({
        where: { id: quest.id },
        data: { status: 'ACTIVE' }
      });
    }

    return created;
  });

  await refreshStreak(characterId);

  return entry;
}

/**
 * Update a time entry. Rejected if the quest is already COMPLETED.
 */
export async function updateTimeEntry(
  logId: string,
  characterId: string,
  update: TimeEntryUpdate
): Promise<ActivityLog> {
  const entry = await prisma.activityLog.findUnique({
    where: { id: logId },
    include: { quest: { select: { status: true } } }
  });

  if (!entry || entry.characterId !== characterId) {
    throw new ActivityLogError('Activity log not found', 404);
  }

  if (entry.quest?.status === 'COMPLETED') {
    throw new ActivityLogError('Cannot modify time entries on a completed quest', 400);
  }

  if (update.durationMin !== undefined) assertDuration(update.durationMin);
  assertDifficulty(update.difficulty);

  const workedOnChanged = update.workedOn !== undefined;

  const updated = await prisma.activityLog.update({
    where: { id: logId },
    data: {
      ...(update.durationMin !== undefined ? { durationMin: update.durationMin } : {}),
      ...(workedOnChanged ? { workedOn: new Date(update.workedOn as string | Date) } : {}),
      ...(update.notes !== undefined ? { notes: update.notes } : {}),
      ...(update.mood !== undefined ? { mood: update.mood } : {}),
      ...(update.difficulty !== undefined ? { difficulty: update.difficulty } : {}),
      ...(update.reflection !== undefined ? { reflection: update.reflection } : {})
    }
  });

  if (workedOnChanged) {
    await refreshStreak(characterId);
  }

  return updated;
}

/**
 * Delete a time entry. Rejected if the quest is already COMPLETED.
 */
export async function deleteTimeEntry(logId: string, characterId: string): Promise<void> {
  const entry = await prisma.activityLog.findUnique({
    where: { id: logId },
    include: { quest: { select: { status: true } } }
  });

  if (!entry || entry.characterId !== characterId) {
    throw new ActivityLogError('Activity log not found', 404);
  }

  if (entry.quest?.status === 'COMPLETED') {
    throw new ActivityLogError('Cannot modify time entries on a completed quest', 400);
  }

  await prisma.activityLog.delete({ where: { id: logId } });

  await refreshStreak(characterId);
}
