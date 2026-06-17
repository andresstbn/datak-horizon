import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAuth } from '../../utils/auth'
import { conversationMessageRepository } from '../../repositories/conversationMessageRepository'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de mensaje no provisto.' })
  }

  await conversationMessageRepository.delete(id)

  return { success: true }
})
