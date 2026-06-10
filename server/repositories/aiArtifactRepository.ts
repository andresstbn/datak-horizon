import { desc, eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { aiArtifacts, type AIArtifact, type NewAIArtifact } from '../db/schema'

const creatorColumns = {
  columns: {
    id: true,
    displayName: true,
    email: true,
    photoUrl: true
  }
} as const

export const aiArtifactRepository = {
  async listByInitiative(initiativeId: string) {
    const db = getDb()
    return db.query.aiArtifacts.findMany({
      where: eq(aiArtifacts.initiativeId, initiativeId),
      with: {
        createdBy: creatorColumns,
        requirement: {
          columns: {
            title: true
          }
        },
        sourceConversation: {
          columns: {
            title: true
          }
        }
      },
      orderBy: [desc(aiArtifacts.createdAt)]
    })
  },

  async findById(id: string) {
    const db = getDb()
    return db.query.aiArtifacts.findFirst({
      where: eq(aiArtifacts.id, id),
      with: {
        createdBy: creatorColumns,
        requirement: {
          columns: {
            title: true
          }
        },
        sourceConversation: {
          columns: {
            title: true
          }
        }
      }
    })
  },

  async create(data: NewAIArtifact): Promise<AIArtifact> {
    const db = getDb()
    const [row] = await db.insert(aiArtifacts).values(data).returning()
    return row!
  },

  async update(id: string, data: Partial<NewAIArtifact>): Promise<AIArtifact> {
    const db = getDb()
    const [row] = await db
      .update(aiArtifacts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(aiArtifacts.id, id))
      .returning()
    return row!
  }
}

export type ArtifactWithDetails = Awaited<
  ReturnType<typeof aiArtifactRepository.listByInitiative>
>[number]
export type ArtifactDetailRow = NonNullable<
  Awaited<ReturnType<typeof aiArtifactRepository.findById>>
>
