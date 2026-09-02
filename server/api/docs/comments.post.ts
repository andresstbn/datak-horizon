import { defineEventHandler, getRequestURL, readBody } from 'h3'
import { requireAuth } from '../../utils/auth'
import { getBranchParam, parseDocFilename, parseDocType } from '../../utils/docsRequest'
import { httpError } from '../../utils/httpError'
import { githubPrService } from '../../services/githubPrService'

const MAX_COMMENT_LENGTH = 10000

/**
 * POST /api/docs/comments — publishes a comment about one document into the
 * open PR of its branch.
 * Thin handler: authenticates, validates input and delegates. The author is
 * taken from the verified session, never from the request body.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const branch = getBranchParam(event)
  const body = await readBody<{ tipo?: unknown, filename?: unknown, body?: unknown }>(event)

  const tipo = parseDocType(body?.tipo)
  const filename = parseDocFilename(body?.filename)

  const text = typeof body?.body === 'string' ? body.body.trim() : ''
  if (!text) {
    throw httpError(400, 'El comentario no puede estar vacío.')
  }
  if (text.length > MAX_COMMENT_LENGTH) {
    throw httpError(400, `El comentario supera el máximo de ${MAX_COMMENT_LENGTH} caracteres.`)
  }

  const origin = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin
  const docUrl = `${origin}/docs?branch=${encodeURIComponent(branch)}&tipo=${tipo}&doc=${encodeURIComponent(filename)}`
  const authorName = user.name || user.email || user.uid

  return githubPrService.addComment(branch, tipo, filename, text, authorName, docUrl)
})
