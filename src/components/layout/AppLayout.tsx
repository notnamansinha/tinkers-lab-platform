import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Box, Calendar, LayoutDashboard, LogOut, MessageSquare, ShieldCheck, Wrench } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
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
  const { profile, user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    try {
      const { signOut } = await import('@/services/firebase/auth')
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
    <div className="flex min-h-svh flex-col bg-black text-white">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-hairline bg-black px-4 md:hidden">
        {location.pathname.startsWith('/admin') && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-near-black text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <button type="button" onClick={() => navigate('/')} aria-label="Go to dashboard">
          <BrandLockup compact />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-pink text-xs font-extrabold text-black"
          aria-label="Open profile"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt={initials} className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : initials}
        </button>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 gap-4 md:p-4 xl:gap-6 xl:p-6">
        <aside className="hidden w-16 shrink-0 flex-col rounded-card bg-charcoal p-2 md:sticky md:top-4 md:flex md:h-[calc(100svh-2rem)] md:self-start xl:top-6 xl:h-[calc(100svh-3rem)] xl:w-60 xl:p-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-6 flex items-center justify-center gap-3 rounded-md px-2 py-2 text-left xl:justify-start xl:px-3"
            aria-label="Go to dashboard"
          >
            <FlowerMark className="h-9 w-9" />
            <span className="hidden font-brand text-xl lowercase text-pink xl:inline">tinkerers lab</span>
          </button>

          <nav className="flex flex-col gap-1.5" aria-label="Main navigation">
            {NAV_LINKS.map(link => {
              const active = isActive(link.path)
              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => navigate(link.path)}
                  aria-current={active ? 'page' : undefined}
                  title={link.name}
                  className={cn(
                    'flex h-11 items-center justify-center gap-3 rounded-md px-2 text-sm font-semibold transition-colors xl:justify-start xl:px-4',
                    active ? 'bg-indigo text-white' : 'text-white/55 hover:bg-near-black hover:text-white',
                  )}
                >
                  <link.icon className="h-5 w-5" aria-hidden="true" />
                  <span className="hidden xl:inline">{link.name}</span>
                </button>
              )
            })}
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                aria-current={location.pathname.startsWith('/admin') ? 'page' : undefined}
                title="Admin"
                className={cn(
                  'flex h-11 items-center justify-center gap-3 rounded-md px-2 text-sm font-semibold transition-colors xl:justify-start xl:px-4',
                  location.pathname.startsWith('/admin')
                    ? 'bg-indigo text-white'
                    : 'text-white/55 hover:bg-near-black hover:text-white',
                )}
              >
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                <span className="hidden xl:inline">Admin</span>
              </button>
            )}
          </nav>

          <div className="mt-auto flex flex-col items-center gap-2 rounded-md bg-near-black p-2 xl:flex-row xl:gap-3 xl:p-3">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink text-xs font-extrabold text-black overflow-hidden"
              aria-label="Open profile"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt={initials} className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : initials}
            </button>
            <div className="hidden min-w-0 flex-1 xl:block">
              <p className="truncate text-sm font-bold text-white">{profile?.displayName || 'Lab member'}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo text-white transition-colors hover:bg-indigo-light"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-[var(--tl-mobile-nav-space)] md:pb-0">
          <div className="hidden h-14 items-center justify-between border-b border-hairline px-2 md:flex xl:px-4">
            <div className="flex-1" />
            <BrandLockup compact />
            <div className="flex flex-1 justify-end">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-pink text-xs font-extrabold text-black"
                aria-label="Open profile"
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={initials} className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : initials}
              </button>
            </div>
          </div>
          <div className="w-full min-w-0 px-4 py-4 md:px-0 md:py-5 xl:py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex items-center justify-around rounded-full border border-hairline bg-charcoal px-2 py-2.5 md:hidden" aria-label="Mobile navigation">
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
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate('/admin')}
            aria-current={location.pathname.startsWith('/admin') ? 'page' : undefined}
            aria-label="Admin"
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
              location.pathname.startsWith('/admin') ? 'bg-indigo text-white' : 'text-white/45',
            )}
          >
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </nav>
    </div>
  )
}
