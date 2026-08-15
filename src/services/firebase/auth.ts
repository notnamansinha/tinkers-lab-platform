import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { cleanFirestoreData } from '@/lib/utils'
import type { UserProfile, UserRole } from '@/types'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

// ============================================================
// SIGN IN — Google
// ============================================================

export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  } catch (error: unknown) {
    const firebaseError = error as { code?: string }
    if (
      firebaseError.code === 'auth/popup-blocked' ||
      firebaseError.code === 'auth/popup-closed-by-user' ||
      firebaseError.code === 'auth/cross-origin-opener-policy-failed'
    ) {
      await signInWithRedirect(auth, googleProvider)
      throw new Error('Redirecting to Google...')
    }
    throw error
  }
}



// ============================================================
// SIGN OUT
// ============================================================
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

// ============================================================
// USER PROFILE — Firestore
// ============================================================
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as UserProfile
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return snap.data() as UserProfile
  return createUserProfile(user, user.displayName || user.email?.split('@')[0] || 'User')
}

export async function createUserProfile(
  user: User,
  displayName: string,
  extraData: Partial<UserProfile> = {}
): Promise<UserProfile> {
  const ref = doc(db, 'users', user.uid)
  const now = serverTimestamp()
  // Strip privilege/identity fields so callers can never override role, active status,
  // email, or uid — these are always set server-side/from the auth user below.
  const safeExtraData = Object.fromEntries(
    Object.entries(extraData).filter(([key]) => !['uid', 'email', 'role', 'isActive'].includes(key))
  ) as Partial<UserProfile>
  const profile: Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>
    updatedAt: ReturnType<typeof serverTimestamp>
  } = {
    uid: user.uid,
    email: user.email ?? '',
    displayName,
    role: 'student' as UserRole,
    department: '',
    userType: 'Student',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...safeExtraData,
  }
  await setDoc(ref, cleanFirestoreData(profile), { merge: true })
  return profile as unknown as UserProfile
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, 'users', uid)
  // Defence-in-depth: never let a self-update change role, active status, or email
  // (the Firestore rules also block these, but we strip them here too).
  const safeData = Object.fromEntries(
    Object.entries(data).filter(([key]) => !['email', 'role', 'isActive'].includes(key))
  ) as Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
  await setDoc(ref, cleanFirestoreData({ ...safeData, updatedAt: serverTimestamp() }), { merge: true })
}
