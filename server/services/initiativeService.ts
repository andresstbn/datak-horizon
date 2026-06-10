import {
  initiativeRepository,
  type InitiativeDetailRow,
  type InitiativeWithOwners
} from '../repositories/initiativeRepository'
import type {
  InitiativeDetail,
  InitiativeListItem,
  OwnerRef
} from '../../shared/types/initiative'
import type { NewInitiative } from '../db/schema'

function toOwnerRef(owner: InitiativeWithOwners['functionalOwner']): OwnerRef | null {
  if (!owner) {
    return null
  }
  return {
    id: owner.id,
    displayName: owner.displayName,
    email: owner.email,
    photoUrl: owner.photoUrl
  }
}

function toListItem(row: InitiativeWithOwners): InitiativeListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    priority: row.priority,
    risk: row.risk,
    health: row.health,
    functionalOwner: toOwnerRef(row.functionalOwner),
    technicalOwner: toOwnerRef(row.technicalOwner),
    createdAt: row.createdAt.toISOString(),
    targetDate: row.targetDate?.toISOString() ?? null,
    committedDate: row.committedDate?.toISOString() ?? null,
    estimatedDate: row.estimatedDate?.toISOString() ?? null,
    delayReason: row.delayReason
  }
}

function toDetail(row: InitiativeDetailRow): InitiativeDetail {
  return {
    ...toListItem(row),
    description: row.description,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    createdById: row.createdById
  }
}

export const initiativeService = {
  async list(): Promise<InitiativeListItem[]> {
    const rows = await initiativeRepository.listWithOwners()
    return rows.map(toListItem)
  },

  async getById(id: string): Promise<InitiativeDetail | null> {
    const row = await initiativeRepository.findById(id)
    return row ? toDetail(row) : null
  },

  async create(data: Omit<NewInitiative, 'slug'>, userId: string): Promise<InitiativeDetail> {
    // Basic slug generation
    const slugBase = data.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[^a-z0-9]+/g, '-')     // replace non-alphanumeric with hyphen
      .replace(/(^-|-$)+/g, '')        // trim leading/trailing hyphens
    
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const slug = `${slugBase}-${randomSuffix}`

    const row = await initiativeRepository.create({
      ...data,
      slug,
      createdById: userId
    })

    const detailed = await initiativeRepository.findById(row.id)
    return toDetail(detailed!)
  },

  async update(id: string, data: Partial<NewInitiative>): Promise<InitiativeDetail | null> {
    const row = await initiativeRepository.update(id, data)
    if (!row) return null
    const detailed = await initiativeRepository.findById(id)
    return detailed ? toDetail(detailed) : null
  }
}
