import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { getUserProfile } from '@/services/firebase/auth'
import type { UserProfile, UserRole, ADMIN_ROLES, STAFF_ROLES } from '@/types'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  role: UserRole | null
  loading: boolean
  isAdmin: boolean
  isStaff: boolean
  refetchProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (u: User) => {
    try {
      const p = await getUserProfile(u.uid)
      setProfile(p)
    } catch {
      setProfile(null)
    }
  }

  const refetchProfile = async () => {
    if (user) await loadProfile(user)
  }

  useEffect(() => {
    // Handle redirect result for environments where popup is blocked
    import('firebase/auth').then(({ getRedirectResult }) => {
      getRedirectResult(auth).catch(console.error)
    })

    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, (u) => {
      setLoading(true)
      setUser(u)
      
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (u) {
        profileUnsub = onSnapshot(doc(db, 'users', u.uid), (docSnap: any) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile)
          } else {
            setProfile(null)
          }
          setLoading(false)
        }, (error: any) => {
          console.error("Profile snapshot error:", error)
          setProfile(null)
          setLoading(false)
        })
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      authUnsub()
      if (profileUnsub) profileUnsub()
    }
  }, [])

  const role = profile?.role ?? null
  const normalizedRole = role?.toLowerCase().replace(/[^a-z]/g, '') ?? ''
  
  const adminRoles = ['superadmin', 'admin']
  const staffRoles = ['superadmin', 'admin', 'faculty', 'labassistant']
  
  const isAdmin = adminRoles.includes(normalizedRole)
  const isStaff = staffRoles.includes(normalizedRole)

  return (
    <AuthContext.Provider
      value={{ user, profile, role, loading, isAdmin, isStaff, refetchProfile }}
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
