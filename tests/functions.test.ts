import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, type Auth,
} from 'firebase/auth'
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions'
import { initializeApp as adminInit, type App as AdminApp } from 'firebase-admin/app'
import { getFirestore as getAdminFs, type Firestore as AdminDb } from 'firebase-admin/firestore'
import { pathToFileURL } from 'node:url'
const OVERDUE_LIB = new URL('../functions/lib/overdue.js', import.meta.url).href
const FUNCTIONS_ADMIN_APP = new URL('../functions/node_modules/firebase-admin/lib/app/index.js', import.meta.url).href

// The compiled functions import firebase-admin from functions/node_modules — a
// different module instance than tests/node_modules. Initialise that instance
// so the scheduled-function under test can call getFirestore() against the
// emulator (env vars set by emulators:exec).
let functionsAdminReady: Promise<void> | null = null
function ensureFunctionsAdmin(): Promise<void> {
  if (!functionsAdminReady) {
    functionsAdminReady = (async () => {
      const mod = (await import(FUNCTIONS_ADMIN_APP)) as { initializeApp?: (o: object) => unknown }
      try { mod.initializeApp?.({ projectId: 'demo-tinkers-lab' }) } catch { /* already initialised */ }
    })()
  }
  return functionsAdminReady
}

// ─────────────────────────────────────────────────────────────
// Emulator plumbing
// ─────────────────────────────────────────────────────────────
let app: FirebaseApp
let adminApp: AdminApp
let adminDb: AdminDb
let auth: Auth
let functions: ReturnType<typeof getFunctions>

// User email -> auth uid (captured at creation so the admin seed matches).
const USERS: Record<string, string> = {}
const PASSWORD = 'password123'

const EMAILS = {
  student: 'student@tinkers.test',
  other: 'other@tinkers.test',
  staff: 'staff@tinkers.test',
  admin: 'admin@tinkers.test',
  inactive: 'inactive@tinkers.test',
}

const baseProfile = (email: string, role: string, extra: Record<string, unknown> = {}) => ({
  email, displayName: email.split('@')[0], userType: 'Student', role, isActive: true, ...extra,
})

async function createAuthUser(email: string): Promise<string> {
  const cred = await createUserWithEmailAndPassword(auth, email, PASSWORD)
  return cred.user.uid
}

async function signInAs(email: string) {
  await signOut(auth).catch(() => {})
  await signInWithEmailAndPassword(auth, email, PASSWORD)
}

function call(name: string, data?: unknown) {
  return httpsCallable<unknown, any>(functions, name)(data ?? {})
}

const expectCode = async (p: Promise<unknown>, code: string) => {
  try {
    await p
    throw new Error(`expected error code ${code} but call succeeded`)
  } catch (e) {
    const err = e as { code?: string }
    if (err?.message?.includes('expected error code')) throw e
    // The web SDK prefixes callable error codes with "functions/" — normalize.
    const actual = (err?.code ?? '').replace(/^functions\//, '')
    expect(actual).toBe(code)
  }
}

// Fixture ids
const FIX = {
  equipmentBookable: 'bambu-x1c',
  equipmentLaser: 'laser-cutter',
  equipmentUnconfirmed: 'unconfirmed-printer',
  equipmentNonBookable: 'hammer',
  equipmentUnavailable: 'busy-cnc',
  projectActive: 'active-proj',
  projectPending: 'pending-proj',
  projectOther: 'other-proj',
}

async function seedFixtures() {
  const db = adminDb
  const now = new Date()
  const eq = (id: string, over: Record<string, unknown>) =>
    db.doc(`equipment/${id}`).set({
      machineId: id, name: id, tier: 'bookable', confirmed: true,
      status: 'available', category: 'Digital Fabrication', healthStatus: 'good',
      createdAt: now, updatedAt: now, ...over,
    })
  await eq(FIX.equipmentBookable, {})
  await eq(FIX.equipmentLaser, {})
  await eq(FIX.equipmentUnconfirmed, { confirmed: false })
  await eq(FIX.equipmentNonBookable, { tier: 'checkout' })
  await eq(FIX.equipmentUnavailable, { status: 'under_maintenance' })

  const project = (id: string, owner: string, over: Record<string, unknown>) =>
    db.doc(`projects/${id}`).set({
      userId: owner, status: 'active', title: id, abstract: 'Abstract '.repeat(6),
      safetyAgreementAccepted: true, termsAccepted: true, projectCode: `TL-${id}`,
      imageUrls: [], documentUrls: [], createdAt: now, updatedAt: now, ...over,
    })
  await project(FIX.projectActive, USERS.student, {})
  await project(FIX.projectPending, USERS.student, { status: 'pending' })
  await project(FIX.projectOther, USERS.other, {})
}

beforeAll(async () => {
  app = initializeApp({ apiKey: 'demo', projectId: 'demo-tinkers-lab', authDomain: 'localhost' })
  auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  functions = getFunctions(app, 'asia-south1')
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)

  adminApp = adminInit({ projectId: 'demo-tinkers-lab' })
  adminDb = getAdminFs(adminApp)

  // Create auth users and capture uids.
  USERS.student = await createAuthUser(EMAILS.student)
  USERS.other = await createAuthUser(EMAILS.other)
  USERS.staff = await createAuthUser(EMAILS.staff)
  USERS.admin = await createAuthUser(EMAILS.admin)
  USERS.inactive = await createAuthUser(EMAILS.inactive)

  // Seed profiles + base fixtures (admin SDK bypasses rules).
  const db = adminDb
  await db.doc(`users/${USERS.student}`).set(baseProfile(EMAILS.student, 'student'))
  await db.doc(`users/${USERS.other}`).set(baseProfile(EMAILS.other, 'student'))
  await db.doc(`users/${USERS.staff}`).set(baseProfile(EMAILS.staff, 'lab_assistant', { userType: 'Professor or Faculty' }))
  await db.doc(`users/${USERS.admin}`).set(baseProfile(EMAILS.admin, 'super_admin', { userType: 'Professor or Faculty' }))
  await db.doc(`users/${USERS.inactive}`).set(baseProfile(EMAILS.inactive, 'student', { isActive: false }))
  await seedFixtures()
})

