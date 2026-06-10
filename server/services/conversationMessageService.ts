import { conversationMessageRepository, type MessageWithAuthor } from '../repositories/conversationMessageRepository'
import type { ConversationMessage, CreateMessageInput } from '../../shared/types/conversation'
import type { OwnerRef } from '../../shared/types/initiative'

function toAuthorRef(user: MessageWithAuthor['author']): OwnerRef | null {
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

function toMessage(row: MessageWithAuthor): ConversationMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    authorId: row.authorId,
    role: row.role,
    contentType: row.contentType,
    body: row.body,
    audioUrl: row.audioUrl,
    transcription: row.transcription,
    mediaUrl: row.mediaUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: toAuthorRef(row.author)
  }
}

export const conversationMessageService = {
  async listByConversation(conversationId: string): Promise<ConversationMessage[]> {
    const rows = await conversationMessageRepository.listByConversation(conversationId)
    return rows.map(toMessage)
  },

  async create(
    conversationId: string,
    data: CreateMessageInput,
    userId: string
  ): Promise<ConversationMessage> {
    const row = await conversationMessageRepository.create({
      conversationId,
      authorId: userId,
      role: data.role,
      contentType: data.contentType,
      body: data.body,
      audioUrl: data.audioUrl ?? null,
      transcription: data.transcription ?? null,
      mediaUrl: data.mediaUrl ?? null
    })

    // Fetch message with author relations
    const list = await conversationMessageRepository.listByConversation(conversationId)
    const matched = list.find(m => m.id === row.id)
    if (!matched) {
      throw new Error('Failed to retrieve newly created message')
    }

    return toMessage(matched)
  }
}
