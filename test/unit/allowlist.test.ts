import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ALLOWED_EMAILS,
  getAllowedEmails,
  isEmailAllowed,
  normalizeEmail,
  parseAllowlistString
} from '../../server/utils/allowlist'

describe('allowlist utility', () => {
  describe('normalizeEmail', () => {
    it('lowercases and trims email addresses', () => {
      expect(normalizeEmail('  DANIEL@Datak.Co  ')).toBe('daniel@datak.co')
      expect(normalizeEmail('Ana@Datak.Example')).toBe('ana@datak.example')
    })
  })

  describe('parseAllowlistString', () => {
    it('parses comma-separated emails with extra spaces and empty entries', () => {
      const result = parseAllowlistString(' user1@datak.co ,  user2@datak.co ,,  USER3@DATAK.CO ')
      expect(result).toEqual(['user1@datak.co', 'user2@datak.co', 'user3@datak.co'])
    })

    it('returns empty array for empty, undefined or null values', () => {
      expect(parseAllowlistString('')).toEqual([])
      expect(parseAllowlistString(null)).toEqual([])
      expect(parseAllowlistString(undefined)).toEqual([])
    })
  })

  describe('DEFAULT_ALLOWED_EMAILS', () => {
    it('contains all audited production and seed users', () => {
      const expected = [
        'daestebanc@gmail.com',
        'daniel@datak.co',
        'eduardo.luna@datak.co',
        'tania@datak.co',
        'ana@datak.example',
        'luis@datak.example',
        'marta@datak.example'
      ]

      for (const email of expected) {
        expect(DEFAULT_ALLOWED_EMAILS).toContain(email)
      }
    })
  })

  describe('getAllowedEmails', () => {
    it('includes default emails and appends custom allowlist entries', () => {
      const allowed = getAllowedEmails('extra1@datak.co, EXTRA2@DATAK.CO')
      expect(allowed.has('daniel@datak.co')).toBe(true)
      expect(allowed.has('extra1@datak.co')).toBe(true)
      expect(allowed.has('extra2@datak.co')).toBe(true)
    })
  })

  describe('isEmailAllowed', () => {
    it('authorizes audited team members in default allowlist', () => {
      expect(isEmailAllowed('daniel@datak.co')).toBe(true)
      expect(isEmailAllowed('DANIEL@DATAK.CO')).toBe(true)
      expect(isEmailAllowed('  tania@datak.co  ')).toBe(true)
      expect(isEmailAllowed('eduardo.luna@datak.co')).toBe(true)
      expect(isEmailAllowed('daestebanc@gmail.com')).toBe(true)
      expect(isEmailAllowed('ana@datak.example')).toBe(true)
    })

    it('authorizes custom emails passed via runtime allowlist', () => {
      expect(isEmailAllowed('newhire@datak.co', 'newhire@datak.co,other@datak.co')).toBe(true)
      expect(isEmailAllowed('NEWHIRE@DATAK.CO', 'newhire@datak.co')).toBe(true)
    })

    it('rejects unauthorized Google accounts', () => {
      expect(isEmailAllowed('unauthorized.person@gmail.com')).toBe(false)
      expect(isEmailAllowed('attacker@external.org')).toBe(false)
      expect(isEmailAllowed('not-in-list@datak.co')).toBe(false)
    })

    it('rejects null, undefined, or empty values', () => {
      expect(isEmailAllowed(null)).toBe(false)
      expect(isEmailAllowed(undefined)).toBe(false)
      expect(isEmailAllowed('')).toBe(false)
      expect(isEmailAllowed('   ')).toBe(false)
    })
  })
})
