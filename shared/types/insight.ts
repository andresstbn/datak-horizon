import type { OwnerRef } from './initiative'

export type InsightType = 'constraint' | 'dependency' | 'decision' | 'rule' | 'assumption' | 'risk'
export type InsightSource = 'manual' | 'ai_extracted'

export interface Insight {
  id: string
  initiativeId: string
  sourceConversationId: string | null
  type: InsightType
  body: string
  source: InsightSource
  confidence: number | null
  authorId: string | null
  createdAt: string
  updatedAt: string
  author?: OwnerRef | null
  sourceConversationTitle?: string | null
}

export interface CreateInsightInput {
  sourceConversationId?: string | null
  type: InsightType
  body: string
  source?: InsightSource
  confidence?: number | null
}
