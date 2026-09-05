import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest'
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
const ADMIN = 'admin-user'
const OUTSIDER = 'outsider-user'
// A uid that never exists in the seed — used for true "create" tests.
const CREATE_USER = 'fresh-user'

const baseProfile = {
  email: 'x@x.com', displayName: 'X', userType: 'Student',
  createdAt: new Date(),
}

/** Seed every document the rules read (via get()) or that tests mutate. */
const seedData = async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await db.doc(`users/${STUDENT_A}`).set({ ...baseProfile, role: 'student', isActive: true })
    await db.doc(`users/${STUDENT_B}`).set({ ...baseProfile, role: 'student', isActive: true })
    await db.doc(`users/${OUTSIDER}`).set({ ...baseProfile, role: 'student', isActive: true })
    await db.doc(`users/${INACTIVE}`).set({ ...baseProfile, role: 'student', isActive: false })
    await db.doc(`users/${STAFF}`).set({
      ...baseProfile, role: 'lab_assistant', isActive: true,
    })
    await db.doc(`users/${ADMIN}`).set({
      ...baseProfile, role: 'super_admin', isActive: true, userType: 'Professor or Faculty',
    })

    // A confirmed, bookable, available machine (for booking rules).
    await db.doc('equipment/bambu-x1c').set({
      machineId: 'bambu-x1c', name: 'Bambu X1C', tier: 'bookable', confirmed: true,
      status: 'available', category: 'Digital Fabrication', healthStatus: 'good',
    })
    await db.doc('equipment/laser-cutter').set({
      machineId: 'laser-cutter', name: 'Laser Cutter', tier: 'bookable', confirmed: true,
      status: 'available', category: 'Digital Fabrication', healthStatus: 'good',
    })
    await db.doc('equipment/hammer').set({
      machineId: 'hammer', name: 'Hammer', tier: 'checkout', confirmed: true,
      status: 'available', category: 'Hand Tools', healthStatus: 'good',
    })

    // Projects owned by A and B.
    await db.doc('projects/project-of-a').set({
      userId: STUDENT_A, status: 'pending', title: 'Project A', abstract: 'Abstract A',
      safetyAgreementAccepted: true, termsAccepted: true, projectCode: 'TL-001',
      imageUrls: [], documentUrls: [],
    })
    await db.doc('projects/project-of-b').set({
      userId: STUDENT_B, status: 'active', title: 'Project B', abstract: 'Abstract B',
      safetyAgreementAccepted: true, termsAccepted: true, projectCode: 'TL-002',
      imageUrls: [], documentUrls: [],
    })

    // Bookings: an approved booking by A and a cancelled one by B.
    await db.doc('projects/project-of-a/bookings/b-approved').set({
      equipmentId: 'bambu-x1c', machineId: 'bambu-x1c', projectId: 'project-of-a',
      date: '2026-01-02', startTime: '10:00', endTime: '11:00', purpose: 'Print',
      safetyAgreementAccepted: true, status: 'approved', userId: STUDENT_A,
    })
    await db.doc('projects/project-of-b/bookings/b-b').set({
      equipmentId: 'laser-cutter', machineId: 'laser-cutter', projectId: 'project-of-b',
      date: '2026-01-03', startTime: '11:00', endTime: '12:00', purpose: 'Cut',
      safetyAgreementAccepted: true, status: 'approved', userId: STUDENT_B,
    })

    // Checkouts: A has an active checkout (for return/overdue rules) and a returned one.
    await db.doc('projects/project-of-a/checkouts/c-active').set({
      userId: STUDENT_A, projectId: 'project-of-a', action: 'checking_out',
      toolCategory: 'Hand Tools', toolName: 'Hammer', quantity: 1,
      locationOfUse: 'in_lab', expectedReturnDate: '2099-01-01',
      conditionAtCheckout: 'good', isOverdue: false, returnedAt: null,
    })
    await db.doc('projects/project-of-a/checkouts/c-returned').set({
      userId: STUDENT_A, projectId: 'project-of-a', action: 'checking_out',
      toolCategory: 'Hand Tools', toolName: 'Screwdriver', quantity: 1,
      locationOfUse: 'in_lab', expectedReturnDate: '2026-01-01',
      conditionAtCheckout: 'good', isOverdue: false,
      returnedAt: new Date(), conditionAtReturn: 'good',
    })

    await db.doc('projects/project-of-a/activityLog/e1').set({
      type: 'booking', summary: 'Booked X', userId: STUDENT_A, createdAt: new Date(),
    })

    // Project members roster for project A.
    await db.doc('projects/project-of-a/projectMembers/m1').set({
      projectId: 'project-of-a', name: 'Mentor', isMentor: true, createdAt: new Date(),
    })

    // Inventory + transactions.
    await db.doc('inventory/filament').set({
      name: 'PLA Filament', category: 'Consumables', quantity: 10, minQuantity: 2,
      unit: 'kg', location: 'Shelf 1', status: 'in_stock', createdAt: new Date(),
    })
    await db.doc('inventoryTransactions/tx1').set({
      itemId: 'filament', itemName: 'PLA Filament', type: 'restock', quantity: 5,
      quantityBefore: 5, quantityAfter: 10, userId: STAFF, userName: 'Staff',
      userEmail: 'x@x.com', createdAt: new Date(),
    })

    // Maintenance + workshops + registrations.
    await db.doc('maintenance/m1').set({
      equipmentId: 'bambu-x1c', machineId: 'bambu-x1c', machineName: 'Bambu X1C',
      type: 'preventive', status: 'scheduled', title: 'Lube', description: 'Lube rails',
      scheduledDate: '2026-02-01', technician: 'T1', createdAt: new Date(),
    })
    await db.doc('workshops/w1').set({
      title: 'Soldering 101', type: 'training', description: 'Learn soldering',
      instructor: 'I', date: '2026-03-01', startTime: '10:00', endTime: '11:00',
      capacity: 20, registeredCount: 0, location: 'Lab', isActive: true,
      certificateIssued: false, createdAt: new Date(),
    })
    await db.doc('workshopRegistrations/reg1').set({
      workshopId: 'w1', workshopTitle: 'Soldering 101', userId: STUDENT_A,
      userName: 'A', userEmail: 'a@x.com', status: 'registered',
      certificateIssued: false, createdAt: new Date(), updatedAt: new Date(),
    })

    // Notifications, announcements, issues, audit logs, settings, feedback.
    await db.doc('notifications/n1').set({
      userId: STUDENT_A, type: 'announcement', title: 'Hi', message: 'There',
      isRead: false, createdAt: new Date(),
    })
    await db.doc('announcements/a1').set({
      title: 'Lab closed', body: 'On Sunday', priority: 'normal',
      isActive: true, authorId: STAFF, authorName: 'Staff', createdAt: new Date(),
    })
    await db.doc('issues/i1').set({
      userId: STUDENT_A, userName: 'A', userEmail: 'a@x.com', type: 'machine_malfunction',
      severity: 'medium', status: 'open', description: 'This is a long enough description.',
      createdAt: new Date(), updatedAt: new Date(),
    })
    await db.doc('auditLogs/l1').set({
      userId: ADMIN, userEmail: 'admin@x.com', action: 'approve',
      resource: 'projects', resourceId: 'project-of-a', createdAt: new Date(),
    })
    await db.doc('settings/app').set({ maintenanceMode: false })
    await db.doc('feedback/f1').set({ userId: STUDENT_A, message: 'Hi' })
    await db.doc('feedbackWindows/window-a').set({ lastSubmittedAt: Date.now() })

    // A slot doc as the createBooking function would write it.
    await db.doc('slots/bambu-x1c_2026-01-05_10:00').set({
      equipmentId: 'bambu-x1c', machineId: 'bambu-x1c', machineName: 'Bambu X1C',
      date: '2026-01-05', startTime: '10:00', endTime: '11:00',
      bookingId: 'b2', status: 'approved', createdAt: new Date(),
    })
  })
}

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: RULES } })
})

