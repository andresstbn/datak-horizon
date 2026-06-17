import { requirementRepository, type RequirementWithDetails, type RequirementWithInitiative } from '../repositories/requirementRepository'
import { initiativeRepository } from '../repositories/initiativeRepository'
import { userRepository } from '../repositories/userRepository'
import { slackService } from './slackService'
import type { Requirement, CreateRequirementInput, UpdateRequirementInput } from '../../shared/types/requirement'
import type { OwnerRef } from '../../shared/types/initiative'

function toCreatorRef(user: RequirementWithDetails['createdBy']): OwnerRef | null {
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

export interface RequirementListItem extends Requirement {
  initiativeTitle?: string
}

function toRequirement(row: RequirementWithDetails): Requirement {
  return {
    id: row.id,
    initiativeId: row.initiativeId,
    sourceConversationId: row.sourceConversationId,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    createdById: row.createdById,
    confluenceUrl: row.confluenceUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: toCreatorRef(row.createdBy),
    sourceConversationTitle: row.sourceConversation?.title ?? null
  }
}

function toRequirementWithInitiative(row: RequirementWithInitiative): RequirementListItem {
  return {
    ...toRequirement(row),
    initiativeTitle: row.initiative?.title
  }
}

export const requirementService = {
  async listByInitiative(initiativeId: string): Promise<Requirement[]> {
    const rows = await requirementRepository.listByInitiative(initiativeId)
    return rows.map(toRequirement)
  },

  async listRefining(limit: number = 5): Promise<RequirementListItem[]> {
    const rows = await requirementRepository.listRefining(limit)
    return rows.map(toRequirementWithInitiative)
  },

  async create(
    initiativeId: string,
    data: CreateRequirementInput,
    userId: string
  ): Promise<Requirement> {
    const row = await requirementRepository.create({
      initiativeId,
      sourceConversationId: data.sourceConversationId ?? null,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status ?? 'draft',
      createdById: userId,
      confluenceUrl: data.confluenceUrl ?? null
    })

    const list = await requirementRepository.listByInitiative(initiativeId)
    const matched = list.find(r => r.id === row.id)
    if (!matched) {
      throw new Error('Failed to retrieve newly created requirement')
    }

    const result = toRequirement(matched)

    // Trigger Slack notification asynchronously
    if (process.env.VITEST !== 'true') {
      Promise.all([
        initiativeRepository.findById(initiativeId),
        userRepository.findById(userId)
      ]).then(([initiative, user]) => {
        if (initiative) {
          slackService.notifyRequirementCreated(
            initiative.title,
            result,
            user?.displayName || user?.email || undefined
          )
        }
      }).catch(err => console.error('Error sending requirement Slack notification:', err))
    }

    return result
  },

  async update(id: string, data: UpdateRequirementInput): Promise<Requirement> {
    const row = await requirementRepository.update(id, data)

    const list = await requirementRepository.listByInitiative(row.initiativeId)
    const matched = list.find(r => r.id === row.id)
    if (!matched) {
      throw new Error('Failed to retrieve updated requirement')
    }

    return toRequirement(matched)
  },

  async delete(id: string): Promise<void> {
    await requirementRepository.delete(id)
  }
}
