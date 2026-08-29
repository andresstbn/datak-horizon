import { defineEventHandler } from 'h3'
import { requireAuth } from '../../utils/auth'
import { githubDocsService } from '../../services/githubDocsService'

/**
 * GET /api/docs — returns the list of RF and SPEC documents.
 * Thin handler: authenticates and delegates to githubDocsService.
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  return githubDocsService.listDocs()
})
