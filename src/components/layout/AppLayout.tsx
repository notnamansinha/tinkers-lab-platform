import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Box, Calendar, LayoutDashboard, LogOut, Menu, MessageSquare, Wrench, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/services/firebase/auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import flowerMark from '@/assets/tinkerer-figjam/flower-mark.svg'

const NAV_LINKS = [
  { name: 'Home', icon: LayoutDashboard, path: '/' },
  { name: 'Machines', icon: Wrench, path: '/equipment' },
  { name: 'Bookings', icon: Calendar, path: '/bookings' },
  { name: 'Inventory', icon: Box, path: '/inventory' },
  { name: 'Projects', icon: MessageSquare, path: '/projects' },
]

export default function AppLayout() {
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
            <img src={flowerMark} alt="" className="h-full w-full" />
          </button>
          <span className="text-pink font-display font-black lowercase text-xl leading-none">tinkerers lab</span>
        </div>
        <button className="text-white p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {menuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-black/95 backdrop-blur-xl p-4 flex flex-col gap-4">
          {NAV_LINKS.map(link => (
            <button
              key={link.path}
              onClick={() => { navigate(link.path); setMenuOpen(false) }}
              className={cn(
                'flex items-center gap-4 px-6 py-4 rounded-full font-bold text-lg transition-all',
                isActive(link.path) ? 'bg-indigo text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
            >
              <link.icon size={24} />
              {link.name}
            </button>
          ))}
          {isStaff && (
            <button
              onClick={() => { navigate('/admin'); setMenuOpen(false) }}
              className={cn(
                'flex items-center gap-4 px-6 py-4 rounded-full font-bold text-lg transition-all',
                isActive('/admin') ? 'bg-indigo text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
            >
              <LayoutDashboard size={24} />
              Admin
            </button>
          )}
          <div className="mt-auto flex items-center gap-4 px-6 py-4">
            <div className="w-10 h-10 rounded-full bg-pink text-black flex items-center justify-center font-black text-sm">
              {initials}
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-bold">{profile?.displayName || 'User'}</p>
              <button onClick={handleSignOut} className="text-pink text-sm font-bold uppercase hover:underline">Log out</button>
            </div>
          </div>
        </div>
      )}

      <aside className="tl-rail py-6 items-center flex-shrink-0 relative z-10">
        <button className="w-12 h-12 rounded-[14px] overflow-hidden mb-8 hover:scale-105 transition-transform" onClick={() => navigate('/')} aria-label="Go home">
          <img src={flowerMark} alt="" className="h-full w-full" />
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
              <span className="hidden lg:inline text-xs font-black uppercase tracking-[0.08em]">{link.name}</span>
            </button>
          ))}
          {isStaff && (
            <button
              onClick={() => navigate('/admin')}
              title="Admin"
              className={cn(
                'w-full lg:w-auto lg:justify-start h-12 mx-auto rounded-full flex items-center justify-center gap-3 px-0 lg:px-4 transition-all hover:scale-[1.02]',
                isActive('/admin')
                  ? 'bg-indigo text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
                  : 'text-white/50 hover:bg-white/5 hover:text-white'
              )}
            >
              <LayoutDashboard size={20} />
              <span className="hidden lg:inline text-xs font-black uppercase tracking-[0.08em]">Admin</span>
            </button>
          )}
        </nav>

        <div className="mt-auto flex flex-col gap-4 w-full px-4 items-center">
          <button
            onClick={handleSignOut}
            title="Log out"
            className="w-12 h-12 rounded-full text-white/50 hover:bg-white/5 hover:text-pink transition-all flex items-center justify-center"
          >
            <LogOut size={20} />
          </button>
          <div className="w-12 h-12 rounded-full bg-pink flex items-center justify-center text-black font-black text-sm shadow-lg">
            {initials}
          </div>
        </div>
      </aside>

      <main className="flex-1 w-full min-w-0 max-w-full relative z-0 flex flex-col">
        <div className="hidden md:flex h-20 items-center justify-center">
          <h1 className="text-pink font-display font-black lowercase text-[34px] leading-none">tinkerers lab</h1>
        </div>

        <div className="flex-1 p-4 pt-0 md:p-8 md:pt-0 overflow-y-auto">
          <div className="max-w-[1280px] mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
