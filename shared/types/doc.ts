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
}
