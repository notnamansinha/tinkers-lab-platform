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
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS, SUBCOLLECTIONS } from './firestore'
import { logProjectActivity } from './activityLog'
import type { Booking, BookingStatus } from '@/types'

// ============================================================
// BOOKING SERVICE
// Project-centric restructure: bookings now live UNDER the project
//   projects/{projectId}/bookings/{bookingId}
// Cross-project queries use COLLECTION GROUP queries on 'bookings'.
// ⚠️ CREATION is server-enforced via the `createBooking` Cloud
// Function (src/services/firebase/functions.ts) — direct client
// creates are denied by firestore.rules so conflict detection
// cannot be bypassed. This module handles reads + status updates.
// ============================================================

/** collectionGroup reference for querying bookings across ALL projects */
function allBookings() {
  return collectionGroup(db, SUBCOLLECTIONS.PROJECT_BOOKINGS)
}

/**
 * Get all approved bookings for a machine on a specific date.
 * Used by the slot picker UI to show booked times.
 * COLLECTION GROUP query — narrow: equipmentId + date.
 */
export async function getBookingsForSlot(
  equipmentId: string,
  date: string
): Promise<Booking[]> {
  const q = query(
    allBookings(),
    where('equipmentId', '==', equipmentId),
    where('date', '==', date),
    where('status', '==', 'approved')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking)
}

/**
 * Look up a single booking by its Firestore doc ID using a collection-group
 * query on __name__. This works regardless of which project it lives under,
 * keeping URLs stable (/bookings/:id). Returns null if not found.
 */
export async function getBookingById(bookingId: string): Promise<Booking | null> {
  const q = query(allBookings(), where('__name__', '==', bookingId))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as Booking
}

/**
 * Update booking status (cancel / reject / complete).
 * projectId is required to construct the subcollection path.
 */
export async function updateBookingStatus(
  projectId: string,
  bookingId: string,
  status: BookingStatus,
  options?: { rejectionReason?: string; cancelledBy?: string; actor?: { uid: string; name: string; email: string } }
): Promise<void> {
  const ref = doc(db, COLLECTIONS.PROJECTS, projectId, SUBCOLLECTIONS.PROJECT_BOOKINGS, bookingId)
  const updates: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  }
  if (status === 'rejected' && options?.rejectionReason) {
    updates.rejectionReason = options.rejectionReason
  }
  if (status === 'cancelled' && options?.cancelledBy) {
    updates.cancelledBy = options.cancelledBy
  }
  await updateDoc(ref, updates)

  const actor = options?.actor
  await logProjectActivity(projectId, {
    type: 'status_change',
    summary: `Booking ${status}${options?.rejectionReason ? ` — ${options.rejectionReason}` : ''}`,
    resourceId: bookingId,
    userId: actor?.uid ?? 'system',
    userName: actor?.name ?? 'Coordinator',
    userEmail: actor?.email ?? '',
  })
}

/**
 * Get every booking that hangs under one project (admin project drill-down).
 * Scoped collection query — no collection-group scan needed.
 */
export async function getProjectBookings(projectId: string): Promise<Booking[]> {
  const ref = collection(db, COLLECTIONS.PROJECTS, projectId, SUBCOLLECTIONS.PROJECT_BOOKINGS)
  const q = query(ref, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Booking)
    .sort((a, b) => (b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime)))
}
