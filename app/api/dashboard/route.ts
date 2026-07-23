/**
 * Dashboard API
 *
 * GET /api/dashboard → single aggregate payload for the dashboard:
 * character summary, 11-tree snapshot, focus signal, active quests, status
 * effects, and the same-day-logging flag. No AI (all AI roles are later phases).
 *
 * Per Phase 2 Requirements 1.1, 1.3, 1.5, 15.1-15.3
 */

import { requireCharacter } from '@/lib/api/session';
import { buildDashboard } from '@/lib/services/dashboard';
import { ErrorResponses } from '@/lib/api/errorResponse';
import { logError } from '@/lib/api/logger';

export async function GET() {
  try {
    const { context, response } = await requireCharacter();
    if (response) return response;

    const payload = await buildDashboard(context.character.id);
    return Response.json(payload);
  } catch (error) {
    logError(error as Error, { path: '/api/dashboard', method: 'GET' });
    return ErrorResponses.internal();
  }
}