// Every test needs pristine, unmutated seed data — admin/owner mutations in
// one test must never change the outcome of a later one.
beforeEach(async () => {
  await env.clearFirestore()
  await seedData()
})

afterAll(async () => {
  await env?.cleanup()
})

// ================================================================
// USERS COLLECTION
// ================================================================
describe('users — reads', () => {
  it('unauthenticated users cannot read any profile', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(db.doc(`users/${STUDENT_A}`).get())
  })

  it('owners can read their own profile', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc(`users/${STUDENT_A}`).get())
  })

  it('non-owners cannot read another user\'s profile', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc(`users/${STUDENT_A}`).get())
  })

  it('admins can read any profile', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc(`users/${STUDENT_A}`).get())
  })

  it('staff (non-admin) cannot read arbitrary profiles', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertFails(db.doc(`users/${STUDENT_A}`).get())
  })
})

describe('users — create', () => {
  const validCreate = {
    email: 'a@x.com', displayName: 'A', role: 'student',
    userType: 'Student', isActive: true, createdAt: new Date(),
  }

  it('self-create with role=student is allowed', async () => {
    const db = env.authenticatedContext(CREATE_USER).firestore()
    await assertSucceeds(db.doc(`users/${CREATE_USER}`).set(validCreate))
  })

  it('self-create with role=super_admin is denied', async () => {
    const db = env.authenticatedContext(CREATE_USER).firestore()
    await assertFails(db.doc(`users/${CREATE_USER}`).set({ ...validCreate, role: 'super_admin' }))
  })

  it('self-create with role=faculty is denied', async () => {
    const db = env.authenticatedContext(CREATE_USER).firestore()
    await assertFails(db.doc(`users/${CREATE_USER}`).set({ ...validCreate, role: 'faculty' }))
  })

  it('self-create with role=lab_assistant is denied', async () => {
    const db = env.authenticatedContext(CREATE_USER).firestore()
    await assertFails(db.doc(`users/${CREATE_USER}`).set({ ...validCreate, role: 'lab_assistant' }))
  })

  it('self-create missing email is denied', async () => {
    const db = env.authenticatedContext(CREATE_USER).firestore()
    const { email: _email, ...rest } = validCreate
    await assertFails(db.doc(`users/${CREATE_USER}`).set(rest))
  })

  it('self-create missing displayName is denied', async () => {
    const db = env.authenticatedContext(CREATE_USER).firestore()
    const { displayName: _displayName, ...rest } = validCreate
    await assertFails(db.doc(`users/${CREATE_USER}`).set(rest))
  })

  it('self-create missing role is denied', async () => {
    const db = env.authenticatedContext(CREATE_USER).firestore()
    const { role: _role, ...rest } = validCreate
    await assertFails(db.doc(`users/${CREATE_USER}`).set(rest))
  })

  it('self-create missing userType is denied', async () => {
    const db = env.authenticatedContext(CREATE_USER).firestore()
    const { userType: _userType, ...rest } = validCreate
    await assertFails(db.doc(`users/${CREATE_USER}`).set(rest))
  })

  it('self-create missing isActive is denied', async () => {
    const db = env.authenticatedContext(CREATE_USER).firestore()
    const { isActive: _isActive, ...rest } = validCreate
    await assertFails(db.doc(`users/${CREATE_USER}`).set(rest))
  })

  it('self-create missing createdAt is denied', async () => {
    const db = env.authenticatedContext(CREATE_USER).firestore()
    const { createdAt: _createdAt, ...rest } = validCreate
    await assertFails(db.doc(`users/${CREATE_USER}`).set(rest))
  })

  it('a user cannot create another user\'s profile', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc(`users/${STUDENT_A}`).set(validCreate))
  })
})

describe('users — update', () => {
  it('owners can update their displayName', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc(`users/${STUDENT_A}`).update({ displayName: 'New name' }))
  })

  it('owners cannot change their own role', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc(`users/${STUDENT_A}`).update({ role: 'super_admin' }))
  })

  it('owners cannot change their own isActive', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc(`users/${STUDENT_A}`).update({ isActive: false }))
  })

  it('owners cannot change their own email', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc(`users/${STUDENT_A}`).update({ email: 'hacked@x.com' }))
  })

  it('admins can update any user\'s role', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc(`users/${STUDENT_A}`).update({ role: 'lab_assistant' }))
  })

  it('admins can update any user\'s displayName', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc(`users/${STUDENT_A}`).update({ displayName: 'By admin' }))
  })

  it('staff (non-admin) cannot update another user', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertFails(db.doc(`users/${STUDENT_A}`).update({ displayName: 'By staff' }))
  })
})

