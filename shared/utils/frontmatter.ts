import type { DocFrontmatter } from '../types/doc'

function cleanScalar(val: string): unknown {
  const trimmed = val.trim()
  if (!trimmed) return ''

  // Strip enclosing quotes
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1)
  }

  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)

  // Inline array: [a, b, c]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map(s => cleanScalar(s.trim()))
  }

  // Inline map: { id: "123", url: "https://..." }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const inner = trimmed.slice(1, -1).trim()
    const result: Record<string, unknown> = {}
    if (!inner) return result
    const pairs = inner.split(',')
    for (const pair of pairs) {
      const idx = pair.indexOf(':')
      if (idx !== -1) {
        const k = pair.slice(0, idx).trim()
        const v = pair.slice(idx + 1).trim()
        result[k] = cleanScalar(v)
      }
    }
    return result
  }

  return trimmed
}

/**
 * Lightweight, zero-dependency 1-level YAML frontmatter parser.
 * Supports scalar keys, inline maps/arrays, indented list items, and nested blocks (e.g. confluence).
 */
export function parseFrontmatter(text: string): { frontmatter: DocFrontmatter, content: string } {
  if (!text) {
    return { frontmatter: {}, content: '' }
  }

  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match || !match[1]) {
    return { frontmatter: {}, content: text }
  }

  const rawYaml = match[1]
  const content = match[2] ?? ''
  const frontmatter: DocFrontmatter = {}

  const lines = rawYaml.split(/\r?\n/)
  let currentParentKey: string | null = null

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue

    const isIndented = line.startsWith('  ') || line.startsWith('\t')
    const trimmed = line.trim()

    if (isIndented && currentParentKey) {
      if (trimmed.startsWith('- ')) {
        const listVal = cleanScalar(trimmed.slice(2))
        const existing = frontmatter[currentParentKey]
        if (Array.isArray(existing)) {
          existing.push(listVal)
        } else {
          frontmatter[currentParentKey] = [listVal]
        }
      } else {
        const colonIdx = trimmed.indexOf(':')
        if (colonIdx !== -1) {
          const subKey = trimmed.slice(0, colonIdx).trim()
          const subVal = trimmed.slice(colonIdx + 1).trim()
          if (!frontmatter[currentParentKey] || typeof frontmatter[currentParentKey] !== 'object' || Array.isArray(frontmatter[currentParentKey])) {
            frontmatter[currentParentKey] = {}
          }
          ;(frontmatter[currentParentKey] as Record<string, unknown>)[subKey] = cleanScalar(subVal)
        }
      }
      continue
    }

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) continue

    const key = trimmed.slice(0, colonIdx).trim()
    const val = trimmed.slice(colonIdx + 1).trim()

    if (!val) {
      currentParentKey = key
      frontmatter[key] = {}
    } else {
      currentParentKey = null
      frontmatter[key] = cleanScalar(val) as string
    }
  }

  return { frontmatter, content }
}
