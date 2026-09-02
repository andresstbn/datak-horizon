import { createError } from 'h3'

/**
 * Builds an HTTP error for the service layer, which must not import h3 directly
 * (see RULES.md §7 import boundaries).
 */
export function httpError(statusCode: number, statusMessage: string) {
  return createError({ statusCode, statusMessage })
}
