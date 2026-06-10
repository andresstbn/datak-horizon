import { createError, defineEventHandler, readBody } from 'h3'
import { requireAuth } from '../../utils/auth'
import { userService } from '../../services/userService'
import { initiativeService } from '../../services/initiativeService'

export default defineEventHandler(async (event) => {
  const token = await requireAuth(event)
  const body = await readBody(event)

  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'El título es obligatorio.' })
  }

  const user = await userService.getOrCreateFromToken(token)

  const payload = {
    title: body.title.trim(),
    description: body.description || null,
    status: body.status || 'discovery',
    priority: body.priority || 'medium',
    risk: body.risk || 'low',
    health: body.health || 'on_track',
    functionalOwnerId: body.functionalOwnerId || null,
    technicalOwnerId: body.technicalOwnerId || null,
    targetDate: body.targetDate ? new Date(body.targetDate) : null,
    committedDate: body.committedDate ? new Date(body.committedDate) : null,
    estimatedDate: body.estimatedDate ? new Date(body.estimatedDate) : null,
    delayReason: body.delayReason || null
  }

  return initiativeService.create(payload, user.id)
})
