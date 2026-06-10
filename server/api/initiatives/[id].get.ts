import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAuth } from '../../utils/auth'
import { initiativeService } from '../../services/initiativeService'

/**
 * GET /api/initiatives/:id — initiative detail for the Resumen tab.
 * Thin handler: authenticate, validate the param, delegate to the service.
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing initiative id' })
  }

  const initiative = await initiativeService.getById(id)
  if (!initiative) {
    throw createError({ statusCode: 404, statusMessage: 'Initiative not found' })
  }
  return initiative
})
