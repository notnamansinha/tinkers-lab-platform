import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle } from 'lucide-react'
import { signInWithGoogle, signInWithEmail } from '@/services/firebase/auth'
import { toast } from 'sonner'

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type LoginForm = z.infer<typeof loginSchema>

// ── Atmospheric gradient — lavender — same formula as brief ───────────────
const HERO_GRADIENT = `
  radial-gradient(circle at center,  rgba(5,5,18,0.92) 0%, rgba(12,12,30,0.80) 30%, rgba(40,40,70,0.20) 60%, transparent 100%),
  radial-gradient(circle at top left, rgba(200,204,227,0.42) 0%, rgba(200,204,227,0.18) 36%, transparent 66%),
  radial-gradient(circle at bottom right, rgba(144,149,192,0.34) 0%, rgba(144,149,192,0.14) 32%, transparent 62%),
  linear-gradient(135deg, #1d2038 0%, #6D729C 100%)
`

const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E\")"

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  color: '#F5F5F7',
  fontSize: 15,
  fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
  outline: 'none',
  transition: 'border-color 200ms ease',
}

export default function LoginPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      navigate(from, { replace: true })
      toast.success('Signed in successfully')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    try {
      await signInWithEmail(data.email, data.password)
      navigate(from, { replace: true })
      toast.success('Signed in successfully')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed'
      setError(
        msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')
          ? 'Invalid email or password'
          : msg
      )
    }
  }

  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        background: '#08090B',
      }}
    >
      {/* ── Left — atmospheric gradient hero panel ────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between"
        style={{
          width: '45%',
          flexShrink: 0,
          padding: '48px 52px',
          background: HERO_GRADIENT,
          backgroundImage: `${GRAIN}, ${HERO_GRADIENT}`,
          borderRadius: '0 0 0 0',
          borderRight: '1px solid rgba(255,255,255,0.10)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grain layer */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: GRAIN, opacity: 1, zIndex: 1,
          }}
        />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#0A84FF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13, color: '#fff',
              fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
            }}
          >
            TL
          </div>
          <div>
            <p style={{
              fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
              fontWeight: 600, fontSize: 15, color: '#F5F5F7', lineHeight: 1.2,
            }}>
              Tinkerers' Lab
            </p>
            <p style={{
              fontSize: 12, color: 'rgba(200,204,227,0.65)',
              fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
            }}>
              Ahmedabad University
            </p>
          </div>
        </div>

        {/* Hero copy */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <p
            style={{
              fontFamily: 'ui-monospace, SF Mono, monospace',
              fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'rgba(200,204,227,0.55)', marginBottom: 18,
            }}
          >
            Innovation & Tinkering Lab
          </p>
          <h1
            style={{
              fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
              fontWeight: 600,
              fontSize: 'clamp(32px, 3.5vw, 48px)',
              letterSpacing: '-0.02em',
              lineHeight: 1.08,
              color: '#F5F5F7',
              marginBottom: 20,
            }}
          >
            Build it.<br />
            <em style={{ color: '#9598C0', fontStyle: 'normal' }}>Book it.</em><br />
            Bring it back.
          </h1>
          <p style={{
            color: 'rgba(200,204,227,0.65)', fontSize: 14, lineHeight: 1.6,
            maxWidth: 320,
            fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
          }}>
            One platform for equipment bookings, tool checkout, inventory,
            workshops, and lab projects.
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 32px', position: 'relative', zIndex: 2 }}>
          {[
            { val: '14+', label: 'Bookable machines' },
            { val: 'RBAC', label: 'Role-based access' },
            { val: 'Live', label: 'Real-time status' },
            { val: 'Cloud', label: 'Firebase native' },
          ].map(({ val, label }) => (
            <div key={label}>
              <p style={{
                fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
                fontWeight: 700, fontSize: 22, color: '#F5F5F7', marginBottom: 2,
              }}>
                {val}
              </p>
              <p style={{
                fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
                fontSize: 12, color: 'rgba(200,204,227,0.55)',
              }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right — form panel ────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '32px 24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile logo */}
          <div
            className="lg:hidden"
            style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}
          >
            <div
              style={{
                width: 32, height: 32, borderRadius: 8, background: '#0A84FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 11, color: '#fff',
              }}
            >
              TL
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, color: '#F5F5F7' }}>Tinkerers' Lab</p>
              <p style={{ fontSize: 11, color: '#98989D' }}>Ahmedabad University</p>
            </div>
          </div>

          {/* Heading */}
          <h2
            style={{
              fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
              fontWeight: 600, fontSize: 26, letterSpacing: '-0.01em',
              color: '#F5F5F7', marginBottom: 4,
            }}
          >
            Sign in
          </h2>
          <p style={{ color: '#98989D', fontSize: 14, marginBottom: 28 }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{ color: '#0A84FF', textDecoration: 'none', fontWeight: 500 }}
            >
              Register
            </Link>
          </p>

          {/* Error */}
          {error && (
            <div
              style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                padding: '12px 14px', borderRadius: 12, marginBottom: 20,
                background: 'rgba(255,59,48,0.08)',
                border: '1px solid rgba(255,59,48,0.25)',
                color: '#FF3B30', fontSize: 13,
                fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block', fontSize: 13, fontWeight: 500,
                  color: '#F5F5F7', marginBottom: 6,
                  fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@ahduni.edu.in"
                style={{
                  ...inputStyle,
                  borderColor: errors.email ? 'rgba(255,59,48,0.50)' : 'rgba(255,255,255,0.12)',
                }}
                {...register('email')}
              />
              {errors.email && (
                <p style={{ color: '#FF3B30', fontSize: 12, marginTop: 4,
                  fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <label
                  htmlFor="password"
                  style={{ fontSize: 13, fontWeight: 500, color: '#F5F5F7',
                    fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif' }}
                >
                  Password
                </label>
                <Link
                  to="/register"
                  style={{ fontSize: 12, color: '#98989D', textDecoration: 'none' }}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  ...inputStyle,
                  borderColor: errors.password ? 'rgba(255,59,48,0.50)' : 'rgba(255,255,255,0.12)',
                }}
                {...register('password')}
              />
              {errors.password && (
                <p style={{ color: '#FF3B30', fontSize: 12, marginTop: 4,
                  fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Sign in CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%', padding: '11px 0',
                borderRadius: 999, background: '#0A84FF', border: 'none',
                color: '#fff', fontWeight: 600, fontSize: 15, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.65 : 1,
                fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
                transition: 'background 150ms ease, transform 300ms cubic-bezier(0.32,0.72,0,1)',
                marginTop: 4,
              }}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{
              fontSize: 12, color: '#98989D', textTransform: 'uppercase', letterSpacing: '0.06em',
              fontFamily: 'ui-monospace, SF Mono, monospace',
            }}>
              or
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            style={{
              width: '100%', padding: '10px 0',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#F5F5F7',
              fontWeight: 500, fontSize: 14, cursor: googleLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
              opacity: googleLoading ? 0.65 : 1,
              transition: 'background 150ms ease',
            }}
            onMouseEnter={el => { if (!googleLoading) (el.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={el => { ;(el.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
          >
            {googleLoading ? (
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.2)',
                borderTopColor: '#fff',
                animation: 'spin 0.6s linear infinite',
              }} />
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <p style={{
            textAlign: 'center', fontSize: 11, color: 'rgba(152,152,157,0.65)',
            marginTop: 24, lineHeight: 1.6,
            fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
          }}>
            By signing in, you agree to follow lab safety guidelines<br />
            and the Tinkerers' Lab usage policies.
          </p>
        </div>
      </div>
    </div>
  )
}
