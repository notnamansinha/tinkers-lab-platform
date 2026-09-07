/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared helpers for the page-interaction suite (src/features/__tests__).
// Every suite mocks 'firebase/firestore', '@/lib/firebase', 'sonner' and
// '@/contexts/AuthContext' at the module boundary, then drives the real
// page component with @testing-library/user-event — i.e. actual clicks,
// typing, radio toggles and form submits, not direct function calls.

import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

/** QueryClient that never triggers real fetch retries during a test. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
}

/** Render a page with router + react-query context (firebase already mocked by the suite). */
export function renderPage(ui: React.ReactNode, initialEntries: string[] = ['/']) {
  const qc = makeQueryClient()
  const utils = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...utils, qc }
}

/** Standard firestore mock. Returns handles so each test can shape responses. */
export function createFirestoreMock() {
  const m = {
    collection: vi.fn(() => 'col'),
    collectionGroup: vi.fn(() => 'cg'),
    query: vi.fn(() => 'q'),
    orderBy: vi.fn(),
    orderByField: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    doc: vi.fn((...args: unknown[]) => ['doc', ...args].join('/')),
    getDocs: vi.fn(async () => ({ docs: [] })),
    getDoc: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
    getCountFromServer: vi.fn(async () => ({ data: () => ({ count: 0 }) })),
    addDoc: vi.fn(async () => ({ id: 'new-id' })),
    updateDoc: vi.fn(async () => {}),
    setDoc: vi.fn(async () => {}),
    deleteDoc: vi.fn(async () => {}),
    writeBatch: vi.fn(() => ({
      update: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn(async () => {}),
    })),
    serverTimestamp: vi.fn(() => ({ __sentinel: 'ts' })),
    FieldValue: { increment: vi.fn(() => 'increment'), serverTimestamp: vi.fn(() => ({ __sentinel: 'ts' })) },
  }
  return m
}

/** docs → a Firestore-shaped snapshot list (id + data()) */
export function snapDocs(docs: Array<Record<string, unknown> & { id?: string }>) {
  return docs.map((d) => ({ id: d.id ?? 'd', exists: true, data: () => d, ref: {} }))
}

export function snapDoc(data?: Record<string, unknown> | null) {
  return data == null
    ? { exists: () => false, data: () => undefined }
    : { exists: () => true, id: 'd', data: () => ({ ...data, id: 'd' }), ref: {} }
}

export const currentUser = { uid: 'u1', email: 'alice@tinkers.test', displayName: 'Alice' } as any

export const studentProfile: any = {
  uid: 'u1', email: 'alice@tinkers.test', displayName: 'Alice',
  contact: '9825000000', role: 'student', userType: 'Student',
  department: 'CSE', universityId: 'AU001', isActive: true,
}

export const adminProfile: any = {
  uid: 'u-admin', email: 'admin@tinkers.test', displayName: 'Boss',
  contact: '9825000000', role: 'super_admin', userType: 'Professor or Faculty',
  department: 'ME', researchArea: 'Robotics', isActive: true,
}

export const staffProfile: any = {
  uid: 'u-staff', email: 'staff@tinkers.test', displayName: 'Tutor',
  contact: '9825000000', role: 'lab_assistant', userType: 'Professor or Faculty',
  department: 'ME', researchArea: 'Mech', isActive: true,
}

/** Subscribe the mocked useAuth to a mutable auth state object. */
export function installAuthMock(useAuth: () => any, state: {
  user?: any | null
  profile?: any | null
  isAdmin?: boolean
  isStaff?: boolean
  loading?: boolean
  authReady?: boolean
}) {
  return (useAuth as any).mockReturnValue({
    user: state.user ?? null,
    profile: state.profile ?? null,
    role: state.profile?.role ?? null,
    loading: state.loading ?? false,
    authReady: state.authReady ?? true,
    isAdmin: state.isAdmin ?? false,
    isStaff: state.isStaff ?? false,
    refetchProfile: vi.fn(async () => {}),
  })
}

/** Await all pending microtasks/macrotasks so react-query promises settle. */
export async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0))
  await Promise.resolve()
}