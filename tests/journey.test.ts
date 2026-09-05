import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initializeApp, deleteApp as firebaseDeleteApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, type Auth,
} from 'firebase/auth'
import {
  getFirestore, connectFirestoreEmulator,
  doc, getDoc, updateDoc, getDocs, collection, query, where,
  type Firestore,
} from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions'
import { initializeApp as adminInit, type App as AdminApp } from 'firebase-admin/app'
import { getFirestore as getAdminFs, type Firestore as AdminDb, type QuerySnapshot } from 'firebase-admin/firestore'

// ─────────────────────────────────────────────────────────────
// END-TO-END USER JOURNEY — client SDK with security RULES ACTIVE
// Simulates exactly what the UI does: sign in -> register project
// -> admin approves -> book -> check out -> return -> log -> feedback
// -> delete account. Catches cross-layer contract breaks that unit
// tests cannot see (rules vs callables vs triggers vs indexes).
// ─────────────────────────────────────────────────────────────

let app: FirebaseApp
let auth: Auth
let db: Firestore
let functions: ReturnType<typeof getFunctions>
let adminApp: AdminApp
let adminDb: AdminDb

const OWNER_EMAIL = 'journey-owner@tinkers.test'
const ADMIN_EMAIL = 'journey-admin@tinkers.test'
const PASSWORD = 'password123'
let ownerUid = ''
let adminUid = ''

const client = (name: string, data?: unknown) => httpsCallable<unknown, any>(functions, name)(data ?? {})

async function signIn(email: string) {
  await signOut(auth).catch(() => {})
  await signInWithEmailAndPassword(auth, email, PASSWORD)
}

beforeAll(async () => {
  app = initializeApp({ apiKey: 'demo', projectId: 'demo-tinkers-lab', authDomain: 'localhost' })
  auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  db = getFirestore(app)
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  functions = getFunctions(app, 'asia-south1')
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  adminApp = adminInit({ projectId: 'demo-tinkers-lab' })
  adminDb = getAdminFs(adminApp)

  const owner = await createUserWithEmailAndPassword(auth, OWNER_EMAIL, PASSWORD)
  ownerUid = owner.user.uid
  const admin = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, PASSWORD)
  adminUid = admin.user.uid
  await adminDb.doc(`users/${ownerUid}`).set({
    email: OWNER_EMAIL, displayName: 'Journey Owner', role: 'student',
    userType: 'Student', isActive: true, contact: '9825000000', createdAt: new Date(),
  })
  await adminDb.doc(`users/${adminUid}`).set({
    email: ADMIN_EMAIL, displayName: 'Journey Admin', role: 'super_admin',
    userType: 'Professor or Faculty', isActive: true, createdAt: new Date(),
  })
  await adminDb.doc('equipment/journey-3dp').set({
    machineId: 'journey-3dp', name: 'Journey Printer', tier: 'bookable', confirmed: true,
    status: 'available', category: 'Digital Fabrication', healthStatus: 'good',
  })
})

afterAll(async () => {
  await signOut(auth).catch(() => {})
  await firebaseDeleteApp(app);
  await (adminApp as unknown as { delete: () => Promise<void> }).delete()
})

