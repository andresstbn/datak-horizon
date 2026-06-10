import { conversationRepository, type ConversationWithCreator, type ConversationWithInitiative } from '../repositories/conversationRepository'
import type { Conversation, CreateConversationInput } from '../../shared/types/conversation'
import type { OwnerRef } from '../../shared/types/initiative'

function toOwnerRef(user: ConversationWithCreator['createdBy']): OwnerRef | null {
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

export interface ConversationListItem extends Conversation {
  initiativeTitle?: string
}

function toConversation(row: ConversationWithCreator): Conversation {
  return {
    id: row.id,
    initiativeId: row.initiativeId,
    title: row.title,
    source: row.source,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: toOwnerRef(row.createdBy)
  }
}

function toConversationWithInitiative(row: ConversationWithInitiative): ConversationListItem {
  return {
    ...toConversation(row),
    initiativeTitle: row.initiative?.title
  }
}

export const conversationService = {
  async listByInitiative(initiativeId: string): Promise<Conversation[]> {
    const rows = await conversationRepository.listByInitiative(initiativeId)
    return rows.map(toConversation)
  },

  async listRecent(limit: number = 5): Promise<ConversationListItem[]> {
    const rows = await conversationRepository.listRecent(limit)
    return rows.map(toConversationWithInitiative)
  },

  async create(
    initiativeId: string,
    data: CreateConversationInput,
    userId: string
  ): Promise<Conversation> {
    const row = await conversationRepository.create({
      initiativeId,
      title: data.title,
      source: data.source,
      createdById: userId
    })

    const full = await conversationRepository.findById(row.id)
    if (!full) {
      throw new Error('Failed to retrieve created conversation')
    }

    return {
      id: full.id,
      initiativeId: full.initiativeId,
      title: full.title,
      source: full.source,
      createdById: full.createdById,
      createdAt: full.createdAt.toISOString(),
      updatedAt: full.updatedAt.toISOString(),
      createdBy: null
    }
  }
}
