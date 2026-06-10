import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { userService } from '../../../services/userService'
import { conversationService } from '../../../services/conversationService'

export default defineEventHandler(async (event) => {
  const token = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de iniciativa no provisto.' })
  }

  const body = await readBody(event)
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'El título es obligatorio.' })
  }

  const user = await userService.getOrCreateFromToken(token)

  return conversationService.create(id, {
    title: body.title.trim(),
    source: body.source || 'manual'
  }, user.id)
})
