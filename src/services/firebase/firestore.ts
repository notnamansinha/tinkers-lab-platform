// ============================================================
// COLLECTION NAMES — single source of truth
// ============================================================
export const COLLECTIONS = {
  USERS: 'users',
  EQUIPMENT: 'equipment',
  BOOKINGS: 'bookings',
  // Legacy name kept for back-compat; the active path is the 'checkouts'
  // subcollection under projects (see SUBCOLLECTIONS.PROJECT_CHECKOUTS).
  TOOL_CHECKOUTS: 'checkouts',
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
  FEEDBACK: 'feedback',
  // Atomic counter docs — counters/projects → { nextId: N }
  COUNTERS: 'counters',
} as const

// ============================================================
// SUBCOLLECTION NAMES — project-centric restructure
// Bookings / checkouts / activity logs now live UNDER projects:
//   projects/{projectDocId}/bookings/{bookingId}
//   projects/{projectDocId}/checkouts/{checkoutId}
//   projects/{projectDocId}/activityLog/{logId}
// Collection-group queries (querying across ALL projects) use
// these same names as the collection group id.
// ============================================================
export const SUBCOLLECTIONS = {
  PROJECT_BOOKINGS: 'bookings',
  PROJECT_CHECKOUTS: 'checkouts',
  PROJECT_ACTIVITY_LOG: 'activityLog',
  PROJECT_MEMBERS: 'projectMembers',
} as const


