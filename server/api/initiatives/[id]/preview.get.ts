import { createError, defineEventHandler, getRouterParam } from 'h3'
import { initiativeService } from '../../../services/initiativeService'

/**
 * GET /api/initiatives/:id/preview — public minimal endpoint for social previews and link previews.
 * Returns strictly the initiative identifier and title.
 * All sensitive/internal data (descriptions, specs, comments, users, etc.) is strictly omitted.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing initiative id' })
  }

  const preview = await initiativeService.getPublicPreview(id)
  if (!preview) {
    throw createError({ statusCode: 404, statusMessage: 'Initiative not found' })
  }

  return preview
})
