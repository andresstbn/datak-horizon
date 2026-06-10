import { desc, eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { initiatives, type Initiative, type NewInitiative } from '../db/schema'

const ownerColumns = {
  columns: {
    id: true,
    displayName: true,
    email: true,
    photoUrl: true
  }
} as const

/**
 * Data-access for initiatives. Only this layer talks to the database.
 */
export const initiativeRepository = {
  /** List every initiative with its functional and technical owners. */
  async listWithOwners() {
    const db = getDb()
    return db.query.initiatives.findMany({
      with: {
        functionalOwner: ownerColumns,
        technicalOwner: ownerColumns
      },
      orderBy: [desc(initiatives.createdAt)]
    })
  },

  /** Fetch a single initiative with owners. */
  async findById(id: string) {
    const db = getDb()
    return db.query.initiatives.findFirst({
      where: eq(initiatives.id, id),
      with: {
        functionalOwner: ownerColumns,
        technicalOwner: ownerColumns
      }
    })
  },

  /** Create a new initiative. */
  async create(data: NewInitiative): Promise<Initiative> {
    const db = getDb()
    const [row] = await db.insert(initiatives).values(data).returning()
    return row!
  },

  /** Update an existing initiative. */
  async update(id: string, data: Partial<NewInitiative>): Promise<Initiative> {
    const db = getDb()
    const [row] = await db
      .update(initiatives)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(initiatives.id, id))
      .returning()
    return row!
  }
}

export type InitiativeWithOwners = Awaited<
  ReturnType<typeof initiativeRepository.listWithOwners>
>[number]

export type InitiativeDetailRow = NonNullable<
  Awaited<ReturnType<typeof initiativeRepository.findById>>
>
