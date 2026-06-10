import type { OwnerRef } from './initiative'

export type RequirementPriority = 'must' | 'should' | 'could' | 'wont'
export type RequirementStatus = 'draft' | 'refining' | 'ready' | 'implemented' | 'archived'

export interface Requirement {
  id: string
  initiativeId: string
  sourceConversationId: string | null
  title: string
  description: string
  priority: RequirementPriority
  status: RequirementStatus
  createdById: string | null
  createdAt: string
  updatedAt: string
  createdBy?: OwnerRef | null
  sourceConversationTitle?: string | null
}

export interface CreateRequirementInput {
  sourceConversationId?: string | null
  title: string
  description: string
  priority: RequirementPriority
  status?: RequirementStatus
}

export interface UpdateRequirementInput {
  title?: string
  description?: string
  priority?: RequirementPriority
  status?: RequirementStatus
}
