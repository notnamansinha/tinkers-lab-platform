import { describe, it, beforeAll, afterAll } from 'vitest'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ID = 'demo-tinkers-lab'
const RULES = readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8')

let env: RulesTestEnvironment

const STUDENT_A = 'student-a'
const STUDENT_B = 'student-b'
const INACTIVE = 'inactive-user'
const STAFF = 'staff-member'

const seedData = async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    const base = { email: 'x@x.com', displayName: 'X', userType: 'Student', createdAt: new Date() }
    await db.doc('users/student-a').set({ ...base, role: 'student', isActive: true })
    await db.doc('users/student-b').set({ ...base, role: 'student', isActive: true })
    await db.doc('users/inactive-user').set({ ...base, role: 'student', isActive: false })
    await db.doc('users/staff-member').set({ ...base, role: 'lab_assistant', isActive: true })
    // A confirmed, bookable, available machine (for booking rules).
    await db.doc('equipment/bambu-x1c').set({
      machineId: 'bambu-x1c', name: 'Bambu X1C', tier: 'bookable', confirmed: true,
      status: 'available', category: 'Digital Fabrication',
    })
    // A project owned by student-a.
    await db.doc('projects/project-of-a').set({
      userId: 'student-a', status: 'pending', title: 'A', abstract: 'Abstract',
      safetyAgreementAccepted: true, termsAccepted: true, projectCode: 'TL-001',
    })
    // A booking owned by student-a (used for cancel/update tests).
    await db.doc('projects/project-of-a/bookings/b2').set({
      equipmentId: 'bambu-x1c', machineId: 'bambu-x1c', projectId: 'project-of-a',
      date: '2026-01-02', startTime: '10:00', endTime: '11:00', purpose: 'Print',
      safetyAgreementAccepted: true, status: 'approved', userId: 'student-a',
    })
    await db.doc('feedback/f1').set({ userId: 'student-a', message: 'Hi' })
    await db.doc('projects/project-of-a/activityLog/e1').set({
      type: 'booking', summary: 'Booked X', userId: 'student-a', createdAt: new Date(),
    })
  })
}

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: RULES } })
  await seedData()
})

afterAll(async () => {
  await env?.cleanup()
})

describe('users', () => {
  it('a user cannot self-register with an elevated role', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('users/student-a').set({
      email: 'a@x.com', displayName: 'A', role: 'super_admin',
      userType: 'Student', isActive: true, createdAt: new Date(),
    }))
  })

  it('a user cannot change their own role', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('users/student-a').update({ role: 'faculty' }))
  })
})

describe('projects', () => {
  it('unauthenticated users cannot read projects', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(db.doc('projects/project-of-a').get())
  })

  it('direct client project creation is denied (function-only)', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/direct-create').set({
      userId: 'student-a', status: 'pending', title: 'New', abstract: 'A long abstract',
      safetyAgreementAccepted: true, termsAccepted: true,
    }))
  })

  it('users cannot tamper with the atomic project counter (function-only)', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('counters/projects').set({ nextId: 999999 }))
    await assertFails(db.doc('counters/projects').update({ nextId: 1 }))
  })

  it('a student cannot read another student\'s project', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('projects/project-of-a').get())
  })

  it('the owner can read their own project', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a').get())
  })

  it('staff can read any project', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('projects/project-of-a').get())
  })

  it('direct client project creation is denied even with agreements', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/new-project').set({
      userId: 'student-a', status: 'pending', title: 'New', abstract: 'A long abstract',
      safetyAgreementAccepted: true, termsAccepted: true,
    }))
  })

  it('direct client project creation is denied without agreements', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/no-agreement').set({
      userId: 'student-a', status: 'pending', title: 'New', abstract: 'A long abstract',
    }))
  })

  it('a deactivated user cannot register a project', async () => {
    const db = env.authenticatedContext(INACTIVE).firestore()
    await assertFails(db.doc('projects/inactive-proj').set({
      userId: 'inactive-user', status: 'pending', title: 'New', abstract: 'A long abstract',
      safetyAgreementAccepted: true, termsAccepted: true,
    }))
  })

  it('an owner cannot change protected project identity or status fields', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a').update({ title: 'Updated title' }))
    await assertFails(db.doc('projects/project-of-a').update({ userId: STUDENT_B }))
    await assertFails(db.doc('projects/project-of-a').update({ status: 'active' }))
  })
})

describe('bookings (server-enforced creation)', () => {
  it('direct client booking creation is denied (function-only)', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/bookings/b1').set({
      equipmentId: 'bambu-x1c', machineId: 'bambu-x1c', projectId: 'project-of-a',
      date: '2026-01-01', startTime: '10:00', endTime: '11:00', purpose: 'Print',
      safetyAgreementAccepted: true, status: 'approved', userId: 'student-a',
    }))
  })

  it('an owner can cancel their own booking', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/bookings/b2').update({
      status: 'cancelled', cancelledBy: 'student-a', updatedAt: new Date(),
    }))
  })

  it('a non-owner cannot cancel someone else\'s booking', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('projects/project-of-a/bookings/b2').update({
      status: 'cancelled', cancelledBy: 'student-b', updatedAt: new Date(),
    }))
  })
})

describe('checkouts (server-enforced creation)', () => {
  it('direct client checkout creation is denied (function-only)', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/checkouts/c1').set({
      userId: STUDENT_A, projectId: 'project-of-a', action: 'checking_out',
      toolCategory: 'Hand Tools', toolName: 'Hammer', quantity: 1,
      locationOfUse: 'in_lab', expectedReturnDate: '2099-01-01',
      conditionAtCheckout: 'good', isOverdue: false,
    }))
  })
})

describe('feedback (server-enforced creation)', () => {
  it('direct client feedback creation is denied (function-only)', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('feedback/anything').set({
      userId: 'student-a', message: 'Hello', createdAt: new Date(),
    }))
  })

  it('staff can read feedback', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('feedback/f1').get())
  })
})

describe('activityLog (immutable timeline)', () => {
  it('the project owner can append an entry', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/activityLog/e2').set({
      type: 'checkout', summary: 'Checked out Y', userId: 'student-a',
      userName: 'X', userEmail: 'x@x.com', createdAt: new Date(),
    }))
  })

  it('nobody can update or delete log entries', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertFails(db.doc('projects/project-of-a/activityLog/e1').update({ summary: 'tampered' }))
    await assertFails(db.doc('projects/project-of-a/activityLog/e1').delete())
  })

  it('an owner cannot forge another actor in the timeline', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/activityLog/e3').set({
      type: 'checkout', summary: 'Forged entry', userId: STUDENT_B,
      userName: 'Someone else', userEmail: 'other@example.com', createdAt: new Date(),
    }))
  })
})
