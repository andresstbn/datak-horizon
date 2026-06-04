import { defineEventHandler } from 'h3'
import { requireAuth } from '../utils/auth'
import { userService } from '../services/userService'

/**
 * GET /api/me — returns the application profile for the authenticated user.
 * Thin handler: it only authenticates and delegates to the service layer.
 */
export default defineEventHandler(async (event) => {
  const token = await requireAuth(event)
  const user = await userService.getOrCreateFromToken(token)

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    photoUrl: user.photoUrl,
    role: user.role
  }
})
