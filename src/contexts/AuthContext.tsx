import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
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

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setLoading(true)
      setUser(u)
      if (u) {
        await loadProfile(u)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const role = profile?.role ?? null
  const adminRoles: string[] = ['super_admin', 'admin']
  const staffRoles: string[] = ['super_admin', 'admin', 'faculty', 'lab_assistant']
  const isAdmin = role ? adminRoles.includes(role) : false
  const isStaff = role ? staffRoles.includes(role) : false

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
