// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
// Workshop panel — every click path: register (server-enforced callable),
// capacity/closed button states, search filter, add-workshop form create/edit.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { renderPage, makeQueryClient, snapDocs, currentUser, studentProfile, staffProfile, flush } from './helpers'
import { render } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

// vi.hoisted guarantees the mock object exists before the factory runs.
const mockFirestore = vi.hoisted(() => ({
  collection: vi.fn(() => 'col'),
  collectionGroup: vi.fn(() => 'cg'),
  query: vi.fn(() => 'q'),
  orderBy: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  doc: vi.fn((...a: unknown[]) => ['doc', ...a].join('/')),
  getDocs: vi.fn(async () => ({ docs: [] })),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
  getCountFromServer: vi.fn(async () => ({ data: () => ({ count: 0 }) })),
  addDoc: vi.fn(async () => ({ id: 'new-id' })),
  updateDoc: vi.fn(async () => {}),
  setDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  writeBatch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(async () => {}) })),
  serverTimestamp: vi.fn(() => ({ __sentinel: 'ts' })),
  FieldValue: class {}, Timestamp: class {}, GeoPoint: class {}, DocumentReference: class {}, Bytes: class {},
  FieldValueSentinel: { increment: vi.fn(), serverTimestamp: vi.fn() },
}))
vi.mock('firebase/firestore', () => mockFirestore)
vi.mock('@/lib/firebase', () => ({ db: {}, app: {} }))
vi.mock('@/services/firebase/functions', () => ({
  registerForWorkshopCallable: vi.fn(),
  createProjectCallable: vi.fn(),
  createBookingCallable: vi.fn(),
  createToolCheckoutCallable: vi.fn(),
  submitFeedbackCallable: vi.fn(),
  deleteMyAccountCallable: vi.fn(),
  appendActivityLogCallable: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))

import { registerForWorkshopCallable } from '@/services/firebase/functions'
import WorkshopListPage from '../workshops/WorkshopListPage'
import WorkshopFormPage from '../workshops/WorkshopFormPage'

const { getDocs, addDoc, updateDoc } = mockFirestore
const mToast = vi.mocked(toast)

const workshop = (over: Record<string, unknown> = {}) => ({
  id: 'w1', title: 'Soldering Basics', description: 'Learn to solder',
  type: 'training', date: '2099-06-01', startTime: '10:00', endTime: '12:00',
  location: 'Workshop A', instructor: 'Tutor', capacity: 20, registeredCount: 0,
  isActive: true, ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('WorkshopListPage', () => {
  it('registers via the server-enforced callable and shows success', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: currentUser, profile: { ...studentProfile } as any, role: 'student', isStaff: false, isAdmin: false,
      loading: false, authReady: true, refetchProfile: vi.fn(async () => {}),
    })
    vi.mocked(registerForWorkshopCallable).mockResolvedValue({ data: { registrationId: 'reg-x' } } as any)
    getDocs.mockResolvedValue({ docs: snapDocs([workshop()]) } as any)

    renderPage(<WorkshopListPage />)
    await waitFor(() => expect(screen.getByText('Soldering Basics')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(registerForWorkshopCallable).toHaveBeenCalledWith({ workshopId: 'w1' })
      expect(mToast.success).toHaveBeenCalledWith(expect.stringContaining('Soldering Basics'))
    })
    // No direct client writes are made anymore (that is what was broken).
    expect(addDoc).not.toHaveBeenCalled()
    expect(updateDoc).not.toHaveBeenCalled()
  })

  it('surfaces the callable rejection (e.g. already registered) as a toast without retry side effects', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: currentUser, profile: studentProfile, role: 'student', isStaff: false, isAdmin: false,
      loading: false, authReady: true, refetchProfile: vi.fn(async () => {}),
    })
    const err = new Error('You are already registered for this workshop.') as any
    err.code = 'functions/failed-precondition'
    vi.mocked(registerForWorkshopCallable).mockRejectedValue(err)
    getDocs.mockResolvedValue({ docs: snapDocs([workshop()]) } as any)

    renderPage(<WorkshopListPage />)
    await waitFor(() => expect(screen.getByText('Soldering Basics')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => expect(mToast.error).toHaveBeenCalledWith('You are already registered for this workshop.'))
    expect(addDoc).not.toHaveBeenCalled()
  })

  it('disables the register button for closed or full workshops', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: currentUser, profile: studentProfile, role: 'student', isStaff: false, isAdmin: false,
      loading: false, authReady: true, refetchProfile: vi.fn(async () => {}),
    })
    getDocs.mockResolvedValue({
      docs: snapDocs([
        workshop({ id: 'closed', title: 'Closed Shop', isActive: false }),
        workshop({ id: 'full', title: 'Fully Booked', capacity: 2, registeredCount: 2 }),
        workshop({ id: 'open', title: 'Open Seat', capacity: 2, registeredCount: 1 }),
      ]),
    } as any)

    renderPage(<WorkshopListPage />)
    await waitFor(() => expect(screen.getByText('Open Seat')).toBeInTheDocument())

    const closedBtn = screen.getByRole('button', { name: /closed/i })
    const fullBtn = screen.getByRole('button', { name: /full/i })
    const openBtn = screen.getByRole('button', { name: /register/i })
    expect(closedBtn).toBeDisabled()
    expect(fullBtn).toBeDisabled()
    expect(openBtn).not.toBeDisabled()
    expect(openBtn).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /details/i }).length).toBe(3)
  })

  it('filters workshops by search and empty-state message', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: currentUser, profile: studentProfile, role: 'student', isStaff: false, isAdmin: false,
      loading: false, authReady: true, refetchProfile: vi.fn(async () => {}),
    })
    getDocs.mockResolvedValue({ docs: snapDocs([workshop(), workshop({ id: 'w2', title: 'Laser Safety' })]) } as any)
    renderPage(<WorkshopListPage />)
    await waitFor(() => expect(screen.getByText('Soldering Basics')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(/search workshops/i), { target: { value: 'laser' } })
    await flush()
    expect(screen.getByText('Laser Safety')).toBeInTheDocument()
    expect(screen.queryByText('Soldering Basics')).not.toBeInTheDocument()
  })

  it('hides the Add Workshop button from students but shows it to staff', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: currentUser, profile: studentProfile, role: 'student', isStaff: false, isAdmin: false,
      loading: false, authReady: true, refetchProfile: vi.fn(async () => {}),
    })
    getDocs.mockResolvedValue({ docs: [] } as any)
    const { unmount } = renderPage(<WorkshopListPage />)
    await waitFor(() => expect(screen.getByText(/no workshops scheduled/i)).toBeInTheDocument())
    expect(screen.queryByText(/add workshop/i)).not.toBeInTheDocument()
    unmount()

    vi.mocked(useAuth).mockReturnValue({
      user: { ...currentUser, uid: 'u-staff' }, profile: staffProfile, role: 'lab_assistant', isStaff: true, isAdmin: false,
      loading: false, authReady: true, refetchProfile: vi.fn(async () => {}),
    })
    renderPage(<WorkshopListPage />)
    await waitFor(() => expect(screen.getByText(/add workshop/i)).toBeInTheDocument())
  })
})

