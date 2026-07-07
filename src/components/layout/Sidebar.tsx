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
          'hidden lg:flex flex-col h-full bg-zinc-950 text-zinc-100 border-r border-zinc-900 transition-all duration-300 shrink-0 overflow-hidden',
          isOpen ? 'w-64' : 'w-16'
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
          'fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-zinc-950 text-zinc-100 border-r border-zinc-900 lg:hidden transition-transform duration-300',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-900">
          <BrandMark expanded />
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
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
}: {
  isOpen: boolean
  visibleItems: NavItem[]
  isAdmin: boolean
  isAdminRoute: boolean
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Brand */}
      <div className="hidden lg:flex items-center gap-3 px-4 py-5 border-b border-zinc-900 shrink-0">
        <BrandMark expanded={isOpen} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6 scrollbar-thin">
        {/* Main nav */}
        <div className="space-y-1">
          {visibleItems.map((item) => (
            <SidebarLink key={item.path} item={item} expanded={isOpen} />
          ))}
        </div>

        {/* Admin section */}
        {isAdmin && (
          <div>
            <div
              className={cn(
                'px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono',
                !isOpen && 'text-center text-[9px]'
              )}
            >
              {isOpen ? 'Admin & Config' : 'ADM'}
            </div>
            <div className="space-y-1">
              {ADMIN_ITEMS.map((item) => (
                <SidebarLink key={item.path} item={item} expanded={isOpen} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      {isOpen && (
        <div className="shrink-0 px-5 py-4 border-t border-zinc-900 mt-auto">
          <p className="text-xs text-zinc-500 font-medium">Tinkerers&apos; Lab</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">Ahmedabad University</p>
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
          'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
        )
      }
      title={!expanded ? item.label : undefined}
    >
      <Icon size={18} className={cn("shrink-0", expanded ? "opacity-70 group-hover:opacity-100 transition-opacity" : "")} />
      {expanded && <span className="truncate">{item.label}</span>}
      {expanded && (
        <ChevronRight
          size={14}
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500"
        />
      )}
    </NavLink>
  )
}

function BrandMark({ expanded }: { expanded: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-primary flex items-center justify-center shrink-0 rounded-md">
        <span className="text-primary-foreground font-display font-bold text-sm leading-none">TL</span>
      </div>
      {expanded && (
        <div className="overflow-hidden">
          <p className="font-display font-bold text-sm leading-tight text-white tracking-tight">
            Tinkerers&apos; Lab
          </p>
        </div>
      )}
    </div>
  )
}
