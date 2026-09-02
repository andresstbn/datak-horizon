import { getQuery, type H3Event } from 'h3'
import type { DocType } from '~~/shared/types/doc'
import { DEFAULT_DOC_BRANCH } from '~~/shared/utils/docs'
import { isValidBranchName } from './githubGraphql'
import { httpError } from './httpError'

/**
 * Reads and validates the `branch` query parameter, defaulting to the main branch.
 */
export function getBranchParam(event: H3Event): string {
  const raw = getQuery(event).branch
  if (raw === undefined || raw === null || raw === '') {
    return DEFAULT_DOC_BRANCH
  }

  const branch = String(raw)
  if (!isValidBranchName(branch)) {
    throw httpError(400, `Nombre de rama inválido: "${branch}"`)
  }

  return branch
}

/** Narrows an unknown value to a DocType, or rejects it. */
export function parseDocType(value: unknown): DocType {
  if (value !== 'rf' && value !== 'specs') {
    throw httpError(400, 'El tipo de documento debe ser "rf" o "specs"')
  }
  return value
}

/** Narrows an unknown value to a bare markdown filename, or rejects it. */
export function parseDocFilename(value: unknown): string {
  const filename = typeof value === 'string' ? value.trim() : ''
  if (!/^[\w.-]+\.md$/.test(filename)) {
    throw httpError(400, 'El nombre del archivo debe ser un documento .md válido')
  }
  return filename
}
