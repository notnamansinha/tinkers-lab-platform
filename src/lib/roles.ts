import { ADMIN_ROLES, STAFF_ROLES } from '@/types'

/**
 * Role normalization + membership helpers.
 *
 * These are pure functions so the authorization semantics (which roles count
 * as "staff" / "admin") are unit-testable and cannot drift from the rules in
 * firestore.rules (isAdmin == 'super_admin', isStaff == super_admin/faculty/
 * lab_assistant).
 */

/** Lowercase and strip anything that is not a-z — "Super_Admin" → "superadmin". */
export function normalizeRole(role: string | null | undefined): string {
  if (!role) return ''
  return role.toLowerCase().replace(/[^a-z]/g, '')
}

/** True if the raw role string is admin (case / punctuation insensitive). */
export function isAdminRole(role: string | null | undefined): boolean {
  const norm = normalizeRole(role)
  return ADMIN_ROLES.map(normalizeRole).includes(norm)
}

/** True if the raw role string is staff (admin, faculty or lab assistant). */
export function isStaffRole(role: string | null | undefined): boolean {
  const norm = normalizeRole(role)
  return STAFF_ROLES.map(normalizeRole).includes(norm)
}