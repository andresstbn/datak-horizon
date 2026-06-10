import type { Requirement, CreateRequirementInput, UpdateRequirementInput } from '~~/shared/types/requirement'

export const requirementService = {
  async list(idToken: string, initiativeId: string): Promise<Requirement[]> {
    return $fetch<Requirement[]>(`/api/initiatives/${initiativeId}/requirements`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
  },

  async listRefining(idToken: string): Promise<Requirement[]> {
    return $fetch<Requirement[]>('/api/requirements', {
      headers: { Authorization: `Bearer ${idToken}` }
    })
  },

  async create(
    idToken: string,
    initiativeId: string,
    data: CreateRequirementInput
  ): Promise<Requirement> {
    return $fetch<Requirement>(`/api/initiatives/${initiativeId}/requirements`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: data
    })
  },

  async update(
    idToken: string,
    requirementId: string,
    data: UpdateRequirementInput
  ): Promise<Requirement> {
    return $fetch<Requirement>(`/api/requirements/${requirementId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${idToken}` },
      body: data
    })
  }
}
