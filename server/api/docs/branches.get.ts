import { defineEventHandler } from 'h3'
import { requireAuth } from '../../utils/auth'
import { githubDocsService } from '../../services/githubDocsService'

/**
 * GET /api/docs/branches — branches whose product docs differ from main.
 * Thin handler: authenticates and delegates.
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  return githubDocsService.listBranches()
})
