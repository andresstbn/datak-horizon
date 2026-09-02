import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { getBranchParam, parseDocType } from '../../../utils/docsRequest'
import { githubDocsService } from '../../../services/githubDocsService'

/**
 * GET /api/docs/:tipo/:filename — returns frontmatter and markdown body of a document.
 * Thin handler: authenticates, validates params, and delegates to githubDocsService.
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const tipo = parseDocType(getRouterParam(event, 'tipo'))
  const filename = getRouterParam(event, 'filename')

  if (!filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El nombre del archivo es requerido'
    })
  }

  const branch = getBranchParam(event)
  const query = getQuery(event)
  const force = query.force === 'true' || query.force === '1'

  const doc = await githubDocsService.getDoc(tipo, filename, branch, force)
  if (!doc) {
    throw createError({
      statusCode: 404,
      statusMessage: `Documento no encontrado en "${branch}": ${tipo}/${filename}`
    })
  }

  return doc
})
