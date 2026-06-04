import { createError, getHeader, type H3Event } from 'h3'
import { getAdminAuth } from './firebaseAdmin'

/** Normalised shape of a verified Firebase ID token. */
export interface VerifiedToken {
  uid: string
  email?: string
  name?: string
  picture?: string
  emailVerified?: boolean
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

/** Extract a Bearer token from the request and verify it. */
export async function requireAuth(event: H3Event): Promise<VerifiedToken> {
  const header = getHeader(event, 'authorization') ?? ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Missing or malformed Authorization header'
    })
  }

  return verifyIdToken(token)
}
