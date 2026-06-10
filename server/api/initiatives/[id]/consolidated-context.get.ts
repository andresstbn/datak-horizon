import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { consolidatedContextService } from '../../../services/consolidatedContextService'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de iniciativa no provisto.' })
  }

  try {
    const markdown = await consolidatedContextService.generateMarkdown(id)
    return { markdown }
  } catch (error: any) {
    throw createError({ statusCode: 404, statusMessage: error.message || 'Iniciativa no encontrada.' })
  }
})
