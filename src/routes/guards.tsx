import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner from '@/components/common/LoadingSpinner'

// ============================================================
// Route guards
// Extracted from routes/index.tsx so their decision logic is
// unit-testable in isolation (see src/routes/__tests__/).
// ============================================================

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!profile || !profile.contact) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!profile || !profile.contact) return <Navigate to="/onboarding" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

export function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profile?.contact && window.location.pathname === '/onboarding') return <Navigate to="/profile" replace />
  return <>{children}</>
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, authReady } = useAuth()
  if (!authReady) return <>{children}</>
  if (user) {
    if (!profile || !profile.contact) return <Navigate to="/onboarding" replace />
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}