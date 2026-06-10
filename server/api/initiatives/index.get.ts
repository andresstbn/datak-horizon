import { defineEventHandler } from 'h3'
import { requireAuth } from '../../utils/auth'
import { initiativeService } from '../../services/initiativeService'

/**
 * GET /api/initiatives — list initiatives for the roadmap.
 * Thin handler: authenticate, then delegate to the service layer.
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  return initiativeService.list()
})
