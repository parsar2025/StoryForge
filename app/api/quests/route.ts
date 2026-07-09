/**
 * Quests API (collection)
 *
 * GET  /api/quests → list character quests, optional status/type filters
 * POST /api/quests → create a manual quest (aiGenerated=false, status=AVAILABLE)
 *
 * Per Requirements 3.1-3.4, 11.1-11.5, 12.1-12.6, 21.1, 21.6, 26.1-26.5
 */

import { requireCharacter } from '@/lib/api/session';
import { prisma } from '@/lib/prisma';
import { ErrorResponses } from '@/lib/api/errorResponse';
import { logError } from '@/lib/api/logger';
import {
  validateTreeIds,
  validateSubSkillTags,
  validateDifficulty,
  validateQuestType,
  validateParentQuest
} from '@/lib/services/validation';
import type { QuestStatus, QuestType } from '@prisma/client';

const QUEST_STATUSES = ['AVAILABLE', 'ACTIVE', 'COMPLETED', 'FAILED', 'ARCHIVED'];
const QUEST_TYPES = ['DAILY', 'WEEKLY', 'EPIC', 'BOSS', 'MAINTENANCE'];

export async function GET(request: Request) {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    if (status && !QUEST_STATUSES.includes(status)) {
      return ErrorResponses.validation(`Invalid status filter '${status}'`, [
        `status must be one of: ${QUEST_STATUSES.join(', ')}`
      ]);
    }

    if (type && !QUEST_TYPES.includes(type)) {
      return ErrorResponses.validation(`Invalid type filter '${type}'`, [
        `type must be one of: ${QUEST_TYPES.join(', ')}`
      ]);
    }

    const quests = await prisma.quest.findMany({
      where: {
        characterId: context.character.id,
        ...(status ? { status: status as QuestStatus } : {}),
        ...(type ? { type: type as QuestType } : {})
      },
      include: { trees: true },
      orderBy: { createdAt: 'desc' }
    });

    return Response.json(quests);
  } catch (error) {
    logError(error as Error, { path: '/api/quests', method: 'GET' });
    return ErrorResponses.internal();
  }
}

export async function POST(request: Request) {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return ErrorResponses.validation('Request body must be a JSON object');
    }

    const {
      title,
      description,
      type,
      difficulty,
      estimatedMinutes,
      completionCriteria,
      relatedTreeIds,
      subSkillTags,
      parentQuestId
    } = body;

    const errors: string[] = [];

    if (typeof title !== 'string' || title.trim().length === 0) {
      errors.push('title is required');
    }
    if (typeof description !== 'string' || description.trim().length === 0) {
      errors.push('description is required');
    }
    if (typeof completionCriteria !== 'string' || completionCriteria.trim().length === 0) {
      errors.push('completionCriteria is required');
    }
    if (!Number.isInteger(estimatedMinutes) || estimatedMinutes <= 0) {
      errors.push('estimatedMinutes must be a positive integer');
    }

    const typeResult = validateQuestType(type);
    if (!typeResult.valid) errors.push(...(typeResult.errors ?? []));

    const difficultyResult = validateDifficulty(difficulty);
    if (!difficultyResult.valid) errors.push(...(difficultyResult.errors ?? []));

    if (!Array.isArray(relatedTreeIds) || relatedTreeIds.length === 0) {
      errors.push('relatedTreeIds must be a non-empty array');
    }

    if (subSkillTags !== undefined && !Array.isArray(subSkillTags)) {
      errors.push('subSkillTags must be an array when provided');
    }

    if (errors.length > 0) {
      return ErrorResponses.validation('Invalid quest payload', errors);
    }

    // Referential validation against the database.
    const treeResult = await validateTreeIds(relatedTreeIds, context.character.id);
    if (!treeResult.valid) {
      return ErrorResponses.validation('Invalid relatedTreeIds', treeResult.errors);
    }

    if (Array.isArray(subSkillTags) && subSkillTags.length > 0) {
      const tagResult = await validateSubSkillTags(subSkillTags, relatedTreeIds, context.character.id);
      if (!tagResult.valid) {
        return ErrorResponses.validation('Invalid subSkillTags', tagResult.errors);
      }
    }

    if (parentQuestId !== undefined && parentQuestId !== null) {
      const parentResult = await validateParentQuest(parentQuestId, context.character.id);
      if (!parentResult.valid) {
        return ErrorResponses.validation('Invalid parentQuestId', parentResult.errors);
      }
    }

    const quest = await prisma.quest.create({
      data: {
        characterId: context.character.id,
        title: title.trim(),
        description: description.trim(),
        type,
        difficulty,
        estimatedMinutes,
        completionCriteria: completionCriteria.trim(),
        relatedTreeIds,
        subSkillTags: Array.isArray(subSkillTags) ? subSkillTags : [],
        parentQuestId: parentQuestId ?? null,
        status: 'AVAILABLE',
        aiGenerated: false,
        xpReward: 0,
        trees: { connect: relatedTreeIds.map((id: string) => ({ id })) }
      },
      include: { trees: true }
    });

    return Response.json(quest, { status: 201 });
  } catch (error) {
    logError(error as Error, { path: '/api/quests', method: 'POST' });
    return ErrorResponses.internal();
  }
}
