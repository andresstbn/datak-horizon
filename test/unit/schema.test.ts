import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import {
  comments,
  decisions,
  initiativeStatus,
  initiatives,
  priorityLevel,
  specificationVersions,
  specifications,
  users
} from '../../server/db/schema'

describe('database schema', () => {
  it('defines the expected initiative status values', () => {
    expect(initiativeStatus.enumValues).toEqual([
      'planned',
      'in_progress',
      'in_review',
      'blocked',
      'completed'
    ])
  })

  it('defines the expected priority values', () => {
    expect(priorityLevel.enumValues).toEqual(['low', 'medium', 'high'])
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

  it('does not store authentication credentials on users', () => {
    const columnNames = getTableConfig(users).columns.map(c => c.name)
    expect(columnNames).not.toContain('password')
    expect(columnNames).not.toContain('password_hash')
  })

  it('versions specifications with a unique (spec, version) pair', () => {
    const config = getTableConfig(specificationVersions)
    const unique = config.indexes.find(i => i.config.unique)
    const columns = unique?.config.columns.map(c => ('name' in c ? c.name : ''))
    expect(columns).toEqual(['specification_id', 'version'])
  })

  it('cascades core relationships from initiatives', () => {
    for (const table of [specifications, decisions, comments]) {
      const fk = getTableConfig(table).foreignKeys.find(f =>
        f.reference().foreignTable === initiatives
      )
      expect(fk?.onDelete).toBe('cascade')
    }
  })
})
