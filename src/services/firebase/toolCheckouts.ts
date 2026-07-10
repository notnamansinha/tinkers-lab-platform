import {
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  doc,
  updateDoc,
  Timestamp,
  addDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from './firestore'
import type { ToolCheckout, ToolCondition } from '@/types'

// ============================================================
// TOOL CHECKOUT SERVICE  (Form 2B — Tier 2 tools)
// Free-tier optimised — narrow queries, no real-time listeners.
// "No calendar event — tools are logged, not scheduled." (Spec 2)
// ============================================================

/**
 * Create a new tool checkout record.
 * Called when a user checks out a tool (action = 'checking_out').
 * isOverdue starts as false — updated client-side by comparing dates.
 */
export async function createToolCheckout(
  data: Omit<ToolCheckout, 'id' | 'createdAt' | 'updatedAt' | 'isOverdue' | 'returnedAt' | 'conditionAtReturn'>
): Promise<string> {
  const ref = collection(db, COLLECTIONS.TOOL_CHECKOUTS)
  const docRef = await addDoc(ref, {
    ...data,
    action: 'checking_out',
    isOverdue: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

/**
 * Mark a checkout as returned.
 * Updates action to 'returning', sets returnedAt and conditionAtReturn.
 * isOverdue is cleared (false) on return.
 */
export async function returnTool(
  checkoutId: string,
  conditionAtReturn: ToolCondition,
  notes?: string
): Promise<void> {
  const ref = doc(db, COLLECTIONS.TOOL_CHECKOUTS, checkoutId)
  const updates: Record<string, unknown> = {
    action: 'returning',
    conditionAtReturn,
    returnedAt: serverTimestamp(),
    isOverdue: false,
    updatedAt: serverTimestamp(),
  }
  if (notes) updates.notes = notes
  await updateDoc(ref, updates)
}

/**
 * Get all active (not yet returned) checkouts for a specific user.
 * "Active" = action == 'checking_out' AND returnedAt is null.
 * Narrow query: userId + action. Ordered newest first.
 */
export async function getActiveUserCheckouts(userId: string): Promise<ToolCheckout[]> {
  const ref = collection(db, COLLECTIONS.TOOL_CHECKOUTS)
  const q = query(
    ref,
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
 * Get ALL active checkouts (staff view — for overdue monitoring).
 * Returns all checking_out records where returnedAt is null.
 * Client-side overdue detection: compare expectedReturnDate < today.
 */
export async function getAllActiveCheckouts(): Promise<ToolCheckout[]> {
  const ref = collection(db, COLLECTIONS.TOOL_CHECKOUTS)
  const q = query(
    ref,
    where('action', '==', 'checking_out')
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ToolCheckout)
    .filter((c) => !c.returnedAt)
}

/**
 * Get overdue checkouts (staff view).
 * Queries isOverdue == true. isOverdue is set on the document when detected client-side.
 * Phase 9 (server-side) will have a daily trigger to mark these automatically.
 */
export async function getOverdueCheckouts(): Promise<ToolCheckout[]> {
  const ref = collection(db, COLLECTIONS.TOOL_CHECKOUTS)
  const q = query(
    ref,
    where('isOverdue', '==', true)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ToolCheckout)
}

/**
 * Get a user's full checkout history (checked-out + returned).
 * Ordered newest first.
 */
export async function getUserCheckoutHistory(userId: string): Promise<ToolCheckout[]> {
  const ref = collection(db, COLLECTIONS.TOOL_CHECKOUTS)
  const q = query(
    ref,
    where('userId', '==', userId)
  )
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
  const today = new Date().toISOString().split('T')[0] // "YYYY-MM-DD"
  return checkout.expectedReturnDate < today
}

/**
 * Flag a checkout as overdue in Firestore.
 * Called client-side when overdue is detected — sets isOverdue: true.
 * Phase 9 will automate this via a daily server-side trigger.
 */
export async function markCheckoutOverdue(checkoutId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.TOOL_CHECKOUTS, checkoutId)
  await updateDoc(ref, {
    isOverdue: true,
    updatedAt: serverTimestamp(),
  })
}
