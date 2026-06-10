import { desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '../db/client'
import { requirements, type Requirement, type NewRequirement } from '../db/schema'

const creatorColumns = {
  columns: {
    id: true,
    displayName: true,
    email: true,
    photoUrl: true
  }
} as const

export const requirementRepository = {
  async listByInitiative(initiativeId: string) {
    const db = getDb()
    return db.query.requirements.findMany({
      where: eq(requirements.initiativeId, initiativeId),
      with: {
        createdBy: creatorColumns,
        sourceConversation: {
          columns: {
            title: true
          }
        }
      },
      orderBy: [desc(requirements.createdAt)]
    })
  },

  async listRefining(limit: number = 5) {
    const db = getDb()
    return db.query.requirements.findMany({
      where: inArray(requirements.status, ['draft', 'refining']),
      with: {
        createdBy: creatorColumns,
        sourceConversation: {
          columns: {
            title: true
          }
        },
        initiative: {
          columns: {
            title: true
          }
        }
      },
      orderBy: [desc(requirements.createdAt)],
      limit
    })
  },

  async findById(id: string): Promise<Requirement | undefined> {
    const db = getDb()
    const [row] = await db.select().from(requirements).where(eq(requirements.id, id)).limit(1)
    return row
  },

  async create(data: NewRequirement): Promise<Requirement> {
    const db = getDb()
    const [row] = await db.insert(requirements).values(data).returning()
    return row!
  },

  async update(id: string, data: Partial<NewRequirement>): Promise<Requirement> {
    const db = getDb()
    const [row] = await db
      .update(requirements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(requirements.id, id))
      .returning()
    return row!
  }
}

export type RequirementWithDetails = Awaited<
  ReturnType<typeof requirementRepository.listByInitiative>
>[number]

export type RequirementWithInitiative = Awaited<
  ReturnType<typeof requirementRepository.listRefining>
>[number]