// Reset mutable state each test (feedback window, counters stay).
beforeEach(async () => {
  await adminDb.doc('feedbackWindows/any').delete().catch(() => {})
  await adminDb.doc(`feedbackWindows/${USERS.student}`).delete().catch(() => {})
})

afterAll(async () => {
  await deleteApp(app)
  await adminApp.delete()
})

// ─────────────────────────────────────────────────────────────
// createProject
// ─────────────────────────────────────────────────────────────
describe('createProject', () => {
  const valid = () => ({
    title: 'A valid project title', abstract: 'x'.repeat(60), contact: '9999999999',
    startDate: '2026-08-01', expectedEquipmentNeeds: ['3D Printer'],
    safetyAgreementAccepted: true, termsAccepted: true,
  })

  it('rejects unauthenticated callers', async () => {
    await signOut(auth).catch(() => {})
    await expectCode(call('createProject', valid()), 'unauthenticated')
  })

  it('rejects deactivated users', async () => {
    await signInAs(EMAILS.inactive)
    await expectCode(call('createProject', valid()), 'permission-denied')
  })

  it('rejects a missing profile (failed-precondition)', async () => {
    // a fresh auth user with no profile doc
    const uid = await createAuthUser('noprofile@tinkers.test')
    await signInAs('noprofile@tinkers.test')
    await expectCode(call('createProject', valid()), 'failed-precondition')
    await adminDb.doc(`users/${uid}`).delete().catch(() => {})
  })

  it('rejects missing required fields', async () => {
    await signInAs(EMAILS.student)
    const { title: _t, ...noTitle } = valid()
    await expectCode(call('createProject', noTitle), 'invalid-argument')
  })

  it('rejects a title shorter than 5 chars', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createProject', { ...valid(), title: 'abc' }), 'invalid-argument')
  })

  it('rejects an abstract shorter than 50 chars', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createProject', { ...valid(), abstract: 'short' }), 'invalid-argument')
  })

  it('rejects an invalid start date', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createProject', { ...valid(), startDate: '2026-02-30' }), 'invalid-argument')
    await expectCode(call('createProject', { ...valid(), startDate: 'not-a-date' }), 'invalid-argument')
  })

  it('rejects an end date before the start date', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createProject', { ...valid(), endDate: '2026-01-01' }), 'invalid-argument')
  })

  it('rejects invalid expectedEquipmentNeeds', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createProject', { ...valid(), expectedEquipmentNeeds: ['Nuclear Reactor'] }), 'invalid-argument')
  })

  it('rejects unaccepted safety agreements', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createProject', { ...valid(), safetyAgreementAccepted: false }), 'invalid-argument')
    await expectCode(call('createProject', { ...valid(), termsAccepted: false }), 'invalid-argument')
  })

  it('rejects non-Firebase imageUrls', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createProject', { ...valid(), imageUrls: ['http://evil.com/x.png'] }), 'invalid-argument')
  })

  it('rejects more than 12 imageUrls', async () => {
    await signInAs(EMAILS.student)
    const urls = Array.from({ length: 13 }, (_, i) => `https://firebasestorage.googleapis.com/v0/b/demo/o/${i}.png`)
    await expectCode(call('createProject', { ...valid(), imageUrls: urls }), 'invalid-argument')
  })

  it('rejects an imageUrl longer than 500 chars', async () => {
    await signInAs(EMAILS.student)
    const long = `https://firebasestorage.googleapis.com/${'x'.repeat(520)}`
    await expectCode(call('createProject', { ...valid(), imageUrls: [long] }), 'invalid-argument')
  })

  it('rejects unexpected extra fields', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createProject', { ...valid(), role: 'super_admin' }), 'invalid-argument')
    await expectCode(call('createProject', { ...valid(), zzz: true }), 'invalid-argument')
  })

  it('rejects a non-http resourceLink', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createProject', { ...valid(), resourceLink: 'javascript:alert(1)' }), 'invalid-argument')
  })

  it('creates a project with a TL-XXX code, timeline and roster', async () => {
    await signInAs(EMAILS.student)
    const res = await call('createProject', {
      ...valid(),
      teamMembers: 'Alice (A001), Bob (B002)\nCarol\nDave, D003',
      facultyMentor: 'Dr. Mentor',
    })
    const { projectId } = res.data as { projectId: string }
    const proj = (await adminDb.doc(`projects/${projectId}`).get()).data()
    expect(proj?.projectCode).toMatch(/^TL-\d{3}$/)
    expect(proj?.status).toBe('pending')
    expect(proj?.userId).toBe(USERS.student)

    // roster seeded
    const members = await adminDb.collection(`projects/${projectId}/projectMembers`).get()
    const names = members.docs.map((d) => d.data().name)
    expect(names).toContain('Dr. Mentor')
    expect(names).toContain('Alice')
    expect(names).toContain('Bob')
    expect(names).toContain('Carol')
    expect(names).toContain('Dave')
    const alice = members.docs.find((d) => d.data().name === 'Alice')?.data()
    expect(alice?.universityId).toBe('A001')
    const dave = members.docs.find((d) => d.data().name === 'Dave')?.data()
    expect(dave?.universityId).toBe('D003')

    // timeline seeded
    const logs = await adminDb.collection(`projects/${projectId}/activityLog`).get()
    expect(logs.docs.some((d) => d.data().type === 'created')).toBe(true)
  })

  it('assigns unique TL-XXX codes under concurrent calls', async () => {
    await signInAs(EMAILS.student)
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => call('createProject', valid())))
    const ids = results.filter((r) => r.status === 'fulfilled').map((r) => (r as PromiseFulfilledResult<any>).value.data.projectId)
    const codes = new Set<string>()
    for (const id of ids) {
      const code = (await adminDb.doc(`projects/${id}`).get()).data()?.projectCode as string
      codes.add(code)
    }
    expect(codes.size).toBe(ids.length)
    // counter advanced atomically
    const nextId = (await adminDb.doc('counters/projects').get()).data()?.nextId as number
    expect(nextId).toBeGreaterThan(1)
  })

  it('rejects the 6th project within one hour (rate limit)', async () => {
    const uid = await createAuthUser('rater@tinkers.test')
    await adminDb.doc(`users/${uid}`).set(baseProfile('rater@tinkers.test', 'student'))
    await signInAs('rater@tinkers.test')
    for (let i = 0; i < 5; i++) {
      await call('createProject', { ...valid(), title: `Rate limited ${i}` })
    }
    await expectCode(call('createProject', valid()), 'resource-exhausted')
  })
})

