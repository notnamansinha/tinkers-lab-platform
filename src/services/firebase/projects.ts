import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS, addDocument, updateDocument } from './firestore'
import type { Project, ProjectStatus } from '@/types'

// ============================================================
// PROJECT SERVICE  (Form 1 — Project Registration)
// Free-tier optimised.
// "Users register a project once; email is the join key." (Spec 2)
// ============================================================

/**
 * Generate a sequential project ID in "TL-001" format.
 * Uses getCountFromServer() — a single aggregation read (1 Firestore read).
 * Thread-safety note: in very low concurrency this is fine. For high concurrency
 * a transaction with a counter document would be needed.
 */
export async function generateProjectId(): Promise<string> {
  const ref = collection(db, COLLECTIONS.PROJECTS)
  const snap = await getCountFromServer(ref)
  const count = snap.data().count + 1
  return `TL-${String(count).padStart(3, '0')}` // TL-001, TL-002, etc.
}

/**
 * Create a new project registration (Form 1).
 * Status starts as 'pending' — admin reviews and approves/rejects.
 * Auto-generates a sequential project ID.
 */
export async function createProject(
  data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'imageUrls' | 'documentUrls'>
): Promise<string> {
  const projectId = await generateProjectId()
  // addDocument stores id as a Firestore field alongside the auto-generated doc ID
  // We cast to any to store the human-readable TL-001 id as a document field
  return addDocument(COLLECTIONS.PROJECTS, {
    ...data,
    id: projectId,         // Human-readable: "TL-001" — stored as a field
    status: 'pending',
    imageUrls: [],
    documentUrls: [],
  } as any)

}

/**
 * Get all projects for a user by their userId.
 * Used to populate the project selector in booking/checkout forms.
 * Only returns active/pending projects (not rejected/completed).
 * React Query caches this — only fetched once per session.
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
  const ref = collection(db, COLLECTIONS.PROJECTS)
  const q = query(
    ref,
    where('userId', '==', userId),
    where('status', 'in', ['pending', 'active'])
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Project)
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
    where('status', 'in', ['pending', 'active'])
  )
  const snap = await getCountFromServer(q)
  return snap.data().count > 0
}

/**
 * Get all projects (admin view) with optional status filter.
 */
export async function getProjectsByStatus(status?: ProjectStatus): Promise<Project[]> {
  const ref = collection(db, COLLECTIONS.PROJECTS)
  const constraints = status ? [where('status', '==', status)] : []
  const q = query(ref, ...constraints)
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Project)
    .sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.())
}

/**
 * Admin: approve or reject a project registration.
 */
export async function updateProjectStatus(
  firestoreDocId: string,
  status: 'active' | 'rejected' | 'on_hold' | 'completed',
  rejectionReason?: string
): Promise<void> {
  const updates: Record<string, unknown> = { status }
  if (rejectionReason) updates.rejectionReason = rejectionReason
  await updateDocument(COLLECTIONS.PROJECTS, firestoreDocId, updates)
}
