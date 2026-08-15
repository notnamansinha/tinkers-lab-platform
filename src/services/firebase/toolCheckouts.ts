import {
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS, SUBCOLLECTIONS } from './firestore'
import { todayStr } from '@/lib/utils'
import { createToolCheckoutCallable } from './functions'
import { logProjectActivity } from './activityLog'
import type { ToolCheckout, ToolCondition } from '@/types'

// ============================================================
// TOOL CHECKOUT SERVICE  (Form 2B — Tier 2 tools)
// Project-centric restructure: checkouts now live UNDER the project
//   projects/{projectId}/checkouts/{checkoutId}
// Cross-project queries use COLLECTION GROUP queries on 'checkouts'.
// Free-tier optimised — narrow queries, no real-time listeners.
// "No calendar event — tools are logged, not scheduled." (Spec 2)
// ============================================================

/** collectionGroup reference for querying checkouts across ALL projects */
function allCheckoutsRef() {
  return collectionGroup(db, SUBCOLLECTIONS.PROJECT_CHECKOUTS)
}

/**
 * Create a new tool checkout record.
 * Called when a user checks out a tool (action = 'checking_out').
 * Writes to projects/{projectId}/checkouts/{autoId} and appends a
 * 'checkout' entry to the project's activityLog.
 * Creation is delegated to the Cloud Function so identity, project approval,
 * date validity, and the activity entry are server-enforced atomically.
 */
export async function createToolCheckout(
  data: Omit<ToolCheckout, 'id' | 'createdAt' | 'updatedAt' | 'isOverdue' | 'returnedAt' | 'conditionAtReturn'>
): Promise<string> {
  const { data: result } = await createToolCheckoutCallable({
    projectId: data.projectId,
    toolCategory: data.toolCategory,
    toolName: data.toolName,
    quantity: data.quantity,
    locationOfUse: data.locationOfUse,
    outsideLocation: data.outsideLocation,
    expectedReturnDate: data.expectedReturnDate,
    expectedReturnTime: data.expectedReturnTime,
    conditionAtCheckout: data.conditionAtCheckout,
    notes: data.notes,
  })
  return result.checkoutId
}

/**
 * Mark a checkout as returned.
 * projectId is required to construct the subcollection path.
 * Updates action to 'returning', sets returnedAt and conditionAtReturn.
 * isOverdue is cleared (false) on return. Appends a 'return' activity entry.
 */
export async function returnTool(
  projectId: string,
  checkoutId: string,
  conditionAtReturn: ToolCondition,
  notes?: string,
  actor?: { uid: string; name: string; email: string }
): Promise<void> {
  const ref = doc(db, COLLECTIONS.PROJECTS, projectId, SUBCOLLECTIONS.PROJECT_CHECKOUTS, checkoutId)
  const updates: Record<string, unknown> = {
    action: 'returning',
    conditionAtReturn,
    returnedAt: serverTimestamp(),
    isOverdue: false,
    updatedAt: serverTimestamp(),
  }
  if (notes) updates.notes = notes
  await updateDoc(ref, updates)

  await logProjectActivity(projectId, {
    type: 'return',
    summary: `Returned tool${notes ? ` — ${notes}` : ''}`,
    resourceId: checkoutId,
    userId: actor?.uid ?? 'system',
    userName: actor?.name ?? 'User',
    userEmail: actor?.email ?? '',
  })
}

/**
 * Get all active (not yet returned) checkouts for a specific user.
 * "Active" = action == 'checking_out' AND returnedAt is null.
 * COLLECTION GROUP query: userId + action. Ordered newest first.
 */
export async function getActiveUserCheckouts(userId: string): Promise<ToolCheckout[]> {
  const q = query(
    allCheckoutsRef(),
    where('userId', '==', userId),
    where('action', '==', 'checking_out')
  )
  const snap = await getDocs(q)
  const checkouts = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ToolCheckout)
    .filter((c) => !c.returnedAt) // Client-side filter for unreturned
    .sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.())
  return checkouts
}

/**
 * Get ALL checkouts (staff view — including returned).
 * COLLECTION GROUP query across all projects, ordered newest first.
 */
export async function getAllCheckouts(): Promise<ToolCheckout[]> {
  const q = query(allCheckoutsRef(), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  const epoch = new Timestamp(0, 0)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ToolCheckout)
    .sort((a, b) => (b.createdAt ?? epoch).toMillis() - (a.createdAt ?? epoch).toMillis())
}

/**
 * Get ALL active checkouts (staff view — for overdue monitoring).
 * COLLECTION GROUP query. Returns all checking_out records where returnedAt is null.
 * Client-side overdue detection: compare expectedReturnDate < today.
 */
export async function getAllActiveCheckouts(): Promise<ToolCheckout[]> {
  const q = query(
    allCheckoutsRef(),
    where('action', '==', 'checking_out')
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ToolCheckout)
    .filter((c) => !c.returnedAt)
}

/**
 * Get a user's full checkout history (checked-out + returned).
 * COLLECTION GROUP query. Ordered newest first.
 */
export async function getUserCheckoutHistory(userId: string): Promise<ToolCheckout[]> {
  const q = query(
    allCheckoutsRef(),
    where('userId', '==', userId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ToolCheckout)
    .sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.())
}

/**
 * Get every tool checkout that hangs under one project (admin drill-down).
 * Scoped collection query — no collection-group scan needed.
 */
export async function getProjectCheckouts(projectId: string): Promise<ToolCheckout[]> {
  const ref = collection(db, COLLECTIONS.PROJECTS, projectId, SUBCOLLECTIONS.PROJECT_CHECKOUTS)
  const q = query(ref, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ToolCheckout)
    .sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.())
}

/**
 * Client-side helper: check if a checkout is overdue.
 * Overdue = expectedReturnDate < today AND returnedAt is null.
 */
export function isCheckoutOverdue(checkout: ToolCheckout): boolean {
  if (checkout.returnedAt) return false
  if (!checkout.expectedReturnDate) return false
  return checkout.expectedReturnDate < todayStr()
}

/**
 * Flag a checkout as overdue in Firestore.
 * projectId is required to construct the subcollection path.
 * Called by the client for immediate UI consistency; the scheduled function is
 * the authoritative daily sweep for overdue records.
 */
export async function markCheckoutOverdue(projectId: string, checkoutId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.PROJECTS, projectId, SUBCOLLECTIONS.PROJECT_CHECKOUTS, checkoutId)
  await updateDoc(ref, {
    isOverdue: true,
    updatedAt: serverTimestamp(),
  })
}
