import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Wrench,
  Calendar,
  Package,
  Settings,
  Users,
  BookOpen,
  ClipboardList,
  AlertTriangle,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  X,
  Beaker,
  FolderKanban,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
  adminOnly?: boolean
  staffOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Equipment', path: '/equipment', icon: Wrench },
  { label: 'Bookings', path: '/bookings', icon: Calendar },
  { label: 'Inventory', path: '/inventory', icon: Package },
  { label: 'Tool Checkout', path: '/checkout', icon: BookOpen },
  { label: 'Maintenance', path: '/maintenance', icon: Settings, staffOnly: true },
  { label: 'Workshops', path: '/workshops', icon: Beaker },
  { label: 'Projects', path: '/projects', icon: FolderKanban },
  { label: 'Reports', path: '/reports', icon: BarChart3, staffOnly: true },
  { label: 'Report Issue', path: '/report-issue', icon: AlertTriangle },
]

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Admin Dashboard', path: '/admin', icon: ShieldCheck },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Bookings', path: '/admin/bookings', icon: Calendar },
  { label: 'Projects', path: '/admin/projects', icon: ClipboardList },
  { label: 'Inventory', path: '/admin/inventory', icon: Package },
  { label: 'Issues', path: '/admin/issues', icon: AlertTriangle },
  { label: 'Announcements', path: '/admin/announcements', icon: BookOpen },
]

interface SidebarProps {
  isOpen: boolean
  isMobileOpen: boolean
  onMobileClose: () => void
}

export default function Sidebar({ isOpen, isMobileOpen, onMobileClose }: SidebarProps) {
  const { isAdmin, isStaff } = useAuth()
  const location = useLocation()

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false
    if (item.staffOnly && !isStaff) return false
    return true
  })

  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col h-full bg-tl-ink text-white transition-all duration-300 shrink-0 overflow-hidden',
          isOpen ? 'w-60' : 'w-16'
        )}
      >
        <SidebarContent
          isOpen={isOpen}
          visibleItems={visibleItems}
          isAdmin={isAdmin}
          isAdminRoute={isAdminRoute}
        />
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-tl-ink text-white lg:hidden transition-transform duration-300',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <BrandMark expanded />
          <button
            onClick={onMobileClose}
            className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <SidebarContent
          isOpen={true}
          visibleItems={visibleItems}
          isAdmin={isAdmin}
          isAdminRoute={isAdminRoute}
        />
      </aside>
    </>
  )
}

function SidebarContent({
  isOpen,
  visibleItems,
  isAdmin,
  isAdminRoute,
}: {
  isOpen: boolean
  visibleItems: NavItem[]
  isAdmin: boolean
  isAdminRoute: boolean
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Brand */}
      <div className="hidden lg:flex items-center gap-3 px-4 py-5 border-b border-white/10 shrink-0">
        <BrandMark expanded={isOpen} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {/* Main nav */}
        <div className="space-y-0.5 px-2">
          {visibleItems.map((item) => (
            <SidebarLink key={item.path} item={item} expanded={isOpen} />
          ))}
        </div>

        {/* Admin section */}
        {isAdmin && (
          <div className="mt-6">
            <div
              className={cn(
                'px-4 mb-2 text-xs font-semibold uppercase tracking-widest text-white/40 font-mono',
                !isOpen && 'text-center text-[9px]'
              )}
            >
              {isOpen ? 'Admin' : 'ADM'}
            </div>
            <div className="space-y-0.5 px-2">
              {ADMIN_ITEMS.map((item) => (
                <SidebarLink key={item.path} item={item} expanded={isOpen} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      {isOpen && (
        <div className="shrink-0 px-4 py-3 border-t border-white/10">
          <p className="text-xs text-white/30 font-mono">Tinkerers&apos; Lab</p>
          <p className="text-[10px] text-white/20 font-mono">Ahmedabad University</p>
        </div>
      )}
    </div>
  )
}

function SidebarLink({ item, expanded }: { item: NavItem; expanded: boolean }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 group',
          isActive
            ? 'bg-tl-orange text-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        )
      }
      title={!expanded ? item.label : undefined}
    >
      <Icon size={18} className="shrink-0" />
      {expanded && <span className="truncate">{item.label}</span>}
      {expanded && (
        <ChevronRight
          size={14}
          className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity"
        />
      )}
    </NavLink>
  )
}

function BrandMark({ expanded }: { expanded: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-tl-orange flex items-center justify-center shrink-0">
        <span className="text-tl-ink font-display font-extrabold text-sm leading-none">TL</span>
      </div>
      {expanded && (
        <div className="overflow-hidden">
          <p className="font-display font-bold text-sm leading-tight text-white">
            Tinkerers&apos; Lab
          </p>
          <p className="text-[10px] text-white/50 leading-tight">Ahmedabad University</p>
        </div>
      )}
    </div>
  )
}
