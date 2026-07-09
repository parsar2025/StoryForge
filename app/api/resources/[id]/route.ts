/**
 * Resources API (single)
 *
 * PATCH  /api/resources/[id] → update progress (0-100) and notes
 * DELETE /api/resources/[id] → delete resource
 *
 * Per Requirements 4.5, 16.3, 16.4
 */

import { requireCharacter } from '@/lib/api/session';
import { prisma } from '@/lib/prisma';
import { ErrorResponses } from '@/lib/api/errorResponse';
import { logError } from '@/lib/api/logger';
import type { Prisma } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    const { id } = await params;

    const existing = await prisma.resource.findUnique({ where: { id } });
    if (!existing || existing.characterId !== context.character.id) {
      return ErrorResponses.notFound('Resource');
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return ErrorResponses.validation('Request body must be a JSON object');
    }

    const data: Prisma.ResourceUpdateInput = {};

    if (body.progress !== undefined) {
      if (!Number.isInteger(body.progress) || body.progress < 0 || body.progress > 100) {
        return ErrorResponses.validation('progress must be an integer between 0 and 100');
      }
      data.progress = body.progress;
    }

    if (body.notes !== undefined) {
      if (body.notes !== null && typeof body.notes !== 'string') {
        return ErrorResponses.validation('notes must be a string or null');
      }
      data.notes = body.notes;
    }

    const updated = await prisma.resource.update({
      where: { id },
      data,
      include: { trees: true }
    });

    return Response.json(updated);
  } catch (error) {
    logError(error as Error, { path: '/api/resources/[id]', method: 'PATCH' });
    return ErrorResponses.internal();
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    const { id } = await params;

    const existing = await prisma.resource.findUnique({ where: { id } });
    if (!existing || existing.characterId !== context.character.id) {
      return ErrorResponses.notFound('Resource');
    }

    await prisma.resource.delete({ where: { id } });

    return new Response(null, { status: 204 });
  } catch (error) {
    logError(error as Error, { path: '/api/resources/[id]', method: 'DELETE' });
    return ErrorResponses.internal();
  }
}
