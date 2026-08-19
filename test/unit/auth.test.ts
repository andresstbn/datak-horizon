import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the Firebase Admin layer so the auth utility can be tested in isolation
// (avoids the '#imports' alias and real credentials).
const verifyIdTokenMock = vi.fn()
vi.mock('../../server/utils/firebaseAdmin', () => ({
  getAdminAuth: () => ({ verifyIdToken: verifyIdTokenMock })
}))

// `h3` is only resolvable inside the Nitro runtime; stub the two helpers used.
vi.mock('h3', () => ({
  createError: (input: { statusCode: number, statusMessage?: string }) =>
    Object.assign(new Error(input.statusMessage ?? 'error'), input),
  getHeader: (event: { node: { req: { headers: Record<string, string> } } }, name: string) =>
    event.node.req.headers[name.toLowerCase()]
}))

const { requireAuth, verifyIdToken } = await import('../../server/utils/auth')

function makeEvent(headers: Record<string, string>): H3Event {
  return { node: { req: { headers } } } as unknown as H3Event
}

describe('auth utility', () => {
  beforeEach(() => {
    verifyIdTokenMock.mockReset()
    delete process.env.NUXT_AUTH_ALLOWLIST
  })

  describe('verifyIdToken', () => {
    it('maps a decoded Firebase token to a VerifiedToken', async () => {
      verifyIdTokenMock.mockResolvedValue({
        uid: 'abc',
        email: 'daniel@datak.co',
        name: 'Daniel',
        picture: 'http://pic',
        email_verified: true
      })

      const result = await verifyIdToken('valid-token')

      expect(result).toEqual({
        uid: 'abc',
        email: 'daniel@datak.co',
        name: 'Daniel',
        picture: 'http://pic',
        emailVerified: true
      })
    })

    it('throws 401 when the token is empty', async () => {
      await expect(verifyIdToken('')).rejects.toMatchObject({ statusCode: 401 })
    })

    it('throws 401 when the Admin SDK rejects the token', async () => {
      verifyIdTokenMock.mockRejectedValue(new Error('expired'))
      await expect(verifyIdToken('bad')).rejects.toMatchObject({ statusCode: 401 })
    })
  })

  describe('requireAuth', () => {
    it('rejects requests without an Authorization header with 401', async () => {
      await expect(requireAuth(makeEvent({}))).rejects.toMatchObject({
        statusCode: 401
      })
    })

    it('rejects a malformed Authorization header with 401', async () => {
      await expect(
        requireAuth(makeEvent({ authorization: 'Token xyz' }))
      ).rejects.toMatchObject({ statusCode: 401 })
    })

    it('rejects with 403 when user is authenticated with Google but NOT in allowlist', async () => {
      verifyIdTokenMock.mockResolvedValue({
        uid: 'unauthorized-uid',
        email: 'random.person@gmail.com',
        name: 'Random User'
      })

      await expect(
        requireAuth(makeEvent({ authorization: 'Bearer valid-unauthorized-token' }))
      ).rejects.toMatchObject({
        statusCode: 403,
        statusMessage: expect.stringContaining('not authorized in Horizon allowlist')
      })
    })

    it('rejects with 403 when decoded token has no email', async () => {
      verifyIdTokenMock.mockResolvedValue({
        uid: 'no-email-uid',
        email: undefined
      })

      await expect(
        requireAuth(makeEvent({ authorization: 'Bearer token-without-email' }))
      ).rejects.toMatchObject({
        statusCode: 403
      })
    })

    it('rejects with 403 when the email is allowlisted but not verified', async () => {
      verifyIdTokenMock.mockResolvedValue({
        uid: 'spoofed-uid',
        email: 'daniel@datak.co',
        name: 'Not Daniel',
        email_verified: false
      })

      await expect(
        requireAuth(makeEvent({ authorization: 'Bearer unverified-token' }))
      ).rejects.toMatchObject({ statusCode: 403 })
    })

    it('accepts an authorized user in the default allowlist', async () => {
      verifyIdTokenMock.mockResolvedValue({
        uid: 'user-daniel',
        email: 'daniel@datak.co',
        name: 'Daniel Esteban',
        email_verified: true
      })

      const result = await requireAuth(makeEvent({ authorization: 'Bearer good-token' }))

      expect(result.uid).toBe('user-daniel')
      expect(result.email).toBe('daniel@datak.co')
      expect(verifyIdTokenMock).toHaveBeenCalledWith('good-token')
    })

    it('accepts an authorized user with case-insensitive email', async () => {
      verifyIdTokenMock.mockResolvedValue({
        uid: 'user-tania',
        email: 'TANIA@DATAK.CO',
        name: 'Tania',
        email_verified: true
      })

      const result = await requireAuth(makeEvent({ authorization: 'Bearer good-token' }))

      expect(result.uid).toBe('user-tania')
      expect(result.email).toBe('TANIA@DATAK.CO')
    })

    it('accepts an authorized user configured via NUXT_AUTH_ALLOWLIST env', async () => {
      process.env.NUXT_AUTH_ALLOWLIST = 'newcolleague@datak.co, external@partner.com'

      verifyIdTokenMock.mockResolvedValue({
        uid: 'user-new',
        email: 'newcolleague@datak.co',
        name: 'New Colleague',
        email_verified: true
      })

      const result = await requireAuth(makeEvent({ authorization: 'Bearer good-token' }))

      expect(result.uid).toBe('user-new')
      expect(result.email).toBe('newcolleague@datak.co')
    })
  })
})
