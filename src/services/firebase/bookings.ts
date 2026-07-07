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
import type { Booking, BookingStatus } from '@/types'

// ============================================================
// BOOKING SERVICE — optimized for Firestore free tier
// ============================================================

/**
 * Check if a time slot conflicts with existing bookings.
 * Only queries for the specific machine + date (narrow index).
 */
export async function checkBookingConflict(
  equipmentId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<Booking | null> {
  const ref = collection(db, COLLECTIONS.BOOKINGS)
  // Query only active bookings for this machine/date
  const q = query(
    ref,
    where('equipmentId', '==', equipmentId),
    where('date', '==', date),
    where('status', 'in', ['pending', 'approved'])
  )
  const snap = await getDocs(q)
  for (const d of snap.docs) {
    if (d.id === excludeBookingId) continue
    const b = { id: d.id, ...d.data() } as Booking
    // Check time overlap: two intervals [a,b] and [c,d] overlap if a < d && c < b
    if (startTime < b.endTime && b.startTime < endTime) {
      return b
    }
  }
  return null
}

/**
 * Create a new booking after conflict check.
 */
export async function createBooking(
  data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> {
  // Server-side conflict check
  const conflict = await checkBookingConflict(
    data.equipmentId,
    data.date,
    data.startTime,
    data.endTime
  )
  if (conflict) {
    throw new Error(
      `Time slot conflicts with existing booking (${conflict.startTime}–${conflict.endTime})`
    )
  }
  return addDocument<Booking>(COLLECTIONS.BOOKINGS, {
    ...data,
    status: 'pending',
  })
}

/**
 * Get bookings for a specific machine and date.
 * Used for the slot picker — narrow query.
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
    where('status', 'in', ['pending', 'approved'])
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking)
}

/**
 * Update booking status (approve/reject/cancel).
 */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  approvedBy?: string,
  rejectionReason?: string
): Promise<void> {
  const ref = doc(db, COLLECTIONS.BOOKINGS, bookingId)
  const updates: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  }
  if (status === 'approved' && approvedBy) {
    updates.approvedBy = approvedBy
    updates.approvedAt = serverTimestamp()
  }
  if (status === 'rejected' && rejectionReason) {
    updates.rejectionReason = rejectionReason
  }
  await updateDoc(ref, updates)
}
