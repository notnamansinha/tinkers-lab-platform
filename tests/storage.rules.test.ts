import { describe, it, beforeAll, afterAll } from 'vitest'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
  type RulesTestContext,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ID = 'demo-tinkers-lab'
const RULES = readFileSync(resolve(__dirname, '../storage.rules'), 'utf8')

let env: RulesTestEnvironment

const STUDENT = 'storage-student'
const OTHER = 'storage-other'
const STAFF = 'storage-staff'
const INACTIVE_STAFF = 'storage-inactive-staff'
const PROJECT_ID_DOC = 'storage-project-a'

/** Wrap an UploadTask as a Promise so assertSucceeds/assertFails accept it. */
function put(
  storage: ReturnType<RulesTestContext['storage']>,
  path: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  return new Promise<void>((resolvePromise, reject) => {
    const task = storage.ref(path).put(bytes, { contentType })
    task.on('state_changed', () => {}, (err: Error) => reject(err), () => resolvePromise())
  })
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: { rules: RULES },
    firestore: {
      // Storage rules read the Firestore user doc for role checks.
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
    },
  })
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    const base = { email: 'x@x.com', displayName: 'X', userType: 'Student', createdAt: new Date() }
    await db.doc(`users/${STUDENT}`).set({ ...base, role: 'student', isActive: true })
    await db.doc(`users/${OTHER}`).set({ ...base, role: 'student', isActive: true })
    await db.doc(`users/${STAFF}`).set({ ...base, role: 'lab_assistant', isActive: true })
    await db.doc(`users/${INACTIVE_STAFF}`).set({ ...base, role: 'lab_assistant', isActive: false })
    await db.doc(`projects/${PROJECT_ID_DOC}`).set({
      userId: STUDENT, status: 'pending', title: 'A', abstract: 'Abstract',
      safetyAgreementAccepted: true, termsAccepted: true,
    })
  })
})

afterAll(async () => {
  await env?.cleanup()
})

describe('storage — equipment images', () => {
  it('students cannot upload equipment images (staff-only)', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertFails(put(storage, 'equipment/bambu-x1c/test.png', new Uint8Array(1), 'image/png'))
  })

  it('staff can upload a valid image under 5 MB', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertSucceeds(put(storage, 'equipment/bambu-x1c/test.png', new Uint8Array(1024), 'image/png'))
  })

  it('staff cannot upload non-image content types', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertFails(put(storage, 'equipment/bambu-x1c/test.pdf', new Uint8Array(10), 'application/pdf'))
  })

  it('deactivated staff cannot upload equipment images', async () => {
    const storage = env.authenticatedContext(INACTIVE_STAFF).storage()
    await assertFails(put(storage, 'equipment/bambu-x1c/inactive.png', new Uint8Array(10), 'image/png'))
  })
})

describe('storage — project files', () => {
  it('the project owner can upload a document', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertSucceeds(put(storage, `projects/${PROJECT_ID_DOC}/documents/report.pdf`, new Uint8Array(100), 'application/pdf'))
  })

  it('a non-owner student cannot upload to another project', async () => {
    const storage = env.authenticatedContext(OTHER).storage()
    await assertFails(put(storage, `projects/${PROJECT_ID_DOC}/documents/report.pdf`, new Uint8Array(100), 'application/pdf'))
  })
})

describe('storage — workshop materials', () => {
  it('staff can upload workshop materials', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertSucceeds(put(storage, 'workshops/w1/slides.pdf', new Uint8Array(100), 'application/pdf'))
  })

  it('students cannot upload workshop materials', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertFails(put(storage, 'workshops/w1/slides.pdf', new Uint8Array(100), 'application/pdf'))
  })
})
