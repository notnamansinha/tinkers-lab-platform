import { Timestamp } from 'firebase/firestore'

// ============================================================
// USER & AUTH TYPES
// ============================================================
export type UserRole =
  | 'super_admin'
  | 'manager'
  | 'faculty'
  | 'lab_assistant'
  | 'student'
  | 'guest'

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  faculty: 'Faculty',
  lab_assistant: 'Lab Assistant',
  student: 'Student',
  guest: 'Guest',
}

export const ADMIN_ROLES: UserRole[] = ['super_admin', 'manager']
export const STAFF_ROLES: UserRole[] = ['super_admin', 'manager', 'faculty', 'lab_assistant']

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: UserRole
  department: string
  batch?: string        // e.g. "2024-25"
  studentId?: string    // e.g. "AU2440123"
  contact?: string
  userType: 'Student' | 'Faculty' | 'Lab Staff' | 'Venture Studio' | 'External Visitor'
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// EQUIPMENT TYPES
// ============================================================
export type EquipmentStatus =
  | 'available'
  | 'reserved'
  | 'in_use'
  | 'under_maintenance'
  | 'out_of_service'
  | 'retired'

export type EquipmentCategory =
  | 'Digital Fabrication'
  | 'Heavy Duty'
  | 'Tabletop Power'
  | 'Electronics'
  | 'Other'

export interface Equipment {
  id: string
  machineId: string          // e.g. "bambu-x1c"
  name: string
  category: EquipmentCategory
  description: string
  manufacturer?: string
  modelNumber?: string
  serialNumber?: string
  purchaseDate?: string
  warrantyInfo?: string
  installationDate?: string
  status: EquipmentStatus
  healthStatus: 'good' | 'fair' | 'poor'
  location: string
  requiresTraining: boolean
  // Storage deferred — see pending_items.md
  imageUrls: string[]
  manualUrls: string[]
  safetyDocUrls: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// BOOKING TYPES
// ============================================================
export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed'

export interface Booking {
  id: string
  equipmentId: string         // Firestore document ID
  machineId: string           // e.g. "laser-cutter"
  machineName: string
  userId: string
  userEmail: string
  userName: string
  projectId?: string
  projectTitle?: string
  date: string                // "YYYY-MM-DD"
  startTime: string           // "HH:MM"
  endTime: string             // "HH:MM"
  purpose: string
  status: BookingStatus
  rejectionReason?: string
  approvedBy?: string
  approvedAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// INVENTORY TYPES
// ============================================================
export type InventoryCategory =
  | 'Raw Materials'
  | 'Components'
  | 'Consumables'
  | 'Electronics'
  | 'Mechanical Parts'
  | 'Hand Tools'
  | 'Handheld Power Tools'
  | 'Measurement Tools'
  | 'Safety Equipment'
  | 'Chemicals'
  | 'Other'

export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export interface InventoryItem {
  id: string
  name: string
  category: InventoryCategory
  description?: string
  quantity: number
  minQuantity: number           // Alert threshold
  unit: string                  // "pcs", "kg", "m", "L"
  location: string
  barcode?: string
  supplierName?: string
  supplierContact?: string
  unitCost?: number
  status: InventoryStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type TransactionType = 'issue' | 'return' | 'restock' | 'adjustment' | 'damage'

export interface InventoryTransaction {
  id: string
  itemId: string
  itemName: string
  type: TransactionType
  quantity: number              // positive = add, negative = remove
  quantityBefore: number
  quantityAfter: number
  userId: string
  userName: string
  userEmail: string
  notes?: string
  dueDate?: string              // For tool checkouts
  returnedAt?: Timestamp
  createdAt: Timestamp
}

// ============================================================
// MAINTENANCE TYPES
// ============================================================
export type MaintenanceType =
  | 'preventive'
  | 'corrective'
  | 'calibration'
  | 'repair'
  | 'inspection'

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface MaintenanceRecord {
  id: string
  equipmentId: string
  machineId: string
  machineName: string
  type: MaintenanceType
  status: MaintenanceStatus
  title: string
  description: string
  scheduledDate: string         // "YYYY-MM-DD"
  completedDate?: string
  technician: string
  technicianContact?: string
  parts?: string
  laborCost?: number
  partsCost?: number
  downtimeHours?: number
  notes?: string
  reportUrls: string[]          // Deferred — see pending_items.md
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// WORKSHOP TYPES
// ============================================================
export type WorkshopType =
  | 'training'
  | 'workshop'
  | 'certification'
  | 'safety_training'

export interface Workshop {
  id: string
  title: string
  type: WorkshopType
  description: string
  instructor: string
  instructorEmail?: string
  date: string                  // "YYYY-MM-DD"
  startTime: string
  endTime: string
  capacity: number
  registeredCount: number
  prerequisites?: string
  materials?: string
  location: string
  isActive: boolean
  certificateIssued: boolean
  materialUrls: string[]        // Deferred — see pending_items.md
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface WorkshopRegistration {
  id: string
  workshopId: string
  workshopTitle: string
  userId: string
  userName: string
  userEmail: string
  status: 'registered' | 'attended' | 'cancelled' | 'no_show'
  feedback?: string
  rating?: number               // 1-5
  certificateIssued: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// PROJECT TYPES
// ============================================================
export type ProjectStatus = 'pending' | 'active' | 'completed' | 'on_hold' | 'rejected'

export interface Project {
  id: string                    // e.g. "TL-001"
  title: string
  abstract: string
  userId: string
  userName: string
  userEmail: string
  contact: string
  userType: string
  department: string
  studentId?: string
  teamMembers?: string
  facultyMentor?: string
  startDate: string
  endDate?: string
  resourceLink?: string
  status: ProjectStatus
  rejectionReason?: string
  // File uploads deferred — see pending_items.md
  imageUrls: string[]
  documentUrls: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// NOTIFICATION TYPES
// ============================================================
export type NotificationType =
  | 'booking_pending'
  | 'booking_approved'
  | 'booking_rejected'
  | 'booking_reminder'
  | 'workshop_reminder'
  | 'inventory_low'
  | 'maintenance_scheduled'
  | 'announcement'
  | 'issue_reported'
  | 'issue_resolved'
  | 'project_approved'
  | 'project_rejected'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: Timestamp
}

// ============================================================
// ISSUE / REPORT TYPES
// ============================================================
export type IssueType =
  | 'machine_malfunction'
  | 'safety_concern'
  | 'missing_damaged'
  | 'suggestion'
  | 'other'

export type IssueSeverity = 'low' | 'medium' | 'high' | 'urgent'
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface Issue {
  id: string
  userId: string
  userName: string
  userEmail: string
  type: IssueType
  severity: IssueSeverity
  status: IssueStatus
  relatedMachine?: string
  description: string
  resolution?: string
  resolvedBy?: string
  resolvedAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// ANNOUNCEMENT TYPES
// ============================================================
export interface Announcement {
  id: string
  title: string
  body: string
  priority: 'normal' | 'high' | 'urgent'
  isActive: boolean
  createdBy?: string        // legacy field
  authorId: string
  authorName: string
  expiresAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// AUDIT LOG TYPES
// ============================================================
export interface AuditLog {
  id: string
  userId: string
  userEmail: string
  action: string
  resource: string
  resourceId: string
  details?: string
  createdAt: Timestamp
}

// ============================================================
// UTILITY TYPES
// ============================================================
export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export type SortOrder = 'asc' | 'desc'

export interface SortState {
  field: string
  order: SortOrder
}
