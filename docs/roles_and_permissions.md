# Roles and Permissions Matrix

The Tinkerers' Lab platform utilizes a strict Role-Based Access Control (RBAC) system. All security enforcement happens both on the frontend UI (hiding/showing buttons and pages) and securely on the backend via Firebase Security Rules (`firestore.rules`).

> [!NOTE]
> All users default to the `student` role upon registration. Elevated roles can only be granted by an existing `super_admin` through the Admin Panel.

## System Roles

1. **Super Admin (`super_admin`)**
   - The highest level of access.
   - The only role capable of accessing application settings and modifying other users' roles.

2. **Faculty (`faculty`)**
   - Elevated staff role intended for professors and instructors.
   - Designed to oversee operations (workshops, bookings) and view analytics, but prevented from altering core application settings or users.

3. **Lab Assistant (`lab_assistant`)**
   - Elevated staff role intended for student workers and technicians.
   - Responsible for day-to-day operations: managing inventory, updating equipment status, executing maintenance, and handling bookings.

4. **Student (`student`)**
   - The default standard role.
   - Limited strictly to viewing resources, requesting bookings, checking out equipment, and managing their own data.

---

## Permission Matrix

| Feature Module | Permission | `super_admin` | `faculty` | `lab_assistant` | `student` |
| --- | --- | :---: | :---: | :---: | :---: |
| **Profile** | Login / Logout | ✓ | ✓ | ✓ | ✓ |
| | View/Edit Own Profile | ✓ | ✓ | ✓ | ✓ |
| **Users** | View All Users | ✓ | ✗ | ✗ | ✗ |
| | Create/Edit/Delete Users | ✓ | ✗ | ✗ | ✗ |
| | Assign Roles | ✓ | ✗ | ✗ | ✗ |
| **Equipment** | View Equipment | ✓ | ✓ | ✓ | ✓ |
| | Create/Edit Equipment | ✓ | ✗ | ✓ | ✗ |
| | Update Status | ✓ | ✗ | ✓ | ✗ |
| | Delete Equipment | ✓ | ✗ | ✗ | ✗ |
| **Bookings** | Create Booking | ✓ | ✓ | ✓ | ✓ |
| | View Own Bookings | ✓ | ✓ | ✓ | ✓ |
| | Cancel Own Booking | ✓ | ✓ | ✓ | ✓ |
| | View All Bookings | ✓ | ✓ | ✓ | ✗ |
| | Approve/Reject Bookings | ✓ | ✓ | ✓ | ✗ |
| | Cancel Any Booking | ✓ | ✗ | ✓ | ✗ |
| | Check In/Out Equipment | ✓ | ✗ | ✓ | ✗ |
| **Inventory** | View Inventory | ✓ | ✓ | ✓ | ✓ |
| | Add/Edit Inventory | ✓ | ✗ | ✓ | ✗ |
| | Update Stock | ✓ | ✗ | ✓ | ✗ |
| | Delete Inventory | ✓ | ✗ | ✗ | ✗ |
| **Maintenance** | View Records | ✓ | ✓ | ✓ | ✓ |
| | Create/Edit Records | ✓ | ✗ | ✓ | ✗ |
| | Close Tasks / Take Offline | ✓ | ✗ | ✓ | ✗ |
| **Workshops** | View Workshops | ✓ | ✓ | ✓ | ✓ |
| | Register for Workshop | ✓ | ✓ | ✓ | ✓ |
| | Create/Edit Workshop | ✓ | ✓ | ✓ | ✗ |
| | Manage Attendance | ✓ | ✓ | ✓ | ✗ |
| | Delete Workshop | ✓ | ✓ | ✗ | ✗ |
| **Documents** | View Documentation | ✓ | ✓ | ✓ | ✓ |
| | Upload Documentation | ✓ | ✓ | ✓ | ✗ |
| | Delete Documentation | ✓ | ✗ | ✗ | ✗ |
| **Reports** | View Dashboard | ✓ | ✓ | ✓ | ✓ |
| | View Analytics | ✓ | △ (Own) | △ (Ops) | ✗ |
| | Export Reports | ✓ | △ | △ | ✗ |
| **Admin** | Application Settings | ✓ | ✗ | ✗ | ✗ |
| | View Audit Logs | ✓ | ✗ | ✗ | ✗ |

> [!IMPORTANT]  
> This document only outlines intended behavior and structural design. No API keys, service accounts, backend endpoints, or configuration secrets are stored here, making it safe to share or commit to source control.