describe('users — delete', () => {
  it('admins can delete a user', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc(`users/${OUTSIDER}`).delete())
  })

  it('non-admins cannot delete a user', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc(`users/${STUDENT_B}`).delete())
  })

  it('staff (non-admin) cannot delete a user', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertFails(db.doc(`users/${STUDENT_B}`).delete())
  })
})

describe('users — deactivated account', () => {
  // NOTE: a deactivated user may still read their OWN profile (isOwner does not
  // gate on isActive) — this is deliberate so a user can see why they are
  // deactivated. Catalog reads (equipment/slots) are isAuth()-gated by design;
  // the deactivation ''revokes'' PP-writes and all role/sensitive reads below.
  it('a deactivated user can still read their own profile', async () => {
    const db = env.authenticatedContext(INACTIVE).firestore()
    await assertSucceeds(db.doc(`users/${INACTIVE}`).get())
  })

  it('a deactivated user cannot read a project (owner/staff read rule gates on active role)', async () => {
    const db = env.authenticatedContext(INACTIVE).firestore()
    await assertFails(db.doc('projects/project-of-a').get())
  })

  it('a deactivated user cannot read counters (isActiveUser-gated)', async () => {
    const db = env.authenticatedContext(INACTIVE).firestore()
    await assertFails(db.doc('counters/projects').get())
  })

  it('a deactivated user cannot create a booking on their own project', async () => {
    const db = env.authenticatedContext(INACTIVE).firestore()
    await assertFails(db.doc('projects/project-of-b/bookings/from-inactive').set({
      equipmentId: 'laser-cutter', machineId: 'laser-cutter', projectId: 'project-of-b',
      date: '2026-01-10', startTime: '10:00', endTime: '11:00', purpose: 'Cut',
      safetyAgreementAccepted: true, status: 'approved', userId: INACTIVE,
    }))
  })

  it('a deactivated user cannot create a checkout', async () => {
    const db = env.authenticatedContext(INACTIVE).firestore()
    await assertFails(db.doc('projects/project-of-b/checkouts/from-inactive').set({
      userId: INACTIVE, projectId: 'project-of-b', action: 'checking_out',
      toolCategory: 'Hand Tools', toolName: 'Hammer', quantity: 1,
      locationOfUse: 'in_lab', expectedReturnDate: '2099-01-01',
      conditionAtCheckout: 'good', isOverdue: false,
    }))
  })

  it('a deactivated user cannot report an issue', async () => {
    const db = env.authenticatedContext(INACTIVE).firestore()
    await assertFails(db.doc('issues/from-inactive').set({
      userId: INACTIVE, userName: 'Inactive', userEmail: 'i@x.com', type: 'other',
      severity: 'low', status: 'open', description: 'This description is long enough.',
      createdAt: new Date(), updatedAt: new Date(),
    }))
  })

  it('a deactivated user cannot register for a workshop', async () => {
    const db = env.authenticatedContext(INACTIVE).firestore()
    await assertFails(db.doc('workshopRegistrations/ri').set({
      workshopId: 'w1', workshopTitle: 'Soldering 101', userId: INACTIVE,
      userName: 'Inactive', userEmail: 'i@x.com', status: 'registered',
      certificateIssued: false, createdAt: new Date(), updatedAt: new Date(),
    }))
  })

  it('a deactivated user cannot create a member doc on any project', async () => {
    const db = env.authenticatedContext(INACTIVE).firestore()
    await assertFails(db.doc('projects/project-of-a/projectMembers/evil').set({
      name: 'Evil', isMentor: false, createdAt: new Date(),
    }))
  })
})

// ================================================================
// EQUIPMENT COLLECTION
// ================================================================
describe('equipment', () => {
  it('authenticated users can read equipment', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('equipment/bambu-x1c').get())
  })

  it('unauthenticated users cannot read equipment', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(db.doc('equipment/bambu-x1c').get())
  })

  it('staff can create equipment', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('equipment/new-machine').set({
      machineId: 'new-machine', name: 'New', tier: 'bookable', confirmed: true,
      status: 'available', category: 'Other', healthStatus: 'good',
    }))
  })

  it('admins can create equipment', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('equipment/admin-machine').set({
      machineId: 'admin-machine', name: 'Admin', tier: 'checkout', confirmed: true,
      status: 'available', category: 'Other', healthStatus: 'good',
    }))
  })

  it('students cannot create equipment', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('equipment/evil-machine').set({
      machineId: 'evil', name: 'Evil', tier: 'bookable', confirmed: true,
      status: 'available', category: 'Other', healthStatus: 'good',
    }))
  })

  it('staff can update equipment', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('equipment/bambu-x1c').update({ status: 'reserved' }))
  })

  it('students cannot update equipment', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('equipment/bambu-x1c').update({ status: 'reserved' }))
  })

  it('admins can delete equipment', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('equipment/hammer').delete())
  })

  it('students cannot delete equipment', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('equipment/bambu-x1c').delete())
  })

  it('staff can delete equipment (staff manage the catalog fully)', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('equipment/bambu-x1c').delete())
  })
})

// ================================================================
// COUNTERS COLLECTION
// ================================================================
describe('counters', () => {
  it('active users can read counters', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('counters/projects').get())
  })

  it('nobody can write counters from the client', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertFails(db.doc('counters/projects').set({ nextId: 999 }))
    await assertFails(db.doc('counters/projects').update({ nextId: 1 }))
    await assertFails(db.doc('counters/projects').delete())
  })
})

// ================================================================
// PROJECTS COLLECTION
// ================================================================
describe('projects — reads', () => {
  it('unauthenticated users cannot read projects', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(db.doc('projects/project-of-a').get())
  })

  it('owners can read their own project', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a').get())
  })

  it('students cannot read another student\'s project (IDOR)', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('projects/project-of-a').get())
  })

  it('staff can read any project', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('projects/project-of-a').get())
  })

  it('admins can read any project', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('projects/project-of-a').get())
  })
})

