import { defineEventHandler, getQuery } from 'h3'
import { requireAuth } from '../../utils/auth'
import { githubDocsService } from '../../services/githubDocsService'

/**
 * GET /api/docs — returns the list of RF and SPEC documents.
 * Thin handler: authenticates and delegates to githubDocsService.
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const query = getQuery(event)
  const force = query.force === 'true' || query.force === '1'
  return githubDocsService.listDocs(force)
})
