import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { githubDocsService } from '../../../services/githubDocsService'
import type { DocType } from '~~/shared/types/doc'

/**
 * GET /api/docs/:tipo/:filename — returns frontmatter and markdown body of a document.
 * Thin handler: authenticates, validates params, and delegates to githubDocsService.
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const tipo = getRouterParam(event, 'tipo') as DocType
  const filename = getRouterParam(event, 'filename')

  if (!tipo || (tipo !== 'rf' && tipo !== 'specs')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El tipo de documento debe ser "rf" o "specs"'
    })
  }

  if (!filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El nombre del archivo es requerido'
    })
  }

  const query = getQuery(event)
  const force = query.force === 'true' || query.force === '1'

  const doc = await githubDocsService.getDoc(tipo, filename, force)
  if (!doc) {
    throw createError({
      statusCode: 404,
      statusMessage: `Documento no encontrado: ${tipo}/${filename}`
    })
  }

  return doc
})
