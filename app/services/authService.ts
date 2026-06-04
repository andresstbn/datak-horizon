import type { AppUser } from '~/composables/useAuth'

/**
 * Infrastructure layer for authentication-related backend access.
 * The only place allowed to perform the HTTP call to the protected endpoint.
 */
export const authService = {
  async fetchMe(idToken: string): Promise<AppUser> {
    return $fetch<AppUser>('/api/me', {
      headers: { Authorization: `Bearer ${idToken}` }
    })
  }
}
