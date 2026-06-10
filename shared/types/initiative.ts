/**
 * Cross-cutting domain types shared between the Nitro server and the Nuxt app.
 * Must stay framework-agnostic (no Vue, no Nitro imports).
 */

export type InitiativeStatus =
  | 'discovery'
  | 'refinement'
  | 'ready'
  | 'in_development'
  | 'qa'
  | 'released'
  | 'blocked'
  | 'cancelled'

export type PriorityLevel = 'low' | 'medium' | 'high'
export type RiskLevel = 'low' | 'medium' | 'high'
export type HealthLevel = 'on_track' | 'at_risk' | 'off_track'

/** Minimal owner reference used in list/detail views. */
export interface OwnerRef {
  id: string
  displayName: string | null
  email: string
  photoUrl: string | null
}

/** A roadmap row: the initiative projected for the table view. */
export interface InitiativeListItem {
  id: string
  title: string
  slug: string
  status: InitiativeStatus
  priority: PriorityLevel
  risk: RiskLevel
  health: HealthLevel
  functionalOwner: OwnerRef | null
  technicalOwner: OwnerRef | null
  createdAt: string
  targetDate: string | null
  committedDate: string | null
  estimatedDate: string | null
  delayReason: string | null
}

/** Full initiative detail consumed by the detail view. */
export interface InitiativeDetail extends InitiativeListItem {
  description: string | null
  archivedAt: string | null
  updatedAt: string
  createdById: string | null
}

/** Sentinel meaning "no filter applied" for the select filters. */
export const ANY_OPTION = 'all' as const

export interface InitiativeFilters {
  search: string
  status: InitiativeStatus | typeof ANY_OPTION
  priority: PriorityLevel | typeof ANY_OPTION
  risk: RiskLevel | typeof ANY_OPTION
  health: HealthLevel | typeof ANY_OPTION
  ownerId: string | typeof ANY_OPTION
}

export function createDefaultFilters(): InitiativeFilters {
  return {
    search: '',
    status: ANY_OPTION,
    priority: ANY_OPTION,
    risk: ANY_OPTION,
    health: ANY_OPTION,
    ownerId: ANY_OPTION
  }
}
