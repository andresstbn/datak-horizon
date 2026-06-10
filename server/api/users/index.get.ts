import { defineEventHandler } from 'h3'
import { requireAuth } from '../../utils/auth'
import { userRepository } from '../../repositories/userRepository'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const list = await userRepository.listAll()
  return list.map(u => ({
    id: u.id,
    displayName: u.displayName,
    email: u.email,
    photoUrl: u.photoUrl
  }))
})
