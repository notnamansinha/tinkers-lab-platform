import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, LogOut, User as UserIcon, Menu, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/services/firebase/auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const NAV_LINKS = [
  { name: 'Home',      path: '/' },
  { name: 'Machines',  path: '/equipment' },
  { name: 'Bookings',  path: '/bookings' },
  { name: 'Inventory', path: '/inventory' },
  { name: 'Projects',  path: '/projects' },
]

export default function TopBar() {
  const { profile, user, isStaff } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'You'
  const initials = displayName.slice(0, 2).toUpperCase()
  const roleName = profile?.role ? profile.role.replace('_', ' ').toUpperCase() : ''

  const isActive = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path)

  return (
    <>
      <header
        className="h-14 sticky top-0 z-30 flex items-center justify-between px-6 md:px-10"
        style={{
          background: 'rgba(8, 9, 11, 0.72)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Left — Logo + Nav */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
              style={{ background: '#0A84FF' }}
            >
              TL
            </div>
            <span
              className="font-semibold text-sm tracking-tight text-white hidden sm:block"
              style={{ fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif' }}
            >
              Tinkerers' Lab
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200',
                  isActive(link.path)
                    ? 'text-white bg-white/10'
                    : 'text-[#98989D] hover:text-white hover:bg-white/5'
                )}
              >
                {link.name}
              </button>
            ))}
            {isStaff && (
              <button
                onClick={() => navigate('/admin')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200',
                  location.pathname.startsWith('/admin')
                    ? 'text-white bg-white/10'
                    : 'text-[#98989D] hover:text-white hover:bg-white/5'
                )}
              >
                Admin
              </button>
            )}
          </nav>
        </div>

        {/* Right — Search + Avatar */}
        <div className="flex items-center gap-3">
          {/* Search pill */}
          <button
            onClick={() => navigate('/equipment')}
            className="hidden lg:flex items-center gap-2 px-3 h-8 rounded-full text-[#98989D] text-sm hover:text-white transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <Search size={13} />
            <span className="font-normal text-sm">Search...</span>
            <kbd
              className="ml-1 font-mono text-[10px] opacity-50"
              style={{ fontFamily: 'ui-monospace, SF Mono, monospace' }}
            >
              ⌘S
            </kbd>
          </button>

          {/* Mobile search icon */}
          <button
            onClick={() => navigate('/equipment')}
            className="lg:hidden text-[#98989D] hover:text-white transition-colors p-1"
          >
            <Search size={18} />
          </button>

          {/* Avatar / profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 transition-opacity hover:opacity-80"
                style={{
                  background: 'linear-gradient(135deg, #0A84FF 0%, #0060D0 100%)',
                  border: '1.5px solid rgba(255,255,255,0.15)',
                }}
              >
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56"
              style={{
                background: '#1C1D22',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '14px',
              }}
            >
              <DropdownMenuLabel className="font-normal px-3 py-2.5">
                <p className="text-sm font-semibold text-white leading-none mb-1">{displayName}</p>
                <p className="text-xs text-[#98989D]" style={{ fontFamily: 'ui-monospace, SF Mono, monospace' }}>
                  {user?.email}
                </p>
                {roleName && (
                  <p className="text-[10px] uppercase font-semibold mt-1.5" style={{ color: '#0A84FF', fontFamily: 'ui-monospace, SF Mono, monospace' }}>
                    {roleName}
                  </p>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator style={{ background: 'rgba(255,255,255,0.08)' }} />
              <DropdownMenuItem
                onClick={() => navigate('/profile')}
                className="px-3 py-2 text-sm text-[#F5F5F7] cursor-pointer focus:bg-white/5 focus:text-white rounded-lg mx-1"
              >
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator style={{ background: 'rgba(255,255,255,0.08)' }} />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="px-3 py-2 text-sm text-[#FF3B30] cursor-pointer focus:bg-red-500/10 focus:text-[#FF3B30] rounded-lg mx-1 mb-1"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-[#98989D] hover:text-white transition-colors p-1"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-x-0 top-14 z-20 px-4 pt-2 pb-4 animate-fade-in"
          style={{
            background: 'rgba(8, 9, 11, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {NAV_LINKS.map(link => (
            <button
              key={link.path}
              onClick={() => { navigate(link.path); setMenuOpen(false) }}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                isActive(link.path) ? 'text-white bg-white/10' : 'text-[#98989D] hover:text-white'
              )}
            >
              {link.name}
            </button>
          ))}
          {isStaff && (
            <button
              onClick={() => { navigate('/admin'); setMenuOpen(false) }}
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-[#98989D] hover:text-white transition-colors"
            >
              Admin
            </button>
          )}
        </div>
      )}
    </>
  )
}
