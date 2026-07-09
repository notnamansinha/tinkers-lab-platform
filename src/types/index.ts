import { Timestamp } from 'firebase/firestore'

// ============================================================
// USER & AUTH TYPES
// ============================================================
export type UserRole =
  | 'super_admin'
  | 'faculty'
  | 'lab_assistant'
  | 'student'

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  faculty: 'Faculty',
  lab_assistant: 'Lab Assistant',
  student: 'Student',
}

export const ADMIN_ROLES: UserRole[] = ['super_admin']
export const STAFF_ROLES: UserRole[] = ['super_admin', 'faculty', 'lab_assistant']

/**
 * userType = identity (who the person is — from Spec 1 Form 1 Section 1)
 * role     = permissions (what they can do in the platform)
 * These are two separate dimensions. A Professor has userType='Professor or Faculty'
 * and role='faculty'. A startup founder has userType='Venture Studio Startup' and role='student'.
 */
export type UserType =
  | 'Student'
  | 'Professor or Faculty'
  | 'Venture Studio Startup'
  | 'External Visitor'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: UserRole
  userType: UserType
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp

  // ── Common fields ───────────────────────────────────────────
  contact?: string
  department?: string

  // ── Student-specific (Spec 1 Form 1 Section 2) ──────────────
  universityId?: string        // "University ID"
  courseName?: string          // "Course or Curriculum Name"
  facultyAdvisor?: string      // "Faculty Advisor"
  teamName?: string            // "Team Name"
  teamMembers?: string         // "Team Members — Names and IDs"

  // ── Professor or Faculty-specific (Spec 1 Form 1 Section 3) ─
  researchArea?: string        // "Research Area or Subject"
  associatedCourse?: string    // "Associated Course"
  studentsInvolved?: string    // "Students Involved"

  // ── Venture Studio Startup-specific (Spec 1 Form 1 Section 4)
  startupName?: string         // "Startup Name"
  industryDomain?: string      // "Industry / Domain"
  startupBrief?: string        // "Brief About Your Startup"
  labTeamMembers?: string      // "Team Members Using the Lab"

  // ── External Visitor-specific (Spec 1 Form 1 Section 5) ─────
  organization?: string        // "Organization / Institution"
  designation?: string         // "Designation / Role"
  purposeOfVisit?: string      // "Purpose of Visit"
  referral?: string            // "Referral"

  // ── Acknowledgements (Spec 1 Form 1 Section 7) ──────────────
  safetyAgreementAccepted?: boolean
  termsAccepted?: boolean
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

/**
 * Tier system from Spec 1:
 *   bookable         — Tier 1: calendar-based time-slot booking (single-unit machines)
 *   checkout         — Tier 2: borrow/return log (multi-unit hand/power tools)
 *   freely_available — Tier 3: no booking needed, inventory tracking only
 *
 * confirmed: true = physically present in the lab (Spec 2's 4 machines).
 *            false = from original quotation, not yet physically present.
 *   Only confirmed=true machines appear in the booking dropdown (Form 2A).
 */
export type EquipmentTier = 'bookable' | 'checkout' | 'freely_available'

