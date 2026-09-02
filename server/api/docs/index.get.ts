import { defineEventHandler, getQuery } from 'h3'
import { requireAuth } from '../../utils/auth'
import { getBranchParam } from '../../utils/docsRequest'
import { githubDocsService } from '../../services/githubDocsService'

/**
 * GET /api/docs — returns the list of RF and SPEC documents for a branch.
 * Thin handler: authenticates, validates the branch and delegates.
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const branch = getBranchParam(event)
  const query = getQuery(event)
  const force = query.force === 'true' || query.force === '1'
  return githubDocsService.listDocs(branch, force)
})
