import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AlertCircle, Cpu, CalendarCheck } from 'lucide-react'
import { signInWithGoogle } from '@/services/firebase/auth'
import { toast } from 'sonner'
import logoMark from '@/assets/tinkerer-figjam/tinkerer-lab-board.webp'
import dashboardArt from '@/assets/tinkerer-figjam/register-image.webp'

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
        <div className="flex items-center gap-3">
          <img src={logoMark} alt="" className="w-12 h-12 rounded-[14px] object-contain" />
          <span
            className="font-brand uppercase text-[#56779D] text-xl lg:text-2xl tracking-wider"
            style={{ WebkitTextStroke: '0.8px currentColor' }}
          >
            Tinkerers Lab
          </span>
        </div>
      </header>

      <section className="relative z-10 flex-1 grid lg:grid-cols-[1.05fr_0.72fr] gap-10 lg:gap-16 items-center px-6 lg:px-14 pb-12 max-lg:grid-cols-1">
        <div className="min-w-0">
          <div className="rounded-[28px] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.5)] border border-white/[0.06]">
            <img src={dashboardArt} alt="Tinkerers Lab workspace" className="w-full h-auto block" />
          </div>
        </div>

        <aside className="w-full max-w-[460px] justify-self-center flex flex-col">
          <h1 className="tl-display-title text-[#56779D] text-5xl lg:text-6xl mb-10 max-lg:text-center">
            Book it.<br />Build it.
          </h1>

          <div className="flex flex-col gap-8 mb-10 max-lg:mx-auto max-lg:w-full">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-indigo/30 flex items-center justify-center shrink-0">
                <Cpu size={20} className="text-indigo" strokeWidth={1.5} />
              </div>
              <div>
                <div className="tl-page-title text-lg text-[#56779D] mb-1">Reserve Equipment</div>
                <div className="text-[#7D9FC2] text-sm leading-relaxed">Fast access to hardware checkouts and machine bookings.</div>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-lime/20 flex items-center justify-center shrink-0">
                <CalendarCheck size={20} className="text-lime" strokeWidth={1.5} />
              </div>
              <div>
                <div className="tl-page-title text-lg text-[#56779D] mb-1">Book Workspaces</div>
                <div className="text-[#7D9FC2] text-sm leading-relaxed">Secure your spot in the lab and track your projects.</div>
              </div>
            </div>
          </div>

          <div className="tl-auth-panel max-lg:mx-auto">
            {error && (
              <div className="flex gap-2 items-start p-4 rounded-[16px] mb-5 bg-orange/15 border border-orange/40 text-[#56779D] text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full min-h-[52px] rounded-full bg-white text-[#56779D] font-semibold text-sm uppercase tracking-wide flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 shadow-[0_8px_32px_rgba(255,255,255,0.12)]"
            >
              {googleLoading ? 'Connecting…' : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
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
