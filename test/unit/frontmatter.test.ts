import { describe, expect, it } from 'vitest'
import { parseFrontmatter } from '../../shared/utils/frontmatter'

describe('parseFrontmatter', () => {
  it('parses complete frontmatter with all product document fields', () => {
    const markdown = `---
id: RF-001
titulo: "Autenticación y Autorización"
estado: APROBADA
fecha: 2026-08-28
autores: Daniel Esteban, Camilo
componentes: [horizon, core]
origen: RFC-012
confluence:
  id: 987654
  url: https://datak.atlassian.net/wiki/spaces/ENG/pages/987654
  version: 3
---
# Introducción

Este documento especifica el flujo de autenticación.`

    const { frontmatter, content } = parseFrontmatter(markdown)

    expect(frontmatter.id).toBe('RF-001')
    expect(frontmatter.titulo).toBe('Autenticación y Autorización')
    expect(frontmatter.estado).toBe('APROBADA')
    expect(frontmatter.fecha).toBe('2026-08-28')
    expect(frontmatter.autores).toBe('Daniel Esteban, Camilo')
    expect(frontmatter.componentes).toEqual(['horizon', 'core'])
    expect(frontmatter.origen).toBe('RFC-012')
    expect(frontmatter.confluence).toEqual({
      id: 987654,
      url: 'https://datak.atlassian.net/wiki/spaces/ENG/pages/987654',
      version: 3
    })
    expect(content.trim()).toBe(`# Introducción\n\nEste documento especifica el flujo de autenticación.`)
  })

  it('parses frontmatter when "estado" is missing', () => {
    const markdown = `---
id: SPEC-042
titulo: Bus de Eventos Asíncronos
fecha: "2026-08-29"
autores: Camilo
---
## Arquitectura

Detalle técnico de RabbitMQ y Cloud Tasks.`

    const { frontmatter, content } = parseFrontmatter(markdown)

    expect(frontmatter.id).toBe('SPEC-042')
    expect(frontmatter.titulo).toBe('Bus de Eventos Asíncronos')
    expect(frontmatter.estado).toBeUndefined()
    expect(frontmatter.fecha).toBe('2026-08-29')
    expect(frontmatter.autores).toBe('Camilo')
    expect(content.trim()).toBe('## Arquitectura\n\nDetalle técnico de RabbitMQ y Cloud Tasks.')
  })

  it('parses frontmatter with inline confluence block', () => {
    const markdown = `---
id: RF-010
titulo: Dashboard de Métricas
estado: EN REVISIÓN
confluence: { id: "123456", url: "https://datak.atlassian.net/wiki/pages/123456", version: 1 }
---
Cuerpo del documento.`

    const { frontmatter, content } = parseFrontmatter(markdown)

    expect(frontmatter.id).toBe('RF-010')
    expect(frontmatter.titulo).toBe('Dashboard de Métricas')
    expect(frontmatter.estado).toBe('EN REVISIÓN')
    expect(frontmatter.confluence).toEqual({
      id: '123456',
      url: 'https://datak.atlassian.net/wiki/pages/123456',
      version: 1
    })
    expect(content.trim()).toBe('Cuerpo del documento.')
  })

  it('parses bullet-list authors and components', () => {
    const markdown = `---
id: SPEC-005
titulo: Servicio de Archivos
autores:
  - Daniel
  - Andrés
---
Contenido.`

    const { frontmatter, content } = parseFrontmatter(markdown)

    expect(frontmatter.id).toBe('SPEC-005')
    expect(frontmatter.autores).toEqual(['Daniel', 'Andrés'])
    expect(content.trim()).toBe('Contenido.')
  })

  it('returns raw text as content if no frontmatter delimiters exist', () => {
    const markdown = '# Documento sin frontmatter\n\nTexto libre.'
    const { frontmatter, content } = parseFrontmatter(markdown)

    expect(frontmatter).toEqual({})
    expect(content).toBe(markdown)
  })

  it('handles empty input gracefully', () => {
    const { frontmatter, content } = parseFrontmatter('')
    expect(frontmatter).toEqual({})
    expect(content).toBe('')
  })
})
