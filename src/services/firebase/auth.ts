import {
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
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
import type { UserProfile, UserRole } from '@/types'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

// ============================================================
// SIGN IN — Google
// ============================================================
import { signInWithRedirect } from 'firebase/auth'

export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  } catch (error: any) {
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cross-origin-opener-policy-failed'
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
    ...extraData,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await setDoc(ref, profile as any, { merge: true })
  return profile as unknown as UserProfile
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, 'users', uid)
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true })
}
