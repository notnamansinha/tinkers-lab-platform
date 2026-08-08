import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Box, Calendar, LayoutDashboard, LogOut, MessageSquare, ShieldCheck, Wrench } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/services/firebase/auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { BrandLockup, FlowerMark } from '@/components/visual'

const NAV_LINKS = [
  { name: 'Dashboard', shortName: 'Home', icon: LayoutDashboard, path: '/' },
  { name: 'Machines', shortName: 'Machines', icon: Wrench, path: '/equipment' },
  { name: 'Bookings', shortName: 'Bookings', icon: Calendar, path: '/bookings' },
  { name: 'Inventory', shortName: 'Inventory', icon: Box, path: '/inventory' },
  { name: 'Projects', shortName: 'Projects', icon: MessageSquare, path: '/projects' },
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
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-hairline bg-black px-4 md:hidden">
        <button type="button" onClick={() => navigate('/')} aria-label="Go to dashboard">
          <BrandLockup compact />
        </button>
        <button
          type="button"
          onClick={() => navigate('/onboarding')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-pink text-xs font-extrabold text-black"
          aria-label="Open profile"
        >
          {initials}
        </button>
      </header>

      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] gap-0 md:p-6">
        <aside className="hidden w-60 shrink-0 flex-col rounded-card bg-charcoal p-4 md:flex md:min-h-[calc(100vh-3rem)] md:sticky md:top-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-8 flex items-center gap-3 rounded-md px-3 py-2 text-left"
            aria-label="Go to dashboard"
          >
            <FlowerMark className="h-9 w-9" />
            <span className="font-brand text-xl lowercase text-pink">tinkerers lab</span>
          </button>

          <nav className="flex flex-col gap-2" aria-label="Main navigation">
            {NAV_LINKS.map(link => {
              const active = isActive(link.path)
              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => navigate(link.path)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-12 items-center gap-3 rounded-md px-4 text-sm font-semibold transition-colors',
                    active ? 'bg-indigo text-white' : 'text-white/55 hover:bg-near-black hover:text-white',
                  )}
                >
                  <link.icon className="h-5 w-5" aria-hidden="true" />
                  {link.name}
                </button>
              )
            })}
            {isStaff && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                aria-current={location.pathname.startsWith('/admin') ? 'page' : undefined}
                className={cn(
                  'flex h-12 items-center gap-3 rounded-md px-4 text-sm font-semibold transition-colors',
                  location.pathname.startsWith('/admin')
                    ? 'bg-indigo text-white'
                    : 'text-white/55 hover:bg-near-black hover:text-white',
                )}
              >
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                Admin
              </button>
            )}
          </nav>

          <div className="mt-auto flex items-center gap-3 rounded-md bg-near-black p-3">
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink text-xs font-extrabold text-black"
              aria-label="Open profile"
            >
              {initials}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{profile?.displayName || 'Lab member'}</p>
              <button type="button" onClick={handleSignOut} className="mt-0.5 text-xs font-semibold text-pink hover:underline">
                Sign out
              </button>
            </div>
            <LogOut className="h-4 w-4 text-white/35" aria-hidden="true" />
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-0">
          <div className="relative hidden h-20 items-center justify-between px-8 md:flex">
            <BrandLockup compact className="mx-auto" />
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="absolute right-8 flex h-9 w-9 items-center justify-center rounded-full bg-pink text-xs font-extrabold text-black"
              aria-label="Open profile"
            >
              {initials}
            </button>
          </div>
          <div className="w-full px-4 py-6 md:px-8 md:pb-8 md:pt-0">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-around rounded-full border border-hairline bg-charcoal px-2 py-3 md:hidden" aria-label="Mobile navigation">
        {NAV_LINKS.map(link => {
          const active = isActive(link.path)
          return (
            <button
              key={link.path}
              type="button"
              onClick={() => navigate(link.path)}
              aria-current={active ? 'page' : undefined}
              aria-label={link.shortName}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
                active ? 'bg-indigo text-white' : 'text-white/45',
              )}
            >
              <link.icon className="h-5 w-5" aria-hidden="true" />
            </button>
          )
        })}
      </nav>
    </div>
  )
}
