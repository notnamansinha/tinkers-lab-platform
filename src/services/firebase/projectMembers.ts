import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  type Transaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS, SUBCOLLECTIONS } from './firestore'
import type { ProjectMember } from '@/types'

// ============================================================
// PROJECT MEMBER SERVICE  (projects/{projectId}/projectMembers)
// Structured, relational roster for each project. Seeded at
// project creation (atomically with the project doc) from the
// free-text "Names and IDs" input; editable by owner/staff.
// ============================================================

function membersRef(projectDocId: string) {
  return collection(db, COLLECTIONS.PROJECTS, projectDocId, SUBCOLLECTIONS.PROJECT_MEMBERS)
}

export interface NewProjectMember {
  name: string
  universityId?: string
  userId?: string
  isMentor?: boolean
}

/**
 * Seed the roster inside the createProject transaction so the project
 * doc, its business code, timeline entry, and members are written atomically.
 */
export function seedProjectMembersTx(
  tx: Transaction,
  projectDocId: string,
  members: NewProjectMember[],
): void {
  for (const m of members) {
    const name = m.name.trim()
    if (!name) continue
    tx.set(doc(membersRef(projectDocId)), {
      projectId: projectDocId,
      name,
      universityId: m.universityId ?? null,
      userId: m.userId ?? null,
      isMentor: m.isMentor === true,
      createdAt: serverTimestamp(),
    })
  }
}

/** Add a member to an existing project (owner or staff). */
export async function addProjectMember(projectDocId: string, member: NewProjectMember): Promise<string> {
  const ref = await addDoc(membersRef(projectDocId), {
    projectId: projectDocId,
    name: member.name.trim(),
    universityId: member.universityId ?? null,
    userId: member.userId ?? null,
    isMentor: member.isMentor === true,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

/** Remove a member from a project roster. */
export async function removeProjectMember(projectDocId: string, memberId: string): Promise<void> {
  await deleteDoc(doc(membersRef(projectDocId), memberId))
}

/** Fetch a project's roster (mentors first, then team members). */
export async function getProjectMembers(projectDocId: string): Promise<ProjectMember[]> {
  const snap = await getDocs(membersRef(projectDocId))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ProjectMember)
    .sort((a, b) => Number(b.isMentor ?? false) - Number(a.isMentor ?? false))
}
