import { describe, it, expect } from 'vitest'
import { normalizeRole, isAdminRole, isStaffRole } from '@/lib/roles'

describe('normalizeRole', () => {
  it('lowercases a role', () => {
    expect(normalizeRole('Super_Admin')).toBe('superadmin')
    expect(normalizeRole('LAB_ASSISTANT')).toBe('labassistant')
  })

  it('strips non-alpha characters', () => {
    expect(normalizeRole('super_admin-2')).toBe('superadmin')
    expect(normalizeRole('STUDENT!')).toBe('student')
  })

  it('returns empty string for null/undefined/empty', () => {
    expect(normalizeRole(null)).toBe('')
    expect(normalizeRole(undefined)).toBe('')
    expect(normalizeRole('')).toBe('')
  })
})

describe('isAdminRole', () => {
  it('returns true only for super_admin', () => {
    expect(isAdminRole('super_admin')).toBe(true)
    expect(isAdminRole('Super_Admin')).toBe(true)
  })

  it('returns false for staff and student roles', () => {
    expect(isAdminRole('faculty')).toBe(false)
    expect(isAdminRole('lab_assistant')).toBe(false)
    expect(isAdminRole('student')).toBe(false)
    expect(isAdminRole(null)).toBe(false)
    expect(isAdminRole('hacker')).toBe(false)
  })
})

describe('isStaffRole', () => {
  it('returns true for super_admin, faculty and lab_assistant', () => {
    expect(isStaffRole('super_admin')).toBe(true)
    expect(isStaffRole('faculty')).toBe(true)
    expect(isStaffRole('lab_assistant')).toBe(true)
  })

  it('handles case differences (Super_Admin vs super_admin)', () => {
    expect(isStaffRole('Super_Admin')).toBe(true)
    expect(isStaffRole('FACULTY')).toBe(true)
  })

  it('returns false for students and unknown roles', () => {
    expect(isStaffRole('student')).toBe(false)
    expect(isStaffRole(null)).toBe(false)
    expect(isStaffRole('admin')).toBe(false)
  })
})