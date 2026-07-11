import { db } from '@/lib/firebase'

// ============================================================
// COLLECTION NAMES — single source of truth
// ============================================================
export const COLLECTIONS = {
  USERS: 'users',
  EQUIPMENT: 'equipment',
  BOOKINGS: 'bookings',
  TOOL_CHECKOUTS: 'toolCheckouts',
  INVENTORY: 'inventory',
  INVENTORY_TRANSACTIONS: 'inventoryTransactions',
  MAINTENANCE: 'maintenance',
  WORKSHOPS: 'workshops',
  WORKSHOP_REGISTRATIONS: 'workshopRegistrations',
  PROJECTS: 'projects',
  NOTIFICATIONS: 'notifications',
  ANNOUNCEMENTS: 'announcements',
  ISSUES: 'issues',
  AUDIT_LOGS: 'auditLogs',
  SETTINGS: 'settings',
} as const

