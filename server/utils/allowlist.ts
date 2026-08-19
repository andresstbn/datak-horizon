/**
 * Default versioned allowlist for Datak Horizon access.
 *
 * Adding or removing authorized users requires updating this list (or the
 * `NUXT_AUTH_ALLOWLIST` environment variable) and deploying the application.
 */
export const DEFAULT_ALLOWED_EMAILS: readonly string[] = Object.freeze([
  // Real users (from production database audit). Seed users from
  // `server/db/seed.ts` are deliberately absent: they only populate the local
  // database and cannot sign in (`.example` is a reserved TLD, so no Google
  // account can exist there). Use `NUXT_AUTH_ALLOWLIST` for local overrides.
  'daestebanc@gmail.com',
  'daniel@datak.co',
  'eduardo.luna@datak.co',
  'tania@datak.co'
])

/**
 * Normalize an email address for case-insensitive comparison.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Parse an allowlist configuration string (e.g. comma-separated emails).
 */
export function parseAllowlistString(rawList?: string | null): string[] {
  if (!rawList || typeof rawList !== 'string') {
    return []
  }

  return rawList
    .split(',')
    .map(email => normalizeEmail(email))
    .filter(email => email.length > 0)
}

/**
 * Get the effective set of authorized emails, combining default versioned emails
 * with any extra emails specified in runtime configuration.
 */
export function getAllowedEmails(customAllowlist?: string | null): Set<string> {
  const allowed = new Set<string>(DEFAULT_ALLOWED_EMAILS.map(normalizeEmail))

  if (customAllowlist) {
    for (const email of parseAllowlistString(customAllowlist)) {
      allowed.add(email)
    }
  }

  return allowed
}

/**
 * Check whether a given email address is authorized in the allowlist.
 */
export function isEmailAllowed(
  email?: string | null,
  customAllowlist?: string | null
): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  const normalized = normalizeEmail(email)
  const allowedSet = getAllowedEmails(customAllowlist)
  return allowedSet.has(normalized)
}
