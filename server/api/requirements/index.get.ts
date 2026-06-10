import { defineEventHandler } from 'h3'
import { requireAuth } from '../../utils/auth'
import { requirementService } from '../../services/requirementService'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  return requirementService.listRefining(5)
})
