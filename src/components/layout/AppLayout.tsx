import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, LayoutDashboard, Wrench, Calendar, Box, MessageSquare, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/services/firebase/auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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

  const initials = (profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'U').slice(0, 2).toUpperCase()

  return (
    <div className="tl-shell">
      {/* Mobile Top Bar */}
      <header className="md:hidden h-16 flex items-center justify-between px-4 border-b border-[#191919] bg-black sticky top-0 z-50">
        <div className="flex items-center gap-2">
          {/* Flower Mark (Mobile) */}
          <div className="w-8 h-8 rounded-full bg-pink flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-black font-bold text-lg">✿</span>
          </div>
          <span className="text-pink font-bold font-['Arial_Black'] uppercase text-lg tracking-tight">tinkerer</span>
        </div>
        <button className="text-white p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Nav Drawer */}
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
            <div className="w-10 h-10 rounded-full bg-pink text-black flex items-center justify-center font-bold text-sm">
              {initials}
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-bold">{profile?.displayName || 'User'}</p>
              <button onClick={handleSignOut} className="text-pink text-sm font-bold uppercase hover:underline">Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Left Rail */}
      <aside className="tl-rail py-6 items-center flex-shrink-0 relative z-10">
        {/* Brand Anchor */}
        <div className="w-12 h-12 rounded-full bg-pink flex items-center justify-center cursor-pointer mb-8 hover:scale-105 transition-transform" onClick={() => navigate('/')}>
          <span className="text-black font-bold text-2xl">✿</span>
        </div>

        {/* Nav Pills */}
        <nav className="flex flex-col gap-4 w-full px-4">
          {NAV_LINKS.map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              title={link.name}
              className={cn(
                'w-12 h-12 mx-auto rounded-full flex items-center justify-center transition-all hover:scale-105',
                isActive(link.path) ? 'bg-indigo text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
              )}
            >
              <link.icon size={20} />
            </button>
          ))}
          {isStaff && (
            <button
              onClick={() => navigate('/admin')}
              title="Admin"
              className={cn(
                'w-12 h-12 mx-auto rounded-full flex items-center justify-center transition-all hover:scale-105',
                isActive('/admin') ? 'bg-indigo text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
              )}
            >
              <LayoutDashboard size={20} />
            </button>
          )}
        </nav>

        {/* User Actions */}
        <div className="mt-auto flex flex-col gap-4 w-full px-4 items-center">
          <button 
            onClick={handleSignOut}
            title="Log Out"
            className="w-12 h-12 rounded-full text-white/50 hover:bg-white/5 hover:text-pink transition-all flex items-center justify-center"
          >
            <LogOut size={20} />
          </button>
          <div className="w-12 h-12 rounded-full bg-pink flex items-center justify-center text-black font-bold text-sm cursor-pointer shadow-lg hover:brightness-110 transition-all">
            {initials}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full min-w-0 max-w-full relative z-0 flex flex-col">
        {/* Desktop Header Wordmark */}
        <div className="hidden md:flex h-20 items-center justify-center">
          <h1 className="text-pink font-bold font-['Arial_Black'] uppercase text-4xl tracking-tight">tinkerer</h1>
        </div>
        
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
