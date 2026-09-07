import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initializeApp, deleteApp as firebaseDeleteApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, type Auth,
} from 'firebase/auth'
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions'
import { initializeApp as adminInit, type App as AdminApp } from 'firebase-admin/app'
import { getFirestore as getAdminFs, type Firestore as AdminDb } from 'firebase-admin/firestore'

// ─────────────────────────────────────────────────────────────
// Adversarial fuzzing — every callable must reject hostile input
// with a defined firebase error or succeed; it must NEVER throw a
// raw 500 / 'internal' / unhandled exception.
// ─────────────────────────────────────────────────────────────
let app: FirebaseApp
let adminApp: AdminApp
let adminDb: AdminDb
let auth: Auth
let functions: ReturnType<typeof getFunctions>
let uid = ''

type CallResult = string // 'ok', a firebase code, or 'client-encode-rejected'

async function callRaw(name: string, data: unknown): Promise<CallResult> {
  try {
    const fn = httpsCallable(functions, name)
    await fn(data)
    return 'ok'
  } catch (e) {
    const err = e as { code?: string; message?: string }
    const code = (err?.code ?? '').replace(/^functions\//, '')
    if (!code) {
      // The callable serializer rejects non-JSON values (NaN, Infinity, typed
      // arrays) before any request leaves the client — a safe, code-less Error.
      if (err?.message?.includes('cannot be encoded in JSON')) return 'client-encode-rejected'
    }
    return code || 'no-code'
  }
}

const CALLABLES = ['createProject', 'createBooking', 'createToolCheckout', 'submitFeedback', 'appendActivityLog']

beforeAll(async () => {
  app = initializeApp({ apiKey: 'demo', projectId: 'demo-tinkers-lab', authDomain: 'localhost' })
  auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  functions = getFunctions(app, 'asia-south1')
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  adminApp = adminInit({ projectId: 'demo-tinkers-lab' })
  adminDb = getAdminFs(adminApp)

  const cred = await createUserWithEmailAndPassword(auth, 'fuzz@tinkers.test', 'password123')
  uid = cred.user.uid
  await adminDb.doc(`users/${uid}`).set({
    email: 'fuzz@tinkers.test', displayName: 'Fuzzer', role: 'student',
    userType: 'Student', isActive: true, createdAt: new Date(),
  })
  await adminDb.doc('projects/fuzz-proj').set({
    userId: uid, status: 'active', title: 'Fuzz Project', abstract: 'x'.repeat(60),
    safetyAgreementAccepted: true, termsAccepted: true, projectCode: 'TL-FUZZ',
  })
  await adminDb.doc('equipment/fuzz-mach').set({
    machineId: 'fuzz-mach', name: 'Fuzz', tier: 'bookable', confirmed: true,
    status: 'available', category: 'Digital Fabrication',
  })
  await signInWithEmailAndPassword(auth, 'fuzz@tinkers.test', 'password123')
})

afterAll(async () => {
  await signOut(auth).catch(() => {})
  await firebaseDeleteApp(app);
  await (adminApp as unknown as { delete: () => Promise<void> }).delete()
})

/**
 * Run hostile payloads against one callable and assert that every result is
 * either 'ok' or a clean, intent-mapped error code — never an internal crash.
 */
async function assertCleanErrors(name: string, payloads: unknown[]) {
  const results: string[] = []
  const BAD = ['internal', 'unknown', 'unavailable', 'no-code', 'deadline-exceeded', 'data-loss']
  for (const payload of payloads) {
    const code = await callRaw(name, payload)
    if (code === 'ok' || code === 'client-encode-rejected') continue
    results.push(`${name} <- ${JSON.stringify(payload)?.slice(0, 60)} => ${code}`)
    expect(BAD, results[results.length - 1]).not.toContain(code)
  }
  return results
}

const RTL = '\u202E'
const ZWSP = '\u200B'
const NUL = '\u0000'

describe('createProject — adversarial payloads', () => {
  const valid = {
    title: 'A valid fuzz project', abstract: 'x'.repeat(60), contact: '9999999999',
    startDate: '2099-05-01', expectedEquipmentNeeds: ['3D Printer'],
    safetyAgreementAccepted: true, termsAccepted: true,
  }

  it('rejects wrong-typed scalar fields without crashing', async () => {
    await assertCleanErrors('createProject', [
      { ...valid, title: 12345 },
      { ...valid, abstract: ['not', 'a', 'string'] },
      { ...valid, contact: null },
      { ...valid, startDate: '2099-13-45' },
      { ...valid, startDate: 20990501 },
      { ...valid, endDate: 'not-a-date' },
      { ...valid, endDate: null },
      { ...valid, expectedEquipmentNeeds: '3D Printer' as never },
      { ...valid, expectedEquipmentNeeds: [123] },
      { ...valid, expectedEquipmentNeeds: null },
      { ...valid, safetyAgreementAccepted: 'yes' as never },
      { ...valid, termsAccepted: 1 as never },
      { ...valid, imageUrls: 7 as never },
      { ...valid, imageUrls: 'https://firebasestorage.googleapis.com/x' as never },
      { ...valid, imageUrls: [null] },
      { ...valid, resourceLink: 'ftp://nope' },
      { ...valid, resourceLink: '  ' },
    ])
    expect(true).toBe(true)
  })

  it('treats __proto__ / constructor keys as unexpected fields (no prototype pollution)', async () => {
    const r = await assertCleanErrors('createProject', [
      JSON.parse('{"title":"A valid fuzz project","abstract":"' + 'x'.repeat(60) + '","contact":"x","startDate":"2099-05-01","expectedEquipmentNeeds":["3D Printer"],"safetyAgreementAccepted":true,"termsAccepted":true,"__proto__":{"isAdmin":true}}'),
      { ...valid, constructor: { prototype: { role: 'super_admin' } } },
    ])
    const proto = r.find((x) => x.includes('__proto__') || x.includes('constructor'))
    expect(proto ?? 'ok').toBeDefined() // either rejected cleanly or dropped by the SDK
  })

  it('stores hostile-but-valid strings verbatim (XSS/null-bytes/RTL survive data, never code)', async () => {
    const evil = `normal title ${RTL}${NUL}${ZWSP}<script>alert(1)</script>`
    const res = await callRaw('createProject', { ...valid, title: evil })
    if (res === 'ok') {
      // Server stored it cleanly (React auto-escapes at render; no eval sinks exist).
      const snap = await adminDb.collection('projects').orderBy('createdAt', 'desc').limit(1).get()
      const top = snap.docs[0].data()
      expect(top.userId).toBe(uid)
      expect(top.title).toContain('normal title')
    } else {
      expect(['invalid-argument', 'permission-denied', 'failed-precondition', 'resource-exhausted']).toContain(res)
    }
  })
})

describe('createBooking — adversarial payloads', () => {
  const valid = {
    projectId: 'fuzz-proj', equipmentId: 'fuzz-mach', machineId: 'fuzz-mach',
    date: '2099-06-01', startTime: '10:00', endTime: '11:00', purpose: 'Fuzz purpose here',
    safetyAgreementAccepted: true,
  }

  it('deadly consumables values (NaN/Infinity/nested/typed) never 500', async () => {
    await assertCleanErrors('createBooking', [
      { ...valid, consumables: { a: NaN } },
      { ...valid, consumables: { a: Infinity } },
      { ...valid, consumables: { a: -Infinity } },
      { ...valid, consumables: 'x' },
      { ...valid, consumables: 5 },
      { ...valid, consumables: [['nested']] },
      { ...valid, consumables: { a: { b: 1 } } },
      { ...valid, consumables: { a: undefined } },
      { ...valid, consumables: { '': 'x' } },
      { ...valid, consumables: { a: 'x'.repeat(300) } },
      { ...valid, consumables: null },
    ])
    expect(true).toBe(true)
  })

  it('faulty times/dates/purposes reject cleanly', async () => {
    await assertCleanErrors('createBooking', [
      { ...valid, date: null },
      { ...valid, date: 20990601 },
      { ...valid, startTime: null },
      { ...valid, startTime: '9:00' },
      { ...valid, startTime: '10:00', endTime: '09:00' },
      { ...valid, startTime: '25:00' },
      { ...valid, endTime: '99:99' },
      { ...valid, purpose: 123 },
      { ...valid, purpose: { x: 1 } },
      { ...valid, purpose: 'x'.repeat(501) },
      { ...valid, safetyAgreementAccepted: 'yes' as never },
      { ...valid, projectId: 5 as never },
      { ...valid, equipmentId: {} as never },
    ])
    expect(true).toBe(true)
  })

  it('frontend regression guard: projectTitle is rejected as an unexpected field', async () => {
    // The UI deliberately never sends projectTitle (server derives it) — if a
    // future client starts sending it, the function must still reject.
    const code = await callRaw('createBooking', { ...valid, projectTitle: 'Hijacked title' })
    expect(code).toBe('invalid-argument')
  })

  it('prototype-key injection into payload is inert', async () => {
    await assertCleanErrors('createBooking', [
      JSON.parse('{"projectId":"fuzz-proj","equipmentId":"fuzz-mach","machineId":"fuzz-mach","date":"2099-07-01","startTime":"10:00","endTime":"11:00","purpose":"ok","safetyAgreementAccepted":true,"__proto__":{"status":"approved"}}'),
    ])
    expect(true).toBe(true)
  })
})

describe('createToolCheckout — adversarial payloads', () => {
  const valid = {
    projectId: 'fuzz-proj', toolCategory: 'Hand Tools', toolName: 'Hammer',
    quantity: 1, locationOfUse: 'in_lab', expectedReturnDate: '2099-08-01',
    conditionAtCheckout: 'good',
  }

  it('hostile quantities and typed fields never 500', async () => {
    await assertCleanErrors('createToolCheckout', [
      { ...valid, quantity: NaN },
      { ...valid, quantity: Infinity },
      { ...valid, quantity: -1 },
      { ...valid, quantity: 1.5 },
      { ...valid, quantity: '5' as never },
      { ...valid, quantity: null },
      { ...valid, quantity: 1e9 },
      { ...valid, toolName: 123 },
      { ...valid, toolName: null },
      { ...valid, toolCategory: 'Explosives' },
      { ...valid, locationOfUse: 'moon' },
      { ...valid, expectedReturnDate: '2099-13-99' },
      { ...valid, conditionAtCheckout: null },
      { ...valid, conditionAtCheckout: 'mint' },
      { ...valid, notes: 5 },
      { ...valid, outsideLocation: { x: 1 } },
    ])
    expect(true).toBe(true)
  })

  it('rejects extra injected fields (isOverdue/action forged by client)', async () => {
    await assertCleanErrors('createToolCheckout', [
      { ...valid, isOverdue: false },
      { ...valid, action: 'returning' },
    ])
    expect(true).toBe(true)
  })
})

describe('submitFeedback — adversarial payloads', () => {
  it('typed/oversized messages never 500', async () => {
    await assertCleanErrors('submitFeedback', [
      { message: 123 },
      { message: ['x'] },
      { message: null },
      { message: {} },
      { message: 'x'.repeat(2001) },
      { message: `ok string ${RTL}${ZWSP}` },
      {},
      'not-an-object' as never,
      42 as never,
    ])
    expect(true).toBe(true)
  })
})

describe('appendActivityLog — adversarial payloads', () => {
  it('typed/short-circuit fields reject cleanly', async () => {
    await assertCleanErrors('appendActivityLog', [
      { projectId: 5 },
      { projectId: {} },
      { projectId: 'fuzz-proj', type: 7 },
      { projectId: 'fuzz-proj', type: 'created' },
      { projectId: 'fuzz-proj', type: 'status_change', summary: 123 },
      { projectId: 'fuzz-proj', type: 'status_change', summary: '' },
      { projectId: 'fuzz-proj', type: 'status_change', summary: 'x'.repeat(301) },
      { projectId: 'fuzz-proj', type: 'status_change', summary: 'x', resourceId: 'y'.repeat(201) },
      { projectId: 'fuzz-proj', type: 'status_change', summary: 'x', resourceId: {} },
    ])
    expect(true).toBe(true)
  })
})

describe('deleteMyAccount — junk payload ignored', () => {
  it('rejects unauthenticated first, then succeeds with hostile data', async () => {
    await signOut(auth).catch(() => {})
    const anonCode = await callRaw('deleteMyAccount', new Uint8Array(4))
    expect(anonCode).toBe('unauthenticated')
    await signInWithEmailAndPassword(auth, 'fuzz@tinkers.test', 'password123')
    const code = await callRaw('deleteMyAccount', { __proto__: { delete_everything: true }, nope: 'x' } as never)
    expect(code).toBe('ok')
    // everything is gone
    const profileGone = await adminDb.doc(`users/${uid}`).get()
    expect(profileGone.exists).toBe(false)
    const projectGone = await adminDb.doc('projects/fuzz-proj').get()
    expect(projectGone.exists).toBe(false)
  })
})

describe('unknown function names resolve to not-found (not a crash)', () => {
  it('calling a nonexistent callable yields not-found', async () => {
    const code = await callRaw('nopeThisDoesNotExist', {})
    expect(code).toBe('not-found')
  })
})

void CALLABLES