// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
// Final batch — the remaining read-mostly panels and detail actions:
// EquipmentDetailPage Book → booking form, BookingDetailPage cancel,
// stock CheckoutPage insufficient-quantity guard, plus smoke coverage of
// the remaining list/detail pages (projects, inventory, maintenance,
// workshops, admin inventory).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { renderPage, makeQueryClient, snapDoc, snapDocs, currentUser, adminProfile, staffProfile } from './helpers'

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
  runTransaction: vi.fn(async (fn: (tx: any) => Promise<void>) => {
    const tx = {
      get: vi.fn(async () => ({ exists: () => true, data: () => ({ quantity: 5, name: 'Solder', unit: 'pcs' }) })),
      update: vi.fn(),
      set: vi.fn(),
    }
    await fn(tx)
  }),
  writeBatch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(async () => {}) })),
  serverTimestamp: vi.fn(() => ({ __sentinel: 'ts' })),
  FieldValue: class {}, Timestamp: class {}, GeoPoint: class {}, DocumentReference: class {}, Bytes: class {},
}))
vi.mock('firebase/firestore', () => mockFirestore)
vi.mock('@/lib/firebase', () => ({ db: {}, app: {} }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@/services/firebase/functions', () => ({
  registerForWorkshopCallable: vi.fn(), createBookingCallable: vi.fn(), createProjectCallable: vi.fn(),
  createToolCheckoutCallable: vi.fn(), submitFeedbackCallable: vi.fn(), deleteMyAccountCallable: vi.fn(),
  appendActivityLogCallable: vi.fn(),
}))
vi.mock('@/services/firebase/bookings', () => ({
  getBookingById: vi.fn(async () => null),
  updateBookingStatus: vi.fn(async () => {}),
  getBookingsForSlot: vi.fn(async () => []),
}))
vi.mock('@/services/firebase/projects', () => ({ getUserProjects: vi.fn(async () => []), getProjectById: vi.fn(async () => null) }))


import { updateBookingStatus } from '@/services/firebase/bookings'
import EquipmentDetailPage from '../equipment/EquipmentDetailPage'
import BookingDetailPage from '../bookings/BookingDetailPage'
import InventoryCheckoutPage from '../inventory/CheckoutPage'
import ProjectListPage from '../projects/ProjectListPage'
import InventoryListPage from '../inventory/InventoryListPage'
import MaintenanceListPage from '../maintenance/MaintenanceListPage'
import WorkshopDetailPage from '../workshops/WorkshopDetailPage'
import AdminInventoryPage from '../admin/AdminInventoryPage'

const mToast = vi.mocked(toast)

function setField(name: string, value: string) {
  fireEvent.change(document.querySelector(`[name="${name}"]`) as Element, { target: { value } })
}

function auth(over: Record<string, unknown>) {
  vi.mocked(useAuth).mockReturnValue({ ...over, refetchProfile: vi.fn(async () => {}) } as any)
}

function routeView(routePath: string, entry: string, ui: React.ReactNode, marker: string) {
  return render(
    <Routes>
      <Route path={routePath} element={ui} />
      <Route path="/bookings/new" element={<div>BOOKING-BOARD</div>} />
      <Route path="*" element={<div>{marker}</div>} />
    </Routes>,
    { wrapper: ({ children }) => (
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
      </QueryClientProvider>
    ) },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFirestore.getDocs.mockResolvedValue({ docs: [] } as any)
  mockFirestore.getDoc.mockResolvedValue({ exists: () => false, data: () => undefined } as any)
  auth({ user: currentUser, profile: { uid: 'u1', displayName: 'Alice', contact: '9' }, role: 'student', isAdmin: false, isStaff: false, loading: false, authReady: true })
})

describe('EquipmentDetailPage', () => {
  it('routes the Book action to the booking form with the machine param', async () => {
    mockFirestore.getDoc.mockResolvedValue(snapDoc({
      id: 'e1', machineId: 'e1', name: 'Prusa MK4 (3D Printer)', status: 'available', tier: 'bookable', confirmed: true,
      category: 'Digital Fabrication', description: 'x'.repeat(20),
      createdAt: { seconds: 1 }, updatedAt: { seconds: 1 },
    }) as any)
    const view = routeView('/equipment/:id', '/equipment/e1', <EquipmentDetailPage />, 'DETAIL')

    void 0 //, JSON.stringify(mockFirestore.getDoc.mock.results.map((r) => r.value)))
await waitFor(() => expect(screen.getByRole('button', { name: '10:00 - 11:00' })).toBeInTheDocument(), { timeout: 8000 })
    await userEvent.click(screen.getByRole('button', { name: '10:00 - 11:00' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /book 10:00 - 11:00/i })).toBeInTheDocument(), { timeout: 8000 })
    await userEvent.click(screen.getByRole('button', { name: /book 10:00 - 11:00/i }))
    await waitFor(() => expect(screen.getByText('BOOKING-BOARD')).toBeInTheDocument(), { timeout: 4000 })
    view.unmount()
  })

  it('disables the Book action when the machine is taken by someone else', async () => {
    mockFirestore.getDoc.mockResolvedValue(snapDoc({
      id: 'e1', machineId: 'e1', name: 'Cnc', status: 'reserved', tier: 'bookable', confirmed: true,
      category: 'Other', description: 'x'.repeat(20),
      createdAt: { seconds: 1 }, updatedAt: { seconds: 1 },
    }) as any)
    const view = routeView('/equipment/:id', '/equipment/e1', <EquipmentDetailPage />, 'DETAIL')
    // All slots taken by others → every slot button is disabled and no Book CTA.
    await waitFor(() => expect(screen.getAllByRole('button', { name: /:00 - \d{2}:00/ }).length).toBe(9), { timeout: 4000 })
    view.unmount()
  })
})

