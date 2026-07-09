import {
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  doc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS, addDocument } from './firestore'
import type { Booking, BookingStatus, BookingConsumables } from '@/types'

// ============================================================
// BOOKING SERVICE
// Free-tier optimised — narrow queries, minimal reads.
// Auto-confirm model (Spec 2): bookings go straight to 'approved'
// with conflict-check rejection as the safety net.
// ============================================================

/**
 * Check if a time slot conflicts with existing approved bookings for a machine.
 * Query is narrowed by equipmentId + date to minimise reads.
 * Two time intervals [a,b] and [c,d] overlap if a < d && c < b.
 */
export async function checkBookingConflict(
  equipmentId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<Booking | null> {
  const ref = collection(db, COLLECTIONS.BOOKINGS)
  const q = query(
    ref,
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
 * - Sets status to 'approved' immediately (Spec 2 auto-confirm model)
 * - Accepts optional consumables for 3D printers and laser cutter (Spec 2)
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
  // Auto-confirm: status = 'approved' on creation (Spec 2 decision)
  return addDocument<Booking>(COLLECTIONS.BOOKINGS, {
    ...data,
    status: 'approved',
  })
}

/**
 * Get all approved bookings for a machine on a specific date.
 * Used by the slot picker UI to show booked times.
 * Narrow query: equipmentId + date — minimal reads.
 */
export async function getBookingsForSlot(
  equipmentId: string,
  date: string
): Promise<Booking[]> {
  const ref = collection(db, COLLECTIONS.BOOKINGS)
  const q = query(
    ref,
    where('equipmentId', '==', equipmentId),
    where('date', '==', date),
    where('status', '==', 'approved')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking)
}

/**
 * Update booking status (cancel / reject / complete).
 */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  options?: { rejectionReason?: string; cancelledBy?: string }
): Promise<void> {
  const ref = doc(db, COLLECTIONS.BOOKINGS, bookingId)
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
}

/**
 * Get all bookings for a specific user (their own history).
 * Ordered by date descending.
 */
export async function getUserBookings(userId: string): Promise<Booking[]> {
  const ref = collection(db, COLLECTIONS.BOOKINGS)
  const q = query(
    ref,
    where('userId', '==', userId),
    where('status', 'in', ['approved', 'completed', 'cancelled', 'rejected'])
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Booking)
    .sort((a, b) => b.date.localeCompare(a.date))
}
