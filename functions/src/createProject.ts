import { onCall } from 'firebase-functions/v2/https'
import { HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getUserProfile } from './lib/helpers'

const db = getFirestore()

// ============================================================
// createProject — SERVER-ENFORCED project registration (Form 1)
// Moves the atomic TL-XXX counter increment server-side so no
// client can tamper with counters/projects and cause duplicate
// business codes. Project doc, timeline entry, and team roster
// are written atomically.
// ============================================================

const PROJECT_KEYS = [
  'title', 'abstract', 'userId', 'userName', 'userEmail', 'userType', 'contact',
  'department', 'universityId', 'teamMembers', 'facultyMentor', 'startDate', 'endDate',
  'expectedEquipmentNeeds', 'equipmentNeedsOther', 'resourceLink',
  'safetyAgreementAccepted', 'termsAccepted', 'status', 'rejectionReason',
  'imageUrls', 'documentUrls', 'projectCode', 'createdAt', 'updatedAt',
] as const

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/
const EXPECTED_NEEDS = [
  '3D Printer', 'Laser Cutter', 'Muffle Furnace', 'Lathe Machine', 'Sheet Bender',
  'Pillar Drill', 'Table Saw', 'Mitre Saw', 'Cut-off Saw', 'ESD Workstation',
  'Oscilloscope', 'Function Generator', 'Soldering Station', 'Hand Tools', 'Power Tools', 'Other',
]

function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

interface CreateProjectInput {
  title: string
  abstract: string
  contact: string
  startDate: string
  endDate?: string
  resourceLink?: string
  expectedEquipmentNeeds: string[]
  equipmentNeedsOther?: string
  teamMembers?: string
  facultyMentor?: string
  department?: string
  universityId?: string
  userType?: string
  safetyAgreementAccepted: boolean
  termsAccepted: boolean
  imageUrls?: string[]
  documentUrls?: string[]
}