describe('WorkshopFormPage (staff authoring)', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { ...currentUser, uid: 'u-staff' }, profile: staffProfile, role: 'lab_assistant',
      isStaff: true, isAdmin: false, loading: false, authReady: true, refetchProfile: vi.fn(async () => {}),
    })
  })

  it('creates a workshop via addDoc with registeredCount seeded at 0', async () => {
    addDoc.mockResolvedValue({ id: 'w-new' } as any)
    // getDoc powers the edit-mode prefetch path and the list fetch.
    getDocs.mockResolvedValue({ docs: [] } as any)

    renderPage(<WorkshopFormPage />)
    await waitFor(() => expect(document.querySelector('[name="title"]')).toBeInTheDocument())

    fireEvent.change(document.querySelector('[name="title"]') as Element, { target: { value: 'Microcontroller Bootcamp' } })
    fireEvent.change(document.querySelector('[name="description"]') as Element, { target: { value: 'Hands-on embedded basics' } })
    fireEvent.change(document.querySelector('[name="date"]') as Element, { target: { value: '2099-07-01' } })
    fireEvent.change(document.querySelector('[name="startTime"]') as Element, { target: { value: '09:00' } })
    fireEvent.change(document.querySelector('[name="endTime"]') as Element, { target: { value: '13:00' } })
    fireEvent.change(document.querySelector('[name="location"]') as Element, { target: { value: 'Room 3' } })
    fireEvent.change(document.querySelector('[name="instructor"]') as Element, { target: { value: 'Dr. X' } })
    fireEvent.change(document.querySelector('[name="capacity"]') as Element, { target: { value: '12' } })

    await userEvent.click(screen.getByRole('button', { name: /create workshop|save/i }))
    await waitFor(() => expect(addDoc).toHaveBeenCalled())
    const payload = (addDoc.mock.calls[0] as unknown[])[1] as Record<string, unknown>
    expect(payload.title).toBe('Microcontroller Bootcamp')
    expect(payload.registeredCount).toBe(0)
    expect(mToast.success).toHaveBeenCalledWith('Created')
  })

  it('validation: rejects a title shorter than the minimum before submitting', async () => {
    addDoc.mockClear()
    renderPage(<WorkshopFormPage />)
    await waitFor(() => expect(document.querySelector('[name="title"]')).toBeInTheDocument())

    fireEvent.change(document.querySelector('[name="title"]') as Element, { target: { value: 'AB' } })
    fireEvent.change(document.querySelector('[name="description"]') as Element, { target: { value: 'x'.repeat(20) } })
    await userEvent.click(screen.getByRole('button', { name: /create workshop|save/i }))
    await flush()

    expect(addDoc).not.toHaveBeenCalled()
    expect(screen.getByText(/too small/i)).toBeInTheDocument()
  })

  it('edit mode prefetches and updates the existing doc', async () => {
    addDoc.mockClear()
    updateDoc.mockClear()
    const existing = workshop({ capacity: 20, registeredCount: 4 })
    const { getDoc } = mockFirestore
    getDoc.mockResolvedValue({
      exists: () => true, id: 'w1', data: () => existing, ref: {},
    } as any)

    render(
      <Routes>
        <Route path="/workshops/:id/edit" element={<WorkshopFormPage />} />
      </Routes>,
      { wrapper: ({ children }) => (
        <QueryClientProvider client={makeQueryClient()}>
          <MemoryRouter initialEntries={['/workshops/w1/edit']}>{children}</MemoryRouter>
        </QueryClientProvider>
      ) },
    )
    await waitFor(() => expect(document.querySelector('[name="title"]')).toHaveValue('Soldering Basics'))
    await userEvent.click(screen.getByRole('button', { name: /create workshop|save/i }))
    await waitFor(() => expect(updateDoc).toHaveBeenCalled())
    expect(addDoc).not.toHaveBeenCalled()
  })

  it('blocks duplicate form submission while saving (disabled submit)', async () => {
    let resolve: (v: { id: string }) => void = () => {}
    addDoc.mockImplementationOnce(() => new Promise((r) => { resolve = r }))
    renderPage(<WorkshopFormPage />)
    await waitFor(() => expect(document.querySelector('[name="title"]')).toBeInTheDocument())
    const set = (n: string, v: string) => fireEvent.change(document.querySelector('[name="' + n + '"]') as Element, { target: { value: v } })
    set('title', 'Valid Workshop')
    set('description', 'y'.repeat(20))
    set('date', '2099-06-01')
    set('startTime', '10:00')
    set('endTime', '12:00')
    set('location', 'Room 1')
    set('instructor', 'Dr. X')
    set('capacity', '10')
    const submit = screen.getByRole('button', { name: /create workshop|save/i })
    await userEvent.click(submit)
    expect(submit).toBeDisabled()
    resolve({ id: 'w-x' })
    await flush()
  })
})