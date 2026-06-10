import { insightRepository, type InsightWithDetails } from '../repositories/insightRepository'
import type { Insight, CreateInsightInput } from '../../shared/types/insight'
import type { OwnerRef } from '../../shared/types/initiative'

function toAuthorRef(user: InsightWithDetails['author']): OwnerRef | null {
  if (!user) {
    return null
  }
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    photoUrl: user.photoUrl
  }
}

function toInsight(row: InsightWithDetails): Insight {
  return {
    id: row.id,
    initiativeId: row.initiativeId,
    sourceConversationId: row.sourceConversationId,
    type: row.type,
    body: row.body,
    source: row.source,
    confidence: row.confidence,
    authorId: row.authorId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: toAuthorRef(row.author),
    sourceConversationTitle: row.sourceConversation?.title ?? null
  }
}

export const insightService = {
  async listByInitiative(initiativeId: string): Promise<Insight[]> {
    const rows = await insightRepository.listByInitiative(initiativeId)
    return rows.map(toInsight)
  },

  async create(
    initiativeId: string,
    data: CreateInsightInput,
    userId: string
  ): Promise<Insight> {
    const row = await insightRepository.create({
      initiativeId,
      sourceConversationId: data.sourceConversationId ?? null,
      type: data.type,
      body: data.body,
      source: data.source ?? 'manual',
      confidence: data.confidence ?? null,
      authorId: userId
    })

    // Fetch the list of details to return with author profile and conversation title
    const list = await insightRepository.listByInitiative(initiativeId)
    const matched = list.find(i => i.id === row.id)
    if (!matched) {
      throw new Error('Failed to retrieve newly created insight')
    }

    return toInsight(matched)
  }
}
