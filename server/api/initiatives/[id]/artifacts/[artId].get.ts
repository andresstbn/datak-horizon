import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAuth } from '../../../../utils/auth'
import { aiArtifactService } from '../../../../services/aiArtifactService'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const artId = getRouterParam(event, 'artId')
  if (!artId) {
    throw createError({ statusCode: 400, statusMessage: 'ID de artefacto no provisto.' })
  }

  const artifact = await aiArtifactService.getById(artId)
  if (!artifact) {
    throw createError({ statusCode: 404, statusMessage: 'Artefacto no encontrado.' })
  }

  return artifact
})
