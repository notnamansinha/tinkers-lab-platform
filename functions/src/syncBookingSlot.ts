import { onDocumentUpdated, onDocumentDeleted } from 'firebase-functions/v2/firestore'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const db = getFirestore()

// ============================================================
// Booking slot lifecycle sync
// Booking documents are PRIVATE (owner/staff only, per rules) —
// machine-wide availability lives in the privacy-safe `slots`
// collection (no user identity). createBooking writes the slot
// atomically; these triggers keep the slot in sync when staff
// reject/cancel/delete a booking, or when a booking is edited
// or re-approved.
// ============================================================

const INACTIVE_STATUSES = ['cancelled', 'rejected']

function slotIdOf(equipmentId: string, date: string, startTime: string): string {
  return `${equipmentId}_${date}_${startTime}`
}

interface BookingLike {
  equipmentId?: string
  machineId?: string
  machineName?: string
  date?: string
  startTime?: string
  endTime?: string
  status?: string
}

/** Rebuild the privacy-safe slot doc for an approved booking. */
async function upsertSlot(bookingId: string, data: BookingLike): Promise<void> {
  const { equipmentId, date, startTime, endTime } = data
  if (!equipmentId || !date || !startTime) return
  await db.collection('slots').doc(slotIdOf(equipmentId, date, startTime)).set({
    equipmentId,
    machineId: data.machineId ?? '',
    machineName: data.machineName ?? '',
    date,
    startTime,
    endTime: endTime ?? '',
    bookingId,
    status: 'approved',
    createdAt: FieldValue.serverTimestamp(),
  })
}

async function removeSlot(data: BookingLike): Promise<void> {
  const { equipmentId, date, startTime } = data
  if (!equipmentId || !date || !startTime) return
  await db.collection('slots').doc(slotIdOf(equipmentId, date, startTime)).delete()
}

export const syncBookingSlot = onDocumentUpdated(
  { document: 'projects/{projectId}/bookings/{bookingId}', maxInstances: 10 },
  async (event) => {
    const before = event.data?.before.data() as BookingLike | undefined
    const after = event.data?.after.data() as BookingLike | undefined
    if (!before || !after) return
    const bookingId = event.params.bookingId

    if (after.status === 'approved') {
      // Idempotent — covers re-approvals and time-slot edits.
      const moved = before.equipmentId !== after.equipmentId
        || before.date !== after.date
        || before.startTime !== after.startTime
      if (!moved) return
      if (moved && before.equipmentId && before.date && before.startTime) {
        // Booking edited in place — remove the OLD slot so availability
        // doesn't show stale occupancy at the previous time.
        await removeSlot(before)
      }
      await upsertSlot(bookingId, after)
      return
    }
    if (typeof after.status === 'string' && INACTIVE_STATUSES.includes(after.status)) {
      await removeSlot(after)
    }
  },
)

export const cleanupBookingSlot = onDocumentDeleted(
  { document: 'projects/{projectId}/bookings/{bookingId}', maxInstances: 10 },
  async (event) => {
    await removeSlot(event.data?.data() as BookingLike | undefined ?? {})
  },
)