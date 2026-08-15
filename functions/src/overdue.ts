import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { notifyUser } from './lib/helpers'

const db = getFirestore()

// ============================================================
// sweepOverdueCheckouts — daily server-side overdue sweep
// Previously isOverdue was client-computed only. This scheduled
// function (02:00 Asia/Kolkata) flags every unreturned checkout
// whose expected return date has passed, and notifies the owner.
// ============================================================

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const sweepOverdueCheckouts = onSchedule(
  { schedule: '0 2 * * *', timeZone: 'Asia/Kolkata', maxInstances: 1 },
  async () => {
    const today = todayStr()
    const snap = await db
      .collectionGroup('checkouts')
      .where('action', '==', 'checking_out')
      .get()

    const batch = db.batch()
    let flagged = 0

    for (const doc of snap.docs) {
      const data = doc.data()
      // Unreturned and past the expected return date (and not already flagged).
      if (data.returnedAt != null) continue
      if (!data.expectedReturnDate || data.expectedReturnDate >= today) continue
      if (data.isOverdue === true) continue

      batch.update(doc.ref, { isOverdue: true, updatedAt: FieldValue.serverTimestamp() })
      flagged++

      const userId: string | undefined = data.userId
      if (userId) {
        await notifyUser({
          userId,
          type: 'checkout_overdue',
          title: 'Tool overdue',
          message: `${data.toolName ?? 'A tool'} (due ${data.expectedReturnDate}) is overdue. Please return it to the lab.`,
          link: '/checkout/history',
        })
      }
    }

    if (flagged > 0) await batch.commit()
    console.log(`[sweepOverdueCheckouts] flagged ${flagged} overdue checkout(s)`)
  },
)