// ─────────────────────────────────────────────────────────────
// createBooking
// ─────────────────────────────────────────────────────────────
describe('createBooking', () => {
  const future = '2099-01-10'
  const valid = () => ({
    projectId: FIX.projectActive, equipmentId: FIX.equipmentBookable,
    machineId: FIX.equipmentBookable, date: future, startTime: '10:00', endTime: '11:00',
    purpose: 'Print a part', safetyAgreementAccepted: true,
  })

  it('rejects unauthenticated callers', async () => {
    await signOut(auth).catch(() => {})
    await expectCode(call('createBooking', valid()), 'unauthenticated')
  })

  it('rejects deactivated users', async () => {
    await signInAs(EMAILS.inactive)
    await expectCode(call('createBooking', valid()), 'permission-denied')
  })

  it('rejects missing required fields', async () => {
    await signInAs(EMAILS.student)
    const { projectId: _p, ...rest } = valid()
    await expectCode(call('createBooking', rest), 'invalid-argument')
  })

  it('rejects an invalid date format', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), date: '10-01-2099' }), 'invalid-argument')
  })

  it('rejects backdated bookings (date < today IST)', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), date: '2020-01-01' }), 'invalid-argument')
  })

  it('rejects startTime >= endTime', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), startTime: '11:00', endTime: '11:00' }), 'invalid-argument')
    await expectCode(call('createBooking', { ...valid(), startTime: '12:00', endTime: '11:00' }), 'invalid-argument')
  })

  it('rejects times past 23:59', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), startTime: '24:00' }), 'invalid-argument')
  })

  it('rejects an empty or oversized purpose', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), purpose: '   ' }), 'invalid-argument')
    await expectCode(call('createBooking', { ...valid(), purpose: 'x'.repeat(501) }), 'invalid-argument')
  })

  it('rejects nested consumable objects', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), consumables: { a: { b: 1 } } }), 'invalid-argument')
  })

  it('rejects more than 100 consumable keys', async () => {
    await signInAs(EMAILS.student)
    const consumables: Record<string, number> = {}
    for (let i = 0; i < 101; i++) consumables[`k${i}`] = i
    await expectCode(call('createBooking', { ...valid(), consumables }), 'invalid-argument')
  })

  it('rejects unaccepted safety agreement', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), safetyAgreementAccepted: false }), 'invalid-argument')
  })

  it('rejects unexpected extra fields', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), role: 'super_admin' }), 'invalid-argument')
  })

  it('rejects a non-existent project', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), projectId: 'does-not-exist' }), 'not-found')
  })

  it('rejects booking a project the caller does not own (student)', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), projectId: FIX.projectOther }), 'permission-denied')
  })

  it('rejects booking on a non-active project', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), projectId: FIX.projectPending }), 'failed-precondition')
  })

  it('rejects a non-existent equipment', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), equipmentId: 'ghost', machineId: 'ghost' }), 'not-found')
  })

  it('rejects non-bookable equipment tier', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), equipmentId: FIX.equipmentNonBookable, machineId: FIX.equipmentNonBookable }), 'failed-precondition')
  })

  it('rejects unconfirmed equipment', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), equipmentId: FIX.equipmentUnconfirmed, machineId: FIX.equipmentUnconfirmed }), 'failed-precondition')
  })

  it('rejects unavailable equipment', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), equipmentId: FIX.equipmentUnavailable, machineId: FIX.equipmentUnavailable }), 'failed-precondition')
  })

  it('rejects a machineId mismatch', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createBooking', { ...valid(), equipmentId: FIX.equipmentBookable, machineId: 'wrong-machine' }), 'invalid-argument')
  })

  it('creates a booking, slot doc and activity entry for a free slot', async () => {
    await signInAs(EMAILS.student)
    const date = '2099-02-01'
    const res = await call('createBooking', { ...valid(), date, startTime: '09:00', endTime: '10:00' })
    const { bookingId } = res.data as { bookingId: string }
    const booking = (await adminDb.doc(`projects/${FIX.projectActive}/bookings/${bookingId}`).get()).data()
    expect(booking?.status).toBe('approved')
    expect(booking?.projectTitle).toBe(FIX.projectActive) // server-derived
    const slot = await adminDb.doc(`slots/${FIX.equipmentBookable}_${date}_09:00`).get()
    expect(slot.exists).toBe(true)
    const logs = await adminDb.collection(`projects/${FIX.projectActive}/activityLog`).get()
    expect(logs.docs.some((d) => d.data().type === 'booking')).toBe(true)
  })


  it('rejects a conflicting time slot (aborted)', async () => {
    await signInAs(EMAILS.student)
    const date = '2099-03-01'
    await call('createBooking', { ...valid(), date, startTime: '10:00', endTime: '12:00' })
    // overlapping slot
    await expectCode(call('createBooking', { ...valid(), date, startTime: '11:00', endTime: '13:00' }), 'aborted')
  })

  it('allows an adjacent non-overlapping slot', async () => {
    await signInAs(EMAILS.student)
    const date = '2099-04-01'
    await call('createBooking', { ...valid(), date, startTime: '10:00', endTime: '11:00' })
    const res = await call('createBooking', { ...valid(), date, startTime: '11:00', endTime: '12:00' })
    expect(res.data).toBeTruthy()
  })

  it('two concurrent bookings for the same slot — exactly one succeeds', async () => {
    await signInAs(EMAILS.student)
    const date = '2099-05-01'
    const payload = { ...valid(), date, startTime: '10:00', endTime: '11:00' }
    const results = await Promise.allSettled([call('createBooking', payload), call('createBooking', payload)])
    const ok = results.filter((r) => r.status === 'fulfilled').length
    expect(ok).toBe(1)
  })
  it('rejects the 11th booking on the same day (rate limit)', async () => {
    await signInAs(EMAILS.student)
    // today in Asia/Kolkata — the same clock the functions rate limit uses
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date())
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
    const today = `${get('year')}-${get('month')}-${get('day')}`
    // 10 non-conflicting hour slots on today's date
    for (let i = 0; i < 10; i++) {
      const start = `${String(i).padStart(2, '0')}:00`
      const end = `${String(i).padStart(2, '0')}:50`
      await call('createBooking', { ...valid(), date: today, startTime: start, endTime: end })
    }
    await expectCode(call('createBooking', { ...valid(), date: today, startTime: '23:00', endTime: '23:50' }), 'resource-exhausted')
  })
})

