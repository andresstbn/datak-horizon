import { desc, eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { conversations, type Conversation, type NewConversation } from '../db/schema'

const creatorColumns = {
  columns: {
    id: true,
    displayName: true,
    email: true,
    photoUrl: true
  }
} as const

export const conversationRepository = {
  async listByInitiative(initiativeId: string) {
    const db = getDb()
    return db.query.conversations.findMany({
      where: eq(conversations.initiativeId, initiativeId),
      with: {
        createdBy: creatorColumns
      },
      orderBy: [desc(conversations.createdAt)]
    })
  },

  async listRecent(limit: number = 5) {
    const db = getDb()
    return db.query.conversations.findMany({
      with: {
        createdBy: creatorColumns,
        initiative: {
          columns: {
            title: true
          }
        }
      },
      orderBy: [desc(conversations.createdAt)],
      limit
    })
  },

  async findById(id: string): Promise<Conversation | undefined> {
    const db = getDb()
    const [row] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1)
    return row
  },

  async create(data: NewConversation): Promise<Conversation> {
    const db = getDb()
    const [row] = await db.insert(conversations).values(data).returning()
    return row!
  }
}

export type ConversationWithCreator = Awaited<
  ReturnType<typeof conversationRepository.listByInitiative>
>[number]

export type ConversationWithInitiative = Awaited<
  ReturnType<typeof conversationRepository.listRecent>
>[number]
