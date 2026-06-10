import {
  ANY_OPTION,
  type InitiativeFilters,
  type InitiativeListItem,
  type PriorityLevel,
  type RiskLevel,
  type InitiativeStatus,
  type HealthLevel
} from '../types/initiative'

/**
 * Pure domain helpers for the roadmap. No Vue, no side effects, fully testable.
 * They answer "what is valid / how is it labelled / how is it derived".
 */

export interface BadgeDescriptor {
  label: string
  color: 'primary' | 'neutral' | 'success' | 'warning' | 'error'
}

const STATUS_BADGES: Record<InitiativeStatus, BadgeDescriptor> = {
  discovery: { label: 'Descubrimiento', color: 'neutral' },
  refinement: { label: 'Refinamiento', color: 'primary' },
  ready: { label: 'Listo', color: 'success' },
  in_development: { label: 'En desarrollo', color: 'primary' },
  qa: { label: 'QA', color: 'warning' },
  released: { label: 'Desplegado', color: 'success' },
  blocked: { label: 'Bloqueado', color: 'error' },
  cancelled: { label: 'Cancelado', color: 'neutral' }
}

const LEVEL_BADGES: Record<PriorityLevel, BadgeDescriptor> = {
  low: { label: 'Baja', color: 'neutral' },
  medium: { label: 'Media', color: 'warning' },
  high: { label: 'Alta', color: 'error' }
}

const HEALTH_BADGES: Record<HealthLevel, BadgeDescriptor> = {
  on_track: { label: 'Al día', color: 'success' },
  at_risk: { label: 'En riesgo', color: 'warning' },
  off_track: { label: 'Retrasado', color: 'error' }
}

export function statusBadge(status: InitiativeStatus): BadgeDescriptor {
  return STATUS_BADGES[status] || { label: status, color: 'neutral' }
}

export function priorityBadge(priority: PriorityLevel): BadgeDescriptor {
  return LEVEL_BADGES[priority] || { label: priority, color: 'neutral' }
}

export function riskBadge(risk: RiskLevel): BadgeDescriptor {
  return LEVEL_BADGES[risk] || { label: risk, color: 'neutral' }
}

export function healthBadge(health: HealthLevel): BadgeDescriptor {
  return HEALTH_BADGES[health] || { label: health, color: 'neutral' }
}

/** Format an ISO date as `DD MMM YYYY` in Spanish, or an em dash when empty. */
export function formatInitiativeDate(value: string | null): string {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

/**
 * Human-friendly relative time in Spanish ("hace 5 minutos", "ayer", …).
 * Pure: accepts the reference instant so it stays deterministic and testable.
 */
export function formatRelativeTime(value: string | null, now: Date = new Date()): string {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) {
    return 'hace un momento'
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
  }
  const days = Math.floor(hours / 24)
  if (days === 1) {
    return 'ayer'
  }
  if (days < 30) {
    return `hace ${days} días`
  }
  return formatInitiativeDate(value)
}

/** Apply the search box + select filters to the list. Pure. */
export function filterInitiatives(
  items: InitiativeListItem[],
  filters: InitiativeFilters
): InitiativeListItem[] {
  const search = filters.search.trim().toLowerCase()

  return items.filter((item) => {
    if (search && !item.title.toLowerCase().includes(search)) {
      return false
    }
    if (filters.status !== ANY_OPTION && item.status !== filters.status) {
      return false
    }
    if (filters.priority !== ANY_OPTION && item.priority !== filters.priority) {
      return false
    }
    if (filters.risk !== ANY_OPTION && item.risk !== filters.risk) {
      return false
    }
    if (filters.health !== ANY_OPTION && item.health !== filters.health) {
      return false
    }
    if (filters.ownerId !== ANY_OPTION) {
      const matchesOwner =
        item.functionalOwner?.id === filters.ownerId ||
        item.technicalOwner?.id === filters.ownerId
      if (!matchesOwner) {
        return false
      }
    }
    return true
  })
}

export interface Paginated<T> {
  rows: T[]
  page: number
  perPage: number
  total: number
  from: number
  to: number
}

/** Slice a list into a 1-based page. Clamps the page into a valid range. */
export function paginate<T>(items: T[], page: number, perPage: number): Paginated<T> {
  const total = items.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(Math.max(1, page), lastPage)
  const start = (safePage - 1) * perPage
  const rows = items.slice(start, start + perPage)

  return {
    rows,
    page: safePage,
    perPage,
    total,
    from: total === 0 ? 0 : start + 1,
    to: start + rows.length
  }
}