// ─────────────────────────────────────────────────────────────
// createToolCheckout
// ─────────────────────────────────────────────────────────────
describe('createToolCheckout', () => {
  const valid = () => ({
    projectId: FIX.projectActive, toolCategory: 'Hand Tools', toolName: 'Hammer',
    quantity: 2, locationOfUse: 'in_lab', expectedReturnDate: '2099-06-01',
    conditionAtCheckout: 'good',
  })

  it('rejects unauthenticated callers', async () => {
    await signOut(auth).catch(() => {})
    await expectCode(call('createToolCheckout', valid()), 'unauthenticated')
  })

  it('rejects deactivated users', async () => {
    await signInAs(EMAILS.inactive)
    await expectCode(call('createToolCheckout', valid()), 'permission-denied')
  })

  it('rejects an invalid tool category', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createToolCheckout', { ...valid(), toolCategory: 'Explosives' }), 'invalid-argument')
  })

  it('rejects an empty or oversized tool name', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createToolCheckout', { ...valid(), toolName: '' }), 'invalid-argument')
    await expectCode(call('createToolCheckout', { ...valid(), toolName: 'x'.repeat(201) }), 'invalid-argument')
  })

  it('rejects quantity < 1, > 1000 and non-integers', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createToolCheckout', { ...valid(), quantity: 0 }), 'invalid-argument')
    await expectCode(call('createToolCheckout', { ...valid(), quantity: 1001 }), 'invalid-argument')
    await expectCode(call('createToolCheckout', { ...valid(), quantity: 1.5 }), 'invalid-argument')
  })

  it('rejects an invalid location of use', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createToolCheckout', { ...valid(), locationOfUse: 'elsewhere' }), 'invalid-argument')
  })

  it('requires an outside location when taking outside', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createToolCheckout', { ...valid(), locationOfUse: 'taking_outside' }), 'invalid-argument')
  })

  it('rejects a past expected return date', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createToolCheckout', { ...valid(), expectedReturnDate: '2020-01-01' }), 'invalid-argument')
  })

  it('rejects an invalid expected return time', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createToolCheckout', { ...valid(), expectedReturnTime: '25:00' }), 'invalid-argument')
  })

  it('rejects an invalid condition at checkout', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createToolCheckout', { ...valid(), conditionAtCheckout: 'mint' }), 'invalid-argument')
  })

  it('rejects unexpected extra fields', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createToolCheckout', { ...valid(), isOverdue: false }), 'invalid-argument')
  })

  it('rejects a project the caller does not own', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createToolCheckout', { ...valid(), projectId: FIX.projectOther }), 'permission-denied')
  })

  it('rejects a non-active project', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('createToolCheckout', { ...valid(), projectId: FIX.projectPending }), 'failed-precondition')
  })

  it('creates a checkout and activity entry for a valid request', async () => {
    await signInAs(EMAILS.student)
    const res = await call('createToolCheckout', valid())
    const { checkoutId } = res.data as { checkoutId: string }
    const c = (await adminDb.doc(`projects/${FIX.projectActive}/checkouts/${checkoutId}`).get()).data()
    expect(c?.action).toBe('checking_out')
    expect(c?.isOverdue).toBe(false)
    expect(c?.userId).toBe(USERS.student)
    const logs = await adminDb.collection(`projects/${FIX.projectActive}/activityLog`).get()
    expect(logs.docs.some((d) => d.data().type === 'checkout')).toBe(true)
  })

  it('rejects when the user has 20 or more open checkouts', async () => {
    await signInAs(EMAILS.student)
    const ref = adminDb.collection(`projects/${FIX.projectActive}/checkouts`)
    for (let i = 0; i < 20; i++) {
      await ref.add({
        userId: USERS.student, projectId: FIX.projectActive, action: 'checking_out',
        toolName: `Tool ${i}`, quantity: 1, isOverdue: false,
        expectedReturnDate: '2099-06-01', returnedAt: null,
      })
    }
    await expectCode(call('createToolCheckout', { ...valid(), toolName: 'One too many' }), 'resource-exhausted')
  })
})

