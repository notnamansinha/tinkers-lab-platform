import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const db = getFirestore()

/**
 * Today's calendar date (YYYY-MM-DD) in Asia/Kolkata.
 * Cloud Functions run on UTC, but every date constraint in the app
 * (checkout due dates, booking dates) is expressed in IST — a UTC-based
 * "today" makes overdue sweeps and date checks drift by a day.
 */
export function todayInIndia(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/**
 * Create an in-app notification for a user (admin SDK — bypasses rules,
 * but the Firestore rules still restrict client-created notifications).
 */
export async function notifyUser(params: {
  userId: string
  type: string
  title: string
  message: string
  link?: string
}): Promise<void> {
  await db.collection('notifications').add({
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link ?? null,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
  })
}

/**
 * Read a user's profile doc. Returns null if missing.
 */
export async function getUserProfile(uid: string) {
  const snap = await db.collection('users').doc(uid).get()
  return snap.exists ? (snap.data() ?? null) : null
}
