/**
 * Quest Completion API
 *
 * POST /api/quests/[id]/complete → run QuestCompletionService, award and
 * distribute XP, handle level-ups. Quest must be ACTIVE.
 *
 * Per Requirements 13.1-13.5
 */

import { requireCharacter } from '@/lib/api/session';
import { completeQuest } from '@/lib/services/questCompletion';
import { ErrorResponses } from '@/lib/api/errorResponse';
import { logError } from '@/lib/api/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    const { id } = await params;

    const result = await completeQuest(id, context.character.id);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return ErrorResponses.notFound('Quest');
    }
    if (message.includes('does not belong')) {
      return ErrorResponses.notFound('Quest');
    }
    if (message.includes('ACTIVE') || message.includes('no activity logs')) {
      return ErrorResponses.validation(message);
    }

    logError(error as Error, { path: '/api/quests/[id]/complete', method: 'POST' });
    return ErrorResponses.transactionFailed();
  }
}