// ─────────────────────────────────────────────────────────────
// submitFeedback
// ─────────────────────────────────────────────────────────────
describe('submitFeedback', () => {
  it('rejects unauthenticated callers', async () => {
    await signOut(auth).catch(() => {})
    await expectCode(call('submitFeedback', { message: 'Great lab' }), 'unauthenticated')
  })

  it('rejects an empty message', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('submitFeedback', { message: '   ' }), 'invalid-argument')
  })

  it('rejects a message longer than 2000 chars', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('submitFeedback', { message: 'x'.repeat(2001) }), 'invalid-argument')
  })

  it('accepts the first submission', async () => {
    await signInAs(EMAILS.student)
    const res = await call('submitFeedback', { message: 'First feedback' })
    expect(res.data).toHaveProperty('feedbackId')
  })

  it('rejects a second submission within 5 minutes with a countdown', async () => {
    await signInAs(EMAILS.student)
    await call('submitFeedback', { message: 'One' })
    await expectCode(call('submitFeedback', { message: 'Two' }), 'resource-exhausted')
  })

  it('accepts a submission after the 5-minute window', async () => {
    await signInAs(EMAILS.student)
    await adminDb.doc(`feedbackWindows/${USERS.student}`).set({ lastSubmittedAt: Date.now() - 6 * 60 * 1000 })
    const res = await call('submitFeedback', { message: 'Later feedback' })
    expect(res.data).toHaveProperty('feedbackId')
  })
})

// ─────────────────────────────────────────────────────────────
// appendActivityLog
// ─────────────────────────────────────────────────────────────
describe('appendActivityLog', () => {
  it('rejects unauthenticated callers', async () => {
    await signOut(auth).catch(() => {})
    await expectCode(call('appendActivityLog', { projectId: FIX.projectActive, type: 'status_change', summary: 'x' }), 'unauthenticated')
  })

  it('rejects a non-owner non-staff caller', async () => {
    await signInAs(EMAILS.other)
    await expectCode(call('appendActivityLog', { projectId: FIX.projectActive, type: 'checkout', summary: 'x' }), 'permission-denied')
  })

  it('rejects a reserved log type from an owner (type check fires first)', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('appendActivityLog', { projectId: FIX.projectActive, type: 'created', summary: 'x' }), 'invalid-argument')
  })

  it('rejects an invalid type', async () => {
    await signInAs(EMAILS.student)
    await expectCode(call('appendActivityLog', { projectId: FIX.projectActive, type: 'hacked', summary: 'x' }), 'invalid-argument')
  })

  it('appends a server-stamped entry for the owner', async () => {
    await signInAs(EMAILS.student)
    const res = await call('appendActivityLog', { projectId: FIX.projectActive, type: 'status_change', summary: 'Booking cancelled' })
    const { logId } = res.data as { logId: string }
    const entry = (await adminDb.doc(`projects/${FIX.projectActive}/activityLog/${logId}`).get()).data()
    expect(entry?.summary).toBe('Booking cancelled')
    expect(entry?.userId).toBe(USERS.student)
    expect(entry?.createdAt).toBeTruthy()
  })

  it('allows a staff member to append on any project', async () => {
    await signInAs(EMAILS.staff)
    const res = await call('appendActivityLog', { projectId: FIX.projectOther, type: 'status_change', summary: 'Reviewed by staff' })
    expect(res.data).toHaveProperty('logId')
  })
})

