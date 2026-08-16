import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS, SUBCOLLECTIONS } from './firestore'
import type { ActivityLogEntry, ActivityLogType } from '@/types'

// ============================================================
// PROJECT ACTIVITY LOG SERVICE
// Unified chronological timeline stored under each project:
//   projects/{projectDocId}/activityLog/{logId}
// Gives a single place to see everything that happened on a
// project — bookings, checkouts, returns, status changes —
// without cross-collection joins.
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
 * Append an entry to a project's activityLog subcollection.
 * Immutable — there is intentionally no update/delete path.
 */
export async function logProjectActivity(
  projectDocId: string,
  entry: NewActivityLogEntry
): Promise<string> {
  const ref = collection(db, COLLECTIONS.PROJECTS, projectDocId, SUBCOLLECTIONS.PROJECT_ACTIVITY_LOG)
  const docRef = await addDoc(ref, {
    type: entry.type,
    // Keep summaries within the rules-enforced 300-char limit (rejection reasons
    // can be long). Truncate defensively so the log write never fails.
    summary: entry.summary.length > 280 ? entry.summary.slice(0, 277) + '…' : entry.summary,
    resourceId: entry.resourceId ?? null,
    userId: entry.userId,
    userName: entry.userName,
    userEmail: entry.userEmail,
    createdAt: serverTimestamp(),
  })
  return docRef.id
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