describe('projects — create (server-enforced)', () => {
  const payload = {
    userId: STUDENT_A, status: 'pending', title: 'New project', abstract: 'A long abstract.',
    safetyAgreementAccepted: true, termsAccepted: true,
  }

  it('direct client create is denied even with valid fields', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/direct-create').set(payload))
  })

  it('direct client create with a forged status is denied', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/direct-active').set({ ...payload, status: 'active' }))
  })

  it('admins also cannot create projects directly (function-only)', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertFails(db.doc('projects/admin-direct').set(payload))
  })

  it('staff also cannot create projects directly (function-only)', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertFails(db.doc('projects/staff-direct').set(payload))
  })
})

describe('projects — update', () => {
  it('owners can update allowed fields', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a').update({ title: 'Updated title' }))
  })

  it('owners cannot change status', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a').update({ status: 'active' }))
  })

  it('owners cannot change userId', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a').update({ userId: STUDENT_B }))
  })

  it('owners cannot silently add status alongside an allowed edit', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a').update({ title: 'New', status: 'active' }))
  })

  it('owners cannot change projectCode', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a').update({ projectCode: 'TL-999' }))
  })

  it('owners cannot weaken safety agreements to false', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a').update({ safetyAgreementAccepted: false }))
  })

  it('owners can update imageUrls with valid Firebase Storage URLs', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a').update({
      imageUrls: ['https://firebasestorage.googleapis.com/v0/b/demo/app/o/a.png'],
    }))
  })

  it('owners cannot set imageUrls to a javascript: URL', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a').update({ imageUrls: ['javascript:alert(1)'] }))
  })

  it('owners cannot set imageUrls to an off-site http URL', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a').update({ imageUrls: ['http://evil.com/tracking.gif'] }))
  })

  it('owners cannot set imageUrls to a URL longer than 500 chars', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    const long = `https://firebasestorage.googleapis.com/${'x'.repeat(520)}`
    await assertFails(db.doc('projects/project-of-a').update({ imageUrls: [long] }))
  })

  it('owners cannot set imageUrls to more than 12 URLs', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    const urls = Array.from({ length: 13 }, (_, i) => `https://firebasestorage.googleapis.com/v0/b/demo/o/${i}.png`)
    await assertFails(db.doc('projects/project-of-a').update({ imageUrls: urls }))
  })

  it('owners can update documentUrls with valid Firebase Storage URLs', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a').update({
      documentUrls: ['https://firebasestorage.googleapis.com/v0/b/demo/app/o/r.pdf'],
    }))
  })

  it('owners cannot set documentUrls to a non-Firebase URL', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a').update({ documentUrls: ['https://evil.com/r.pdf'] }))
  })

  it('owners cannot set documentUrls to more than 12 URLs', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    const urls = Array.from({ length: 13 }, (_, i) => `https://firebasestorage.googleapis.com/v0/b/demo/o/${i}.pdf`)
    await assertFails(db.doc('projects/project-of-a').update({ documentUrls: urls }))
  })

  it('non-owners cannot update another project', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('projects/project-of-a').update({ title: 'Hijacked' }))
  })

  it('admins can update anything on a project', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('projects/project-of-a').update({ status: 'active' }))
  })

  it('admins can update userId on a project', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('projects/project-of-a').update({ userId: STUDENT_B }))
  })
})

describe('projects — delete', () => {
  it('admins can delete a project', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('projects/project-of-b').delete())
  })

  it('owners cannot delete their own project', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a').delete())
  })

  it('staff (non-admin) cannot delete a project', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertFails(db.doc('projects/project-of-a').delete())
  })
})

// ================================================================
// PROJECT MEMBERS
// ================================================================
describe('projectMembers', () => {
  it('owners can read their project roster', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/projectMembers/m1').get())
  })

  it('non-owners cannot read another project\'s roster', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('projects/project-of-a/projectMembers/m1').get())
  })

  it('staff can read any roster', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/projectMembers/m1').get())
  })

  it('owners can add members to their own project', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/projectMembers/m2').set({
      projectId: 'project-of-a', name: 'Member', isMentor: false, createdAt: new Date(),
    }))
  })

  it('owners cannot add members to another project', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-b/projectMembers/m2').set({
      projectId: 'project-of-b', name: 'Sneaky', isMentor: false, createdAt: new Date(),
    }))
  })

  it('owners can delete members from their own project', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/projectMembers/m2').delete())
  })

  it('owners cannot delete members from another project', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-b/projectMembers/m1').delete())
  })

  it('staff can update roster members', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/projectMembers/m1').update({ name: 'Renamed' }))
  })
})

// ================================================================
// BOOKINGS SUBCOLLECTION
// ================================================================
describe('bookings — reads', () => {
  it('owners can read their own project\'s bookings', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/bookings/b-approved').get())
  })

  it('non-owners cannot read another project\'s bookings', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('projects/project-of-a/bookings/b-approved').get())
  })

  it('staff can read any bookings', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/bookings/b-approved').get())
  })

  it('unauthenticated users cannot read bookings', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(db.doc('projects/project-of-a/bookings/b-approved').get())
  })
})

describe('bookings — create (server-enforced)', () => {
  const payload = {
    equipmentId: 'bambu-x1c', machineId: 'bambu-x1c', projectId: 'project-of-a',
    date: '2026-01-01', startTime: '10:00', endTime: '11:00', purpose: 'Print',
    safetyAgreementAccepted: true, status: 'approved', userId: STUDENT_A,
  }

  it('direct client creation is denied (function-only)', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/bookings/b-direct').set(payload))
  })

  it('admins cannot create bookings directly either', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertFails(db.doc('projects/project-of-a/bookings/b-admin').set(payload))
  })
})

