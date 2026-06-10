import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { userService } from '../../../services/userService'
import { insightService } from '../../../services/insightService'

export default defineEventHandler(async (event) => {
  const token = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de iniciativa no provisto.' })
  }

  const body = await readBody(event)
  if (!body || typeof body.body !== 'string' || !body.body.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'El contenido del insight es obligatorio.' })
  }
  if (!body.type) {
    throw createError({ statusCode: 400, statusMessage: 'El tipo de insight es obligatorio.' })
  }

  const user = await userService.getOrCreateFromToken(token)

  return insightService.create(id, {
    sourceConversationId: body.sourceConversationId || null,
    type: body.type,
    body: body.body.trim(),
    source: body.source || 'manual',
    confidence: body.confidence !== undefined && body.confidence !== null ? Number(body.confidence) : null
  }, user.id)
})
