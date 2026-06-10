import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { userService } from '../../../services/userService'
import { conversationMessageService } from '../../../services/conversationMessageService'

export default defineEventHandler(async (event) => {
  const token = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de conversación no provisto.' })
  }

  const body = await readBody(event)
  if (!body || typeof body.body !== 'string' || !body.body.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'El contenido del mensaje es obligatorio.' })
  }

  const user = await userService.getOrCreateFromToken(token)

  return conversationMessageService.create(id, {
    role: body.role || 'user',
    contentType: body.contentType || 'markdown',
    body: body.body.trim(),
    audioUrl: body.audioUrl || null,
    transcription: body.transcription || null,
    mediaUrl: body.mediaUrl || null
  }, user.id)
})