describe('full user journey (rules enforced)', () => {
  it('runs the complete lifecycle end to end', async () => {
    // ── 1. Register a project (rules: create denied, callable allowed) ──
    await signIn(OWNER_EMAIL)
    const projRes = await client('createProject', {
      title: 'Journey Project', abstract: 'x'.repeat(60), contact: '9825000000',
      startDate: todayIST(), expectedEquipmentNeeds: ['3D Printer'],
      safetyAgreementAccepted: true, termsAccepted: true,
      teamMembers: 'Alice (A001), Bob',
      facultyMentor: 'Dr. Mentor',
    })
    const projectId = (projRes.data as { projectId: string }).projectId

    // Owner can read own project via client rules
    const myProject = await getDoc(doc(db, 'projects', projectId))
    expect(myProject.exists()).toBe(true)
    expect(myProject.data()?.projectCode).toMatch(/^TL-\d{3}$/)
    expect(myProject.data()?.status).toBe('pending')

    // Roster + timeline seeded
    const roster = await getDocs(collection(db, 'projects', projectId, 'projectMembers'))
    expect(roster.docs.map((d) => d.data().name)).toEqual(expect.arrayContaining(['Alice', 'Bob', 'Dr. Mentor']))
    const log = await getDocs(collection(db, 'projects', projectId, 'activityLog'))
    expect(log.docs.some((d) => d.data().type === 'created')).toBe(true)

    // A different student cannot read it (rules)
    const outsider = await createUserWithEmailAndPassword(auth, 'journey-outsider@tinkers.test', PASSWORD)
    await signIn('journey-outsider@tinkers.test')
    await expect(getDoc(doc(db, 'projects', projectId))).rejects.toThrow()
    await signIn(OWNER_EMAIL)

    // ── 2. Admin approves via the CLIENT (rules: admin can update status) ──
    await signIn(ADMIN_EMAIL)
    await updateDoc(doc(db, 'projects', projectId), { status: 'active' })
    // trigger fires asynchronously (cold start) — poll for the notification
    const deadline = Date.now() + 15000
    let notifs: QuerySnapshot | undefined = undefined
    while (Date.now() < deadline) {
      notifs = await adminDb.collection('notifications').where('userId', '==', ownerUid).get()
      if (notifs.docs.some((d) => d.data().type === 'project_approved')) break
      await new Promise((r) => setTimeout(r, 500))
    }
    expect(notifs!.docs.some((d) => d.data().type === 'project_approved')).toBe(true)

    // ── 3. Owner books the printer via the callable ──
    await signIn(OWNER_EMAIL)
    const date = todayIST()
    const bookRes = await client('createBooking', {
      projectId, equipmentId: 'journey-3dp', machineId: 'journey-3dp',
      machineName: 'Journey Printer', date, startTime: '10:00', endTime: '11:00',
      purpose: 'Print a housing', safetyAgreementAccepted: true,
      consumables: { filamentType: 'PLA' },
    })
    const bookingId = (bookRes.data as { bookingId: string }).bookingId

    // Slot is readable by ANY authenticated user (privacy-safe calendar)
    const slot = await getDoc(doc(db, 'slots', `journey-3dp_${date}_10:00`))
    expect(slot.exists()).toBe(true)
    expect(JSON.stringify(slot.data())).not.toContain(ownerUid) // no identity leak

    // ── 4. Check out a tool (callable) ──
    const checkRes = await client('createToolCheckout', {
      projectId, toolCategory: 'Hand Tools', toolName: 'Safety Goggles',
      quantity: 1, locationOfUse: 'in_lab', expectedReturnDate: date,
      conditionAtCheckout: 'good',
    })
    const checkoutId = (checkRes.data as { checkoutId: string }).checkoutId

    // ── 5. Return the tool via the CLIENT (rules: owner return allowed) ──
    await updateDoc(doc(db, 'projects', projectId, 'checkouts', checkoutId), {
      action: 'returning', returnedAt: new Date(), conditionAtReturn: 'good',
      isOverdue: false, updatedAt: new Date(),
    })
    const returned = await getDoc(doc(db, 'projects', projectId, 'checkouts', checkoutId))
    expect(returned.data()?.action).toBe('returning')

    // ── 6. Bookings / checkouts / timeline are all owner-readable ──
    const bookingDoc = await getDoc(doc(db, 'projects', projectId, 'bookings', bookingId))
    expect(bookingDoc.data()?.status).toBe('approved')
    expect(bookingDoc.data()?.projectTitle).toBe('Journey Project')

    // ── 7. Feedback (rate-limited callable) ──
    const fb = await client('submitFeedback', { message: 'Great lab experience overall.' })
    expect(fb.data).toHaveProperty('feedbackId')
    await expect(client('submitFeedback', { message: 'Duplicate' })).rejects.toThrow()

    // ── 8. Feedback visible to staff, invisible to students (rules) ──
    await signIn('journey-outsider@tinkers.test')
    const feedbackQuery = query(collection(db, 'feedback'), where('userId', '==', ownerUid))
    await expect(getDocs(feedbackQuery)).rejects.toThrow() // student denied
    void outsider

    // ── 9. Delete account — the whole cascade ──
    await signIn(OWNER_EMAIL)
    const del = await client('deleteMyAccount')
    expect(del.data).toEqual({ deleted: true })

    // Auth account revoked — signing back in fails
    await expect(signIn(OWNER_EMAIL)).rejects.toThrow()

    // All owned data gone (admin view)
    const ownerProfile = await adminDb.doc(`users/${ownerUid}`).get()
    expect(ownerProfile.exists).toBe(false)
    const orphan = await adminDb.doc(`projects/${projectId}`).get()
    expect(orphan.exists).toBe(false)
    const leftoverFeedback = await adminDb.collection('feedback').where('userId', '==', ownerUid).get()
    expect(leftoverFeedback.docs.length).toBe(0)
    const leftoverNotifs = await adminDb.collection('notifications').where('userId', '==', ownerUid).get()
    expect(leftoverNotifs.docs.length).toBe(0)
  }, 120000)
})

function todayIST(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}