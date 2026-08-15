import { onCall } from 'firebase-functions/v2/https'
import { HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getUserProfile } from './lib/helpers'

const db = getFirestore()

// ============================================================
// createBooking — SERVER-ENFORCED booking creation (Form 2A)
// Replaces the previous client-side conflict check. Runs the
// overlap detection + atomic write on the server so two clients
// cannot double-book the same machine slot.
// ============================================================

const BOOKING_KEYS = [
  'equipmentId', 'machineId', 'machineName', 'userId', 'userEmail', 'userName',
  'projectId', 'projectTitle', 'date', 'startTime', 'endTime', 'purpose',
  'consumables', 'safetyAgreementAccepted', 'status', 'rejectionReason',
  'cancelledBy', 'createdAt', 'updatedAt',
] as const

const TIME_PATTERN = /^[0-9]{2}:[0-9]{2}$/
const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/

function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

interface CreateBookingInput {
  equipmentId: string
  machineId: string
  machineName?: string
  projectId: string
  projectTitle?: string
  date: string
  startTime: string
  endTime: string
  purpose: string
  consumables?: Record<string, unknown>
  safetyAgreementAccepted: boolean
}

export const createBooking = onCall(
  { maxInstances: 10, enforceAppCheck: false },
  async (request): Promise<{ bookingId: string }> => {
    const auth = request.auth
    if (!auth) throw new HttpsError('unauthenticated', 'Sign in to book a machine.')

    const input = (request.data ?? {}) as CreateBookingInput
    const uid = auth.uid

    // ── 1. Validate the caller is an active user ───────────────────
    const user = await getUserProfile(uid)
    if (!user) throw new HttpsError('failed-precondition', 'Profile not found. Complete onboarding first.')
    if (user.isActive === false) throw new HttpsError('permission-denied', 'Account is deactivated.')

    // ── 2. Validate input shape ────────────────────────────────────
    if (typeof input.projectId !== 'string' || !input.projectId.trim()
      || typeof input.equipmentId !== 'string' || !input.equipmentId.trim()
      || typeof input.date !== 'string' || !input.date) {
      throw new HttpsError('invalid-argument', 'Missing required booking fields.')
    }
    if (!isRealDate(input.date)) {
      throw new HttpsError('invalid-argument', 'date must be YYYY-MM-DD.')
    }
    if (typeof input.startTime !== 'string' || typeof input.endTime !== 'string'
      || !TIME_PATTERN.test(input.startTime) || !TIME_PATTERN.test(input.endTime)) {
      throw new HttpsError('invalid-argument', 'startTime/endTime must be HH:MM.')
    }
    if (input.startTime > '23:59' || input.endTime > '23:59') {
      throw new HttpsError('invalid-argument', 'startTime/endTime must be valid times.')
    }
    if (input.startTime >= input.endTime) {
      throw new HttpsError('invalid-argument', 'endTime must be after startTime.')
    }
    if (typeof input.purpose !== 'string' || !input.purpose.trim() || input.purpose.trim().length > 500) {
      throw new HttpsError('invalid-argument', 'purpose is required (max 500 chars).')
    }
    if (input.safetyAgreementAccepted !== true) {
      throw new HttpsError('invalid-argument', 'Safety agreement must be accepted.')
    }
    // Reject any attempt to inject privileged fields via the payload.
    for (const key of Object.keys(input)) {
      if (!BOOKING_KEYS.includes(key as (typeof BOOKING_KEYS)[number])) {
        throw new HttpsError('invalid-argument', `Unexpected field: ${key}`)
      }
    }

    // ── 3. Validate the project belongs to the caller ──────────────
    const projectRef = db.collection('projects').doc(input.projectId)
    const projectSnap = await projectRef.get()
    if (!projectSnap.exists) throw new HttpsError('not-found', 'Project not found.')
    const project = projectSnap.data()!
    const isStaff = ['super_admin', 'faculty', 'lab_assistant'].includes(user.role)
    if (project.userId !== uid && !isStaff) {
      throw new HttpsError('permission-denied', 'Booking requires an active project you own.')
    }
    if (project.status !== 'active') {
      throw new HttpsError('failed-precondition', 'Project must be active to book machines.')
    }

    // ── 4. Validate the machine is bookable (Tier-1, confirmed) ────
    const equipmentRef = db.collection('equipment').doc(input.equipmentId)
    const equipmentSnap = await equipmentRef.get()
    if (!equipmentSnap.exists) throw new HttpsError('not-found', 'Equipment not found.')
    const equipment = equipmentSnap.data()!
    if (equipment.tier !== 'bookable' || equipment.confirmed !== true) {
      throw new HttpsError('failed-precondition', 'This machine is not bookable.')
    }
    if (input.machineId !== equipment.machineId) {
      throw new HttpsError('invalid-argument', 'Machine identity does not match equipment.')
    }
    if (!['available', 'reserved'].includes(equipment.status)) {
      throw new HttpsError('failed-precondition', 'Machine is not available for booking.')
    }

    // ── 5. Conflict detection + atomic write (server-side) ─────────
    const bookingId = db.collection('projects').doc(input.projectId)
      .collection('bookings').doc().id

    const conflictRef = db
      .collectionGroup('bookings')
      .where('equipmentId', '==', input.equipmentId)
      .where('date', '==', input.date)
      .where('status', '==', 'approved')

    await db.runTransaction(async (tx) => {
      // Re-read inside the transaction for isolation.
      const snap = await tx.get(conflictRef)
      for (const doc of snap.docs) {
        const b = doc.data()
        if (input.startTime < b.endTime && b.startTime < input.endTime) {
          throw new HttpsError(
            'aborted',
            `Time slot conflicts with an existing booking (${b.startTime}–${b.endTime}).`,
          )
        }
      }

      const bookingRef = db
        .collection('projects').doc(input.projectId)
        .collection('bookings').doc(bookingId)

      const bookingPayload: Record<string, unknown> = {
        equipmentId: input.equipmentId,
        machineId: input.machineId,
        machineName: input.machineName ?? equipment.name ?? '',
        userId: uid,
        userEmail: user.email ?? '',
        userName: user.displayName ?? '',
        projectId: input.projectId,
        projectTitle: input.projectTitle ?? project.title ?? '',
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        purpose: input.purpose,
        consumables: input.consumables ?? null,
        safetyAgreementAccepted: true,
        status: 'approved',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }
      tx.set(bookingRef, bookingPayload)

      // Append to the immutable project timeline.
      const logRef = db
        .collection('projects').doc(input.projectId)
        .collection('activityLog').doc()
      tx.set(logRef, {
        type: 'booking',
        summary: `Booked ${bookingPayload.machineName} (${input.date} ${input.startTime}–${input.endTime})`,
        resourceId: bookingId,
        userId: uid,
        userName: user.displayName ?? '',
        userEmail: user.email ?? '',
        createdAt: FieldValue.serverTimestamp(),
      })
    })

    return { bookingId }
  },
)
