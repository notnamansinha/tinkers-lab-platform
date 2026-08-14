/**
 * Tinkerers' Lab — Migration: Flat bookings/toolCheckouts → Project Subcollections
 *
 * Migrates existing top-level Firestore documents into the new project-centric
 * structure:
 *
 *   bookings/{docId}            → projects/{projectId}/bookings/{docId}
 *   toolCheckouts/{docId}       → projects/{projectId}/checkouts/{docId}
 *
 * Also:
 *  - Generates an initial activityLog entry per migrated booking/checkout
 *  - Initialises counters/projects → { nextId: <projectCount + 1> }
 *    (so the next TL-XXX code continues where the old data left off)
 *
 * Idempotent: re-running it will NOT duplicate data, because it writes each
 * document back under the SAME document ID it already had (setDoc on the target
 * path with the same ID simply overwrites the identical payload).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * USAGE
 *   This script requires the Firebase Admin SDK and a service account.
 *
 *   1.  npm install firebase-admin
 *   2.  Place your service account JSON at scripts/service-account.json
 *       (or set GOOGLE_APPLICATION_CREDENTIALS to its path)
 *   3.  Run:  npx ts-node scripts/migrateToSubcollections.ts
 *
 *   WARNING: Run against the PRODUCTION database only when you are ready to
 *   switch the app over. The app reads/writes ONLY the new subcollection
 *   structure after this migration, so old top-level docs would be orphaned.
 * ────────────────────────────────────────────────────────────────────────────
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

const SERVICE_ACCOUNT = process.env.GOOGLE_APPLICATION_CREDENTIALS
  || path.resolve(__dirname, 'service-account.json')

if (!fs.existsSync(SERVICE_ACCOUNT)) {
  console.error(`❌ Service account not found at ${SERVICE_ACCOUNT}`)
  console.error('   Place it at scripts/service-account.json or set GOOGLE_APPLICATION_CREDENTIALS.')
  process.exit(1)
}

initializeApp({ credential: cert(SERVICE_ACCOUNT) })
const db = getFirestore()

async function migrateBookings() {
  console.log('\n── Bookings ───────────────────────────────')
  const snap = await db.collection('bookings').get()
  console.log(`Found ${snap.size} top-level bookings.`)

  let moved = 0
  let skipped = 0

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const projectId = data.projectId

    if (!projectId) {
      console.warn(`  ⚠ skipping ${docSnap.id}: no projectId — cannot place under a project`)
      skipped++
      continue
    }

    const target = db.doc(`projects/${projectId}/bookings/${docSnap.id}`)
    const targetSnap = await target.get()
    if (targetSnap.exists) {
      // Already migrated (idempotency) — verify it matches
      console.log(`  · ${docSnap.id} already exists under project ${projectId} — skipped`)
      skipped++
      continue
    }

    // Create the activity log entry for this historical booking
    await db.collection(`projects/${projectId}/activityLog`).add({
      type: 'booking',
      summary: `Migrated booking: ${data.machineName || data.machineId || 'machine'} (${data.date || ''} ${data.startTime || ''}–${data.endTime || ''})`,
      resourceId: docSnap.id,
      userId: data.userId || 'unknown',
      userName: data.userName || 'Unknown',
      userEmail: data.userEmail || '',
      createdAt: data.createdAt || new Date(),
    })

    await target.set(data)
    moved++
  }

  console.log(`✅ ${moved} migrated, ${skipped} skipped`)
}

async function migrateCheckouts() {
  console.log('\n── Tool Checkouts ─────────────────────────')
  const snap = await db.collection('toolCheckouts').get()
  console.log(`Found ${snap.size} top-level tool checkouts.`)

  let moved = 0
  let skipped = 0

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const projectId = data.projectId

    if (!projectId) {
      console.warn(`  ⚠ skipping ${docSnap.id}: no projectId — cannot place under a project`)
      skipped++
      continue
    }

    const target = db.doc(`projects/${projectId}/checkouts/${docSnap.id}`)
    const targetSnap = await target.get()
    if (targetSnap.exists) {
      console.log(`  · ${docSnap.id} already exists under project ${projectId} — skipped`)
      skipped++
      continue
    }

    await db.collection(`projects/${projectId}/activityLog`).add({
      type: data.action === 'returning' ? 'return' : 'checkout',
      summary: `Migrated checkout: ${data.toolName || 'tool'} (qty: ${data.quantity ?? 1})`,
      resourceId: docSnap.id,
      userId: data.userId || 'unknown',
      userName: data.userName || 'Unknown',
      userEmail: data.userEmail || '',
      createdAt: data.createdAt || new Date(),
    })

    await target.set(data)
    moved++
  }

  console.log(`✅ ${moved} migrated, ${skipped} skipped`)
}

async function initCounter() {
  console.log('\n── Atomic counter ─────────────────────────')
  const counterRef = db.doc('counters/projects')
  const counterSnap = await counterRef.get()

  const projectsSnap = await db.collection('projects').get()
  const nextId = projectsSnap.size + 1

  if (counterSnap.exists) {
    const current = counterSnap.data()?.nextId
    console.log(`Counters/projects already exists (nextId=${current}) — leaving as-is.`)
    return
  }

  await counterRef.set({ nextId })
  console.log(`✅ Initialised counters/projects → { nextId: ${nextId} } (projects count = ${projectsSnap.size})`)
}

async function main() {
  console.log('🚀 Starting migration to project subcollections…')
  await migrateBookings()
  await migrateCheckouts()
  await initCounter()
  console.log('\n🎉 Migration complete. The app now reads/writes only the new structure.')
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
