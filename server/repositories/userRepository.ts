import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { users, type NewUser, type User } from '../db/schema'

/**
 * Data-access layer for users. Repositories are the only place that talk to
 * the database directly; services orchestrate, handlers stay thin.
 */
export const userRepository = {
  async findByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const db = getDb()
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid))
      .limit(1)
    return row
  },

  async findByEmail(email: string): Promise<User | undefined> {
    const db = getDb()
    const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    return row
  },

  async create(data: NewUser): Promise<User> {
    const db = getDb()
    const [row] = await db.insert(users).values(data).returning()
    return row!
  }
}
