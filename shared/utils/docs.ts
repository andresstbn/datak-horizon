import type { DocBranch, DocFilters, DocIndexItem, DocType } from '../types/doc'

/** Branch the viewer shows when no other one is selected. */
export const DEFAULT_DOC_BRANCH = 'main'

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
    if (item.tipo !== filters.tipo) {
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
export function resolveDocLink(
  href: string,
  currentTipo: DocType = 'rf',
  branch?: string
): string {
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
  const branchParam = branch && branch !== DEFAULT_DOC_BRANCH
    ? `&branch=${encodeURIComponent(branch)}`
    : ''

  return `/docs?tipo=${targetTipo}&doc=${encodeURIComponent(filename)}${branchParam}${hash}`
}

/**
 * Resolves an asset image path from relative markdown reference
 * (e.g. `../assets/RF-001/diagram.png` or `assets/RF-001/diagram.png`)
 * to `/api/docs/assets/:pageId/:name`.
 */
export function resolveDocAsset(src: string, branch?: string): string {
  if (!src) return src
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/api/')) {
    return src
  }

  // Match e.g. ../assets/<pageId>/<name> or assets/<pageId>/<name> or /docs/assets/<pageId>/<name>
  const match = src.match(/(?:\.\.\/|\.\/|\/)?(?:docs\/)?assets\/([^/]+)\/(.+)$/)
  if (match && match[1] && match[2]) {
    const pageId = match[1]
    const filename = match[2]
    const query = branch && branch !== DEFAULT_DOC_BRANCH
      ? `?branch=${encodeURIComponent(branch)}`
      : ''
    return `/api/docs/assets/${encodeURIComponent(pageId)}/${encodeURIComponent(filename)}${query}`
  }

  return src
}

/**
 * Hidden anchor appended to every PR comment written from Horizon, so a PR that
 * touches several documents keeps one thread per document. GitHub renders HTML
 * comments as nothing, so it stays invisible to readers on GitHub too.
 */
export function docCommentMarker(tipo: DocType, filename: string): string {
  return `<!-- horizon:doc=${tipo}/${filename} -->`
}

/** Removes the anchor before showing a comment body in Horizon. */
export function stripDocCommentMarker(body: string): string {
  return body.replace(/\n?<!--\s*horizon:doc=[^>]*-->\s*$/, '').trimEnd()
}

/** Paths a pull request touches, as far as the docs viewer cares. */
export interface PullRequestDocFiles {
  number: number
  title: string
  headRefName: string
  filePaths: string[]
}

/** True for the files the viewer actually renders. */
export function isProductDocPath(path: string): boolean {
  return path.startsWith('docs/rf/') || path.startsWith('docs/specs/')
}

/**
 * Branches offered in the viewer: the default branch, plus the head of every
 * open pull request that touches an RF or a SPEC.
 *
 * Comparing docs tree oids against `main` was tried first and does not work: it
 * also flags every branch that merely predates the last docs change on main, and
 * it needs a per-ref scan that GitHub only returns alphabetically.
 */
export function pickDocBranchesFromPullRequests(
  pullRequests: PullRequestDocFiles[],
  defaultBranch: string = DEFAULT_DOC_BRANCH
): DocBranch[] {
  const branches: DocBranch[] = [{ name: defaultBranch }]
  const seen = new Set<string>([defaultBranch])

  for (const pr of pullRequests) {
    if (seen.has(pr.headRefName)) continue
    if (!pr.filePaths.some(isProductDocPath)) continue

    seen.add(pr.headRefName)
    branches.push({ name: pr.headRefName, prNumber: pr.number, prTitle: pr.title })
  }

  return branches
}
