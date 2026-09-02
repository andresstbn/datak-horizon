import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { requireAuth } from '../../../../utils/auth'
import { githubDocsService } from '../../../../services/githubDocsService'

/**
 * GET /api/docs/assets/:pageId/:name — image proxy for private repo assets.
 * Thin handler: authenticates, proxies binary with content-type and caching.
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const pageId = getRouterParam(event, 'pageId')
  const name = getRouterParam(event, 'name')

  if (!pageId || !name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Faltan parámetros pageId o name'
    })
  }

  const asset = await githubDocsService.getAsset(pageId, name)
  if (!asset) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Imagen no encontrada'
    })
  }

  setHeader(event, 'Content-Type', asset.contentType)
  setHeader(event, 'Cache-Control', 'public, max-age=300')
  return Buffer.from(asset.base64, 'base64')
})
