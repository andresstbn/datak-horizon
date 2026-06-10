import type { Conversation, ConversationMessage, CreateConversationInput, CreateMessageInput } from '~~/shared/types/conversation'

export const conversationService = {
  async list(idToken: string, initiativeId: string): Promise<Conversation[]> {
    return $fetch<Conversation[]>(`/api/initiatives/${initiativeId}/conversations`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
  },

  async listRecent(idToken: string): Promise<Conversation[]> {
    return $fetch<Conversation[]>('/api/conversations', {
      headers: { Authorization: `Bearer ${idToken}` }
    })
  },

  async create(
    idToken: string,
    initiativeId: string,
    data: CreateConversationInput
  ): Promise<Conversation> {
    return $fetch<Conversation>(`/api/initiatives/${initiativeId}/conversations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: data
    })
  },

  async listMessages(idToken: string, conversationId: string): Promise<ConversationMessage[]> {
    return $fetch<ConversationMessage[]>(`/api/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
  },

  async createMessage(
    idToken: string,
    conversationId: string,
    data: CreateMessageInput
  ): Promise<ConversationMessage> {
    return $fetch<ConversationMessage>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: data
    })
  }
}
