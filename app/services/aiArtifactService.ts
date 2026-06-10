import type { AIArtifact, CreateArtifactInput, UpdateArtifactInput } from '~~/shared/types/artifact'

export const aiArtifactService = {
  async list(idToken: string, initiativeId: string): Promise<AIArtifact[]> {
    return $fetch<AIArtifact[]>(`/api/initiatives/${initiativeId}/artifacts`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
  },

  async getById(idToken: string, initiativeId: string, artId: string): Promise<AIArtifact> {
    return $fetch<AIArtifact>(`/api/initiatives/${initiativeId}/artifacts/${artId}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
  },

  async create(
    idToken: string,
    initiativeId: string,
    data: CreateArtifactInput
  ): Promise<AIArtifact> {
    return $fetch<AIArtifact>(`/api/initiatives/${initiativeId}/artifacts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: data
    })
  }
}
