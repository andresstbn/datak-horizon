import type {
  InitiativeDetail,
  InitiativeListItem
} from '~~/shared/types/initiative'

/**
 * Infrastructure layer for initiative backend access. Only place allowed to
 * perform the HTTP call to the initiatives endpoint.
 */
export const initiativeService = {
  async list(idToken: string): Promise<InitiativeListItem[]> {
    return $fetch<InitiativeListItem[]>('/api/initiatives', {
      headers: { Authorization: `Bearer ${idToken}` }
    })
  },

  async getById(idToken: string, id: string): Promise<InitiativeDetail> {
    return $fetch<InitiativeDetail>(`/api/initiatives/${id}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
  },

  async create(idToken: string, data: { title: string; description: string | null }): Promise<InitiativeDetail> {
    return $fetch<InitiativeDetail>('/api/initiatives', {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: data
    })
  },

  async update(idToken: string, id: string, data: Partial<InitiativeDetail>): Promise<InitiativeDetail> {
    return $fetch<InitiativeDetail>(`/api/initiatives/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${idToken}` },
      body: data
    })
  },

  async getConsolidatedContext(idToken: string, id: string): Promise<{ markdown: string }> {
    return $fetch<{ markdown: string }>(`/api/initiatives/${id}/consolidated-context`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
  }
}
