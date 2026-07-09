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
 * Resolve the authenticated user (id + email) from the Supabase session.
 *
 * @returns The user, or null if no valid session.
 */
export async function getAuthUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  return { id: user.id, email: user.email ?? `${user.id}@no-email.local` };
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
  const user = await getAuthUser();

  if (!user) {
    return { response: ErrorResponses.unauthorized() };
  }

  const character = await getOrCreateCharacter(user.id, user.email);

  return { context: { userId: user.id, character } };
}