export interface Equipment {
  id: string
  machineId: string          // e.g. "bambu-x1c" — slug used in conflict checks
  name: string
  tier: EquipmentTier        // Which tier this equipment belongs to
  confirmed: boolean         // Physically present in the lab?
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
  imageUrls: string[]
  manualUrls: string[]
  safetyDocUrls: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// BOOKING TYPES  (Form 2A — Tier 1 bookable machines only)
// ============================================================
export type BookingStatus =
  | 'approved'     // Default on creation — auto-confirm per Spec 2
  | 'rejected'     // Conflict detected or admin rejection
  | 'cancelled'
  | 'completed'

/**
 * Consumables tracked per booking (Spec 2):
 *  - 3D Printers: filament type, color, quantity in grams
 *  - Laser Cutter: material type and size
 * "by logging filament/material used per booking, monthly usage data
 *  feeds directly into procurement decisions"
 */
export interface BookingConsumables {
  // 3D Printer consumables
  filamentType?: string          // PLA, ABS, PETG, TPU, Other
  filamentColor?: string
  filamentQuantityGrams?: number
  // Laser Cutter consumables
  materialType?: string          // Acrylic, MDF, Plywood, Other
  materialSize?: string          // Dimensions or description
}

export interface Booking {
  id: string
  equipmentId: string         // Firestore document ID
  machineId: string           // e.g. "laser-cutter" — for conflict checking
  machineName: string
  userId: string
  userEmail: string
  userName: string
  projectId: string           // Required — Spec 2: "every booking must reference a registered project"
  projectTitle: string
  date: string                // "YYYY-MM-DD"
  startTime: string           // "HH:MM"
  endTime: string             // "HH:MM"
  purpose: string
  consumables?: BookingConsumables
  safetyAgreementAccepted: boolean
  status: BookingStatus       // Default: 'approved' (auto-confirm with conflict-check rejection)
  rejectionReason?: string
  cancelledBy?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// TOOL CHECKOUT TYPES  (Form 2B — Tier 2 checkout items only)
// ============================================================

/**
 * Tool checkout is completely separate from machine bookings (Spec 2 core decision):
 * "Power Tools / Hand Tools → Checkout / Return log. Multiple units per item,
 *  short usage bursts. Calendar-booking would flood the calendar daily."
 *
 * Key fields per Spec 2:
 *  - locationOfUse: "In Lab / Taking Outside Lab" with optional "where"
 *  - isOverdue: computed flag for querying — set true when expectedReturnDate < today AND returnedAt is null
 *  - projectId: required — "every checkout must reference a registered project"
 */
export type ToolCategory = 'Power Tools' | 'Hand Tools' | 'Measurement Tools' | 'Safety Equipment' | 'Other'
export type ToolCondition = 'good' | 'fair' | 'damaged'

export interface ToolCheckout {
  id: string
  userId: string
  userEmail: string
  userName: string
  universityId?: string         // For students — from user profile
  projectId: string             // Required
  projectTitle: string
  action: 'checking_out' | 'returning'
  toolCategory: ToolCategory
  toolName: string              // Free text — matched against inventory on viewer side
  quantity: number
  locationOfUse: 'in_lab' | 'taking_outside'
  outsideLocation?: string      // Conditional — required if taking_outside
  expectedReturnDate: string    // "YYYY-MM-DD"
  expectedReturnTime?: string   // "HH:MM"
  conditionAtCheckout: ToolCondition
  conditionAtReturn?: ToolCondition
  returnedAt?: Timestamp
  isOverdue: boolean            // Computed: expectedReturnDate < today AND returnedAt is null
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// INVENTORY TYPES  (admin stock management — separate from checkout)
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

/**
 * Inventory transactions are for admin-initiated stock changes only (restock, adjustment, damage).
 * Per Spec 2: "v1 logs consumables and checkouts WITHOUT automatically adjusting stock counts."
 * Tool checkouts use the separate ToolCheckout collection, not this one.
 */
export type TransactionType = 'restock' | 'adjustment' | 'damage' | 'write_off'

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
  reportUrls: string[]
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
  materialUrls: string[]
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
  rating?: number               // 1–5
  certificateIssued: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// PROJECT TYPES  (Form 1 — Project Registration)
// ============================================================
export type ProjectStatus = 'pending' | 'active' | 'completed' | 'on_hold' | 'rejected'

/**
 * Expected equipment needs from Spec 1 Form 1 Section 6 checkbox list.
 */
export type ExpectedEquipmentNeed =
  | '3D Printer'
  | 'Laser Cutter'
  | 'Muffle Furnace'
  | 'Lathe Machine'
  | 'Sheet Bender'
  | 'Pillar Drill'
  | 'Table Saw'
  | 'Mitre Saw'
  | 'Cut-off Saw'
  | 'ESD Workstation'
  | 'Oscilloscope'
  | 'Function Generator'
  | 'Soldering Station'
  | 'Hand Tools'
  | 'Power Tools'
  | 'Other'

export interface Project {
  id: string                    // Sequential: "TL-001", "TL-002", etc.
  title: string
  abstract: string
  userId: string
  userName: string
  userEmail: string
  userType: UserType
  contact: string
  department?: string
  universityId?: string         // Students only
  teamMembers?: string
  facultyMentor?: string
  startDate: string
  endDate?: string
  expectedEquipmentNeeds: ExpectedEquipmentNeed[]
  equipmentNeedsOther?: string  // "If Other, please specify"
  resourceLink?: string
  safetyAgreementAccepted: boolean
  termsAccepted: boolean
  status: ProjectStatus
  rejectionReason?: string
  imageUrls: string[]
  documentUrls: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// NOTIFICATION TYPES
// ============================================================
export type NotificationType =
  | 'booking_approved'
  | 'booking_rejected'
  | 'booking_reminder'          // 24-hour reminder (future — Phase 9)
  | 'booking_conflict'          // Conflict rejection
  | 'checkout_confirmed'
  | 'checkout_overdue'          // Overdue alert (future — Phase 9)
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
// ISSUE / REPORT TYPES  (Form 4 — Report an Issue / Suggestion)
// ============================================================
export type IssueType =
  | 'machine_malfunction'   // "Machine Malfunction"
  | 'safety_concern'        // "Safety Concern"
  | 'missing_damaged'       // "Missing or Damaged Item"
  | 'suggestion'            // "Suggestion"
  | 'other'                 // "Other"

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
  dateNoticed?: string          // "When did you notice this?"
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

