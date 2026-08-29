import { describe, expect, it } from 'vitest'
import MarkdownIt from 'markdown-it'
import type { DocIndexItem } from '../../shared/types/doc'
import {
  docStatusBadge,
  docTypeBadge,
  filterDocs,
  resolveDocAsset,
  resolveDocLink
} from '../../shared/utils/docs'

describe('resolveDocLink', () => {
  it('rewrites relative cross-folder link to another RF or SPEC', () => {
    expect(resolveDocLink('../specs/SPEC-001-arquitectura.md', 'rf')).toBe(
      '/docs?tipo=specs&doc=SPEC-001-arquitectura.md'
    )
    expect(resolveDocLink('../rf/RF-002-auth.md', 'specs')).toBe(
      '/docs?tipo=rf&doc=RF-002-auth.md'
    )
  })

  it('rewrites relative same-folder link keeping the current document type', () => {
    expect(resolveDocLink('./RF-003-billing.md', 'rf')).toBe(
      '/docs?tipo=rf&doc=RF-003-billing.md'
    )
    expect(resolveDocLink('SPEC-010-queue.md', 'specs')).toBe(
      '/docs?tipo=specs&doc=SPEC-010-queue.md'
    )
  })

  it('preserves section anchors in rewritten document links', () => {
    expect(resolveDocLink('../specs/SPEC-001.md#arquitectura-general', 'rf')).toBe(
      '/docs?tipo=specs&doc=SPEC-001.md#arquitectura-general'
    )
  })

  it('leaves anchor-only links untouched', () => {
    expect(resolveDocLink('#seccion-1', 'rf')).toBe('#seccion-1')
  })

  it('leaves external links untouched', () => {
    expect(resolveDocLink('https://datak.co', 'rf')).toBe('https://datak.co')
    expect(resolveDocLink('http://example.com', 'specs')).toBe('http://example.com')
    expect(resolveDocLink('mailto:soporte@datak.co', 'rf')).toBe('mailto:soporte@datak.co')
  })

  it('handles empty or non-markdown links gracefully', () => {
    expect(resolveDocLink('')).toBe('')
    expect(resolveDocLink('/other/path')).toBe('/other/path')
  })
})

describe('resolveDocAsset', () => {
  it('rewrites relative assets path from docs folder to the proxy endpoint', () => {
    expect(resolveDocAsset('../assets/RF-001/diagrama.png')).toBe(
      '/api/docs/assets/RF-001/diagrama.png'
    )
    expect(resolveDocAsset('assets/SPEC-002/schema.svg')).toBe(
      '/api/docs/assets/SPEC-002/schema.svg'
    )
    expect(resolveDocAsset('/docs/assets/RF-003/screenshot.jpg')).toBe(
      '/api/docs/assets/RF-003/screenshot.jpg'
    )
  })

  it('preserves absolute URLs and external assets', () => {
    expect(resolveDocAsset('https://images.datak.co/logo.png')).toBe(
      'https://images.datak.co/logo.png'
    )
    expect(resolveDocAsset('/api/docs/assets/RF-001/pic.png')).toBe(
      '/api/docs/assets/RF-001/pic.png'
    )
  })
})

describe('docStatusBadge', () => {
  it('maps known business statuses to appropriate colors and labels', () => {
    expect(docStatusBadge('BORRADOR')).toEqual({ label: 'Borrador', color: 'neutral' })
    expect(docStatusBadge('EN REVISIÓN')).toEqual({ label: 'En revisión', color: 'warning' })
    expect(docStatusBadge('EN REVISION')).toEqual({ label: 'En revisión', color: 'warning' })
    expect(docStatusBadge('APROBADA')).toEqual({ label: 'Aprobada', color: 'success' })
    expect(docStatusBadge('EN IMPLEMENTACIÓN')).toEqual({ label: 'En implementación', color: 'info' })
    expect(docStatusBadge('COMPLETADA')).toEqual({ label: 'Completada', color: 'primary' })
  })

  it('handles empty or unrecognised statuses gracefully', () => {
    expect(docStatusBadge('')).toEqual({ label: 'Sin estado', color: 'neutral' })
    expect(docStatusBadge(null)).toEqual({ label: 'Sin estado', color: 'neutral' })
    expect(docStatusBadge('OBSOLETA')).toEqual({ label: 'OBSOLETA', color: 'neutral' })
  })
})

