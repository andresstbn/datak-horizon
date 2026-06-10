import type { Insight, CreateInsightInput } from '~~/shared/types/insight'

export const insightService = {
  async list(idToken: string, initiativeId: string): Promise<Insight[]> {
    return $fetch<Insight[]>(`/api/initiatives/${initiativeId}/insights`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
  },

  async create(idToken: string, initiativeId: string, data: CreateInsightInput): Promise<Insight> {
    return $fetch<Insight>(`/api/initiatives/${initiativeId}/insights`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: data
    })
  }
}