// ─────────────────────────────────────────────────────────────
// syncBookingSlot (firestore trigger) + cleanup
// ─────────────────────────────────────────────────────────────
async function eventually(fn: () => Promise<boolean>, timeoutMs = 12000, everyMs = 400): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await fn()) return true
    await new Promise((r) => setTimeout(r, everyMs))
  }
  return fn()
}

describe('syncBookingSlot / cleanupBookingSlot', () => {
  // NOTE: createBooking writes the slot doc atomically itself, and the trigger
  // returns early when a booking is CREATED (no before-snapshot). These tests
  // therefore drive the trigger through UPDATE events — the staff workflows it
  // exists for: re-approvals, rejections, cancellations and time edits.
  function bookingRef(id: string) {
    return adminDb.doc(`projects/${FIX.projectActive}/bookings/${id}`)
  }
  async function seedBooking(id: string, date: string, over: Record<string, unknown> = {}) {
    await bookingRef(id).set({
      equipmentId: FIX.equipmentLaser, machineId: FIX.equipmentLaser, machineName: 'Laser',
      date, startTime: '10:00', endTime: '11:00',
      status: 'pending', userId: USERS.student, ...over,
    })
    // trigger must be subscribed before the event lands
    await new Promise((r) => setTimeout(r, 400))
  }

  it('creates a slot when a booking is (re-)approved', async () => {
    const id = 'book-approve'
    const date = '2099-07-01'
    const slotId = `${FIX.equipmentLaser}_${date}_10:00`
    await seedBooking(id, date)
    await bookingRef(id).update({ status: 'approved' })
    expect(await eventually(async () => (await adminDb.doc(`slots/${slotId}`).get()).exists)).toBe(true)
  })

  it('removes a slot when a booking is cancelled', async () => {
    const id = 'book-cancel'
    const date = '2099-08-01'
    const slotId = `${FIX.equipmentLaser}_${date}_10:00`
    await seedBooking(id, date)
    await bookingRef(id).update({ status: 'approved' })
    expect(await eventually(async () => (await adminDb.doc(`slots/${slotId}`).get()).exists)).toBe(true)
    await bookingRef(id).update({ status: 'cancelled' })
    expect(await eventually(async () => !(await adminDb.doc(`slots/${slotId}`).get()).exists)).toBe(true)
  })

  it('removes a slot when a booking is rejected', async () => {
    const id = 'book-reject'
    const date = '2099-09-01'
    const slotId = `${FIX.equipmentLaser}_${date}_10:00`
    await seedBooking(id, date)
    await bookingRef(id).update({ status: 'approved' })
    expect(await eventually(async () => (await adminDb.doc(`slots/${slotId}`).get()).exists)).toBe(true)
    await bookingRef(id).update({ status: 'rejected' })
    expect(await eventually(async () => !(await adminDb.doc(`slots/${slotId}`).get()).exists)).toBe(true)
  })

  it('removes a slot when a booking is deleted', async () => {
    const id = 'book-del'
    const date = '2099-10-01'
    const slotId = `${FIX.equipmentLaser}_${date}_10:00`
    await seedBooking(id, date)
    await bookingRef(id).update({ status: 'approved' })
    expect(await eventually(async () => (await adminDb.doc(`slots/${slotId}`).get()).exists)).toBe(true)
    await bookingRef(id).delete()
    expect(await eventually(async () => !(await adminDb.doc(`slots/${slotId}`).get()).exists)).toBe(true)
  })

  it('moves the slot when a booking time is edited while still approved', async () => {
    const id = 'book-edit'
    const date = '2099-11-01'
    const oldSlot = `${FIX.equipmentLaser}_${date}_10:00`
    const newSlot = `${FIX.equipmentLaser}_${date}_12:00`
    await seedBooking(id, date)
    await bookingRef(id).update({ status: 'approved' })
    expect(await eventually(async () => (await adminDb.doc(`slots/${oldSlot}`).get()).exists)).toBe(true)
    await bookingRef(id).update({ startTime: '12:00', endTime: '13:00' })
    expect(await eventually(async () => !(await adminDb.doc(`slots/${oldSlot}`).get()).exists)).toBe(true)
    expect(await eventually(async () => (await adminDb.doc(`slots/${newSlot}`).get()).exists)).toBe(true)
  })

  it('keeps the slot when a non-occupancy field changes on an approved booking', async () => {
    const id = 'book-nomove'
    const date = '2099-11-02'
    const slotId = `${FIX.equipmentLaser}_${date}_10:00`
    await seedBooking(id, date)
    await bookingRef(id).update({ status: 'approved' })
    expect(await eventually(async () => (await adminDb.doc(`slots/${slotId}`).get()).exists)).toBe(true)
    await bookingRef(id).update({ purpose: 'Renamed purpose' })
    expect(await eventually(async () => (await adminDb.doc(`slots/${slotId}`).get()).exists)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────
// Notification triggers
// ─────────────────────────────────────────────────────────────
describe('notification triggers', () => {
  async function notificationsFor(uid: string) {
    const snap = await adminDb.collection('notifications').where('userId', '==', uid).get()
    return snap.docs.map((d) => d.data())
  }

  it('notifies the owner when a project is approved', async () => {
    const id = 'notif-proj-active'
    await adminDb.doc(`projects/${id}`).set({
      userId: USERS.student, status: 'pending', title: 'N', abstract: 'x'.repeat(60),
      safetyAgreementAccepted: true, termsAccepted: true, projectCode: 'TL-N1',
      imageUrls: [], documentUrls: [],
    })
    await adminDb.doc(`projects/${id}`).update({ status: 'active' })
    expect(await eventually(async () => (await notificationsFor(USERS.student)).some((n) => n.type === 'project_approved'))).toBe(true)
    await adminDb.doc(`projects/${id}`).delete().catch(() => {})
  })

  it('notifies the owner when a project is rejected with reason', async () => {
    const id = 'notif-proj-rej'
    await adminDb.doc(`projects/${id}`).set({
      userId: USERS.student, status: 'pending', title: 'N', abstract: 'x'.repeat(60),
      safetyAgreementAccepted: true, termsAccepted: true, projectCode: 'TL-N2',
      imageUrls: [], documentUrls: [],
    })
    await adminDb.doc(`projects/${id}`).update({ status: 'rejected', rejectionReason: 'Missing details' })
    const ok = await eventually(async () =>
      (await notificationsFor(USERS.student))
        .some((n) => n.type === 'project_rejected' && typeof n.message === 'string' && n.message.includes('Missing details')))
    expect(ok).toBe(true)
    await adminDb.doc(`projects/${id}`).delete().catch(() => {})
  })

  it('notifies the owner when a project is put on hold', async () => {
    const id = 'notif-proj-hold'
    await adminDb.doc(`projects/${id}`).set({
      userId: USERS.student, status: 'active', title: 'N', abstract: 'x'.repeat(60),
      safetyAgreementAccepted: true, termsAccepted: true, projectCode: 'TL-N3',
      imageUrls: [], documentUrls: [],
    })
    await adminDb.doc(`projects/${id}`).update({ status: 'on_hold' })
    expect(await eventually(async () => (await notificationsFor(USERS.student)).some((n) => n.message.includes('on hold')))).toBe(true)
    await adminDb.doc(`projects/${id}`).delete().catch(() => {})
  })

  it('notifies the owner when a booking is rejected', async () => {
    const id = 'notif-book-rej'
    await adminDb.doc(`projects/${FIX.projectActive}/bookings/${id}`).set({
      equipmentId: FIX.equipmentLaser, machineId: FIX.equipmentLaser, machineName: 'Laser',
      date: '2099-12-01', startTime: '10:00', endTime: '11:00',
      status: 'approved', userId: USERS.student,
    })
    await adminDb.doc(`projects/${FIX.projectActive}/bookings/${id}`).update({ status: 'rejected', rejectionReason: 'Conflict' })
    expect(await eventually(async () => (await notificationsFor(USERS.student)).some((n) => n.type === 'booking_rejected'))).toBe(true)
    await adminDb.doc(`projects/${FIX.projectActive}/bookings/${id}`).delete().catch(() => {})
  })

  it('notifies the owner when a booking is cancelled', async () => {
    const id = 'notif-book-cancel'
    await adminDb.doc(`projects/${FIX.projectActive}/bookings/${id}`).set({
      equipmentId: FIX.equipmentLaser, machineId: FIX.equipmentLaser, machineName: 'Laser',
      date: '2099-12-02', startTime: '10:00', endTime: '11:00',
      status: 'approved', userId: USERS.student,
    })
    await adminDb.doc(`projects/${FIX.projectActive}/bookings/${id}`).update({ status: 'cancelled' })
    expect(await eventually(async () => (await notificationsFor(USERS.student)).some((n) => n.type === 'booking_reminder'))).toBe(true)
    await adminDb.doc(`projects/${FIX.projectActive}/bookings/${id}`).delete().catch(() => {})
  })
})

// ─────────────────────────────────────────────────────────────
// sweepOverdueCheckouts (unit-test the handler directly)
// ─────────────────────────────────────────────────────────────
describe('sweepOverdueCheckouts', () => {
  it('flags unreturned overdue checkouts and notifies the owner', async () => {
    await ensureFunctionsAdmin()
    const { sweepOverdueCheckouts } = await import(OVERDUE_LIB)
    // two checkouts: one overdue-unreturned, one returned, one future
    const c1 = adminDb.doc(`projects/${FIX.projectActive}/checkouts/sweep-1`)
    const c2 = adminDb.doc(`projects/${FIX.projectActive}/checkouts/sweep-2`)
    const c3 = adminDb.doc(`projects/${FIX.projectActive}/checkouts/sweep-3`)
    await c1.set({ userId: USERS.student, action: 'checking_out', expectedReturnDate: '2020-01-01', isOverdue: false, returnedAt: null, toolName: 'Old' })
    await c2.set({ userId: USERS.student, action: 'checking_out', expectedReturnDate: '2020-01-01', isOverdue: false, returnedAt: new Date(), toolName: 'Ret' })
    await c3.set({ userId: USERS.student, action: 'checking_out', expectedReturnDate: '2099-01-01', isOverdue: false, returnedAt: null, toolName: 'New' })

    await (sweepOverdueCheckouts as unknown as { run: () => Promise<void> }).run()

    expect((await c1.get()).data()?.isOverdue).toBe(true)
    expect((await c2.get()).data()?.isOverdue).toBe(false)
    expect((await c3.get()).data()?.isOverdue).toBe(false)
    const notifs = await adminDb.collection('notifications').where('userId', '==', USERS.student).get()
    expect(notifs.docs.some((d) => d.data().type === 'checkout_overdue')).toBe(true)

    await c1.delete(); await c2.delete(); await c3.delete()
  })

  it('does not re-flag an already-flagged checkout', async () => {
    await ensureFunctionsAdmin()
    const { sweepOverdueCheckouts } = await import(OVERDUE_LIB)
    const c = adminDb.doc(`projects/${FIX.projectActive}/checkouts/sweep-already`)
    await c.set({ userId: USERS.student, action: 'checking_out', expectedReturnDate: '2020-01-01', isOverdue: true, returnedAt: null, toolName: 'Already' })
    await (sweepOverdueCheckouts as unknown as { run: () => Promise<void> }).run()
    expect((await c.get()).data()?.isOverdue).toBe(true)
    await c.delete()
  })
})

// ─────────────────────────────────────────────────────────────
// deleteMyAccount
// ─────────────────────────────────────────────────────────────
describe('deleteMyAccount', () => {
  it('rejects unauthenticated callers', async () => {
    await signOut(auth).catch(() => {})
    await expectCode(call('deleteMyAccount'), 'unauthenticated')
  })

  it('deletes the user\'s data and auth account', async () => {
    const uid = await createAuthUser('todelete@tinkers.test')
    await signInAs('todelete@tinkers.test')
    await adminDb.doc(`users/${uid}`).set(baseProfile('todelete@tinkers.test', 'student'))
    const projId = 'delete-proj'
    await adminDb.doc(`projects/${projId}`).set({
      userId: uid, status: 'pending', title: 'D', abstract: 'x'.repeat(60),
      safetyAgreementAccepted: true, termsAccepted: true, projectCode: 'TL-DEL',
    })
    await adminDb.doc(`projects/${projId}/bookings/b1`).set({ equipmentId: 'x', date: '2099-01-01', startTime: '10:00', status: 'approved', userId: uid })
    await adminDb.doc(`projects/${projId}/activityLog/a1`).set({ type: 'created', summary: 'x', userId: uid })
    await adminDb.doc(`projects/${projId}/checkouts/c1`).set({ userId: uid, action: 'checking_out', toolName: 'T', isOverdue: false })
    await adminDb.doc('notifications/n-del').set({ userId: uid, isRead: false, message: 'x' })
    await adminDb.doc('feedback/f-del').set({ userId: uid, message: 'x' })
    await adminDb.doc('issues/i-del').set({ userId: uid, description: 'x'.repeat(30), status: 'open' })
    await adminDb.doc('workshopRegistrations/reg-del').set({ userId: uid, status: 'registered' })

    const res = await call('deleteMyAccount')
    expect(res.data).toEqual({ deleted: true })

    // auth account gone
    await signOut(auth).catch(() => {})
    await expectCode(signInWithEmailAndPassword(auth, 'todelete@tinkers.test', PASSWORD), 'auth/user-not-found')

    // owned data gone
    expect((await adminDb.doc(`users/${uid}`).get()).exists).toBe(false)
    expect((await adminDb.doc(`projects/${projId}`).get()).exists).toBe(false)
    expect((await adminDb.collection('notifications').where('userId', '==', uid).get()).docs.length).toBe(0)
    expect((await adminDb.collection('feedback').where('userId', '==', uid).get()).docs.length).toBe(0)
  })

  it('retains activity-log entries the user left on another user\'s project', async () => {
    const uid = await createAuthUser('todelete2@tinkers.test')
    await signInAs('todelete2@tinkers.test')
    await adminDb.doc(`users/${uid}`).set(baseProfile('todelete2@tinkers.test', 'student'))
    // todelete2 authored a log entry on the OTHER user's project (owned by USERS.other)
    await adminDb.doc(`projects/${FIX.projectOther}/activityLog/kept`).set({
      type: 'status_change', summary: 'x', userId: uid,
    })
    await call('deleteMyAccount')
    // the entry on OTHER's project survives
    expect((await adminDb.doc(`projects/${FIX.projectOther}/activityLog/kept`).get()).exists).toBe(true)
    await adminDb.doc(`projects/${FIX.projectOther}/activityLog/kept`).delete().catch(() => {})
  })
})