export const createProject = onCall(
  { maxInstances: 10, enforceAppCheck: false },
  async (request): Promise<{ projectId: string }> => {
    const auth = request.auth
    if (!auth) throw new HttpsError('unauthenticated', 'Sign in to register a project.')

    const input = (request.data ?? {}) as CreateProjectInput
    const uid = auth.uid

    // ── 1. Active user check ───────────────────────────────────────
    const user = await getUserProfile(uid)
    if (!user) throw new HttpsError('failed-precondition', 'Profile not found. Complete onboarding first.')
    if (user.isActive === false) throw new HttpsError('permission-denied', 'Account is deactivated.')

    // ── 2. Input validation (mirrors the old client-side rules) ────
    if (typeof input.title !== 'string' || input.title.trim().length < 5) {
      throw new HttpsError('invalid-argument', 'Title must be at least 5 characters.')
    }
    if (typeof input.abstract !== 'string' || input.abstract.trim().length < 50) {
      throw new HttpsError('invalid-argument', 'Abstract must be at least 50 characters.')
    }
    if (typeof input.contact !== 'string' || input.contact.trim().length < 5) throw new HttpsError('invalid-argument', 'Contact is required.')
    if (!isRealDate(input.startDate)) throw new HttpsError('invalid-argument', 'Start date must be a valid date.')
    if (input.endDate && (!isRealDate(input.endDate) || input.endDate < input.startDate)) {
      throw new HttpsError('invalid-argument', 'End date must be a valid date after the start date.')
    }
    if (!Array.isArray(input.expectedEquipmentNeeds) || input.expectedEquipmentNeeds.some((need) => !EXPECTED_NEEDS.includes(need))) {
      throw new HttpsError('invalid-argument', 'Invalid expected equipment needs.')
    }
    if (input.safetyAgreementAccepted !== true || input.termsAccepted !== true) {
      throw new HttpsError('invalid-argument', 'Both agreements must be accepted.')
    }
    if (input.resourceLink && !/^https?:\/\//.test(input.resourceLink)) {
      throw new HttpsError('invalid-argument', 'resourceLink must be an http(s) URL.')
    }
    for (const key of Object.keys(input)) {
      if (!PROJECT_KEYS.includes(key as (typeof PROJECT_KEYS)[number])) {
        throw new HttpsError('invalid-argument', `Unexpected field: ${key}`)
      }
    }

    // ── 3. Atomic write: counter + project + timeline + roster ─────
    const counterRef = db.collection('counters').doc('projects')
    const projectRef = db.collection('projects').doc()

    await db.runTransaction(async (tx) => {
      const counterSnap = await tx.get(counterRef)
      const counterData = counterSnap.exists ? counterSnap.data() : undefined
      const nextId = counterData && typeof counterData.nextId === 'number' ? counterData.nextId : 1
      const projectCode = `TL-${String(nextId).padStart(3, '0')}`

      tx.set(counterRef, { nextId: nextId + 1 }, { merge: true })

      tx.set(projectRef, {
        title: input.title.trim(),
        abstract: input.abstract.trim(),
        userId: uid,
        userName: user.displayName ?? '',
        userEmail: user.email ?? '',
        userType: input.userType ?? user.userType ?? 'Student',
        contact: input.contact,
        department: input.department ?? user.department ?? '',
        universityId: input.universityId ?? null,
        teamMembers: input.teamMembers ?? '',
        facultyMentor: input.facultyMentor ?? '',
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        resourceLink: input.resourceLink ?? null,
        expectedEquipmentNeeds: input.expectedEquipmentNeeds ?? [],
        equipmentNeedsOther: input.equipmentNeedsOther ?? null,
        safetyAgreementAccepted: true,
        termsAccepted: true,
        status: 'pending',
        rejectionReason: null,
        imageUrls: input.imageUrls ?? [],
        documentUrls: input.documentUrls ?? [],
        projectCode,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Seed the immutable timeline.
      const logRef = db.collection('projects').doc(projectRef.id).collection('activityLog').doc()
      tx.set(logRef, {
        type: 'created',
        summary: `Project registered (${projectCode}) — pending review`,
        resourceId: projectRef.id,
        userId: uid,
        userName: user.displayName ?? '',
        userEmail: user.email ?? '',
        createdAt: FieldValue.serverTimestamp(),
      })

      // Seed the relational team roster (mentor first, then parsed members).
      const roster = parseRoster(input.teamMembers ?? '')
      const mentor = (input.facultyMentor ?? '').trim()
      const membersRef = db.collection('projects').doc(projectRef.id).collection('projectMembers')
      if (mentor) {
        tx.set(membersRef.doc(), {
          projectId: projectRef.id, name: mentor, isMentor: true, createdAt: FieldValue.serverTimestamp(),
        })
      }
      for (const m of roster) {
        tx.set(membersRef.doc(), {
          projectId: projectRef.id, name: m.name, universityId: m.universityId ?? null,
          userId: null, isMentor: false, createdAt: FieldValue.serverTimestamp(),
        })
      }
    })

    return { projectId: projectRef.id }
  },
)

/** Server-side mirror of src/lib/teamMembers.ts (kept dependency-free). */
function parseRoster(input: string): { name: string; universityId?: string }[] {
  const out: { name: string; universityId?: string }[] = []
  if (!input || !input.trim()) return out
  for (const chunk of input.split(/[\n;]+/)) {
    for (const raw of chunk.split(',')) {
      const token = raw.trim()
      if (!token) continue
      const paren = token.match(/^(.+?)\s*\(([^)]+)\)$/)
      if (paren) {
        out.push({ name: paren[1].trim(), universityId: paren[2].trim() })
        continue
      }
      const last = out[out.length - 1]
      if (/\d/.test(token) && last && !last.universityId) {
        last.universityId = token
        continue
      }
      out.push({ name: token })
    }
  }
  return out
}
