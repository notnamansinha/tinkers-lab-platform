import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Box, Calendar, LayoutDashboard, LogOut, MessageSquare, Wrench, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/services/firebase/auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import logoMark from '@/assets/tinkerer-figjam/tinkerer-lab-board.webp'

const NAV_LINKS = [
  { name: 'Home',     icon: LayoutDashboard, path: '/' },
  { name: 'Machines', icon: Wrench,          path: '/equipment' },
  { name: 'Bookings', icon: Calendar,        path: '/bookings' },
  { name: 'Inventory',icon: Box,             path: '/inventory' },
  { name: 'Projects', icon: MessageSquare,   path: '/projects' },
]

export default function AppLayout() {
  const { profile, user, isStaff } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const initials = (profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'U')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="kivo-shell">
      {/* Top Header */}
      <header className="flex items-center justify-between p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <span className="font-brand text-white text-[24px] tracking-wider">TINKERERS LAB</span>
        </div>
        <div className="flex items-center gap-3">
          {isStaff && (
            <button
              className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-white/70 hover:text-white transition-colors"
              onClick={() => navigate('/admin')}
            >
              <ShieldCheck size={18} />
            </button>
          )}
          <button 
            className="w-10 h-10 rounded-full border border-[rgba(255,255,255,0.1)] overflow-hidden bg-[rgba(255,255,255,0.05)] flex items-center justify-center"
            onClick={() => navigate('/onboarding')}
          >
             <span className="text-white text-xs font-semibold">{initials}</span>
          </button>
          <button
            className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-white/70 hover:text-white transition-colors ml-2"
            onClick={handleSignOut}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-32">
        <Outlet />
      </main>

      {/* Floating KIVO Dock */}
      <div className="fixed bottom-6 left-0 right-0 px-4 pointer-events-none z-50 flex justify-center">
        <nav className="kivo-nav-bar pointer-events-auto rounded-full px-4 py-3 flex items-center gap-2 sm:gap-6 w-full max-w-md mx-auto justify-between shadow-2xl">
          {NAV_LINKS.map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={cn(
                "flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300",
                isActive(link.path) 
                  ? "bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.3)] text-white translate-y-[-4px]" 
                  : "text-white/50 hover:bg-white/10 hover:text-white/80"
              )}
            >
              <link.icon size={22} strokeWidth={isActive(link.path) ? 2.5 : 2} />
              <span className="text-[10px] font-medium mt-1 tracking-wide opacity-0 h-0 group-hover:opacity-100 group-hover:h-auto overflow-hidden transition-all hidden sm:block">
                {link.name}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
