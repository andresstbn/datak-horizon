import { aiArtifactRepository, type ArtifactWithDetails } from '../repositories/aiArtifactRepository'
import type { AIArtifact, CreateArtifactInput, UpdateArtifactInput } from '../../shared/types/artifact'
import type { OwnerRef } from '../../shared/types/initiative'

function toCreatorRef(user: ArtifactWithDetails['createdBy']): OwnerRef | null {
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

function toArtifact(row: ArtifactWithDetails): AIArtifact {
  return {
    id: row.id,
    initiativeId: row.initiativeId,
    requirementId: row.requirementId,
    sourceConversationId: row.sourceConversationId,
    type: row.type,
    title: row.title,
    content: row.content,
    promptUsed: row.promptUsed,
    model: row.model,
    status: row.status,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: toCreatorRef(row.createdBy),
    requirementTitle: row.requirement?.title ?? null,
    sourceConversationTitle: row.sourceConversation?.title ?? null
  }
}

export const aiArtifactService = {
  async listByInitiative(initiativeId: string): Promise<AIArtifact[]> {
    const rows = await aiArtifactRepository.listByInitiative(initiativeId)
    return rows.map(toArtifact)
  },

  async getById(id: string): Promise<AIArtifact | null> {
    const row = await aiArtifactRepository.findById(id)
    return row ? toArtifact(row) : null
  },

  async create(
    initiativeId: string,
    data: CreateArtifactInput,
    userId: string
  ): Promise<AIArtifact> {
    const row = await aiArtifactRepository.create({
      initiativeId,
      requirementId: data.requirementId ?? null,
      sourceConversationId: data.sourceConversationId ?? null,
      type: data.type,
      title: data.title,
      content: data.content,
      promptUsed: data.promptUsed ?? null,
      model: data.model ?? null,
      status: data.status ?? 'draft',
      createdById: userId
    })

    const full = await aiArtifactRepository.findById(row.id)
    if (!full) {
      throw new Error('Failed to retrieve newly created artifact')
    }

    return toArtifact(full)
  },

  async update(id: string, data: UpdateArtifactInput): Promise<AIArtifact> {
    const row = await aiArtifactRepository.update(id, data)
    const full = await aiArtifactRepository.findById(row.id)
    if (!full) {
      throw new Error('Failed to retrieve updated artifact')
    }

    return toArtifact(full)
  }
}
