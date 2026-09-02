import type { DocDetail, DocIndexItem, DocType } from '~~/shared/types/doc'

/**
 * Infrastructure layer for Monorepo Product Documents access.
 * Only place allowed to perform HTTP calls to the docs endpoints.
 */
export const docService = {
  /**
   * Retrieves the index of RF and SPEC documents.
   */
  async list(idToken: string, force = false): Promise<DocIndexItem[]> {
    return $fetch<DocIndexItem[]>('/api/docs', {
      headers: { Authorization: `Bearer ${idToken}` },
      query: force ? { force: 'true' } : undefined
    })
  },

  /**
   * Forces re-synchronization of documents with GitHub.
   */
  async sync(idToken: string): Promise<DocIndexItem[]> {
    return $fetch<DocIndexItem[]>('/api/docs/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` }
    })
  },

  /**
   * Retrieves frontmatter and raw Markdown content for a single document.
   */
  async getByPath(idToken: string, tipo: DocType, filename: string, force = false): Promise<DocDetail> {
    return $fetch<DocDetail>(`/api/docs/${tipo}/${encodeURIComponent(filename)}`, {
      headers: { Authorization: `Bearer ${idToken}` },
      query: force ? { force: 'true' } : undefined
    })
  }
}
