import { describe, expect, it } from 'vitest'
import {
  createDefaultFilters,
  type InitiativeListItem
} from '../../shared/types/initiative'
import {
  filterInitiatives,
  formatInitiativeDate,
  formatRelativeTime,
  paginate,
  priorityBadge,
  statusBadge,
  healthBadge
} from '../../shared/utils/initiatives'

function makeItem(overrides: Partial<InitiativeListItem> = {}): InitiativeListItem {
  return {
    id: overrides.id ?? 'id-1',
    title: 'Portal único de clientes',
    slug: 'portal',
    status: 'in_development',
    priority: 'high',
    risk: 'medium',
    health: 'on_track',
    functionalOwner: { id: 'u1', displayName: 'Ana', email: 'a@x', photoUrl: null },
    technicalOwner: { id: 'u2', displayName: 'Luis', email: 'l@x', photoUrl: null },
    createdAt: '2026-06-01T00:00:00.000Z',
    targetDate: null,
    committedDate: '2026-08-31T00:00:00.000Z',
    estimatedDate: null,
    delayReason: null,
    ...overrides
  }
}

describe('initiative helpers', () => {
  it('maps status, priority and health to localized badges', () => {
    expect(statusBadge('blocked')).toEqual({ label: 'Bloqueado', color: 'error' })
    expect(priorityBadge('high')).toEqual({ label: 'Alta', color: 'error' })
    expect(healthBadge('on_track')).toEqual({ label: 'Al día', color: 'success' })
  })

  it('formats dates and falls back to an em dash', () => {
    expect(formatInitiativeDate(null)).toBe('—')
    expect(formatInitiativeDate('not-a-date')).toBe('—')
    expect(formatInitiativeDate('2026-08-31T00:00:00.000Z')).toMatch(/2026/)
  })

  it('filters by search term (case-insensitive, title only)', () => {
    const items = [makeItem({ id: 'a', title: 'Alpha' }), makeItem({ id: 'b', title: 'Beta' })]
    const filters = { ...createDefaultFilters(), search: 'alph' }
    const result = filterInitiatives(items, filters)
    expect(result.map(i => i.id)).toEqual(['a'])
  })

  it('filters by status, priority and owner', () => {
    const items = [
      makeItem({ id: 'a', status: 'in_development', priority: 'high' }),
      makeItem({ id: 'b', status: 'released', priority: 'low' })
    ]
    expect(
      filterInitiatives(items, { ...createDefaultFilters(), status: 'released' }).map(i => i.id)
    ).toEqual(['b'])
    expect(
      filterInitiatives(items, { ...createDefaultFilters(), ownerId: 'u2' }).map(i => i.id)
    ).toEqual(['a', 'b'])
    expect(
      filterInitiatives(items, { ...createDefaultFilters(), ownerId: 'missing' })
    ).toHaveLength(0)
  })

  it('formats relative time in Spanish', () => {
    const now = new Date('2026-06-04T12:00:00.000Z')
    expect(formatRelativeTime(null, now)).toBe('—')
    expect(formatRelativeTime('2026-06-04T11:59:30.000Z', now)).toBe('hace un momento')
    expect(formatRelativeTime('2026-06-04T11:00:00.000Z', now)).toBe('hace 1 hora')
    expect(formatRelativeTime('2026-06-04T09:00:00.000Z', now)).toBe('hace 3 horas')
    expect(formatRelativeTime('2026-06-03T10:00:00.000Z', now)).toBe('ayer')
    expect(formatRelativeTime('2026-06-01T12:00:00.000Z', now)).toBe('hace 3 días')
  })

  it('paginates with clamped page and 1-based bounds', () => {
    const items = Array.from({ length: 10 }, (_, i) => makeItem({ id: String(i) }))
    const page1 = paginate(items, 1, 8)
    expect(page1.rows).toHaveLength(8)
    expect(page1).toMatchObject({ page: 1, total: 10, from: 1, to: 8 })

    const page2 = paginate(items, 99, 8)
    expect(page2.page).toBe(2)
    expect(page2).toMatchObject({ from: 9, to: 10 })

    const empty = paginate([], 1, 8)
    expect(empty).toMatchObject({ from: 0, to: 0, total: 0 })
  })
})
