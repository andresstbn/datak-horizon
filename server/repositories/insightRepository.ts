import { desc, eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { insights, type Insight, type NewInsight } from '../db/schema'

const authorColumns = {
  columns: {
    id: true,
    displayName: true,
    email: true,
    photoUrl: true
  }
} as const

export const insightRepository = {
  async listByInitiative(initiativeId: string) {
    const db = getDb()
    return db.query.insights.findMany({
      where: eq(insights.initiativeId, initiativeId),
      with: {
        author: authorColumns,
        sourceConversation: {
          columns: {
            title: true
          }
        }
      },
      orderBy: [desc(insights.createdAt)]
    })
  },

  async create(data: NewInsight): Promise<Insight> {
    const db = getDb()
    const [row] = await db.insert(insights).values(data).returning()
    return row!
  }
}

export type InsightWithDetails = Awaited<
  ReturnType<typeof insightRepository.listByInitiative>
>[number]
