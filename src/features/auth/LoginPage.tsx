import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AlertCircle, Wrench, Calendar, Rocket } from 'lucide-react'
import { signInWithGoogle } from '@/services/firebase/auth'
import { toast } from 'sonner'
import logoMark from '@/assets/tinkerer-figjam/tinkerer-lab-board.webp'
import dashboardArt from '@/assets/tinkerer-figjam/register-image.webp'

const palette = {
  black: '#000000',
  charcoal: '#191919',
  pink: '#EC68D8',
  indigo: '#514AF1',
  lime: '#DDF237',
  orange: '#FFB13F',
  cream: '#FFF4BE',
  beige: '#A9957A',
  white: '#FFFFFF',
}

const displayFont = "'PP Mori', 'Arial Black', Arial, sans-serif"
const bodyFont = "'PP Mori', Arial, sans-serif"

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
    <main
      style={{
        minHeight: '100svh',
        background: palette.black,
        color: palette.white,
        fontFamily: bodyFont,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <header
        className="flex items-center justify-between"
        style={{
          minHeight: 72,
          gap: 18,
          padding: '18px clamp(18px, 4vw, 56px)',
        }}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <img 
            src={logoMark} 
            alt="Logo" 
            className="w-12 h-12 sm:w-20 sm:h-20 bg-white object-contain"
          />
          <span
            className="flex flex-col sm:flex-row sm:gap-[0.3em] text-[22px] sm:text-[32px]"
            style={{
              color: palette.white,
              fontFamily: displayFont,
              fontWeight: 900,
              lineHeight: 1,
              WebkitTextStroke: '1.5px currentColor',
              letterSpacing: '0.05em',
            }}
          >
            <span>TINKERERS</span>
            <span>LAB</span>
          </span>
        </div>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.05fr) minmax(320px, 0.72fr)',
          gap: 'clamp(24px, 5vw, 72px)',
          alignItems: 'center',
          padding: 'clamp(18px, 4vw, 56px)',
          paddingTop: 10,
        }}
        className="max-lg:!grid-cols-1"
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              background: palette.beige,
              borderRadius: 14,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <img
              src={dashboardArt}
              alt="Plan smarter, live better."
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>
        </div>

        <aside style={{ width: '100%', maxWidth: 460, justifySelf: 'center', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 24,
            padding: '40px 32px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <h1 style={{
              fontFamily: displayFont,
              fontSize: 'clamp(36px, 5vw, 44px)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              marginBottom: 36,
              color: palette.white
            }}>
              Welcome to<br/>the Lab.
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 40 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ padding: 10, background: 'rgba(255, 255, 255, 0.06)', borderRadius: 12, color: palette.white }}>
                  <Wrench size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: palette.white }}>Reserve Equipment</div>
                  <div style={{ color: palette.white, opacity: 0.6, fontSize: 14, lineHeight: 1.4 }}>Fast access to hardware checkouts.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ padding: 10, background: 'rgba(255, 255, 255, 0.06)', borderRadius: 12, color: palette.white }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: palette.white }}>Book Workspaces</div>
                  <div style={{ color: palette.white, opacity: 0.6, fontSize: 14, lineHeight: 1.4 }}>Secure your spot in the lab.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ padding: 10, background: 'rgba(255, 255, 255, 0.06)', borderRadius: 12, color: palette.white }}>
                  <Rocket size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: palette.white }}>Manage Projects</div>
                  <div style={{ color: palette.white, opacity: 0.6, fontSize: 14, lineHeight: 1.4 }}>Track your builds from start to finish.</div>
                </div>
              </div>
            </div>

            {error && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  padding: '12px 14px',
                  borderRadius: 8,
                  marginBottom: 20,
                  background: 'rgba(236,104,216,0.16)',
                  border: `2px solid ${palette.pink}`,
                  color: palette.white,
                  fontSize: 13,
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              style={{
                width: '100%',
                minHeight: 52,
                borderRadius: 999,
                border: 0,
                background: palette.pink,
                color: palette.black,
                fontFamily: displayFont,
                fontWeight: 800,
                fontSize: 15,
                cursor: googleLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                boxShadow: '0 8px 24px rgba(236, 104, 216, 0.3)',
                transition: 'all 0.2s ease',
                marginTop: 'auto'
              }}
            >
              {googleLoading ? 'CONNECTING...' : 'CONTINUE WITH GOOGLE'}
            </button>
          </div>
        </aside>
      </section>

      <div style={{
        position: 'absolute',
        bottom: 24,
        left: 'clamp(18px, 4vw, 56px)',
        color: palette.white,
        opacity: 0.4,
        fontSize: 12,
        fontWeight: 600
      }}>
        © {new Date().getFullYear()} Tinkerers' Lab. All rights reserved.
      </div>
    </main>
  )
}
