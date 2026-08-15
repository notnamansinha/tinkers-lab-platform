import { onCall } from 'firebase-functions/v2/https'
import { HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const db = getFirestore()

// ============================================================
// submitFeedback — SERVER-ENFORCED feedback rate limiting
// Replaces the client-predictable document-ID scheme. The
// function stamps a server-side cooldown document
// (feedbackWindows/{uid}) and enforces 1 per 5 minutes.
// ============================================================

const WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const MAX_MESSAGE = 2000

export const submitFeedback = onCall(
  { maxInstances: 10, enforceAppCheck: false },
  async (request): Promise<{ feedbackId: string }> => {
    const auth = request.auth
    if (!auth) throw new HttpsError('unauthenticated', 'Sign in to send feedback.')

    const message = (request.data as { message?: unknown } | undefined)?.message
    if (typeof message !== 'string' || message.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Message is required.')
    }
    if (message.length > MAX_MESSAGE) {
      throw new HttpsError('invalid-argument', `Message must be ${MAX_MESSAGE} characters or fewer.`)
    }

    const uid = auth.uid
    const windowRef = db.collection('feedbackWindows').doc(uid)
    const now = Date.now()

    const feedbackId = await db.runTransaction(async (tx) => {
      const windowSnap = await tx.get(windowRef)
      const last = windowSnap.exists ? (windowSnap.data()?.lastSubmittedAt as number | undefined) : undefined
      if (last != null && now - last < WINDOW_MS) {
        const waitSec = Math.ceil((WINDOW_MS - (now - last)) / 1000)
        throw new HttpsError('resource-exhausted', `Please wait ${waitSec}s before sending more feedback.`)
      }

      const ref = db.collection('feedback').doc()
      tx.set(ref, {
        userId: uid,
        message: message.trim(),
        createdAt: FieldValue.serverTimestamp(),
      })
      tx.set(windowRef, { lastSubmittedAt: now }, { merge: true })
      return ref.id
    })

    return { feedbackId }
  },
)
