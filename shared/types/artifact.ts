import type { OwnerRef } from './initiative'

export type ArtifactType =
  | 'refinement_questions'
  | 'functional_specification'
  | 'technical_plan'
  | 'implementation_prompt'
  | 'qa_checklist'
  | 'consolidated_context'

export type ArtifactStatus = 'draft' | 'accepted' | 'archived'

export interface AIArtifact {
  id: string
  initiativeId: string
  requirementId: string | null
  sourceConversationId: string | null
  type: ArtifactType
  title: string
  content: string
  promptUsed: string | null
  model: string | null
  status: ArtifactStatus
  createdById: string | null
  createdAt: string
  updatedAt: string
  createdBy?: OwnerRef | null
  requirementTitle?: string | null
  sourceConversationTitle?: string | null
}

export interface CreateArtifactInput {
  requirementId?: string | null
  sourceConversationId?: string | null
  type: ArtifactType
  title: string
  content: string
  promptUsed?: string | null
  model?: string | null
  status?: ArtifactStatus
}

export interface UpdateArtifactInput {
  title?: string
  content?: string
  status?: ArtifactStatus
}
