import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAuth } from '../../utils/auth'
import { requirementService } from '../../services/requirementService'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de requerimiento no provisto.' })
  }

  const body = await readBody(event)
  if (!body) {
    throw createError({ statusCode: 400, statusMessage: 'El cuerpo de la solicitud no puede estar vacío.' })
  }

  const payload: Record<string, any> = {}
  if (body.title !== undefined) payload.title = body.title
  if (body.description !== undefined) payload.description = body.description
  if (body.priority !== undefined) payload.priority = body.priority
  if (body.status !== undefined) payload.status = body.status

  return requirementService.update(id, payload)
})
