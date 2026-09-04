import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getUserProfile } from './lib/helpers'

const db = getFirestore()

// ============================================================
// appendActivityLog — SERVER-ENFORCED timeline appends
// The project activity log is the platform's audit trail, but the
// old client-direct writes let a malicious owner forge entries or
// backdate the timeline (client-supplied createdAt). This callable
// validates ownership + entry type, and stamps a SERVER timestamp.
// `created`/`booking`/`checkout` entries are reserved for the
// functions that create those resources; clients may append:
//   - checkout / return  (owner logging their own events)
//   - status_change      (owner cancels a booking, or staff any change)
// ============================================================

const APPENDABLE_TYPES = ['checkout', 'return', 'status_change'] as const
const MAX_SUMMARY_LEN = 300
const MAX_RESOURCE_ID_LEN = 200

export const appendActivityLog = onCall(
  { maxInstances: 10, enforceAppCheck: false },
  async (request): Promise<{ logId: string }> => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to update the timeline.')

    const uid = request.auth.uid
    const data = (request.data ?? {}) as {
      projectId?: unknown
      type?: unknown
      summary?: unknown
      resourceId?: unknown
    }

    if (typeof data.projectId !== 'string' || !data.projectId.trim()) {
      throw new HttpsError('invalid-argument', 'projectId is required.')
    }
    if (typeof data.type !== 'string' || !(APPENDABLE_TYPES as readonly string[]).includes(data.type)) {
      throw new HttpsError('invalid-argument', `type must be one of: ${APPENDABLE_TYPES.join(', ')}.`)
    }
    if (
      typeof data.summary !== 'string'
      || data.summary.trim().length === 0
      || data.summary.length > MAX_SUMMARY_LEN
    ) {
      throw new HttpsError('invalid-argument', `summary is required (max ${MAX_SUMMARY_LEN} chars).`)
    }
    if (data.resourceId !== undefined && (typeof data.resourceId !== 'string' || data.resourceId.length > MAX_RESOURCE_ID_LEN)) {
      throw new HttpsError('invalid-argument', 'resourceId must be short text.')
    }

    // ── Caller must be an active user who owns the project (or staff) ──
    const user = await getUserProfile(uid)
    if (!user) throw new HttpsError('failed-precondition', 'Profile not found. Complete onboarding first.')
    if (user.isActive === false) throw new HttpsError('permission-denied', 'Account is deactivated.')

    const isStaffRole = ['super_admin', 'faculty', 'lab_assistant'].includes(user.role ?? '')

    const projectSnap = await db.collection('projects').doc(data.projectId).get()
    if (!projectSnap.exists) throw new HttpsError('not-found', 'Project not found.')
    const project = projectSnap.data()!
    const isOwner = project.userId === uid
    if (!isOwner && !isStaffRole) {
      throw new HttpsError('permission-denied', 'Timeline updates require owning the project.')
    }

    // Owners may only log their own checkout/return events or a booking-cancel
    // status change — they cannot forge `created`/`booking`/`checkout` entries.
    if (isOwner && !isStaffRole && data.type !== 'checkout' && data.type !== 'return' && data.summary !== 'Booking cancelled') {
      throw new HttpsError('permission-denied', 'Owners may only log checkout/return/cancel events.')
    }

    const logRef = db.collection('projects').doc(data.projectId).collection('activityLog').doc()
    await logRef.set({
      type: data.type,
      summary: data.summary.trim(),
      resourceId: data.resourceId ?? null,
      userId: uid,
      userName: user.displayName ?? '',
      userEmail: user.email ?? '',
      createdAt: FieldValue.serverTimestamp(), // server-stamped — no backdating
    })
    return { logId: logRef.id }
  },
)