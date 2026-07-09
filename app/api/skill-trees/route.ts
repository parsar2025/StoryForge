/**
 * Skill Trees API
 *
 * GET /api/skill-trees → the character's 11 trees, CORE first then SUPPORT,
 * each ordered by key. Trees are auto-provisioned if missing.
 */

import { requireCharacter } from '@/lib/api/session';
import { prisma } from '@/lib/prisma';
import { ErrorResponses } from '@/lib/api/errorResponse';
import { logError } from '@/lib/api/logger';

export async function GET() {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    const trees = await prisma.skillTree.findMany({
      where: { characterId: context.character.id },
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    });

    return Response.json(trees);
  } catch (error) {
    logError(error as Error, { path: '/api/skill-trees', method: 'GET' });
    return ErrorResponses.internal();
  }
}
