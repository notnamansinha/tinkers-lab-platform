import {
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  serverTimestamp,
  doc,
  updateDoc,
  addDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { cleanFirestoreData } from '@/lib/utils'
import { COLLECTIONS, SUBCOLLECTIONS } from './firestore'
import { logProjectActivity } from './activityLog'
import type { Booking, BookingStatus } from '@/types'

// ============================================================
// BOOKING SERVICE
// Project-centric restructure: bookings now live UNDER the project
//   projects/{projectId}/bookings/{bookingId}
// Cross-project queries use COLLECTION GROUP queries on 'bookings'.
// Free-tier optimised — narrow queries, minimal reads.
// Auto-confirm model (Spec 2): bookings go straight to 'approved'
// with conflict-check rejection as the safety net.
// ============================================================

/** collectionGroup reference for querying bookings across ALL projects */
function allBookings() {
  return collectionGroup(db, SUBCOLLECTIONS.PROJECT_BOOKINGS)
}

/** Reference for one project's bookings subcollection */
function projectBookings(projectId: string) {
  return collection(db, COLLECTIONS.PROJECTS, projectId, SUBCOLLECTIONS.PROJECT_BOOKINGS)
}

/**
 * Check if a time slot conflicts with existing approved bookings for a machine.
 * Uses a COLLECTION GROUP query (all projects) scoped by equipmentId + date.
 * Two time intervals [a,b] and [c,d] overlap if a < d && c < b.
 */
export async function checkBookingConflict(
  equipmentId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<Booking | null> {
  const q = query(
    allBookings(),
    where('equipmentId', '==', equipmentId),
    where('date', '==', date),
    where('status', 'in', ['approved'])  // Only approved bookings block slots
  )
  const snap = await getDocs(q)
  for (const d of snap.docs) {
    if (d.id === excludeBookingId) continue
    const b = { id: d.id, ...d.data() } as Booking
    if (startTime < b.endTime && b.startTime < endTime) {
      return b
    }
  }
  return null
}

/**
 * Create a new booking.
 * - Runs conflict check first; throws if overlap found (Spec 2: "rejects + emails if conflict found")
 * - Writes to projects/{projectId}/bookings/{autoId}
 * - Sets status to 'approved' immediately (Spec 2 auto-confirm model)
 * - Accepts optional consumables for 3D printers and laser cutter (Spec 2)
 * - Appends a 'booking' entry to the project's activityLog
 */
export async function createBooking(
  data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> {
  const conflict = await checkBookingConflict(
    data.equipmentId,
    data.date,
    data.startTime,
    data.endTime
  )
  if (conflict) {
    throw new Error(
      `Time slot conflicts with an existing booking (${conflict.startTime}–${conflict.endTime}). Please choose a different time.`
    )
  }
  const ref = projectBookings(data.projectId)
  const payload = cleanFirestoreData({
    ...data,
    status: 'approved',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  const docRef = await addDoc(ref, payload)

  await logProjectActivity(data.projectId, {
    type: 'booking',
    summary: `Booked ${data.machineName} (${data.date} ${data.startTime}–${data.endTime})`,
    resourceId: docRef.id,
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
  })

  return docRef.id
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
    userId: actor?.uid ?? 'system',
    userName: actor?.name ?? 'Coordinator',
    userEmail: actor?.email ?? '',
  })
}

/**
 * Get all bookings for a specific user (their own history).
 * COLLECTION GROUP query on userId. Ordered by date descending (client-side).
 */
export async function getUserBookings(userId: string): Promise<Booking[]> {
  const q = query(
    allBookings(),
    where('userId', '==', userId),
    where('status', 'in', ['approved', 'completed', 'cancelled', 'rejected'])
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Booking)
    .sort((a, b) => b.date.localeCompare(a.date))
}
