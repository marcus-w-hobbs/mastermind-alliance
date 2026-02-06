/**
 * Auth utilities stub
 * This repo has no authentication layer.
 * Users provide their own API keys via .env.local
 */

/**
 * Returns the current user ID for memory operations
 * Since there's no auth, returns a static default user ID
 */
export function getCurrentMemoryUserId(): string | null {
  // No authentication - return default user ID for local development
  return process.env.MEMORY_USER_ID || 'default-local-user';
}
