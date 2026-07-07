import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile,
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
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider)
  // Create user profile if first time
  await ensureUserProfile(result.user)
  return result.user
}

// ============================================================
// SIGN IN — Email + Password
// ============================================================
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

// ============================================================
// REGISTER — Email + Password
// ============================================================
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
  extraData: Partial<UserProfile> = {}
): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(result.user, { displayName })
  await createUserProfile(result.user, displayName, extraData)
  return result.user
}

// ============================================================
// PASSWORD RESET
// ============================================================
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
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