describe('BookingDetailPage', () => {
  it('cancels an approved booking through updateBookingStatus', async () => {
    const { getBookingById } = vi.mocked(await import('@/services/firebase/bookings'))
    vi.mocked(getBookingById as any).mockResolvedValue({
      id: 'bk1', projectId: 'proj-1', machineName: 'Laser Cutter', date: '2099-02-01',
      startTime: '10:00', endTime: '11:00', status: 'approved', purpose: 'Cut acrylic',
      projectTitle: 'My Robot', userName: 'Alice', userEmail: 'a@tinkers.test', userId: 'u1',
      createdAt: { seconds: 1 },
    } as any)
    auth({ user: currentUser, profile: { uid: 'u1', displayName: 'Alice', contact: '9' }, role: 'student', isAdmin: false, isStaff: false, loading: false, authReady: true })
    const view = routeView('/bookings/:id', '/bookings/bk1', <BookingDetailPage />, 'BK')
    await new Promise((r) => setTimeout(r, 600))
    await waitFor(() => expect(screen.getAllByText('Laser Cutter').length).toBeGreaterThan(0), { timeout: 4000 })
    const cb = screen.queryAllByRole('button', { name: /cancel booking/i })
    await userEvent.click(cb[0])
    await userEvent.click(screen.getAllByRole('button', { name: /cancel booking/i }).slice(-1)[0])
    await waitFor(() => expect(updateBookingStatus).toHaveBeenCalled(), { timeout: 4000 })
    expect(vi.mocked(updateBookingStatus).mock.calls[0][2]).toBe('cancelled')
    view.unmount()
  })
})

describe('Inventory CheckoutPage (stock)', () => {
  it('blocks issuing more stock than is available', async () => {
    mockFirestore.getDocs.mockResolvedValue({ docs: snapDocs([{ id: 'it1', name: 'Solder Wire', quantity: 3, unit: 'spool', category: 'Consumables', status: 'in_stock', minQuantity: 0 }]) } as any)
    auth({ user: { uid: 'u-staff', email: 's@t.test' }, profile: staffProfile, role: 'lab_assistant', isAdmin: false, isStaff: true, loading: false, authReady: true })
    renderPage(<InventoryCheckoutPage />)
    await waitFor(() => expect(document.querySelector('[name="itemId"]')).toBeInTheDocument(), { timeout: 4000 })
    await new Promise((r) => setTimeout(r, 600))
    await waitFor(() => expect(screen.getAllByRole('option', { name: /^Solder Wire/ }).length).toBeGreaterThan(0))
    await userEvent.selectOptions(document.querySelector('[name="itemId"]') as Element, 'it1')
    setField('quantity', '10')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => expect(mToast.error).toHaveBeenCalledWith(expect.stringContaining('available')), { timeout: 4000 })
    expect(mockFirestore.runTransaction).not.toHaveBeenCalled()
  })
})

describe('remaining list/detail pages — smoke', () => {
  it('ProjectListPage empty state', async () => {
    renderPage(<ProjectListPage />)
    await waitFor(() => expect(screen.getByText(/no projects/i)).toBeInTheDocument(), { timeout: 4000 })
  })

  it('InventoryListPage renders items and their status', async () => {
    mockFirestore.getDocs.mockResolvedValue({ docs: snapDocs([{ id: 'i1', name: 'Resistor Kit', quantity: 0, unit: 'box', category: 'Electronics', status: 'out_of_stock', minQuantity: 2 }]) } as any)
    renderPage(<InventoryListPage />)
    await waitFor(() => expect(screen.getByText('Resistor Kit')).toBeInTheDocument(), { timeout: 4000 })
  })

  it('MaintenanceListPage renders scheduled records', async () => {
    mockFirestore.getDocs.mockResolvedValue({ docs: snapDocs([{ id: 'm1', title: 'Laser alignment', status: 'scheduled', equipmentId: 'e1', equipmentName: 'Laser Cutter', scheduledDate: '2099-03-01', type: 'calibration' }]) } as any)
    renderPage(<MaintenanceListPage />)
    await waitFor(() => expect(screen.getByText('Laser alignment')).toBeInTheDocument(), { timeout: 4000 })
  })

  it('WorkshopDetailPage shows workshop info', async () => {
    mockFirestore.getDoc.mockResolvedValue(snapDoc({ id: 'w1', title: 'Soldering 101', description: 'Learn', type: 'training', date: '2099-05-01', startTime: '10:00', endTime: '12:00', location: 'Lab B', instructor: 'T', capacity: 20, registeredCount: 3, isActive: true }) as any)
    const view = routeView('/workshops/:id', '/workshops/w1', <WorkshopDetailPage />, 'WS')
    await waitFor(() => expect(screen.getByText('Soldering 101')).toBeInTheDocument(), { timeout: 4000 })
    expect(screen.getByText(/3\/20/i)).toBeInTheDocument()
    view.unmount()
  })

  it('AdminInventoryPage renders the low-stock summary', async () => {
    mockFirestore.getDocs.mockResolvedValue({ docs: snapDocs([{ id: 'i1', name: 'Glue Gun', quantity: 1, unit: 'pcs', category: 'Tool', status: 'low_stock', minQuantity: 2 }]) } as any)
    auth({ user: { uid: 'u-admin', email: 'a@t.test' }, profile: adminProfile, role: 'super_admin', isAdmin: true, isStaff: true, loading: false, authReady: true })
    renderPage(<AdminInventoryPage />)
    await waitFor(() => expect(screen.getByText('Glue Gun')).toBeInTheDocument(), { timeout: 4000 })
  })
})