describe('bookings — update', () => {
  it('owners can cancel their own booking', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/bookings/b-approved').update({
      status: 'cancelled', cancelledBy: STUDENT_A, updatedAt: new Date(),
    }))
  })

  it('owners cannot change a booking to approved', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/bookings/b-approved').update({
      status: 'approved',
    }))
  })

  it('owners cannot change the purpose of a booking', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/bookings/b-approved').update({
      purpose: 'Forged purpose',
    }))
  })

  it('owners cannot change the date of a booking', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/bookings/b-approved').update({
      date: '2027-01-01',
    }))
  })

  it('non-owners cannot cancel another user\'s booking', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('projects/project-of-a/bookings/b-approved').update({
      status: 'cancelled', cancelledBy: STUDENT_B, updatedAt: new Date(),
    }))
  })

  it('owners of a different project cannot cancel this booking', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('projects/project-of-a/bookings/b-approved').update({
      status: 'cancelled', cancelledBy: STUDENT_B, updatedAt: new Date(),
    }))
  })

  it('staff can update any booking field', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/bookings/b-approved').update({
      status: 'rejected', rejectionReason: 'Conflict',
    }))
  })

  it('admins can update any booking field', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/bookings/b-approved').update({
      status: 'approved',
    }))
  })

  it('deactivated owners cannot cancel their booking', async () => {
    const db = env.authenticatedContext(INACTIVE).firestore()
    await assertFails(db.doc('projects/project-of-b/bookings/b-b').update({
      status: 'cancelled', cancelledBy: INACTIVE, updatedAt: new Date(),
    }))
  })
})

describe('bookings — delete', () => {
  it('admins can delete bookings', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('projects/project-of-b/bookings/b-b').delete())
  })

  it('owners cannot delete bookings', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/bookings/b-approved').delete())
  })

  it('staff (non-admin) cannot delete bookings', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertFails(db.doc('projects/project-of-a/bookings/b-approved').delete())
  })
})

// ================================================================
// CHECKOUTS SUBCOLLECTION
// ================================================================
describe('checkouts — reads', () => {
  it('owners can read their own project\'s checkouts', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/checkouts/c-active').get())
  })

  it('non-owners cannot read another project\'s checkouts', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('projects/project-of-a/checkouts/c-active').get())
  })

  it('staff can read any checkouts', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/checkouts/c-active').get())
  })
})

describe('checkouts — create (server-enforced)', () => {
  it('direct client checkout creation is denied', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/checkouts/c-direct').set({
      userId: STUDENT_A, projectId: 'project-of-a', action: 'checking_out',
      toolCategory: 'Hand Tools', toolName: 'Hammer', quantity: 1,
      locationOfUse: 'in_lab', expectedReturnDate: '2099-01-01',
      conditionAtCheckout: 'good', isOverdue: false,
    }))
  })

  it('admins cannot create checkouts directly either', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertFails(db.doc('projects/project-of-a/checkouts/c-admin').set({
      userId: ADMIN, projectId: 'project-of-a', action: 'checking_out',
      toolCategory: 'Hand Tools', toolName: 'Hammer', quantity: 1,
      locationOfUse: 'in_lab', expectedReturnDate: '2099-01-01',
      conditionAtCheckout: 'good', isOverdue: false,
    }))
  })
})

describe('checkouts — update (owner return)', () => {
  it('owners can return an active checkout', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/checkouts/c-active').update({
      action: 'returning', returnedAt: new Date(),
      conditionAtReturn: 'good', isOverdue: false, updatedAt: new Date(),
    }))
  })

  it('owners cannot change the toolName on a checkout', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/checkouts/c-active').update({
      toolName: 'Stolen Hammer',
    }))
  })

  it('owners cannot change the quantity on a checkout', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/checkouts/c-active').update({ quantity: 99 }))
  })

  it('owners cannot mark an already-returned checkout as returned again', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/checkouts/c-returned').update({
      action: 'returning', returnedAt: new Date(), conditionAtReturn: 'good',
      isOverdue: false, updatedAt: new Date(),
    }))
  })

  it('owners cannot set conditionAtReturn to an invalid value', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/checkouts/c-active').update({
      action: 'returning', returnedAt: new Date(),
      conditionAtReturn: 'destroyed', isOverdue: false, updatedAt: new Date(),
    }))
  })

  it('owners cannot return without a conditionAtReturn', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/checkouts/c-active').update({
      action: 'returning', returnedAt: new Date(), isOverdue: false, updatedAt: new Date(),
    }))
  })

  it('non-owners cannot return another user\'s checkout', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('projects/project-of-a/checkouts/c-active').update({
      action: 'returning', returnedAt: new Date(),
      conditionAtReturn: 'good', isOverdue: false, updatedAt: new Date(),
    }))
  })
})

describe('checkouts — update (overdue flag)', () => {
  it('owners can mark their own active checkout overdue', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/checkouts/c-active').update({
      isOverdue: true, updatedAt: new Date(),
    }))
  })

  it('owners cannot mark an already-returned checkout overdue', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/checkouts/c-returned').update({
      isOverdue: true, updatedAt: new Date(),
    }))
  })

  it('owners cannot flip isOverdue back to false once flagged', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/checkouts/c-returned').update({
      isOverdue: false, updatedAt: new Date(),
    }))
  })

  it('owners cannot change other fields while flagging overdue', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/checkouts/c-active').update({
      isOverdue: true, toolName: 'Forged', updatedAt: new Date(),
    }))
  })
})

describe('checkouts — update (staff)', () => {
  it('staff can update any checkout field', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/checkouts/c-active').update({
      quantity: 5,
    }))
  })

  it('admins can update any checkout field', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/checkouts/c-active').update({
      notes: 'Admin note',
    }))
  })
})

describe('checkouts — delete', () => {
  it('admins can delete checkouts', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/checkouts/c-active').delete())
  })

  it('non-admins cannot delete checkouts', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/checkouts/c-active').delete())
  })
})

// ================================================================
// ACTIVITY LOG (immutable)
// ================================================================
describe('activityLog', () => {
  it('owners can read their own project\'s timeline', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/activityLog/e1').get())
  })

  it('non-owners cannot read another project\'s timeline', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('projects/project-of-a/activityLog/e1').get())
  })

  it('staff can read any timeline', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('projects/project-of-a/activityLog/e1').get())
  })

  it('direct client appends are denied (function-only)', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('projects/project-of-a/activityLog/e-forged').set({
      type: 'booking', summary: 'Forged', userId: STUDENT_A, createdAt: new Date(),
    }))
  })

  it('nobody can update log entries', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertFails(db.doc('projects/project-of-a/activityLog/e1').update({ summary: 'tampered' }))
  })

  it('nobody can delete log entries', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertFails(db.doc('projects/project-of-a/activityLog/e1').delete())
  })
})

