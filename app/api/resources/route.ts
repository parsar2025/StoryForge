/**
 * Resources API (collection)
 *
 * GET  /api/resources → list character resources with tree data
 * POST /api/resources → create a resource (validated type, treeIds, subSkillTags)
 *
 * Per Requirements 4.1-4.4, 16.1-16.2, 16.5
 */

import { requireCharacter } from '@/lib/api/session';
import { prisma } from '@/lib/prisma';
import { ErrorResponses } from '@/lib/api/errorResponse';
import { logError } from '@/lib/api/logger';
import {
  validateResourceType,
  validateTreeIds,
  validateSubSkillTags
} from '@/lib/services/validation';

export async function GET() {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    const resources = await prisma.resource.findMany({
      where: { characterId: context.character.id },
      include: { trees: true },
      orderBy: { createdAt: 'desc' }
    });

    return Response.json(resources);
  } catch (error) {
    logError(error as Error, { path: '/api/resources', method: 'GET' });
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

    const { type, title, author, url, treeIds, subSkillTags } = body;

    const errors: string[] = [];
    if (typeof title !== 'string' || title.trim().length === 0) {
      errors.push('title is required');
    }

    const typeResult = validateResourceType(type);
    if (!typeResult.valid) errors.push(...(typeResult.errors ?? []));

    if (!Array.isArray(treeIds) || treeIds.length === 0) {
      errors.push('treeIds must be a non-empty array');
    }

    if (subSkillTags !== undefined && !Array.isArray(subSkillTags)) {
      errors.push('subSkillTags must be an array when provided');
    }

    if (errors.length > 0) {
      return ErrorResponses.validation('Invalid resource payload', errors);
    }

    const treeResult = await validateTreeIds(treeIds, context.character.id);
    if (!treeResult.valid) {
      return ErrorResponses.validation('Invalid treeIds', treeResult.errors);
    }

    if (Array.isArray(subSkillTags) && subSkillTags.length > 0) {
      const tagResult = await validateSubSkillTags(subSkillTags, treeIds, context.character.id);
      if (!tagResult.valid) {
        return ErrorResponses.validation('Invalid subSkillTags', tagResult.errors);
      }
    }

    const resource = await prisma.resource.create({
      data: {
        characterId: context.character.id,
        type,
        title: title.trim(),
        author: typeof author === 'string' ? author : null,
        url: typeof url === 'string' ? url : null,
        treeIds,
        subSkillTags: Array.isArray(subSkillTags) ? subSkillTags : [],
        progress: 0,
        trees: { connect: treeIds.map((id: string) => ({ id })) }
      },
      include: { trees: true }
    });

    return Response.json(resource, { status: 201 });
  } catch (error) {
    logError(error as Error, { path: '/api/resources', method: 'POST' });
    return ErrorResponses.internal();
  }
}
