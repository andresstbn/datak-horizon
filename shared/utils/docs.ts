import type { DocFilters, DocIndexItem, DocType } from '../types/doc'

export interface BadgeConfig {
  label: string
  color: 'neutral' | 'warning' | 'success' | 'info' | 'primary' | 'error'
}

export function docStatusBadge(status?: string | null): BadgeConfig {
  const normalized = (status ?? '').trim().toUpperCase()

  switch (normalized) {
    case 'BORRADOR':
      return { label: 'Borrador', color: 'neutral' }
    case 'EN REVISIÓN':
    case 'EN REVISION':
      return { label: 'En revisión', color: 'warning' }
    case 'APROBADA':
    case 'APROBADO':
      return { label: 'Aprobada', color: 'success' }
    case 'EN IMPLEMENTACIÓN':
    case 'EN IMPLEMENTACION':
      return { label: 'En implementación', color: 'info' }
    case 'COMPLETADA':
    case 'COMPLETADO':
      return { label: 'Completada', color: 'primary' }
    default:
      return { label: status?.trim() || 'Sin estado', color: 'neutral' }
  }
}

export function docTypeBadge(type: DocType): BadgeConfig & { description: string } {
  switch (type) {
    case 'rf':
      return { label: 'RF', color: 'info', description: 'Requerimiento Funcional' }
    case 'specs':
      return { label: 'SPEC', color: 'primary', description: 'Especificación Técnica' }
    default:
      return { label: (type as string).toUpperCase(), color: 'neutral', description: 'Documento' }
  }
}

export function filterDocs(items: DocIndexItem[], filters: DocFilters): DocIndexItem[] {
  return items.filter((item) => {
    // Type filter
    if (filters.tipo !== 'all' && item.tipo !== filters.tipo) {
      return false
    }

    // Status filter
    if (filters.estado !== 'all') {
      const itemStatus = (item.estado || '').toUpperCase()
      const filterStatus = filters.estado.toUpperCase()
      if (itemStatus !== filterStatus) {
        return false
      }
    }

    // Search text
    if (filters.search && filters.search.trim()) {
      const query = filters.search.toLowerCase().trim()
      const matchId = item.id.toLowerCase().includes(query)
      const matchTitle = item.titulo.toLowerCase().includes(query)
      const matchAuthors = (item.autores || '').toLowerCase().includes(query)
      const matchFilename = item.filename.toLowerCase().includes(query)
      if (!matchId && !matchTitle && !matchAuthors && !matchFilename) {
        return false
      }
    }

    return true
  })
}

/**
 * Resolves a Markdown link reference inside docs.
 * If it's a relative link to another markdown file, returns internal route.
 * Otherwise returns original href.
 */
export function resolveDocLink(href: string, currentTipo: DocType = 'rf'): string {
  if (!href) return href

  // External links or anchor-only
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('#')) {
    return href
  }

  // Parse relative markdown link, e.g.
  // ../specs/SPEC-001-slug.md#heading
  // ../rf/RF-002.md
  // ./RF-003.md
  // RF-004.md
  // docs/rf/RF-001.md
  const [pathPart, hashPart] = href.split('#')
  const cleanPath = pathPart?.trim() ?? ''

  if (!cleanPath.endsWith('.md')) {
    return href
  }

  let targetTipo: DocType = currentTipo
  if (cleanPath.includes('/specs/') || cleanPath.startsWith('specs/')) {
    targetTipo = 'specs'
  } else if (cleanPath.includes('/rf/') || cleanPath.startsWith('rf/')) {
    targetTipo = 'rf'
  }

  const filename = cleanPath.split('/').pop() ?? cleanPath
  const hash = hashPart ? `#${hashPart}` : ''

  return `/docs?tipo=${targetTipo}&doc=${encodeURIComponent(filename)}${hash}`
}

/**
 * Resolves an asset image path from relative markdown reference
 * (e.g. `../assets/RF-001/diagram.png` or `assets/RF-001/diagram.png`)
 * to `/api/docs/assets/:pageId/:name`.
 */
export function resolveDocAsset(src: string): string {
  if (!src) return src
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/api/')) {
    return src
  }

  // Match e.g. ../assets/<pageId>/<name> or assets/<pageId>/<name> or /docs/assets/<pageId>/<name>
  const match = src.match(/(?:\.\.\/|\.\/|\/)?(?:docs\/)?assets\/([^/]+)\/(.+)$/)
  if (match && match[1] && match[2]) {
    const pageId = match[1]
    const filename = match[2]
    return `/api/docs/assets/${encodeURIComponent(pageId)}/${encodeURIComponent(filename)}`
  }

  return src
}
