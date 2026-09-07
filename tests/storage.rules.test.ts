import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest'
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
const ADMIN = 'storage-admin'
const PROJECT_ID_DOC = 'storage-project-a'

const MB = 1024 * 1024

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

// Seeded identically before every test — storage rules read Firestore docs.
async function seedData() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    const base = { email: 'x@x.com', displayName: 'X', userType: 'Student', createdAt: new Date() }
    await db.doc(`users/${STUDENT}`).set({ ...base, role: 'student', isActive: true })
    await db.doc(`users/${OTHER}`).set({ ...base, role: 'student', isActive: true })
    await db.doc(`users/${STAFF}`).set({ ...base, role: 'lab_assistant', isActive: true })
    await db.doc(`users/${ADMIN}`).set({
      ...base, role: 'super_admin', isActive: true, userType: 'Professor or Faculty',
    })
    await db.doc(`users/${INACTIVE_STAFF}`).set({ ...base, role: 'lab_assistant', isActive: false })
    await db.doc(`projects/${PROJECT_ID_DOC}`).set({
      userId: STUDENT, status: 'pending', title: 'A', abstract: 'Abstract',
      safetyAgreementAccepted: true, termsAccepted: true,
    })
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
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.clearStorage()
  await seedData()
})

afterAll(async () => {
  await env?.cleanup()
})

describe('storage — equipment images', () => {
  it('students cannot upload equipment images (staff-only)', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertFails(put(storage, 'equipment/bambu-x1c/test.png', new Uint8Array(1), 'image/png'))
  })

  it('staff can upload a valid JPEG under 5 MB', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertSucceeds(put(storage, 'equipment/bambu-x1c/photo.jpg', new Uint8Array(1024), 'image/jpeg'))
  })

  it('staff can upload a valid PNG under 5 MB', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertSucceeds(put(storage, 'equipment/bambu-x1c/test.png', new Uint8Array(1024), 'image/png'))
  })

  it('staff can upload a valid WebP under 5 MB', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertSucceeds(put(storage, 'equipment/bambu-x1c/test.webp', new Uint8Array(1024), 'image/webp'))
  })

  it('staff can upload an image of exactly 5 MB', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertSucceeds(put(storage, 'equipment/bambu-x1c/edge.png', new Uint8Array(5 * MB), 'image/png'))
  })

  it('staff cannot upload an image larger than 5 MB', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertFails(put(storage, 'equipment/bambu-x1c/big.png', new Uint8Array(5 * MB + 1), 'image/png'))
  })

  it('staff cannot upload non-image content types (PDF)', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertFails(put(storage, 'equipment/bambu-x1c/manual.pdf', new Uint8Array(10), 'application/pdf'))
  })

  it('staff cannot upload arbitrary MIME types', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertFails(put(storage, 'equipment/bambu-x1c/evil.html', new Uint8Array(10), 'text/html'))
  })

  it('deactivated staff cannot upload equipment images', async () => {
    const storage = env.authenticatedContext(INACTIVE_STAFF).storage()
    await assertFails(put(storage, 'equipment/bambu-x1c/inactive.png', new Uint8Array(10), 'image/png'))
  })

  it('unauthenticated users cannot read equipment images', async () => {
    const storage = env.unauthenticatedContext().storage()
    await assertFails(storage.ref('equipment/bambu-x1c/test.png').getMetadata())
  })

  it('any authenticated user can read equipment images', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertSucceeds(storage.ref('equipment/bambu-x1c/test.png').getMetadata())
  })

  it('staff can delete equipment images', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertSucceeds(storage.ref('equipment/bambu-x1c/test.png').delete())
  })

  it('students cannot delete equipment images', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertFails(storage.ref('equipment/bambu-x1c/test.png').delete())
  })
})

describe('storage — project images', () => {
  it('the project owner can upload an image', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertSucceeds(put(storage, `projects/${PROJECT_ID_DOC}/images/photo.png`, new Uint8Array(100), 'image/png'))
  })

  it('the project owner can upload PNG/JPEG/WebP only', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    for (const [ext, type] of [['png', 'image/png'], ['jpg', 'image/jpeg'], ['webp', 'image/webp']]) {
      await assertSucceeds(put(storage, `projects/${PROJECT_ID_DOC}/images/a.${ext}`, new Uint8Array(10), type))
    }
  })

  it('the project owner cannot upload an oversized image (> 5 MB)', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertFails(put(storage, `projects/${PROJECT_ID_DOC}/images/big.png`, new Uint8Array(5 * MB + 1), 'image/png'))
  })

  it('the project owner cannot upload a PDF into images/', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertFails(put(storage, `projects/${PROJECT_ID_DOC}/images/report.pdf`, new Uint8Array(10), 'application/pdf'))
  })

  it('a non-owner student cannot upload to another project', async () => {
    const storage = env.authenticatedContext(OTHER).storage()
    await assertFails(put(storage, `projects/${PROJECT_ID_DOC}/images/photo.png`, new Uint8Array(100), 'image/png'))
  })

  it('staff can upload to any project', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertSucceeds(put(storage, `projects/${PROJECT_ID_DOC}/images/staff.png`, new Uint8Array(100), 'image/png'))
  })

  it('the project owner can read their own images', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertSucceeds(storage.ref(`projects/${PROJECT_ID_DOC}/images/photo.png`).getMetadata())
  })

  it('a non-owner student cannot read another project\'s images', async () => {
    const storage = env.authenticatedContext(OTHER).storage()
    await assertFails(storage.ref(`projects/${PROJECT_ID_DOC}/images/photo.png`).getMetadata())
  })

  it('staff can read any project image', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertSucceeds(storage.ref(`projects/${PROJECT_ID_DOC}/images/photo.png`).getMetadata())
  })

  it('the project owner can delete their own images', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertSucceeds(storage.ref(`projects/${PROJECT_ID_DOC}/images/photo.png`).delete())
  })

  it('a non-owner student cannot delete another project\'s images', async () => {
    const storage = env.authenticatedContext(OTHER).storage()
    await assertFails(storage.ref(`projects/${PROJECT_ID_DOC}/images/photo.png`).delete())
  })
})

