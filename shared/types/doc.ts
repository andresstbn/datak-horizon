export type DocType = 'rf' | 'specs'

export type DocStatus
  = | 'BORRADOR'
    | 'EN REVISIÓN'
    | 'APROBADA'
    | 'EN IMPLEMENTACIÓN'
    | 'COMPLETADA'

export interface ConfluenceRef {
  id?: string | number
  url?: string
  version?: number | string
}

export interface DocFrontmatter {
  id?: string
  titulo?: string
  estado?: string
  fecha?: string
  autores?: string | string[]
  componentes?: string | string[]
  origen?: string
  confluence?: ConfluenceRef
  [key: string]: unknown
}

export interface DocIndexItem {
  id: string
  titulo: string
  estado: string
  fecha?: string
  autores?: string
  tipo: DocType
  filename: string
}

export interface DocDetail {
  frontmatter: DocFrontmatter
  content: string
  tipo: DocType
  filename: string
}

export interface DocFilters {
  tipo: DocType
  estado: string | 'all'
  search: string
  branch: string
}

/** A branch offered in the viewer, with its open PR when it has one. */
export interface DocBranch {
  name: string
  prNumber?: number
  prTitle?: string
}

/** A PR comment written about one RF or SPEC. */
export interface DocComment {
  id: string
  body: string
  createdAt: string
  url: string
  authorLogin: string
  authorAvatarUrl?: string
}

/** Open PR backing the comment thread of a branch, if any. */
export interface DocCommentThread {
  prNumber?: number
  prTitle?: string
  prUrl?: string
  comments: DocComment[]
}
