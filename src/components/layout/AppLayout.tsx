import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Box, Calendar, LayoutDashboard, LogOut, MessageSquare, Wrench, Users, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/services/firebase/auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import logoMark from '@/assets/tinkerer-figjam/tinkerer-lab-board.webp'

const NAV_LINKS = [
  { name: 'Home',      icon: LayoutDashboard, path: '/' },
  { name: 'Machines',  icon: Wrench,          path: '/equipment' },
  { name: 'Bookings',  icon: Calendar,        path: '/bookings' },
  { name: 'Inventory', icon: Box,             path: '/inventory' },
  { name: 'Projects',  icon: MessageSquare,   path: '/projects' },
]

const ADMIN_LINKS = [
  { name: 'Admin Hub', icon: ShieldCheck,   path: '/admin' },
  { name: 'Users',     icon: Users,         path: '/admin/users' },
  { name: 'Issues',    icon: AlertTriangle, path: '/admin/issues' },
]

export default function AppLayout() {
  const { profile, user, role, isStaff } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
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
    <div className="tl-shell">
      <header className="md:hidden h-16 flex items-center justify-between px-4 border-b border-white/5 bg-black sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-[10px] overflow-hidden" onClick={() => navigate('/')} aria-label="Go home">
            <img src={logoMark} alt="" className="h-full w-full" />
          </button>
          <span className="font-brand uppercase text-white text-[20px] tracking-wider font-black" style={{ WebkitTextStroke: '0.8px currentColor' }}>TINKERERS LAB</span>
        </div>
        <button 
          className="w-8 h-8 rounded-full bg-pink flex items-center justify-center text-black font-bold text-[11px] shrink-0" 
          onClick={() => navigate('/onboarding')} 
          aria-label="View Profile"
        >
          {initials}
        </button>
      </header>

      <aside className="tl-rail py-6 items-center flex-shrink-0 relative z-10">
        <button className="w-12 h-12 rounded-[14px] overflow-hidden mb-8 hover:scale-105 transition-transform" onClick={() => navigate('/')} aria-label="Go home">
          <img src={logoMark} alt="" className="h-full w-full" />
        </button>

        <nav className="flex flex-col gap-4 w-full px-4">
          {NAV_LINKS.map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              title={link.name}
              className={cn(
                'w-full lg:w-auto lg:justify-start h-12 mx-auto rounded-full flex items-center justify-center gap-3 px-0 lg:px-4 transition-all hover:scale-[1.02]',
                isActive(link.path)
                  ? 'bg-indigo text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
                  : 'text-white/50 hover:bg-white/5 hover:text-white'
              )}
            >
              <link.icon size={20} />
              <span className={cn("hidden lg:inline", isActive(link.path) ? "text-sidebar-active" : "text-sidebar-normal")}>{link.name}</span>
            </button>
          ))}
          {isStaff && (
            <>
              <div className="w-full h-px bg-white/10 my-2" />
              {ADMIN_LINKS.map(link => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  title={link.name}
                  className={cn(
                    'w-full lg:w-auto lg:justify-start h-12 mx-auto rounded-full flex items-center justify-center gap-3 px-0 lg:px-4 transition-all hover:scale-[1.02]',
                    isActive(link.path) && link.path !== '/admin' || (link.path === '/admin' && location.pathname === '/admin')
                      ? 'bg-indigo text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
                      : 'text-white/50 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <link.icon size={20} />
                  <span className={cn("hidden lg:inline", isActive(link.path) && link.path !== '/admin' || (link.path === '/admin' && location.pathname === '/admin') ? "text-sidebar-active" : "text-sidebar-normal")}>{link.name}</span>
                </button>
              ))}
            </>
          )}
        </nav>

        <div className="mt-auto flex flex-col gap-2 w-full px-4 border-t border-white/5 pt-4">
          <button
            onClick={() => navigate('/onboarding')}
            title="View Profile"
            className={cn(
              'w-full lg:w-auto lg:justify-start h-12 mx-auto rounded-full flex items-center justify-center gap-3 px-0 lg:px-4 transition-all hover:scale-[1.02]',
              'text-white/50 hover:bg-white/5 hover:text-white'
            )}
          >
            <div className="w-6 h-6 rounded-full bg-pink flex items-center justify-center text-black font-bold text-[10px] shrink-0">
              {initials}
            </div>
            <span className="hidden lg:inline text-sidebar-normal font-medium truncate max-w-[120px]">Profile</span>
          </button>
          
          <button
            onClick={handleSignOut}
            title="Log out"
            className={cn(
              'w-full lg:w-auto lg:justify-start h-12 mx-auto rounded-full flex items-center justify-center gap-3 px-0 lg:px-4 transition-all hover:scale-[1.02]',
              'text-white/50 hover:bg-white/5 hover:text-pink'
            )}
          >
            <LogOut size={20} className="shrink-0" />
            <span className="hidden lg:inline text-sidebar-normal font-medium">Log out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 w-full min-w-0 max-w-full relative z-0 flex flex-col pb-16 md:pb-0">
        <div className="hidden md:flex h-20 items-center justify-center">
          <span className="font-brand uppercase text-white text-[32px] tracking-wider font-black" style={{ WebkitTextStroke: '1.5px currentColor' }}>TINKERERS LAB</span>
        </div>

        <div className="flex-1 p-4 pt-0 md:p-8 md:pt-0 overflow-y-auto">
          <div className="max-w-[1280px] mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-[#151515] border-t border-white/5 z-50 flex items-center justify-around px-1">
        {NAV_LINKS.map(link => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1",
              isActive(link.path) ? "text-[#DDF237]" : "text-white/40"
            )}
          >
            <link.icon size={20} />
            <span className="text-[10px] font-medium leading-none">{link.name}</span>
          </button>
        ))}
        {isStaff && (
          <button
            onClick={() => navigate('/admin')}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1",
              location.pathname.startsWith('/admin') ? "text-[#DDF237]" : "text-white/40"
            )}
          >
            <ShieldCheck size={20} />
            <span className="text-[10px] font-medium leading-none">Admin</span>
          </button>
        )}
      </nav>
    </div>
  )
}


