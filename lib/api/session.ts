/**
 * API Session Helpers
 *
 * Resolves the authenticated Supabase user and their provisioned character
 * for route handlers. Endpoints call requireCharacter() to get both, or an
 * early Response (401) when unauthenticated.
 */

import { createClient } from '@/lib/supabase/server';
import { getOrCreateCharacter, type CharacterWithTrees } from '@/lib/services/characterProvisioning';
import { ErrorResponses } from '@/lib/api/errorResponse';

/**
 * Authenticated user + provisioned character context for a request.
 */
export interface RequestContext {
  userId: string;
  character: CharacterWithTrees;
}

/**
 * Resolve the authenticated user id from the Supabase session.
 *
 * @returns The user id, or null if no valid session.
 */
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

/**
 * Resolve the authenticated user and their character (auto-provisioned).
 *
 * On success returns { context }. On failure returns { response } holding a
 * ready-to-return 401. Callers should: `if (response) return response;`.
 */
export async function requireCharacter(): Promise<
  { context: RequestContext; response?: never } | { context?: never; response: Response }
> {
  const userId = await getUserId();

  if (!userId) {
    return { response: ErrorResponses.unauthorized() };
  }

  const character = await getOrCreateCharacter(userId);

  return { context: { userId, character } };
}
