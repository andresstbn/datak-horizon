import { createError, getHeader, type H3Event } from 'h3'
import { getAdminAuth } from './firebaseAdmin'
import { isEmailAllowed } from './allowlist'

/** Normalised shape of a verified Firebase ID token. */
export interface VerifiedToken {
  uid: string
  email?: string
  name?: string
  picture?: string
  emailVerified?: boolean
}

/**
 * Helper to safely resolve runtime auth allowlist if present in Nitro config or env.
 */
export function getRuntimeAuthAllowlist(event?: H3Event): string | undefined {
  try {
    const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
    return (config?.authAllowlist as string) || process.env.NUXT_AUTH_ALLOWLIST
  } catch {
    return process.env.NUXT_AUTH_ALLOWLIST
  }
}

/**
 * Verify a raw Firebase ID token via the Admin SDK.
 * Throws a 401 if the token is missing or invalid.
 */
export async function verifyIdToken(idToken: string): Promise<VerifiedToken> {
  if (!idToken) {
    throw createError({ statusCode: 401, statusMessage: 'Missing ID token' })
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      emailVerified: decoded.email_verified
    }
  } catch (error) {
    console.error('Error verifying ID token:', error)
    throw createError({ statusCode: 401, statusMessage: 'Invalid ID token' })
  }
}

/**
 * Extract a Bearer token from the request, verify it with Firebase Admin SDK,
 * and ensure that the user's email is present in the authorized allowlist.
 * Throws 401 for unauthenticated/invalid tokens and 403 for unauthorized users.
 */
export async function requireAuth(event: H3Event): Promise<VerifiedToken> {
  const header = getHeader(event, 'authorization') ?? ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Missing or malformed Authorization header'
    })
  }

  const verified = await verifyIdToken(token)

  // The allowlist keys on the email, so the email must be proven. Firebase
  // issues valid tokens for any provider enabled on the project, and a
  // self-service one (e.g. email/password) would let anyone mint a token
  // claiming an allowlisted address with `email_verified: false`.
  const customAllowlist = getRuntimeAuthAllowlist(event)
  if (!verified.email || !verified.emailVerified || !isEmailAllowed(verified.email, customAllowlist)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: user email is not authorized in Horizon allowlist'
    })
  }

  return verified
}
