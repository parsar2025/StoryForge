/**
 * Activity Log API (collection)
 *
 * POST /api/activity-log → log a manual time entry
 * GET  /api/activity-log → query entries (subSkillTag OR-filter, questId, date range)
 *
 * Per Requirements 14.1-14.6, 22.1-22.5
 */

import { requireCharacter } from '@/lib/api/session';
import { prisma } from '@/lib/prisma';
import { ErrorResponses } from '@/lib/api/errorResponse';
import { logError } from '@/lib/api/logger';
import { createTimeEntry, ActivityLogError } from '@/lib/services/activityLog';
import type { Prisma } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return ErrorResponses.validation('Request body must be a JSON object');
    }

    if (typeof body.questId !== 'string' || body.questId.length === 0) {
      return ErrorResponses.validation('questId is required');
    }

    const entry = await createTimeEntry(context.character.id, {
      questId: body.questId,
      durationMin: body.durationMin,
      workedOn: body.workedOn,
      notes: body.notes,
      mood: body.mood,
      difficulty: body.difficulty,
      reflection: body.reflection
    });

    return Response.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof ActivityLogError) {
      return error.status === 404
        ? ErrorResponses.notFound('Quest')
        : ErrorResponses.validation(error.message);
    }
    logError(error as Error, { path: '/api/activity-log', method: 'POST' });
    return ErrorResponses.internal();
  }
}

export async function GET(request: Request) {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const subSkillTags = searchParams.getAll('subSkillTag');
    const questId = searchParams.get('questId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const questFilter: Prisma.QuestWhereInput = {};
    if (subSkillTags.length > 0) {
      // OR-filter: quest carries at least one of the requested tags.
      questFilter.subSkillTags = { hasSome: subSkillTags };
    }

    const workedOnFilter: Prisma.DateTimeFilter = {};
    if (from) workedOnFilter.gte = new Date(from);
    if (to) workedOnFilter.lte = new Date(to);

    const where: Prisma.ActivityLogWhereInput = {
      characterId: context.character.id,
      ...(questId ? { questId } : {}),
      ...(from || to ? { workedOn: workedOnFilter } : {}),
      ...(subSkillTags.length > 0 ? { quest: { is: questFilter } } : {})
    };

    const entries = await prisma.activityLog.findMany({
      where,
      include: {
        quest: { include: { trees: true } }
      },
      orderBy: { workedOn: 'desc' }
    });

    return Response.json(entries);
  } catch (error) {
    logError(error as Error, { path: '/api/activity-log', method: 'GET' });
    return ErrorResponses.internal();
  }
}