// ================================================================
// SLOTS (privacy-safe occupancy)
// ================================================================
describe('slots', () => {
  it('any authenticated user can read a slot', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertSucceeds(db.doc('slots/bambu-x1c_2026-01-05_10:00').get())
  })

  it('unauthenticated users cannot read slots', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(db.doc('slots/bambu-x1c_2026-01-05_10:00').get())
  })

  it('clients cannot write slots (server-written only)', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertFails(db.doc('slots/bambu-x1c_2026-01-05_11:00').set({
      equipmentId: 'bambu-x1c', date: '2026-01-05', startTime: '11:00',
      endTime: '12:00', bookingId: 'x', status: 'approved',
    }))
  })

  it('clients cannot update or delete slots', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertFails(db.doc('slots/bambu-x1c_2026-01-05_10:00').update({ status: 'cancelled' }))
    await assertFails(db.doc('slots/bambu-x1c_2026-01-05_10:00').delete())
  })
})

// ================================================================
// ISSUES
// ================================================================
describe('issues — create', () => {
  const base = {
    userId: STUDENT_A, userName: 'A', userEmail: 'a@x.com', type: 'machine_malfunction',
    severity: 'medium', status: 'open', description: 'This description is long enough.',
    createdAt: new Date(), updatedAt: new Date(),
  }

  it('an active user can create an issue with valid enums', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('issues/issue-ok').set(base))
  })

  it('every severity enum is accepted', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    for (const severity of ['low', 'medium', 'high', 'urgent']) {
      await assertSucceeds(db.doc(`issues/issue-${severity}`).set({ ...base, severity }))
    }
  })

  it('every type enum is accepted', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    for (const type of ['machine_malfunction', 'safety_concern', 'missing_damaged', 'suggestion', 'other']) {
      await assertSucceeds(db.doc(`issues/issue-t-${type}`).set({ ...base, type }))
    }
  })

  it('create with status != open is denied', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('issues/issue-resolved').set({ ...base, status: 'resolved' }))
  })

  it('create with an invalid type is denied', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('issues/issue-bad-type').set({ ...base, type: 'hack_the_lab' }))
  })

  it('create with an invalid severity is denied', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('issues/issue-bad-sev').set({ ...base, severity: 'catastrophic' }))
  })

  it('create with a description under 20 chars is denied', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('issues/issue-short').set({ ...base, description: 'too short' }))
  })

  it('create with a non-string description is denied', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('issues/issue-num').set({ ...base, description: 12345 }))
  })

  it('create with extra fields not in the allowlist is denied', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('issues/issue-extra').set({ ...base, resolution: 'forged' }))
  })

  it('create with a forged userId is denied', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('issues/issue-forged').set({ ...base, userId: STUDENT_B }))
  })

  it('unauthenticated users cannot create issues', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(db.doc('issues/issue-anon').set(base))
  })
})

describe('issues — read/update/delete', () => {
  it('the reporter can read their own issue', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('issues/i1').get())
  })

  it('students cannot read another user\'s issue', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('issues/i1').get())
  })

  it('staff can read any issue', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('issues/i1').get())
  })

  it('students cannot update issues (staff only)', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('issues/i1').update({ status: 'in_progress' }))
  })

  it('staff can update issues', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('issues/i1').update({ status: 'in_progress' }))
  })

  it('admins can update issues', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('issues/i1').update({ status: 'resolved', resolution: 'Fixed' }))
  })

  it('admins can delete issues', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('issues/i1').delete())
  })

  it('students cannot delete issues', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('issues/i1').delete())
  })
})

// ================================================================
// WORKSHOP REGISTRATIONS
// ================================================================
describe('workshopRegistrations — create', () => {
  it('an active user can register themselves (self only)', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('workshopRegistrations/reg-self').set({
      workshopId: 'w1', workshopTitle: 'Soldering 101', userId: STUDENT_A,
      userName: 'A', userEmail: 'a@x.com', status: 'registered',
      certificateIssued: false, createdAt: new Date(), updatedAt: new Date(),
    }))
  })

  it('a user cannot register under another user\'s identity', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('workshopRegistrations/reg-other').set({
      workshopId: 'w1', workshopTitle: 'Soldering 101', userId: STUDENT_A,
      userName: 'A', userEmail: 'a@x.com', status: 'registered',
      certificateIssued: false, createdAt: new Date(), updatedAt: new Date(),
    }))
  })

  it('unauthenticated users cannot register', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(db.doc('workshopRegistrations/reg-anon').set({
      workshopId: 'w1', workshopTitle: 'Soldering 101', userId: 'anon',
      userName: 'Anon', userEmail: 'a@x.com', status: 'registered',
      certificateIssued: false, createdAt: new Date(), updatedAt: new Date(),
    }))
  })
})

describe('workshopRegistrations — update (owner)', () => {
  it('owners can cancel their own registration', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('workshopRegistrations/reg1').update({
      status: 'cancelled', updatedAt: new Date(),
    }))
  })

  it('owners can leave feedback up to 500 chars', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('workshopRegistrations/reg1').update({
      feedback: 'x'.repeat(500), updatedAt: new Date(),
    }))
  })

  it('owners can rate 1..5', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    for (const rating of [1, 3, 5]) {
      await assertSucceeds(db.doc('workshopRegistrations/reg1').update({ rating, updatedAt: new Date() }))
    }
  })

  it('owners cannot set rating 6', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('workshopRegistrations/reg1').update({ rating: 6, updatedAt: new Date() }))
  })

  it('owners cannot set rating 0', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('workshopRegistrations/reg1').update({ rating: 0, updatedAt: new Date() }))
  })

  it('owners cannot set a non-integer rating', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('workshopRegistrations/reg1').update({ rating: 4.5, updatedAt: new Date() }))
  })

  it('owners cannot set feedback longer than 500 chars', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('workshopRegistrations/reg1').update({
      feedback: 'x'.repeat(501), updatedAt: new Date(),
    }))
  })

  it('owners cannot self-mark as attended', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('workshopRegistrations/reg1').update({
      status: 'attended', updatedAt: new Date(),
    }))
  })

  it('owners cannot change certificateIssued', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('workshopRegistrations/reg1').update({
      certificateIssued: true, updatedAt: new Date(),
    }))
  })

  it('owners cannot change userId on a registration', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('workshopRegistrations/reg1').update({ userId: STUDENT_B }))
  })

  it('owners cannot change workshopId on a registration', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('workshopRegistrations/reg1').update({ workshopId: 'w2' }))
  })

  it('non-owners cannot modify someone else\'s registration', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('workshopRegistrations/reg1').update({
      status: 'cancelled', updatedAt: new Date(),
    }))
  })

  it('deactivated owners cannot modify their registration', async () => {
    const db = env.authenticatedContext(INACTIVE).firestore()
    await assertFails(db.doc('workshopRegistrations/reg1').update({
      status: 'cancelled', updatedAt: new Date(),
    }))
  })
})

