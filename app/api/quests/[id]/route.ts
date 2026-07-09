/**
 * Quests API (single)
 *
 * PATCH  /api/quests/[id] → update editable quest fields
 * DELETE /api/quests/[id] → delete quest, cascade activity logs, orphan sub-quests
 *
 * Per Requirements 3.6, 3.7
 */

import { requireCharacter } from '@/lib/api/session';
import { prisma } from '@/lib/prisma';
import { ErrorResponses } from '@/lib/api/errorResponse';
import { logError } from '@/lib/api/logger';
import {
  validateTreeIds,
  validateSubSkillTags,
  validateDifficulty,
  validateParentQuest
} from '@/lib/services/validation';
import type { Prisma } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    const { id } = await params;

    const existing = await prisma.quest.findUnique({ where: { id } });
    if (!existing || existing.characterId !== context.character.id) {
      return ErrorResponses.notFound('Quest');
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return ErrorResponses.validation('Request body must be a JSON object');
    }

    const data: Prisma.QuestUpdateInput = {};
    const errors: string[] = [];

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length === 0) {
        errors.push('title must be a non-empty string');
      } else {
        data.title = body.title.trim();
      }
    }
    if (body.description !== undefined) {
      if (typeof body.description !== 'string' || body.description.trim().length === 0) {
        errors.push('description must be a non-empty string');
      } else {
        data.description = body.description.trim();
      }
    }
    if (body.completionCriteria !== undefined) {
      if (typeof body.completionCriteria !== 'string' || body.completionCriteria.trim().length === 0) {
        errors.push('completionCriteria must be a non-empty string');
      } else {
        data.completionCriteria = body.completionCriteria.trim();
      }
    }
    if (body.difficulty !== undefined) {
      const result = validateDifficulty(body.difficulty);
      if (!result.valid) errors.push(...(result.errors ?? []));
      else data.difficulty = body.difficulty;
    }
    if (body.estimatedMinutes !== undefined) {
      if (!Number.isInteger(body.estimatedMinutes) || body.estimatedMinutes <= 0) {
        errors.push('estimatedMinutes must be a positive integer');
      } else {
        data.estimatedMinutes = body.estimatedMinutes;
      }
    }
    if (body.phaseOrder !== undefined) {
      if (body.phaseOrder !== null && !Number.isInteger(body.phaseOrder)) {
        errors.push('phaseOrder must be an integer or null');
      } else {
        data.phaseOrder = body.phaseOrder;
      }
    }
    if (body.deadline !== undefined) {
      data.deadline = body.deadline === null ? null : new Date(body.deadline);
    }
    if (body.prerequisiteId !== undefined) {
      data.prerequisiteId = body.prerequisiteId;
    }

    if (errors.length > 0) {
      return ErrorResponses.validation('Invalid quest update', errors);
    }

    // Revalidate tree ids / sub-skill tags when either changes.
    const nextTreeIds: string[] | undefined = Array.isArray(body.relatedTreeIds)
      ? body.relatedTreeIds
      : undefined;

    if (body.relatedTreeIds !== undefined) {
      if (!Array.isArray(body.relatedTreeIds) || body.relatedTreeIds.length === 0) {
        return ErrorResponses.validation('relatedTreeIds must be a non-empty array');
      }
      const treeResult = await validateTreeIds(body.relatedTreeIds, context.character.id);
      if (!treeResult.valid) {
        return ErrorResponses.validation('Invalid relatedTreeIds', treeResult.errors);
      }
      data.relatedTreeIds = body.relatedTreeIds;
      data.trees = { set: body.relatedTreeIds.map((tid: string) => ({ id: tid })) };
    }

    if (body.subSkillTags !== undefined) {
      if (!Array.isArray(body.subSkillTags)) {
        return ErrorResponses.validation('subSkillTags must be an array');
      }
      const treeIdsForTags = nextTreeIds ?? existing.relatedTreeIds;
      if (body.subSkillTags.length > 0) {
        const tagResult = await validateSubSkillTags(body.subSkillTags, treeIdsForTags, context.character.id);
        if (!tagResult.valid) {
          return ErrorResponses.validation('Invalid subSkillTags', tagResult.errors);
        }
      }
      data.subSkillTags = body.subSkillTags;
    }

    if (body.parentQuestId !== undefined) {
      if (body.parentQuestId === null) {
        data.parentQuest = { disconnect: true };
      } else {
        const parentResult = await validateParentQuest(body.parentQuestId, context.character.id);
        if (!parentResult.valid) {
          return ErrorResponses.validation('Invalid parentQuestId', parentResult.errors);
        }
        data.parentQuest = { connect: { id: body.parentQuestId } };
      }
    }

    const updated = await prisma.quest.update({
      where: { id },
      data,
      include: { trees: true }
    });

    return Response.json(updated);
  } catch (error) {
    logError(error as Error, { path: '/api/quests/[id]', method: 'PATCH' });
    return ErrorResponses.internal();
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    const { id } = await params;

    const existing = await prisma.quest.findUnique({ where: { id } });
    if (!existing || existing.characterId !== context.character.id) {
      return ErrorResponses.notFound('Quest');
    }

    await prisma.$transaction([
      // Orphan sub-quests that pointed at this epic.
      prisma.quest.updateMany({
        where: { parentQuestId: id },
        data: { parentQuestId: null }
      }),
      // Cascade: remove this quest's activity logs.
      prisma.activityLog.deleteMany({ where: { questId: id } }),
      prisma.quest.delete({ where: { id } })
    ]);

    return new Response(null, { status: 204 });
  } catch (error) {
    logError(error as Error, { path: '/api/quests/[id]', method: 'DELETE' });
    return ErrorResponses.internal();
  }
}
