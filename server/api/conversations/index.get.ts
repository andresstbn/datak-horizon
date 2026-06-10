import { defineEventHandler } from 'h3'
import { requireAuth } from '../../utils/auth'
import { conversationService } from '../../services/conversationService'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  return conversationService.listRecent(5)
})
