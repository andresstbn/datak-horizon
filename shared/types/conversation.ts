import type { OwnerRef } from './initiative'

export type ConversationSource = 'manual' | 'whatsapp_import' | 'slack_import' | 'voice' | 'meeting'
export type MessageRole = 'user' | 'assistant' | 'system'
export type MessageContentType = 'markdown' | 'text' | 'audio' | 'image' | 'document'

export interface Conversation {
  id: string
  initiativeId: string
  title: string
  source: ConversationSource
  createdById: string | null
  createdAt: string
  updatedAt: string
  createdBy?: OwnerRef | null
}

export interface ConversationMessage {
  id: string
  conversationId: string
  authorId: string | null
  role: MessageRole
  contentType: MessageContentType
  body: string
  audioUrl: string | null
  transcription: string | null
  mediaUrl: string | null
  createdAt: string
  updatedAt: string
  author?: OwnerRef | null
}

export interface CreateConversationInput {
  title: string
  source: ConversationSource
}

export interface CreateMessageInput {
  role: MessageRole
  contentType: MessageContentType
  body: string
  audioUrl?: string | null
  transcription?: string | null
  mediaUrl?: string | null
}
