import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAuth } from '../../utils/auth'
import { initiativeService } from '../../services/initiativeService'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de iniciativa no provisto.' })
  }

  const body = await readBody(event)
  if (!body) {
    throw createError({ statusCode: 400, statusMessage: 'El cuerpo de la solicitud no puede estar vacío.' })
  }

  const payload: Record<string, any> = {}
  if (body.title !== undefined) payload.title = body.title
  if (body.description !== undefined) payload.description = body.description
  if (body.status !== undefined) payload.status = body.status
  if (body.priority !== undefined) payload.priority = body.priority
  if (body.risk !== undefined) payload.risk = body.risk
  if (body.health !== undefined) payload.health = body.health
  if (body.functionalOwnerId !== undefined) payload.functionalOwnerId = body.functionalOwnerId
  if (body.technicalOwnerId !== undefined) payload.technicalOwnerId = body.technicalOwnerId
  if (body.targetDate !== undefined) payload.targetDate = body.targetDate ? new Date(body.targetDate) : null
  if (body.committedDate !== undefined) payload.committedDate = body.committedDate ? new Date(body.committedDate) : null
  if (body.estimatedDate !== undefined) payload.estimatedDate = body.estimatedDate ? new Date(body.estimatedDate) : null
  if (body.delayReason !== undefined) payload.delayReason = body.delayReason
  if (body.archivedAt !== undefined) payload.archivedAt = body.archivedAt ? new Date(body.archivedAt) : null

  const updated = await initiativeService.update(id, payload)
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'La iniciativa no existe.' })
  }

  return updated
})
