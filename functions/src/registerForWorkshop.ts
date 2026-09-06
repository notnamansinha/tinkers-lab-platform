import { onCall } from 'firebase-functions/v2/https'
import { HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getUserProfile } from './lib/helpers'

const db = getFirestore()

// ============================================================
// registerForWorkshop — SERVER-ENFORCED workshop registration
//
// The previous client flow wrote the registration document directly
// (rules allowed it) but then tried to increment workshops.registeredCount
// with a separate client updateDoc — which the rules deny for students.
// Result: every student click printed an error, retries stacked duplicate
// registrations, and the capacity counter never moved.
//
// This callable makes registration atomic inside a single transaction:
//   active check -> capacity check -> duplicate check -> registration +
//   counter increment. Duplicate registration and over-capacity are both
//   impossible to race past.
// ============================================================

const VALID_STATUS = ['registered', 'cancelled', 'attended'] as const

export const registerForWorkshop = onCall(
  { enforceAppCheck: false, region: 'asia-south1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to register.')
    }
    const uid = request.auth.uid

    const raw = (request.data ?? {}) as Record<string, unknown>
    if (raw.workshopId !== undefined && typeof raw.workshopId !== 'string') {
      throw new HttpsError('invalid-argument', 'workshopId must be a string.')
    }
    const workshopId = raw.workshopId?.trim() ?? ''
    if (!workshopId) {
      throw new HttpsError('invalid-argument', 'workshopId is required.')
    }

    const userId = raw.userId
    if (userId !== undefined) {
      // userId is derived from the auth token — a caller-supplied identity
      // (e.g. registering on behalf of someone else) is rejected.
      throw new HttpsError('invalid-argument', 'userId cannot be set by the caller.')
    }

    const workshopRef = db.collection('workshops').doc(workshopId)
    // Read the profile once (outside the transaction) to stamp display
    // identity on the registration doc — same fields the old client flow sent.
    const profile = await getUserProfile(uid)
    const userName = profile?.displayName ?? ''
    const userEmail = profile?.email ?? ''

    const exists = await db.runTransaction(async (tx) => {
      const shop = await tx.get(workshopRef)
      if (!shop.exists) {
        throw new HttpsError('not-found', 'Workshop not found.')
      }
      const data = shop.data()!
      const capacity = typeof data.capacity === 'number' ? data.capacity : 0
      const count = typeof data.registeredCount === 'number' ? data.registeredCount : 0

      if (data.isActive === false) {
        throw new HttpsError('failed-precondition', 'This workshop is closed for registration.')
      }
      if (count >= capacity) {
        throw new HttpsError('resource-exhausted', 'This workshop is full.')
      }

      // Duplicate guard — serialized by the transaction (all registrations
      // for this user are within the same transaction, so two parallel
      // requests cannot both pass this check).
      const dupQuery = db
        .collection('workshopRegistrations')
        .where('workshopId', '==', workshopId)
        .where('userId', '==', uid)
        .where('status', 'in', ['registered', 'attended'])
      const dup = await tx.get(dupQuery)
      if (!dup.empty) {
        throw new HttpsError('failed-precondition', 'You are already registered for this workshop.')
      }

      const regRef = db.collection('workshopRegistrations').doc()
      tx.set(regRef, {
        workshopId,
        workshopTitle: typeof data.title === 'string' ? data.title : '',
        userId: uid,
        userName,
        userEmail,
        status: 'registered',
        certificateIssued: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      tx.update(workshopRef, {
        registeredCount: count + 1,
        updatedAt: FieldValue.serverTimestamp(),
      })
      // Counter increment rides on the same transaction — a failed duplicate
      // check rolls back to zero, and concurrent registrations serialize.
      return regRef.id
    })

    return { registrationId: exists }
  },
)

// Kept for the workshopRegistrations type surface; validate statuses the
// rules already enforce (used by cancel/feedback update paths — see rules).
export const WORKSHOP_REGISTRATION_STATUSES = VALID_STATUS