import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AlertCircle, Cpu, CalendarCheck } from 'lucide-react'
import { signInWithGoogle } from '@/services/firebase/auth'
import { toast } from 'sonner'
import dashboardArt from '@/assets/tinkerer-figjam/register-image.webp'
import { BrandLockup } from '@/components/visual'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      navigate(from, { replace: true })
      toast.success('Signed in successfully')
    } catch (e) {
      console.error('GOOGLE SIGN IN ERROR:', e)
      setError(e instanceof Error ? e.message : 'Google sign-in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <main className="tl-auth-shell">
      <div className="tl-ambient" aria-hidden="true" />

      <header className="relative z-10 flex items-center justify-between px-6 lg:px-14 py-5">
        <BrandLockup />
      </header>

      <section className="relative z-10 flex-1 grid lg:grid-cols-[1.05fr_0.72fr] gap-10 lg:gap-16 items-center px-6 lg:px-14 pb-12 max-lg:grid-cols-1">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-card border border-hairline">
            <img src={dashboardArt} alt="Tinkerers Lab workspace" className="w-full h-auto block" />
          </div>
        </div>

        <aside className="w-full max-w-[460px] justify-self-center flex flex-col">
          <h1 className="tl-display-title mb-10 text-5xl text-white max-lg:text-center lg:text-6xl">
            Book it.<br />Build it.
          </h1>

          <div className="flex flex-col gap-8 mb-10 max-lg:mx-auto max-lg:w-full">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-indigo/30 flex items-center justify-center shrink-0">
                <Cpu size={20} className="text-indigo" strokeWidth={1.5} />
              </div>
              <div>
                <div className="tl-page-title mb-1 text-lg text-white">Reserve Equipment</div>
                <div className="text-sm leading-relaxed text-white/50">Fast access to hardware checkouts and machine bookings.</div>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-lime/20 flex items-center justify-center shrink-0">
                <CalendarCheck size={20} className="text-lime" strokeWidth={1.5} />
              </div>
              <div>
                <div className="tl-page-title mb-1 text-lg text-white">Book Workspaces</div>
                <div className="text-sm leading-relaxed text-white/50">Secure your spot in the lab and track your projects.</div>
              </div>
            </div>
          </div>

          <div className="tl-auth-panel max-lg:mx-auto">
            {error && (
              <div className="mb-5 flex items-start gap-2 rounded-md border border-orange/40 bg-orange/15 p-4 text-sm text-white">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full bg-pink text-sm font-bold uppercase tracking-wide text-black transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {googleLoading ? 'Connecting…' : (
                <>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-sm font-extrabold text-pink" aria-hidden="true">G</span>
                  Continue with Google
                </>
              )}
            </button>

            <p className="text-white/35 text-xs text-center mt-6 font-medium">
              Ahmedabad University · Innovation & Tinkering Lab
            </p>
          </div>
        </aside>
      </section>

      <footer className="relative z-10 px-6 lg:px-14 py-6 text-white/30 text-xs font-medium max-lg:text-center">
        © {new Date().getFullYear()} Tinkerers' Lab. All rights reserved.
      </footer>
    </main>
  )
}