describe('storage — project documents', () => {
  it('the project owner can upload a PDF document (≤ 10 MB)', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertSucceeds(put(storage, `projects/${PROJECT_ID_DOC}/documents/report.pdf`, new Uint8Array(100), 'application/pdf'))
  })

  it('the project owner can upload a DOCX document', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertSucceeds(put(
      storage,
      `projects/${PROJECT_ID_DOC}/documents/report.docx`,
      new Uint8Array(100),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ))
  })

  it('the project owner can upload a plain-text document', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertSucceeds(put(storage, `projects/${PROJECT_ID_DOC}/documents/notes.txt`, new Uint8Array(100), 'text/plain'))
  })

  it('the project owner can upload a document of exactly 10 MB', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertSucceeds(put(storage, `projects/${PROJECT_ID_DOC}/documents/edge.pdf`, new Uint8Array(10 * MB), 'application/pdf'))
  })

  it('the project owner cannot upload a document larger than 10 MB', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertFails(put(storage, `projects/${PROJECT_ID_DOC}/documents/big.pdf`, new Uint8Array(10 * MB + 1), 'application/pdf'))
  })

  it('the project owner cannot upload arbitrary executables', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    // Note: scripts/migrations contain no binaries; an .exe is representative junk.
    await assertFails(put(storage, `projects/${PROJECT_ID_DOC}/documents/evil.exe`, new Uint8Array(10), 'application/octet-stream'))
  })

  it('the project owner can read their own documents', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertSucceeds(storage.ref(`projects/${PROJECT_ID_DOC}/documents/report.pdf`).getMetadata())
  })

  it('a non-owner student cannot read another project\'s documents', async () => {
    const storage = env.authenticatedContext(OTHER).storage()
    await assertFails(storage.ref(`projects/${PROJECT_ID_DOC}/documents/report.pdf`).getMetadata())
  })

  it('a non-owner student cannot upload to another project', async () => {
    const storage = env.authenticatedContext(OTHER).storage()
    await assertFails(put(storage, `projects/${PROJECT_ID_DOC}/documents/report.pdf`, new Uint8Array(100), 'application/pdf'))
  })

  it('a non-owner student cannot delete another project\'s documents', async () => {
    const storage = env.authenticatedContext(OTHER).storage()
    await assertFails(storage.ref(`projects/${PROJECT_ID_DOC}/documents/report.pdf`).delete())
  })

  it('staff can upload documents to any project', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertSucceeds(put(storage, `projects/${PROJECT_ID_DOC}/documents/staff.pdf`, new Uint8Array(100), 'application/pdf'))
  })

  it('staff can read any project document', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertSucceeds(storage.ref(`projects/${PROJECT_ID_DOC}/documents/report.pdf`).getMetadata())
  })
})

describe('storage — workshop materials', () => {
  it('staff can upload workshop materials', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertSucceeds(put(storage, 'workshops/w1/slides.pdf', new Uint8Array(100), 'application/pdf'))
  })

  it('admins can upload workshop materials', async () => {
    const storage = env.authenticatedContext(ADMIN).storage()
    await assertSucceeds(put(storage, 'workshops/w1/handout.txt', new Uint8Array(100), 'text/plain'))
  })

  it('staff cannot upload oversized workshop materials (> 10 MB)', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertFails(put(storage, 'workshops/w1/big.pdf', new Uint8Array(10 * MB + 1), 'application/pdf'))
  })

  it('staff cannot upload arbitrary MIME types', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertFails(put(storage, 'workshops/w1/evil.js', new Uint8Array(10), 'application/javascript'))
  })

  it('students cannot upload workshop materials', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertFails(put(storage, 'workshops/w1/slides.pdf', new Uint8Array(100), 'application/pdf'))
  })

  it('students can READ any workshop material', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertSucceeds(storage.ref('workshops/w1/slides.pdf').getMetadata())
  })

  it('unauthenticated users cannot read workshop materials', async () => {
    const storage = env.unauthenticatedContext().storage()
    await assertFails(storage.ref('workshops/w1/slides.pdf').getMetadata())
  })

  it('students cannot delete workshop materials', async () => {
    const storage = env.authenticatedContext(STUDENT).storage()
    await assertFails(storage.ref('workshops/w1/slides.pdf').delete())
  })

  it('staff can delete workshop materials', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertSucceeds(storage.ref('workshops/w1/slides.pdf').delete())
  })
})

describe('storage — default deny and path traversal', () => {
  it('uploads to unknown paths are denied', async () => {
    const storage = env.authenticatedContext(ADMIN).storage()
    await assertFails(put(storage, 'users/secret.png', new Uint8Array(10), 'image/png'))
    await assertFails(put(storage, 'anything/at-all.pdf', new Uint8Array(10), 'application/pdf'))
  })

  it('reads from unknown paths are denied', async () => {
    const storage = env.authenticatedContext(ADMIN).storage()
    await assertFails(storage.ref('users/secret.png').getMetadata())
  })

  it('deletes from unknown paths are denied', async () => {
    const storage = env.authenticatedContext(ADMIN).storage()
    await assertFails(storage.ref('users/secret.png').delete())
  })

  it('traversal outside the declared prefixes is denied', async () => {
    const storage = env.authenticatedContext(STAFF).storage()
    await assertFails(put(storage, 'equipment/../projects/evil.png', new Uint8Array(10), 'image/png'))
  })
})