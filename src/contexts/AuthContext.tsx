import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { type DocumentData, type DocumentSnapshot } from 'firebase/firestore'
import type { UserProfile, UserRole } from '@/types'
import { ADMIN_ROLES, STAFF_ROLES } from '@/types'
import { debugLog } from '@/lib/utils'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  role: UserRole | null
  loading: boolean
  authReady: boolean
  isAdmin: boolean
  isStaff: boolean
  refetchProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authReady, setAuthReady] = useState(false)

  const loadProfile = async (u: User, db: any) => {
    try {
      const { doc, getDoc } = await import('firebase/firestore')
      const snap = await getDoc(doc(db, 'users', u.uid))
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile)
      } else {
        setProfile(null)
      }
    } catch {
      setProfile(null)
    }
  }

  const refetchProfile = async () => {
    if (!user) return
    const { db } = await import('@/lib/firebase')
    await loadProfile(user, db)
  }

  useEffect(() => {
    let profileUnsub: (() => void) | null = null
    let cancelled = false

    const init = async () => {
      const [{ auth, db }, { onAuthStateChanged, getRedirectResult }, { doc, onSnapshot }] =
        await Promise.all([
          import('@/lib/firebase'),
          import('firebase/auth'),
          import('firebase/firestore'),
        ])

      if (cancelled) return

      getRedirectResult(auth).catch((e: unknown) => { debugLog('getRedirectResult failed:', e) })

      const authUnsub = onAuthStateChanged(auth, (u) => {
        setUser(u)

        if (profileUnsub) {
          profileUnsub()
          profileUnsub = null
        }

        if (u) {
          // Reset to loading state before the first snapshot arrives for the
          // new user — prevents the previous user's profile from being visible.
          setProfile(null)
          setAuthReady(false)
          profileUnsub = onSnapshot(
            doc(db, 'users', u.uid),
            (docSnap: DocumentSnapshot<DocumentData>) => {
              if (docSnap.exists()) {
                setProfile(docSnap.data() as UserProfile)
              } else {
                setProfile(null)
              }
              setAuthReady(true)
            },
            () => {
              setProfile(null)
              setAuthReady(true)
            },
          )
        } else {
          setProfile(null)
          setAuthReady(true)
        }
      })

      return () => {
        authUnsub()
        if (profileUnsub) profileUnsub()
      }
    }

    let cleanup: () => void = () => {}
    init().then((c) => {
      if (c && !cancelled) cleanup = c
    }).catch((err: unknown) => {
      debugLog('Auth initialization failed:', err)
      setAuthReady(true)
    })

    return () => {
      cancelled = true
      cleanup()
    }
  }, [])

  const rawRole = profile?.role ?? null
  const normalizedRole = rawRole?.toLowerCase().replace(/[^a-z]/g, '') ?? ''

  // Single source of truth: the role constants from src/types (matches firestore.rules).
  const normalize = (r: string) => r.toLowerCase().replace(/[^a-z]/g, '')

  const isAdmin = ADMIN_ROLES.map(normalize).includes(normalizedRole)
  const isStaff = STAFF_ROLES.map(normalize).includes(normalizedRole)

  return (
    <AuthContext.Provider
      value={{ user, profile, role: rawRole, loading: !authReady, authReady, isAdmin, isStaff, refetchProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
