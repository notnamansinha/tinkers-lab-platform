import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  type DocumentData,
  type QueryConstraint,
  type DocumentSnapshot,
  type QuerySnapshot,
  type WhereFilterOp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ============================================================
// COLLECTION NAMES — single source of truth
// ============================================================
export const COLLECTIONS = {
  USERS: 'users',
  EQUIPMENT: 'equipment',
  BOOKINGS: 'bookings',
  TOOL_CHECKOUTS: 'toolCheckouts',
  INVENTORY: 'inventory',
  INVENTORY_TRANSACTIONS: 'inventoryTransactions',
  MAINTENANCE: 'maintenance',
  WORKSHOPS: 'workshops',
  WORKSHOP_REGISTRATIONS: 'workshopRegistrations',
  PROJECTS: 'projects',
  NOTIFICATIONS: 'notifications',
  ANNOUNCEMENTS: 'announcements',
  ISSUES: 'issues',
  AUDIT_LOGS: 'auditLogs',
  SETTINGS: 'settings',
} as const

// ============================================================
// GENERIC CRUD HELPERS
// ============================================================

/**
 * Get a single document by ID.
 */
export async function getDocument<T>(
  collectionName: string,
  id: string
): Promise<T | null> {
  const ref = doc(db, collectionName, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as T
}

/**
 * Get all documents in a collection with optional constraints.
 * Always orders by createdAt descending (latest first).
 */
export async function getDocuments<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  const ref = collection(db, collectionName)
  const q = query(ref, orderBy('createdAt', 'desc'), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)
}

/**
 * Get documents with a simple where filter.
 * Results ordered latest to oldest.
 */
export async function getDocumentsWhere<T>(
  collectionName: string,
  field: string,
  op: WhereFilterOp,
  value: unknown,
  limitCount?: number
): Promise<T[]> {
  const ref = collection(db, collectionName)
  const constraints: QueryConstraint[] = [
    where(field, op, value),
    orderBy('createdAt', 'desc'),
  ]
  if (limitCount) constraints.push(limit(limitCount))
  const q = query(ref, ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)
}

/**
 * Add a new document, auto-adding createdAt and updatedAt.
 */
export async function addDocument<T extends DocumentData>(
  collectionName: string,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = collection(db, collectionName)
  const docRef = await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

/**
 * Update an existing document, auto-updating updatedAt.
 */
export async function updateDocument(
  collectionName: string,
  id: string,
  data: Partial<DocumentData>
): Promise<void> {
  const ref = doc(db, collectionName, id)
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Delete a document.
 */
export async function deleteDocument(
  collectionName: string,
  id: string
): Promise<void> {
  const ref = doc(db, collectionName, id)
  await deleteDoc(ref)
}


