import { userRepository } from '../repositories/userRepository'
import type { User } from '../db/schema'
import type { VerifiedToken } from '../utils/auth'

/**
 * Business logic around application users. Maps a verified Firebase identity to
 * an application profile, creating it on first sign-in (just-in-time provisioning).
 */
export const userService = {
  async getOrCreateFromToken(token: VerifiedToken): Promise<User> {
    const existing = await userRepository.findByFirebaseUid(token.uid)
    if (existing) {
      return existing
    }

    return userRepository.create({
      firebaseUid: token.uid,
      email: token.email ?? `${token.uid}@unknown.local`,
      displayName: token.name ?? null,
      photoUrl: token.picture ?? null
    })
  }
}