describe('workshopRegistrations — read/delete', () => {
  it('owners can read their own registration', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('workshopRegistrations/reg1').get())
  })

  it('students cannot read another user\'s registration', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('workshopRegistrations/reg1').get())
  })

  it('staff can read any registration', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('workshopRegistrations/reg1').get())
  })

  it('staff can update any registration', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('workshopRegistrations/reg1').update({
      status: 'attended', certificateIssued: true, updatedAt: new Date(),
    }))
  })

  it('admins can delete registrations', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('workshopRegistrations/reg1').delete())
  })

  it('non-admins cannot delete registrations', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('workshopRegistrations/reg1').delete())
  })
})

// ================================================================
// WORKSHOPS
// ================================================================
describe('workshops', () => {
  it('authenticated users can read workshops', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('workshops/w1').get())
  })

  it('unauthenticated users cannot read workshops', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(db.doc('workshops/w1').get())
  })

  it('staff can create workshops', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('workshops/w2').set({
      title: 'CNC', type: 'workshop', description: 'Desc', instructor: 'I',
      date: '2026-04-01', startTime: '10:00', endTime: '11:00', capacity: 10,
      registeredCount: 0, location: 'Lab', isActive: true, certificateIssued: false,
      createdAt: new Date(),
    }))
  })

  it('students cannot create workshops', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('workshops/w-fake').set({
      title: 'Fake', type: 'workshop', description: 'Desc', instructor: 'I',
      date: '2026-04-01', startTime: '10:00', endTime: '11:00', capacity: 10,
      registeredCount: 999, location: 'Lab', isActive: true, certificateIssued: false,
      createdAt: new Date(),
    }))
  })

  it('staff can update workshops', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('workshops/w1').update({ capacity: 30 }))
  })

  it('students cannot update workshops', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('workshops/w1').update({ capacity: 1 }))
  })

  it('admins can delete workshops', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('workshops/w1').delete())
  })

  it('students cannot delete workshops', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('workshops/w1').delete())
  })
})

// ================================================================
// INVENTORY
// ================================================================
describe('inventory', () => {
  it('authenticated users can read inventory', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('inventory/filament').get())
  })

  it('unauthenticated users cannot read inventory', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(db.doc('inventory/filament').get())
  })

  it('staff can create inventory items', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('inventory/new-item').set({
      name: 'Bolt', category: 'Mechanical Parts', quantity: 100, minQuantity: 10,
      unit: 'pcs', location: 'Shelf 2', status: 'in_stock', createdAt: new Date(),
    }))
  })

  it('students cannot create inventory items', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('inventory/evil-item').set({
      name: 'Bolt', category: 'Mechanical Parts', quantity: 100, minQuantity: 10,
      unit: 'pcs', location: 'Shelf 2', status: 'in_stock', createdAt: new Date(),
    }))
  })

  it('staff can update inventory items', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('inventory/filament').update({ quantity: 5 }))
  })

  it('students cannot update inventory items', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('inventory/filament').update({ quantity: 999 }))
  })

  it('admins can delete inventory items', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('inventory/filament').delete())
  })

  it('staff (non-admin) cannot delete inventory items', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertFails(db.doc('inventory/filament').delete())
  })
})

// ================================================================
// INVENTORY TRANSACTIONS
// ================================================================
describe('inventoryTransactions', () => {
  it('authenticated users can read transactions', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('inventoryTransactions/tx1').get())
  })

  it('staff can create transactions', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('inventoryTransactions/tx2').set({
      itemId: 'filament', itemName: 'PLA Filament', type: 'restock', quantity: 5,
      quantityBefore: 10, quantityAfter: 15, userId: STAFF, userName: 'Staff',
      userEmail: 'x@x.com', createdAt: new Date(),
    }))
  })

  it('students cannot create transactions', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('inventoryTransactions/tx-fake').set({
      itemId: 'filament', itemName: 'PLA Filament', type: 'restock', quantity: 5,
      quantityBefore: 10, quantityAfter: 15, userId: STUDENT_A, userName: 'A',
      userEmail: 'a@x.com', createdAt: new Date(),
    }))
  })

  it('admins can update transactions', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('inventoryTransactions/tx1').update({ notes: 'done' }))
  })

  it('staff cannot update transactions', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertFails(db.doc('inventoryTransactions/tx1').update({ notes: 'nope' }))
  })

  it('admins can delete transactions', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('inventoryTransactions/tx1').delete())
  })

  it('staff cannot delete transactions', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertFails(db.doc('inventoryTransactions/tx1').delete())
  })
})

// ================================================================
// MAINTENANCE
// ================================================================
describe('maintenance', () => {
  it('authenticated users can read maintenance records', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('maintenance/m1').get())
  })

  it('unauthenticated users cannot read maintenance records', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(db.doc('maintenance/m1').get())
  })

  it('staff can create maintenance records', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('maintenance/m2').set({
      equipmentId: 'bambu-x1c', machineId: 'bambu-x1c', machineName: 'Bambu X1C',
      type: 'repair', status: 'scheduled', title: 'Fix', description: 'Fix it',
      scheduledDate: '2026-05-01', technician: 'T2', createdAt: new Date(),
    }))
  })

  it('students cannot create maintenance records', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('maintenance/m-fake').set({
      equipmentId: 'bambu-x1c', machineId: 'bambu-x1c', machineName: 'Bambu X1C',
      type: 'repair', status: 'scheduled', title: 'Fix', description: 'Fix it',
      scheduledDate: '2026-05-01', technician: 'T2', createdAt: new Date(),
    }))
  })

  it('staff can update maintenance records', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('maintenance/m1').update({ status: 'in_progress' }))
  })

  it('students cannot update maintenance records', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('maintenance/m1').update({ status: 'completed' }))
  })

  it('admins can delete maintenance records', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('maintenance/m1').delete())
  })

  it('students cannot delete maintenance records', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('maintenance/m1').delete())
  })
})

