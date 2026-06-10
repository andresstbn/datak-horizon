import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { userService } from '../../../services/userService'
import { aiArtifactService } from '../../../services/aiArtifactService'

export default defineEventHandler(async (event) => {
  const token = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de iniciativa no provisto.' })
  }

  const body = await readBody(event)
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'El título del artefacto es obligatorio.' })
  }
  if (typeof body.content !== 'string' || !body.content.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'El contenido del artefacto es obligatorio.' })
  }
  if (!body.type) {
    throw createError({ statusCode: 400, statusMessage: 'El tipo de artefacto es obligatorio.' })
  }

  const user = await userService.getOrCreateFromToken(token)

  return aiArtifactService.create(id, {
    requirementId: body.requirementId || null,
    sourceConversationId: body.sourceConversationId || null,
    type: body.type,
    title: body.title.trim(),
    content: body.content,
    promptUsed: body.promptUsed || null,
    model: body.model || null,
    status: body.status || 'draft'
  }, user.id)
})
