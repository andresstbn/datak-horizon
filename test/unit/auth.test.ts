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
  })

  it('maps a decoded Firebase token to a VerifiedToken', async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: 'abc',
      email: 'a@b.com',
      name: 'Ana',
      picture: 'http://pic',
      email_verified: true
    })

    const result = await verifyIdToken('valid-token')

    expect(result).toEqual({
      uid: 'abc',
      email: 'a@b.com',
      name: 'Ana',
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

  it('rejects requests without an Authorization header', async () => {
    await expect(requireAuth(makeEvent({}))).rejects.toMatchObject({
      statusCode: 401
    })
  })

  it('rejects a malformed Authorization header', async () => {
    await expect(
      requireAuth(makeEvent({ authorization: 'Token xyz' }))
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('accepts a valid Bearer token', async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: 'abc', email: 'a@b.com' })

    const result = await requireAuth(makeEvent({ authorization: 'Bearer good' }))

    expect(result.uid).toBe('abc')
    expect(verifyIdTokenMock).toHaveBeenCalledWith('good')
  })
})
