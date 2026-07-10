import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import LoadingSpinner from '@/components/common/LoadingSpinner'

// Lazy-load all pages for code splitting (reduces initial bundle)
const LoginPage = React.lazy(() => import('@/features/auth/LoginPage'))
const OnboardingPage = React.lazy(() => import('@/features/auth/OnboardingPage'))
const DashboardPage = React.lazy(() => import('@/features/dashboard/DashboardPage'))
const EquipmentListPage = React.lazy(() => import('@/features/equipment/EquipmentListPage'))
const EquipmentDetailPage = React.lazy(() => import('@/features/equipment/EquipmentDetailPage'))
const EquipmentFormPage = React.lazy(() => import('@/features/equipment/EquipmentFormPage'))
const BookingCalendarPage = React.lazy(() => import('@/features/bookings/BookingCalendarPage'))
const BookingFormPage = React.lazy(() => import('@/features/bookings/BookingFormPage'))
const BookingDetailPage = React.lazy(() => import('@/features/bookings/BookingDetailPage'))
const InventoryListPage = React.lazy(() => import('@/features/inventory/InventoryListPage'))
const InventoryDetailPage = React.lazy(() => import('@/features/inventory/InventoryDetailPage'))
const InventoryFormPage = React.lazy(() => import('@/features/inventory/InventoryFormPage'))
const CheckoutPage = React.lazy(() => import('@/features/inventory/CheckoutPage'))  // admin stock mgmt
const ToolCheckoutPage = React.lazy(() => import('@/features/checkout/ToolCheckoutPage'))
const ToolCheckoutListPage = React.lazy(() => import('@/features/checkout/ToolCheckoutListPage'))
const MaintenanceListPage = React.lazy(() => import('@/features/maintenance/MaintenanceListPage'))
const MaintenanceDetailPage = React.lazy(() => import('@/features/maintenance/MaintenanceDetailPage'))
const MaintenanceFormPage = React.lazy(() => import('@/features/maintenance/MaintenanceFormPage'))
const WorkshopListPage = React.lazy(() => import('@/features/workshops/WorkshopListPage'))
const WorkshopDetailPage = React.lazy(() => import('@/features/workshops/WorkshopDetailPage'))
const WorkshopFormPage = React.lazy(() => import('@/features/workshops/WorkshopFormPage'))
const ProjectListPage = React.lazy(() => import('@/features/projects/ProjectListPage'))
const ProjectDetailPage = React.lazy(() => import('@/features/projects/ProjectDetailPage'))
const ProjectFormPage = React.lazy(() => import('@/features/projects/ProjectFormPage'))
const NotificationsPage = React.lazy(() => import('@/features/notifications/NotificationsPage'))
const ReportsPage = React.lazy(() => import('@/features/reports/ReportsPage'))
const IssueFormPage = React.lazy(() => import('@/features/issues/IssueFormPage'))
// Admin pages
const AdminDashboard = React.lazy(() => import('@/features/admin/AdminDashboard'))
const AdminUsersPage = React.lazy(() => import('@/features/admin/AdminUsersPage'))
const AdminBookingsPage = React.lazy(() => import('@/features/admin/AdminBookingsPage'))
const AdminProjectsPage = React.lazy(() => import('@/features/admin/AdminProjectsPage'))
const AdminInventoryPage = React.lazy(() => import('@/features/admin/AdminInventoryPage'))
const AdminIssuesPage = React.lazy(() => import('@/features/admin/AdminIssuesPage'))
const AdminAnnouncementsPage = React.lazy(() => import('@/features/admin/AdminAnnouncementsPage'))

// ============================================================
// ROUTE GUARDS
// ============================================================
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!profile) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!profile) return <Navigate to="/onboarding" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingSpinner fullScreen />
  if (user) {
    if (!profile) return <Navigate to="/onboarding" replace />
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

// ============================================================
// APP ROUTES
// ============================================================
export default function AppRoutes() {
  return (
    <React.Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />

        {/* Protected — inside AppLayout */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<DashboardPage />} />

          {/* Equipment */}
          <Route path="/equipment" element={<EquipmentListPage />} />
          <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
          <Route path="/equipment/new" element={<EquipmentFormPage />} />
          <Route path="/equipment/:id/edit" element={<EquipmentFormPage />} />

          {/* Bookings */}
          <Route path="/bookings" element={<BookingCalendarPage />} />
          <Route path="/bookings/new" element={<BookingFormPage />} />
          <Route path="/bookings/:id" element={<BookingDetailPage />} />

          {/* Inventory */}
          <Route path="/inventory" element={<InventoryListPage />} />
          <Route path="/inventory/:id" element={<InventoryDetailPage />} />
          <Route path="/inventory/new" element={<InventoryFormPage />} />
          <Route path="/inventory/:id/edit" element={<InventoryFormPage />} />
          <Route path="/checkout" element={<ToolCheckoutPage />} />
          <Route path="/checkout/history" element={<ToolCheckoutListPage />} />
          <Route path="/stock/checkout" element={<CheckoutPage />} />  {/* admin stock mgmt */}

          {/* Maintenance */}
          <Route path="/maintenance" element={<MaintenanceListPage />} />
          <Route path="/maintenance/:id" element={<MaintenanceDetailPage />} />
          <Route path="/maintenance/new" element={<MaintenanceFormPage />} />
          <Route path="/maintenance/:id/edit" element={<MaintenanceFormPage />} />

          {/* Workshops */}
          <Route path="/workshops" element={<WorkshopListPage />} />
          <Route path="/workshops/:id" element={<WorkshopDetailPage />} />
          <Route path="/workshops/new" element={<WorkshopFormPage />} />
          <Route path="/workshops/:id/edit" element={<WorkshopFormPage />} />

          {/* Projects */}
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/projects/new" element={<ProjectFormPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/projects/:id/edit" element={<ProjectFormPage />} />

          {/* Other */}
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/report-issue" element={<IssueFormPage />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
          <Route path="/admin/bookings" element={<AdminRoute><AdminBookingsPage /></AdminRoute>} />
          <Route path="/admin/projects" element={<AdminRoute><AdminProjectsPage /></AdminRoute>} />
          <Route path="/admin/inventory" element={<AdminRoute><AdminInventoryPage /></AdminRoute>} />
          <Route path="/admin/issues" element={<AdminRoute><AdminIssuesPage /></AdminRoute>} />
          <Route path="/admin/announcements" element={<AdminRoute><AdminAnnouncementsPage /></AdminRoute>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  )
}
