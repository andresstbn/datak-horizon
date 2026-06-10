import { asc, eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { conversationMessages, type ConversationMessage, type NewConversationMessage } from '../db/schema'

const authorColumns = {
  columns: {
    id: true,
    displayName: true,
    email: true,
    photoUrl: true
  }
} as const

export const conversationMessageRepository = {
  async listByConversation(conversationId: string) {
    const db = getDb()
    return db.query.conversationMessages.findMany({
      where: eq(conversationMessages.conversationId, conversationId),
      with: {
        author: authorColumns
      },
      orderBy: [asc(conversationMessages.createdAt)]
    })
  },

  async create(data: NewConversationMessage): Promise<ConversationMessage> {
    const db = getDb()
    const [row] = await db.insert(conversationMessages).values(data).returning()
    return row!
  }
}

export type MessageWithAuthor = Awaited<
  ReturnType<typeof conversationMessageRepository.listByConversation>
>[number]
