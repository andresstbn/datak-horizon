import { describe, expect, it } from 'vitest'
import {
  docCommentMarker,
  pickBranchesWithDocChanges,
  resolveDocAsset,
  resolveDocLink,
  stripDocCommentMarker,
  type RefDocTrees
} from '../../shared/utils/docs'

const main = { rfOid: 'rf-main', specsOid: 'specs-main' }

function ref(partial: Partial<RefDocTrees> & { name: string }): RefDocTrees {
  return { rfOid: 'rf-main', specsOid: 'specs-main', ...partial }
}

describe('pickBranchesWithDocChanges', () => {
  it('always offers the default branch first', () => {
    expect(pickBranchesWithDocChanges(main, [])).toEqual([{ name: 'main' }])
  })

  it('drops branches whose docs trees match the default branch', () => {
    const result = pickBranchesWithDocChanges(main, [ref({ name: 'chore/ci' })])
    expect(result.map(b => b.name)).toEqual(['main'])
  })

  it('keeps a branch when either docs folder differs', () => {
    const result = pickBranchesWithDocChanges(main, [
      ref({ name: 'feat/rf-only', rfOid: 'rf-other' }),
      ref({ name: 'feat/specs-only', specsOid: 'specs-other' })
    ])
    expect(result.map(b => b.name)).toEqual(['main', 'feat/rf-only', 'feat/specs-only'])
  })

  it('drops a branch that carries neither docs folder', () => {
    const result = pickBranchesWithDocChanges(main, [
      ref({ name: 'feat/no-docs', rfOid: null, specsOid: null })
    ])
    expect(result.map(b => b.name)).toEqual(['main'])
  })

  it('never lists the default branch twice', () => {
    const result = pickBranchesWithDocChanges(main, [ref({ name: 'main', rfOid: 'rf-main' })])
    expect(result).toEqual([{ name: 'main' }])
  })

  it('carries the open pull request of a changed branch', () => {
    const result = pickBranchesWithDocChanges(main, [
      ref({ name: 'feat/x', rfOid: 'rf-other', prNumber: 42, prTitle: 'Nuevo RF' })
    ])
    expect(result[1]).toEqual({ name: 'feat/x', prNumber: 42, prTitle: 'Nuevo RF' })
  })

  it('omits pull request fields when the branch has none', () => {
    const result = pickBranchesWithDocChanges(main, [ref({ name: 'feat/y', rfOid: 'rf-other' })])
    expect(result[1]).toEqual({ name: 'feat/y' })
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
