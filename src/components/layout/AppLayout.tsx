import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Box, Calendar, LayoutDashboard, LogOut, MessageSquare, Wrench, ShieldCheck, Asterisk } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/services/firebase/auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const NAV_LINKS = [
  { name: 'HOME',     icon: LayoutDashboard, path: '/' },
  { name: 'MACHINES', icon: Wrench,          path: '/equipment' },
  { name: 'BOOKINGS', icon: Calendar,        path: '/bookings' },
  { name: 'INVENTORY',icon: Box,             path: '/inventory' },
  { name: 'PROJECTS', icon: MessageSquare,   path: '/projects' },
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
      {/* Light Frosted Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between p-6 max-w-6xl mx-auto w-full gap-6">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <Asterisk size={32} className="text-[#6FA9FF]" strokeWidth={2.5} />
          <span className="font-brand text-[#56779D] font-medium text-[24px] tracking-tight lowercase mt-1">tinkerer</span>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 bg-white/40 backdrop-blur-xl px-8 py-3 rounded-full border border-white/40 shadow-sm">
          {NAV_LINKS.map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={cn(
                "font-brand text-[14px] font-medium tracking-wide transition-colors",
                isActive(link.path) ? "text-[#56779D] font-bold" : "text-[#7D9FC2] hover:text-[#56779D]"
              )}
            >
              {link.name}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {isStaff && (
            <button
              className="font-brand text-[#7D9FC2] hover:text-[#56779D] text-[14px] font-medium uppercase tracking-wide transition-colors flex items-center gap-1.5"
              onClick={() => navigate('/admin')}
            >
              <ShieldCheck size={18} strokeWidth={2} />
              ADMIN
            </button>
          )}
          <button 
            className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center border border-white hover:border-[#6FA9FF] transition-all shadow-sm"
            onClick={() => navigate('/onboarding')}
          >
             <span className="text-[#56779D] text-xs font-bold">{initials}</span>
          </button>
          <button
            className="text-[#7D9FC2] hover:text-[#56779D] transition-colors"
            onClick={handleSignOut}
          >
            <LogOut size={20} strokeWidth={2} />
          </button>
        </div>
      </header>
      
      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-white/60 backdrop-blur-2xl border border-white/50 shadow-lg rounded-full z-50 flex items-center justify-around px-2 py-4 pb-safe">
        {NAV_LINKS.map(link => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1.5 transition-colors",
              isActive(link.path) ? "text-[#56779D]" : "text-[#7D9FC2]"
            )}
          >
            <link.icon size={22} strokeWidth={isActive(link.path) ? 2.5 : 2} />
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 pb-28 md:pb-12 z-10 relative">
        <Outlet />
      </main>
    </div>
  )
}
