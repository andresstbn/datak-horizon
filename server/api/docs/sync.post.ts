import { defineEventHandler } from 'h3'
import { requireAuth } from '../../utils/auth'
import { githubDocsService } from '../../services/githubDocsService'

/**
 * POST /api/docs/sync — force re-syncs documents directly from GitHub,
 * bypassing cached values and returning the updated document index.
 * Thin handler: authenticates and delegates to githubDocsService.
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  return githubDocsService.listDocs(true)
})
