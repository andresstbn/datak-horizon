import { describe, expect, it } from 'vitest'
import {
  docCommentMarker,
  isProductDocPath,
  pickDocBranchesFromPullRequests,
  resolveDocAsset,
  resolveDocLink,
  stripDocCommentMarker,
  type PullRequestDocFiles
} from '../../shared/utils/docs'

function pr(partial: Partial<PullRequestDocFiles> & { headRefName: string }): PullRequestDocFiles {
  return { number: 1, title: 'PR', filePaths: [], ...partial }
}

describe('isProductDocPath', () => {
  it('matches the files the viewer renders and nothing else', () => {
    expect(isProductDocPath('docs/rf/RF-012.md')).toBe(true)
    expect(isProductDocPath('docs/specs/SPEC-181.md')).toBe(true)
    expect(isProductDocPath('docs/adr/ADR-003.md')).toBe(false)
    expect(isProductDocPath('server/services/foo.ts')).toBe(false)
    expect(isProductDocPath('docs/rfc-notes.md')).toBe(false)
  })
})

describe('pickDocBranchesFromPullRequests', () => {
  it('always offers the default branch first', () => {
    expect(pickDocBranchesFromPullRequests([])).toEqual([{ name: 'main' }])
  })

  it('offers the head of an open PR that touches a SPEC', () => {
    // Regression: Datak-SAS/datak#85 met the criterion and never appeared.
    const result = pickDocBranchesFromPullRequests([
      pr({
        number: 85,
        title: 'SPEC-181: Núcleo hotelero',
        headRefName: 'docs/spec181-hoteleria-nucleo',
        filePaths: ['docs/specs/SPEC-181-nucleo-hotelero.md']
      })
    ])

    expect(result).toEqual([
      { name: 'main' },
      { name: 'docs/spec181-hoteleria-nucleo', prNumber: 85, prTitle: 'SPEC-181: Núcleo hotelero' }
    ])
  })

  it('ignores a PR that changes no product document', () => {
    const result = pickDocBranchesFromPullRequests([
      pr({ headRefName: 'fix/leak', filePaths: ['server/services/auth.ts', 'README.md'] })
    ])
    expect(result.map(b => b.name)).toEqual(['main'])
  })

  it('keeps a PR that mixes code and documents', () => {
    const result = pickDocBranchesFromPullRequests([
      pr({ headRefName: 'feat/x', filePaths: ['app/pages/docs.vue', 'docs/rf/RF-020.md'] })
    ])
    expect(result.map(b => b.name)).toEqual(['main', 'feat/x'])
  })

  it('never lists the default branch twice', () => {
    const result = pickDocBranchesFromPullRequests([
      pr({ headRefName: 'main', filePaths: ['docs/rf/RF-001.md'] })
    ])
    expect(result).toEqual([{ name: 'main' }])
  })

  it('lists a branch once when several open PRs share its head', () => {
    const result = pickDocBranchesFromPullRequests([
      pr({ number: 9, headRefName: 'feat/dup', filePaths: ['docs/rf/RF-001.md'] }),
      pr({ number: 4, headRefName: 'feat/dup', filePaths: ['docs/specs/SPEC-002.md'] })
    ])
    expect(result.map(b => b.name)).toEqual(['main', 'feat/dup'])
    expect(result[1]?.prNumber).toBe(9)
  })

  it('survives a PR whose file list came back empty', () => {
    const result = pickDocBranchesFromPullRequests([pr({ headRefName: 'feat/empty' })])
    expect(result.map(b => b.name)).toEqual(['main'])
  })
})

describe('document comment anchor', () => {
  it('scopes a comment to one document so a PR keeps one thread per doc', () => {
    const rfMarker = docCommentMarker('rf', 'RF-012.md')
    const specMarker = docCommentMarker('specs', 'SPEC-003.md')

    const rfComment = `Falta el caso de anulación.\n${rfMarker}`

    expect(rfComment.includes(rfMarker)).toBe(true)
    expect(rfComment.includes(specMarker)).toBe(false)
  })

  it('hides the anchor from the body shown in Horizon', () => {
    const body = `**Ana** comentó:\n\nRevisar el alcance.\n${docCommentMarker('rf', 'RF-012.md')}`
    expect(stripDocCommentMarker(body)).toBe('**Ana** comentó:\n\nRevisar el alcance.')
  })

  it('leaves a comment written outside Horizon untouched', () => {
    expect(stripDocCommentMarker('Comentario normal del PR')).toBe('Comentario normal del PR')
  })
})

describe('branch-aware document URLs', () => {
  it('keeps main links clean', () => {
    expect(resolveDocLink('../specs/SPEC-001.md', 'rf', 'main')).toBe(
      '/docs?tipo=specs&doc=SPEC-001.md'
    )
    expect(resolveDocAsset('../assets/RF-001/d.png', 'main')).toBe(
      '/api/docs/assets/RF-001/d.png'
    )
  })

  it('carries the branch across documents so links do not fall back to main', () => {
    expect(resolveDocLink('../specs/SPEC-001.md', 'rf', 'feat/nueva-rf')).toBe(
      '/docs?tipo=specs&doc=SPEC-001.md&branch=feat%2Fnueva-rf'
    )
  })

  it('keeps the section anchor after the branch parameter', () => {
    expect(resolveDocLink('../specs/SPEC-001.md#alcance', 'rf', 'feat/x')).toBe(
      '/docs?tipo=specs&doc=SPEC-001.md&branch=feat%2Fx#alcance'
    )
  })

  it('resolves assets against the branch being viewed', () => {
    expect(resolveDocAsset('../assets/RF-001/diagrama.png', 'feat/x')).toBe(
      '/api/docs/assets/RF-001/diagrama.png?branch=feat%2Fx'
    )
  })
})
