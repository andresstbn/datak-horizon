import { defineEventHandler, getQuery } from 'h3'
import { requireAuth } from '../../utils/auth'
import { getBranchParam, parseDocFilename, parseDocType } from '../../utils/docsRequest'
import { githubPrService } from '../../services/githubPrService'

/**
 * GET /api/docs/comments — comments written about one document, read from the
 * open PR of its branch.
 * Thin handler: authenticates, validates params and delegates.
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const branch = getBranchParam(event)
  const query = getQuery(event)
  const tipo = parseDocType(query.tipo)
  const filename = parseDocFilename(query.filename)

  return githubPrService.listComments(branch, tipo, filename)
})
