/**
 * Activity Log API (single)
 *
 * PATCH  /api/activity-log/[id] → edit an entry (rejected if quest COMPLETED)
 * DELETE /api/activity-log/[id] → remove an entry (rejected if quest COMPLETED)
 *
 * Per Requirements 15.1-15.5
 */

import { requireCharacter } from '@/lib/api/session';
import { ErrorResponses } from '@/lib/api/errorResponse';
import { logError } from '@/lib/api/logger';
import { updateTimeEntry, deleteTimeEntry, ActivityLogError } from '@/lib/services/activityLog';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    const { id } = await params;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return ErrorResponses.validation('Request body must be a JSON object');
    }

    const updated = await updateTimeEntry(id, context.character.id, {
      durationMin: body.durationMin,
      workedOn: body.workedOn,
      notes: body.notes,
      mood: body.mood,
      difficulty: body.difficulty,
      reflection: body.reflection
    });

    return Response.json(updated);
  } catch (error) {
    if (error instanceof ActivityLogError) {
      return error.status === 404
        ? ErrorResponses.notFound('Activity log')
        : ErrorResponses.validation(error.message);
    }
    logError(error as Error, { path: '/api/activity-log/[id]', method: 'PATCH' });
    return ErrorResponses.internal();
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    const { id } = await params;

    await deleteTimeEntry(id, context.character.id);

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof ActivityLogError) {
      return error.status === 404
        ? ErrorResponses.notFound('Activity log')
        : ErrorResponses.validation(error.message);
    }
    logError(error as Error, { path: '/api/activity-log/[id]', method: 'DELETE' });
    return ErrorResponses.internal();
  }
}