// ================================================================
// NOTIFICATIONS
// ================================================================
describe('notifications', () => {
  it('users can only read their own notifications', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('notifications/n1').get())
  })

  it('students cannot read another user\'s notifications', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('notifications/n1').get())
  })

  it('staff cannot read a user\'s notifications', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertFails(db.doc('notifications/n1').get())
  })

  it('students cannot create notifications', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('notifications/spam').set({
      userId: STUDENT_A, type: 'announcement', title: 'Spam', message: 'Hi',
      isRead: false, createdAt: new Date(),
    }))
  })

  it('staff can create notifications', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('notifications/staff-made').set({
      userId: STUDENT_A, type: 'announcement', title: 'Hi', message: 'There',
      isRead: false, createdAt: new Date(),
    }))
  })

  it('users can mark their own notification as read', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('notifications/n1').update({ isRead: true }))
  })

  it('users cannot edit their own notification title', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('notifications/n1').update({ title: 'Forged' }))
  })

  it('users cannot mark another user\'s notification as read', async () => {
    const db = env.authenticatedContext(STUDENT_B).firestore()
    await assertFails(db.doc('notifications/n1').update({ isRead: true }))
  })

  it('admins can delete notifications', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('notifications/n1').delete())
  })

  it('users cannot delete their own notifications', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('notifications/n1').delete())
  })
})

// ================================================================
// ANNOUNCEMENTS
// ================================================================
describe('announcements', () => {
  it('any authenticated user can read announcements', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertSucceeds(db.doc('announcements/a1').get())
  })

  it('unauthenticated users cannot read announcements', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(db.doc('announcements/a1').get())
  })

  it('staff can create announcements', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('announcements/a2').set({
      title: 'Maintenance', body: 'Down Thursday', priority: 'high',
      isActive: true, authorId: STAFF, authorName: 'Staff', createdAt: new Date(),
    }))
  })

  it('students cannot create announcements', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('announcements/a-fake').set({
      title: 'Fake', body: 'Fake news', priority: 'urgent',
      isActive: true, authorId: STUDENT_A, authorName: 'A', createdAt: new Date(),
    }))
  })

  it('staff can update announcements', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('announcements/a1').update({ isActive: false }))
  })

  it('students cannot update announcements', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('announcements/a1').update({ isActive: false }))
  })

  it('staff can delete announcements', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('announcements/a1').delete())
  })

  it('students cannot delete announcements', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('announcements/a1').delete())
  })
})

// ================================================================
// AUDIT LOGS (immutable)
// ================================================================
describe('auditLogs', () => {
  it('only admins can read audit logs', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('auditLogs/l1').get())
  })

  it('staff cannot read audit logs', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertFails(db.doc('auditLogs/l1').get())
  })

  it('students cannot read audit logs', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('auditLogs/l1').get())
  })

  it('staff can create audit log entries', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('auditLogs/l2').set({
      userId: STAFF, userEmail: 's@x.com', action: 'update',
      resource: 'inventory', resourceId: 'filament', createdAt: new Date(),
    }))
  })

  it('students cannot create audit log entries', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('auditLogs/l-fake').set({
      userId: STUDENT_A, userEmail: 'a@x.com', action: 'hack',
      resource: 'users', resourceId: 'admin', createdAt: new Date(),
    }))
  })

  it('nobody can update or delete audit log entries', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertFails(db.doc('auditLogs/l1').update({ action: 'tampered' }))
    await assertFails(db.doc('auditLogs/l1').delete())
  })
})

// ================================================================
// SETTINGS
// ================================================================
describe('settings', () => {
  it('admins can read settings', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('settings/app').get())
  })

  it('staff can read settings', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('settings/app').get())
  })

  it('students cannot read settings', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('settings/app').get())
  })

  it('admins can write settings', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('settings/app').update({ maintenanceMode: true }))
  })

  it('staff cannot write settings', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertFails(db.doc('settings/app').update({ maintenanceMode: true }))
  })

  it('students cannot write settings', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('settings/app').set({ maintenanceMode: true }))
  })
})

// ================================================================
// FEEDBACK (server-enforced creation)
// ================================================================
describe('feedback', () => {
  it('staff can read feedback', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertSucceeds(db.doc('feedback/f1').get())
  })

  it('admins can read feedback', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertSucceeds(db.doc('feedback/f1').get())
  })

  it('students cannot read feedback', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('feedback/f1').get())
  })

  it('direct client feedback creation is denied (function-only)', async () => {
    const db = env.authenticatedContext(STUDENT_A).firestore()
    await assertFails(db.doc('feedback/anything').set({
      userId: STUDENT_A, message: 'Hello', createdAt: new Date(),
    }))
  })

  it('staff cannot create feedback directly either', async () => {
    const db = env.authenticatedContext(STAFF).firestore()
    await assertFails(db.doc('feedback/anything').set({
      userId: STUDENT_A, message: 'Hello', createdAt: new Date(),
    }))
  })

  it('nobody can update or delete feedback', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertFails(db.doc('feedback/f1').update({ message: 'tampered' }))
    await assertFails(db.doc('feedback/f1').delete())
  })
})

// ================================================================
// DEFAULT DENY — any unmapped path
// ================================================================
describe('default deny', () => {
  it('read/write to unknown collections is denied', async () => {
    const db = env.authenticatedContext(ADMIN).firestore()
    await assertFails(db.doc('hacked/t1').get())
    await assertFails(db.doc('hacked/t1').set({ x: 1 }))
    await assertFails(db.doc('users/student-a/evilSub/doc').get())
  })
})