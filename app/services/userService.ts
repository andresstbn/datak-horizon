import type { OwnerRef } from '~~/shared/types/initiative'

/**
 * Frontend client service for user endpoints.
 * Must be the only place calling /api/users on the client.
 */
export const userService = {
  async list(idToken: string): Promise<OwnerRef[]> {
    return $fetch<OwnerRef[]>('/api/users', {
      headers: { Authorization: `Bearer ${idToken}` }
    })
  }
}