describe('docTypeBadge', () => {
  it('maps rf and specs to correct labels and colors', () => {
    expect(docTypeBadge('rf')).toEqual({
      label: 'RF',
      color: 'info',
      description: 'Requerimiento Funcional'
    })
    expect(docTypeBadge('specs')).toEqual({
      label: 'SPEC',
      color: 'primary',
      description: 'Especificación Técnica'
    })
  })
})

describe('filterDocs', () => {
  const sampleDocs: DocIndexItem[] = [
    {
      id: 'RF-001',
      titulo: 'Autenticación con Google',
      estado: 'APROBADA',
      fecha: '2026-08-28',
      autores: 'Daniel',
      tipo: 'rf',
      filename: 'RF-001-auth.md'
    },
    {
      id: 'RF-002',
      titulo: 'Dashboard de Finanzas',
      estado: 'BORRADOR',
      fecha: '2026-08-29',
      autores: 'Camilo',
      tipo: 'rf',
      filename: 'RF-002-finanzas.md'
    },
    {
      id: 'SPEC-001',
      titulo: 'Arquitectura de Datos BigQuery',
      estado: 'EN IMPLEMENTACIÓN',
      fecha: '2026-08-28',
      autores: 'Andrés',
      tipo: 'specs',
      filename: 'SPEC-001-bigquery.md'
    }
  ]

  it('filters by document type', () => {
    const rfOnly = filterDocs(sampleDocs, { tipo: 'rf', estado: 'all', search: '' })
    expect(rfOnly.length).toBe(2)
    expect(rfOnly.every(d => d.tipo === 'rf')).toBe(true)

    const specsOnly = filterDocs(sampleDocs, { tipo: 'specs', estado: 'all', search: '' })
    expect(specsOnly.length).toBe(1)
    expect(specsOnly[0]?.id).toBe('SPEC-001')
  })

  it('filters by status', () => {
    const aprobadas = filterDocs(sampleDocs, { tipo: 'all', estado: 'APROBADA', search: '' })
    expect(aprobadas.length).toBe(1)
    expect(aprobadas[0]?.id).toBe('RF-001')
  })

  it('filters by search keyword across id, title, authors, filename', () => {
    const searchAuth = filterDocs(sampleDocs, { tipo: 'all', estado: 'all', search: 'google' })
    expect(searchAuth.length).toBe(1)
    expect(searchAuth[0]?.id).toBe('RF-001')

    const searchAuthor = filterDocs(sampleDocs, { tipo: 'all', estado: 'all', search: 'camilo' })
    expect(searchAuthor.length).toBe(1)
    expect(searchAuthor[0]?.id).toBe('RF-002')

    const searchId = filterDocs(sampleDocs, { tipo: 'all', estado: 'all', search: 'SPEC-001' })
    expect(searchId.length).toBe(1)
  })
})

describe('markdown rendering engine rules', () => {
  it('renders tables, code blocks and checkboxes', () => {
    const md = new MarkdownIt({ html: true })

    // Checkboxes / Task lists rule
    md.core.ruler.after('inline', 'task-lists', (state) => {
      const tokens = state.tokens
      for (let i = 0; i < tokens.length; i++) {
        const tokenItem = tokens[i]
        if (tokenItem && tokenItem.type === 'inline' && tokenItem.children) {
          const firstChild = tokenItem.children[0]
          if (firstChild && firstChild.type === 'text') {
            const text = firstChild.content
            const match = text.match(/^\[([ xX])\]\s+(.*)$/)
            if (match && match[1] !== undefined && match[2] !== undefined) {
              const checked = match[1].toLowerCase() === 'x'
              firstChild.content = match[2]
              const checkboxToken = new state.Token('html_inline', '', 0)
              checkboxToken.content = `<input type="checkbox" disabled ${checked ? 'checked' : ''} />`
              tokenItem.children.unshift(checkboxToken)
            }
          }
        }
      }
      return true
    })

    const source = `| Encabezado 1 | Encabezado 2 |
|---|---|
| Celda A | Celda B |

\`\`\`typescript
const x = 42;
\`\`\`

- [ ] Tarea pendiente
- [x] Tarea completada`

    const html = md.render(source)

    expect(html).toContain('<table>')
    expect(html).toContain('<th>Encabezado 1</th>')
    expect(html).toContain('<td>Celda A</td>')
    expect(html).toContain('<pre><code class="language-typescript">')
    expect(html).toContain('<input type="checkbox" disabled  />')
    expect(html).toContain('<input type="checkbox" disabled checked />')
  })
})
