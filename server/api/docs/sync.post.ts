import { defineEventHandler } from 'h3'
import { requireAuth } from '../../utils/auth'
import { getBranchParam } from '../../utils/docsRequest'
import { githubDocsService } from '../../services/githubDocsService'

/**
 * POST /api/docs/sync — invalidates the cached document tree of a branch and
 * returns the freshly fetched index.
 * Thin handler: authenticates, validates the branch and delegates.
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const branch = getBranchParam(event)
  return githubDocsService.listDocs(branch, true)
})
