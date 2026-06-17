export interface ConfluencePreviewData {
  status: 'success' | 'unconfigured' | 'error'
  title: string
  spaceName?: string | null
  spaceKey?: string | null
  lastUpdatedBy?: string | null
  lastUpdatedAt?: string | null
  url: string
}

export const confluenceService = {
  async getPreview(idToken: string, url: string): Promise<ConfluencePreviewData> {
    return $fetch<ConfluencePreviewData>('/api/confluence/preview', {
      headers: { Authorization: `Bearer ${idToken}` },
      query: { url }
    })
  }
}
