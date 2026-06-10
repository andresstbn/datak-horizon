import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import {
  initiativeStatus,
  healthLevel,
  initiatives,
  conversations,
  insights,
  requirements,
  aiArtifacts,
  users
} from '../../server/db/schema'

describe('database schema', () => {
  it('defines the expected initiative status values', () => {
    expect(initiativeStatus.enumValues).toEqual([
      'discovery',
      'refinement',
      'ready',
      'in_development',
      'qa',
      'released',
      'blocked',
      'cancelled'
    ])
  })

  it('defines the expected health level values', () => {
    expect(healthLevel.enumValues).toEqual([
      'on_track',
      'at_risk',
      'off_track'
    ])
  })

  it('links users to the firebase uid and keeps it unique', () => {
    const config = getTableConfig(users)
    const firebaseUid = config.columns.find(c => c.name === 'firebase_uid')
    expect(firebaseUid).toBeDefined()
    expect(firebaseUid?.notNull).toBe(true)

    const hasUniqueFirebaseUid = config.indexes.some(
      i => i.config.unique && i.config.columns.some(c => 'name' in c && c.name === 'firebase_uid')
    )
    expect(hasUniqueFirebaseUid).toBe(true)
  })

  it('cascades core relationships from initiatives', () => {
    for (const table of [conversations, insights, requirements, aiArtifacts]) {
      const fk = getTableConfig(table).foreignKeys.find(f =>
        f.reference().foreignTable === initiatives
      )
      expect(fk?.onDelete).toBe('cascade')
    }
  })
})
