import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  doc,
  runTransaction,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS, SUBCOLLECTIONS } from './firestore'
import { logProjectActivity } from './activityLog'
import { seedProjectMembersTx } from './projectMembers'
import { parseTeamRoster } from '@/lib/teamMembers'
import { cleanFirestoreData } from '@/lib/utils'
import type { Project, ProjectStatus } from '@/types'

// ============================================================
// PROJECT SERVICE  (Form 1 — Project Registration)
// Free-tier optimised.
// "Users register a project once; email is the join key." (Spec 2)
// ============================================================

/**
 * Create a new project registration (Form 1).
 * Status starts as 'pending' — admin reviews and approves/rejects.
 * projectCode (TL-XXX) is generated atomically from counters/projects.
 * The Firestore document ID stays auto-generated (separate from projectCode).
 */
export async function createProject(
  data: Omit<Project, 'id' | 'projectCode' | 'createdAt' | 'updatedAt' | 'status' | 'imageUrls' | 'documentUrls'>
): Promise<string> {
  const projectsCol = collection(db, COLLECTIONS.PROJECTS)
  const counterRef = doc(db, COLLECTIONS.COUNTERS, 'projects')

  // Pre-generate a random document ID (Firestore auto-ID), used inside the transaction.
  const projectDocRef = doc(projectsCol)

  const payload = cleanFirestoreData({
    ...data,
    status: 'pending',
    imageUrls: [],
    documentUrls: [],
    teamMembers: data.teamMembers ?? '',
    facultyMentor: data.facultyMentor ?? '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef)
    const nextId = counterSnap.exists() && typeof counterSnap.data().nextId === 'number'
      ? counterSnap.data().nextId
      : 1
    const projectCode = `TL-${String(nextId).padStart(3, '0')}`

    // 1. Increment the counter (atomic)
    tx.set(counterRef, { nextId: nextId + 1 }, { merge: true })
    // 2. Write the project doc with its business code (atomic with counter)
    tx.set(projectDocRef, { ...payload, projectCode })
    // 3. Seed the immutable project timeline with its creation event (atomic)
    const activityRef = doc(
      collection(db, COLLECTIONS.PROJECTS, projectDocRef.id, SUBCOLLECTIONS.PROJECT_ACTIVITY_LOG),
    )
    tx.set(activityRef, {
      type: 'created',
      summary: `Project registered (${projectCode}) — pending review`,
      resourceId: projectDocRef.id,
      userId: payload.userId ?? '',
      userName: payload.userName ?? '',
      userEmail: payload.userEmail ?? '',
      createdAt: serverTimestamp(),
    })
    // 4. Seed the relational team roster (atomic) — parsed from free-text
    //    "Names and IDs" + the faculty mentor as a mentor-scoped member.
    const roster = parseTeamRoster(typeof data.teamMembers === 'string' ? data.teamMembers : '')
    const mentor = typeof data.facultyMentor === 'string' ? data.facultyMentor.trim() : ''
    seedProjectMembersTx(tx, projectDocRef.id, [
      ...(mentor ? [{ name: mentor, isMentor: true }] : []),
      ...roster.map((m) => ({ name: m.name, universityId: m.universityId })),
    ])
  })

  return projectDocRef.id
}

/**
 * Get all projects for a user by their userId.
 * Used to populate the project selector in booking/checkout forms.
 * Only returns active/pending projects (not rejected/completed).
 * React Query caches this — only fetched once per session.
 *
 * Returns `docId` (Firestore doc ID) alongside `projectCode` (TL-XXX) so
 * callers can display the code while storing the doc ID as the FK.
 */
export async function getUserProjects(userId: string, statusFilter?: string): Promise<(Project & { docId: string })[]> {
  const ref = collection(db, COLLECTIONS.PROJECTS)
  const constraints: any[] = [where('userId', '==', userId)]
  if (statusFilter) constraints.push(where('status', '==', statusFilter))
  const q = query(ref, ...constraints)
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ docId: d.id, ...d.data() }) as Project & { docId: string })
    .sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.())
}

/**
 * Validate that a user (by userId) has at least one registered project.
 * Gate for Forms 2A and 2B: "every booking/checkout must reference a registered project" (Spec 2).
 * Uses count query — 1 read regardless of project count.
 */
export async function userHasActiveProject(userId: string): Promise<boolean> {
  const ref = collection(db, COLLECTIONS.PROJECTS)
  const q = query(
    ref,
    where('userId', '==', userId),
    where('status', '==', 'active')
  )
  const snap = await getCountFromServer(q)
  return snap.data().count > 0
}

/**
 * Get all projects (admin view) with optional status filter.
 */
export async function getProjectsByStatus(status?: ProjectStatus): Promise<(Project & { docId: string })[]> {
  const ref = collection(db, COLLECTIONS.PROJECTS)
  const constraints = status ? [where('status', '==', status)] : []
  const q = query(ref, ...constraints)
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ docId: d.id, ...d.data() }) as Project & { docId: string })
    .sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.())
}

/**
 * Admin: approve or reject a project registration.
 * Also writes a status_change entry to the project's activityLog subcollection.
 */
export async function updateProjectStatus(
  firestoreDocId: string,
  status: 'active' | 'rejected' | 'on_hold' | 'completed',
  rejectionReason?: string,
  actor?: { uid: string; name: string; email: string }
): Promise<void> {
  const updates: Record<string, unknown> = { status, updatedAt: serverTimestamp() }
  if (rejectionReason) updates.rejectionReason = rejectionReason
  const ref = doc(db, COLLECTIONS.PROJECTS, firestoreDocId)
  await updateDoc(ref, updates)

  await logProjectActivity(firestoreDocId, {
    type: 'status_change',
    summary: `Project marked as ${status}${rejectionReason ? ` — ${rejectionReason}` : ''}`,
    userId: actor?.uid ?? 'system',
    userName: actor?.name ?? 'Coordinator',
    userEmail: actor?.email ?? '',
  })
}
