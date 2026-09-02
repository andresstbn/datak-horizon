import type {
  DocBranch,
  DocComment,
  DocCommentThread,
  DocDetail,
  DocIndexItem,
  DocType
} from '~~/shared/types/doc'

/** Builds the query string shared by every branch-scoped docs endpoint. */
function docsQuery(branch: string, force = false): Record<string, string> {
  return {
    branch,
    ...(force ? { force: 'true' } : {})
  }
}

/**
 * Infrastructure layer for Monorepo Product Documents access.
 * Only place allowed to perform HTTP calls to the docs endpoints.
 */
export const docService = {
  /**
   * Retrieves the branches whose product docs differ from main.
   */
  async listBranches(idToken: string): Promise<DocBranch[]> {
    return $fetch<DocBranch[]>('/api/docs/branches', {
      headers: { Authorization: `Bearer ${idToken}` }
    })
  },

  /**
   * Retrieves the index of RF and SPEC documents for a branch.
   */
  async list(idToken: string, branch: string, force = false): Promise<DocIndexItem[]> {
    return $fetch<DocIndexItem[]>('/api/docs', {
      headers: { Authorization: `Bearer ${idToken}` },
      query: docsQuery(branch, force)
    })
  },

  /**
   * Forces re-synchronization of a branch's documents with GitHub.
   */
  async sync(idToken: string, branch: string): Promise<DocIndexItem[]> {
    return $fetch<DocIndexItem[]>('/api/docs/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      query: docsQuery(branch)
    })
  },

  /**
   * Retrieves frontmatter and raw Markdown content for a single document.
   */
  async getByPath(
    idToken: string,
    tipo: DocType,
    filename: string,
    branch: string,
    force = false
  ): Promise<DocDetail> {
    return $fetch<DocDetail>(`/api/docs/${tipo}/${encodeURIComponent(filename)}`, {
      headers: { Authorization: `Bearer ${idToken}` },
      query: docsQuery(branch, force)
    })
  },

  /**
   * Retrieves the comment thread of a document from the open PR of its branch.
   */
  async listComments(
    idToken: string,
    branch: string,
    tipo: DocType,
    filename: string
  ): Promise<DocCommentThread> {
    return $fetch<DocCommentThread>('/api/docs/comments', {
      headers: { Authorization: `Bearer ${idToken}` },
      query: { branch, tipo, filename }
    })
  },

  /**
   * Publishes a comment about a document into the open PR of its branch.
   */
  async addComment(
    idToken: string,
    branch: string,
    tipo: DocType,
    filename: string,
    body: string
  ): Promise<DocComment> {
    return $fetch<DocComment>('/api/docs/comments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      query: { branch },
      body: { tipo, filename, body }
    })
  }
}
