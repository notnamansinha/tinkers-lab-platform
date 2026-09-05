// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute, AdminRoute, OnboardingRoute, PublicRoute } from '../guards'
import type { User } from 'firebase/auth'
import type { UserProfile } from '@/types'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mUseAuth = vi.mocked(useAuth)

type AuthMock = {
  user?: User | null
  profile?: Partial<UserProfile> | null
  isAdmin?: boolean
  isStaff?: boolean
  loading?: boolean
  authReady?: boolean
}

function mockAuth(o: AuthMock) {
  mUseAuth.mockReturnValue({
    user: o.user ?? null,
    profile: (o.profile ?? null) as UserProfile | null,
    role: null,
    loading: o.loading ?? false,
    authReady: o.authReady ?? true,
    isAdmin: o.isAdmin ?? false,
    isStaff: o.isStaff ?? false,
    refetchProfile: vi.fn(async () => {}),
  })
}

const currentUser = { uid: 'u1', email: 'a@x.com' } as User

const TARGETS = (
  <>
    <Route path="/login" element={<div>LOGIN-PAGE</div>} />
    <Route path="/onboarding" element={<div>ONBOARDING</div>} />
    <Route path="/profile" element={<div>PROFILE-PAGE</div>} />
    <Route path="/" element={<div>HOME-PAGE</div>} />
  </>
)

function harness(guarded: React.ReactNode, entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        {guarded}
        {TARGETS}
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState({}, '', '/')
})

describe('ProtectedRoute', () => {
  const G = <Route path='/secret' element={<ProtectedRoute><div>SECRET</div></ProtectedRoute>} />

  it('shows the loading spinner while auth is loading', () => {
    mockAuth({ loading: true })
    harness(G, '/secret')
    expect(document.querySelector('[data-testid="loading-spinner"]') ?? screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('redirects an unauthenticated user to /login', () => {
    mockAuth({ user: null })
    harness(G, '/secret')
    expect(screen.getByText('LOGIN-PAGE')).toBeInTheDocument()
    expect(screen.queryByText('SECRET')).not.toBeInTheDocument()
  })

  it('redirects a user without a complete profile to /onboarding', () => {
    mockAuth({ user: currentUser, profile: null })
    harness(G, '/secret')
    expect(screen.getByText('ONBOARDING')).toBeInTheDocument()
  })

  it('renders children for an authenticated user with a complete profile', () => {
    mockAuth({ user: currentUser, profile: { contact: '9999999999' } })
    harness(G, '/secret')
    expect(screen.getByText('SECRET')).toBeInTheDocument()
  })
})

describe('AdminRoute', () => {
  const G = <Route path='/admin-panel' element={<AdminRoute><div>ADMIN-SECRET</div></AdminRoute>} />

  it('redirects a non-admin to the home route', () => {
    mockAuth({ user: currentUser, profile: { contact: 'x' }, isAdmin: false })
    harness(G, '/admin-panel')
    expect(screen.getByText('HOME-PAGE')).toBeInTheDocument()
    expect(screen.queryByText('ADMIN-SECRET')).not.toBeInTheDocument()
  })

  it('renders children for an admin', () => {
    mockAuth({ user: currentUser, profile: { contact: 'x' }, isAdmin: true })
    harness(G, '/admin-panel')
    expect(screen.getByText('ADMIN-SECRET')).toBeInTheDocument()
  })

  it('redirects to login when unauthenticated', () => {
    mockAuth({ user: null })
    harness(G, '/admin-panel')
    expect(screen.getByText('LOGIN-PAGE')).toBeInTheDocument()
  })

  it('redirects to onboarding when the profile is incomplete', () => {
    mockAuth({ user: currentUser, profile: null, isAdmin: true })
    harness(G, '/admin-panel')
    expect(screen.getByText('ONBOARDING')).toBeInTheDocument()
  })
})

describe('OnboardingRoute', () => {
  const G = <Route path='/onboarding' element={<OnboardingRoute><div>ONBOARDING-FORM</div></OnboardingRoute>} />

  it('redirects a completed profile at /onboarding to /profile', () => {
    window.history.pushState({}, '', '/onboarding')
    mockAuth({ user: currentUser, profile: { contact: '9999999999' } })
    harness(G, '/onboarding')
    expect(screen.getByText('PROFILE-PAGE')).toBeInTheDocument()
  })

  it('keeps the onboarding form for an incomplete profile', () => {
    mockAuth({ user: currentUser, profile: null })
    harness(G, '/onboarding')
    expect(screen.getByText('ONBOARDING-FORM')).toBeInTheDocument()
  })

  it('redirects to login when unauthenticated', () => {
    mockAuth({ user: null })
    harness(G, '/onboarding')
    expect(screen.getByText('LOGIN-PAGE')).toBeInTheDocument()
  })
})

describe('PublicRoute', () => {
  const G = <Route path='/login' element={<PublicRoute><div>LOGIN-FORM</div></PublicRoute>} />

  it('renders children (login form) for an anonymous visitor', () => {
    mockAuth({ user: null })
    harness(G, '/login')
    expect(screen.getByText('LOGIN-FORM')).toBeInTheDocument()
  })

  it('redirects an authenticated user with a complete profile to /', () => {
    mockAuth({ user: currentUser, profile: { contact: 'x' } })
    harness(G, '/login')
    expect(screen.getByText('HOME-PAGE')).toBeInTheDocument()
  })

  it('redirects an authenticated user without a profile to /onboarding', () => {
    mockAuth({ user: currentUser, profile: null })
    harness(G, '/login')
    expect(screen.getByText('ONBOARDING')).toBeInTheDocument()
  })
})