import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const db = getFirestore()

// ============================================================
// deleteMyAccount — full user-requested data deletion
// Erases every data surface the user owns:
//   - their auth account (revokes sign-in everywhere)
//   - profile, notifications, feedback, issues, registrations
//   - their projects: subcollections (bookings/checkouts/activity
//     log/roster), booking occupancy slots, and Storage uploads
// Note: activity-log entries the user left on OTHER projects they
// did not own are intentionally retained — deleting them would
// corrupt other owners' timelines. See docs/firebase/DEPLOYMENT.md.
// ============================================================

async function deleteDocsWhere(collectionPath: string, field: string, value: string): Promise<void> {
  const snap = await db.collection(collectionPath).where(field, '==', value).get()
  for (const doc of snap.docs) {
    await doc.ref.delete()
  }
}

async function deleteSubcollection(docPath: string, sub: string): Promise<void> {
  const ref = db.collection(`${docPath}/${sub}`)
  while (true) {
    const snap = await ref.limit(200).get()
    if (snap.empty) break
    const batch = db.batch()
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}

async function deleteProjectTree(projectId: string, userId: string): Promise<void> {
  const projectRef = db.collection('projects').doc(projectId)

  // Bookings first — each has a privacy slot that must go too.
  const bookingsSnap = await projectRef.collection('bookings').get()
  const batch = db.batch()
  for (const b of bookingsSnap.docs) {
    const d = b.data()
    if (d.equipmentId && d.date && d.startTime) {
      batch.delete(db.collection('slots').doc(`${d.equipmentId}_${d.date}_${d.startTime}`))
    }
    batch.delete(b.ref)
  }
  await batch.commit()

  await deleteSubcollection(projectRef.path, 'checkouts')
  await deleteSubcollection(projectRef.path, 'activityLog')
  await deleteSubcollection(projectRef.path, 'projectMembers')
  await projectRef.delete()

  // Best-effort Storage cleanup for this project's uploads.
  const bucket = getStorage().bucket()
  const safeProjectId = projectId.replace(/[^a-zA-Z0-9_-]/g, '_')
  for (const prefix of [`projects/${safeProjectId}/images/`, `projects/${safeProjectId}/documents/`]) {
    try {
      const [files] = await bucket.getFiles({ prefix })
      if (files.length > 0) {
        await Promise.allSettled(files.map((file) => file.delete()))
      }
    } catch {
      // Storage listing/deletion is best-effort; the docs are gone regardless.
    }
  }
  void userId
}

export const deleteMyAccount = onCall(
  { maxInstances: 10, enforceAppCheck: false },
  async (request): Promise<{ deleted: true }> => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to delete your account.')
    const uid = request.auth.uid

    // 1. Standalone collections owned by the user.
    await deleteDocsWhere('notifications', 'userId', uid)
    await deleteDocsWhere('feedback', 'userId', uid)
    await deleteDocsWhere('issues', 'userId', uid)
    await deleteDocsWhere('workshopRegistrations', 'userId', uid)
    await db.collection('feedbackWindows').doc(uid).delete().catch(() => {})

    // 2. Projects they own — full cascade (subcollections + slots + storage).
    const projectsSnap = await db.collection('projects').where('userId', '==', uid).get()
    for (const doc of projectsSnap.docs) {
      await deleteProjectTree(doc.id, uid)
    }

    // 3. Checkouts they created on any project (collection-group).
    const checkoutsSnap = await db.collectionGroup('checkouts').where('userId', '==', uid).get()
    for (const doc of checkoutsSnap.docs) {
      await doc.ref.delete()
    }

    // 4. Timeline entries they authored on projects they DIDN'T own are kept
    //    (see header comment) — owned projects were fully removed in step 2.

    // 5. Profile + auth account (revokes access everywhere).
    await db.collection('users').doc(uid).delete()

    // 6. Delete the Firebase Auth account last — this also invalidates
    //    outstanding ID tokens, locking the client out cleanly.
    const { getAuth } = await import('firebase-admin/auth')
    await getAuth().deleteUser(uid)

    return { deleted: true }
  },
)