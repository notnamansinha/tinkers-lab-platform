import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { notifyUser } from './lib/helpers'

export const notifyOnProjectUpdate = onDocumentUpdated(
  { document: 'projects/{projectId}', maxInstances: 10 },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    if (!before || !after) return
    if (before.status === after.status) return

    const ownerId: string | undefined = after.userId
    if (!ownerId) return

    const title = after.projectCode ? `${after.projectCode} ${after.status}` : `Project ${after.status}`
    const messages: Record<string, string> = {
      active: 'Your project was approved. You can now book machines and check out tools.',
      rejected: after.rejectionReason
        ? `Your project was rejected: ${after.rejectionReason}`
        : 'Your project was rejected. Contact the lab for details.',
      on_hold: 'Your project was placed on hold.',
      completed: 'Your project was marked completed. Thank you!',
    }

    if (messages[after.status]) {
      await notifyUser({
        userId: ownerId,
        type: after.status === 'active' ? 'project_approved'
          : after.status === 'rejected' ? 'project_rejected'
          : 'announcement',
        title,
        message: messages[after.status],
        link: `/projects/${event.params.projectId}`,
      })
    }
  },
)

// ============================================================
// notifyOnBookingUpdate — in-app notifications when a booking
// is rejected or cancelled by staff.
// ============================================================
export const notifyOnBookingUpdate = onDocumentUpdated(
  { document: 'projects/{projectId}/bookings/{bookingId}', maxInstances: 10 },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    if (!before || !after) return
    if (before.status === after.status) return

    const userId: string | undefined = after.userId
    if (!userId) return

    const machine = after.machineName ?? 'Machine'
    if (after.status === 'rejected') {
      await notifyUser({
        userId,
        type: 'booking_rejected',
        title: 'Booking rejected',
        message: after.rejectionReason
          ? `${machine} on ${after.date} ${after.startTime}–${after.endTime} was rejected: ${after.rejectionReason}`
          : `${machine} on ${after.date} ${after.startTime}–${after.endTime} was rejected.`,
        link: '/bookings',
      })
    } else if (after.status === 'cancelled') {
      await notifyUser({
        userId,
        type: 'booking_reminder',
        title: 'Booking cancelled',
        message: `${machine} on ${after.date} ${after.startTime}–${after.endTime} was cancelled.`,
        link: '/bookings',
      })
    }
  },
)
