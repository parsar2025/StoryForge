/**
 * Character API
 *
 * GET  /api/character  → auto-provision and return the character with 11 trees
 * PATCH /api/character → rename the character (name field only)
 *
 * Per Requirements 1.2, 10.1-10.5
 */

import { requireCharacter } from '@/lib/api/session';
import { prisma } from '@/lib/prisma';
import { ErrorResponses } from '@/lib/api/errorResponse';
import { logError } from '@/lib/api/logger';

export async function GET() {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    return Response.json(context.character);
  } catch (error) {
    logError(error as Error, { path: '/api/character', method: 'GET' });
    return ErrorResponses.internal();
  }
}

export async function PATCH(request: Request) {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    const body = await request.json().catch(() => null);

    if (!body || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return ErrorResponses.validation('A non-empty "name" string is required', [
        'name must be a non-empty string'
      ]);
    }

    const updated = await prisma.character.update({
      where: { id: context.character.id },
      data: { name: body.name.trim() },
      include: {
        skillTrees: {
          orderBy: [{ category: 'asc' }, { key: 'asc' }]
        }
      }
    });

    return Response.json(updated);
  } catch (error) {
    logError(error as Error, { path: '/api/character', method: 'PATCH' });
    return ErrorResponses.internal();
  }
}
