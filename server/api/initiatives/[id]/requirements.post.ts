import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { userService } from '../../../services/userService'
import { requirementService } from '../../../services/requirementService'

export default defineEventHandler(async (event) => {
  const token = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de iniciativa no provisto.' })
  }

  const body = await readBody(event)
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'El título del requerimiento es obligatorio.' })
  }
  if (typeof body.description !== 'string' || !body.description.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'La descripción del requerimiento es obligatoria.' })
  }
  if (!body.priority) {
    throw createError({ statusCode: 400, statusMessage: 'La prioridad del requerimiento es obligatoria.' })
  }

  const user = await userService.getOrCreateFromToken(token)

  return requirementService.create(id, {
    sourceConversationId: body.sourceConversationId || null,
    title: body.title.trim(),
    description: body.description.trim(),
    priority: body.priority,
    status: body.status || 'draft'
  }, user.id)
})
