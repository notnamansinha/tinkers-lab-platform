import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS, SUBCOLLECTIONS } from './firestore'
import type { ProjectMember } from '@/types'

// ============================================================
// PROJECT MEMBER SERVICE  (projects/{projectId}/projectMembers)
// Structured, relational roster for each project. Seeded at
// project creation (atomically, server-side via the createProject
// Cloud Function) from the free-text "Names and IDs" input;
// editable by owner/staff.
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
