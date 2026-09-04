import {
  collection,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS, SUBCOLLECTIONS } from './firestore'
import { appendActivityLogCallable, type AppendActivityLogInput } from './functions'
import type { ActivityLogEntry, ActivityLogType } from '@/types'

// ============================================================
// PROJECT ACTIVITY LOG SERVICE
// Unified chronological timeline stored under each project:
//   projects/{projectDocId}/activityLog/{logId}
// ⚠️ APPENDS ARE SERVER-ENFORCED via the `appendActivityLog` Cloud
// Function (functions/src/appendActivityLog.ts) — it validates
// project ownership + entry type and stamps a SERVER timestamp.
// Direct client writes are denied by firestore.rules.
// ============================================================

export interface NewActivityLogEntry {
  type: ActivityLogType
  summary: string
  resourceId?: string   // bookingId / checkoutId if applicable
  userId: string
  userName: string
  userEmail: string
}

/**
 * Append an entry to a project's activityLog subcollection via the
 * server-enforced callable. Immutable — no update/delete path exists.
 * The callable derives actor identity from the authenticated user, so the
 * caller-supplied userId/userName/userEmail are intentionally ignored
 * (kept in the signature for call-site compatibility).
 */
export async function logProjectActivity(
  projectDocId: string,
  entry: NewActivityLogEntry
): Promise<string> {
  const result = await appendActivityLogCallable({
    projectId: projectDocId,
    type: entry.type as AppendActivityLogInput['type'],
    // Keep summaries within the server-enforced 300-char limit (rejection
    // reasons can be long). Truncate defensively so the call never fails.
    summary: entry.summary.length > 280 ? entry.summary.slice(0, 277) + '…' : entry.summary,
    resourceId: entry.resourceId,
  })
  return result.data.logId
}

/**
 * Get a project's activity timeline, newest first.
 * Scoped collection query — no collection group needed for the detail view.
 */
export async function getProjectActivity(projectDocId: string): Promise<ActivityLogEntry[]> {
  const ref = collection(db, COLLECTIONS.PROJECTS, projectDocId, SUBCOLLECTIONS.PROJECT_ACTIVITY_LOG)
  const q = query(ref, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityLogEntry)
}