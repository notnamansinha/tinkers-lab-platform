import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { signInWithGoogle, signInWithEmail } from '@/services/firebase/auth'
import { toast } from 'sonner'
import flowerMark from '@/assets/tinkerer-figjam/flower-mark.svg'
import dashboardArt from '@/assets/tinkerer-figjam/dashboard-clusters.svg'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

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

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 48,
  padding: '12px 16px',
  background: palette.charcoal,
  border: '2px solid transparent',
  borderRadius: 8,
  color: palette.white,
  fontSize: 14,
  fontFamily: bodyFont,
  outline: 'none',
}

function BrandWordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img src={flowerMark} alt="" style={{ width: 28, height: 28 }} />
      <span
        style={{
          color: palette.pink,
          fontFamily: displayFont,
          fontWeight: 800,
          fontSize: 24,
          lineHeight: 1,
        }}
      >
        tinkerer lab
      </span>
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
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
      console.error('GOOGLE SIGN IN ERROR:', e)
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
    <main
      style={{
        minHeight: '100svh',
        background: palette.black,
        color: palette.white,
        fontFamily: bodyFont,
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          minHeight: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          padding: '18px clamp(18px, 4vw, 56px)',
        }}
      >
        <BrandWordmark />
        <Link
          to="/register"
          style={{
            borderRadius: 999,
            background: palette.pink,
            color: palette.black,
            padding: '9px 18px',
            fontFamily: displayFont,
            fontSize: 12,
            fontWeight: 800,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          REGISTER
        </Link>
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
            className="max-md:!min-h-0 max-md:!justify-start max-md:!gap-4 max-md:!py-6 max-md:!px-6"
            style={{
              background: palette.beige,
              borderRadius: 14,
              minHeight: 'min(66svh, 620px)',
              padding: 'clamp(22px, 4vw, 44px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 26px 70px rgba(0,0,0,0.45)',
            }}
          >
            <p style={{ maxWidth: 230, color: palette.black, fontSize: 20, lineHeight: 1.1, fontWeight: 800, fontFamily: displayFont }}>
              Make smarter reservations and keep the lab moving
            </p>

            <img
              src={dashboardArt}
              className="max-md:!w-[108%] max-md:!max-w-none"
              alt="Dashboard preview with rounded charts and bright planning blocks"
              style={{
                width: 'min(760px, 92%)',
                alignSelf: 'center',
                borderRadius: 12,
                transform: 'rotate(-2deg)',
                boxShadow: '0 24px 46px rgba(0,0,0,0.38)',
              }}
            />

            {/* Decorative overlap removed for better responsiveness */}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 10,
                fontFamily: displayFont,
                fontWeight: 800,
                fontSize: 'clamp(40px, 7vw, 88px)',
                lineHeight: 0.88,
                color: palette.black,
              }}
            >
              <span style={{ background: palette.lime, borderRadius: 10, padding: '4px 10px' }}>Book</span>
              <span style={{ background: palette.black, color: palette.white, borderRadius: 10, padding: '4px 10px' }}>your</span>
              <span style={{ background: palette.pink, borderRadius: 999, width: '1.45em', height: '.78em' }} />
              <span style={{ background: palette.cream, borderRadius: 10, padding: '4px 10px' }}>next</span>
              <span style={{ background: palette.orange, borderRadius: 10, padding: '4px 10px' }}>build.</span>
            </div>
          </div>
        </div>

        <aside style={{ width: '100%', maxWidth: 430, justifySelf: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 999,
              background: palette.charcoal,
              color: palette.cream,
              padding: '8px 13px',
              fontSize: 12,
              fontWeight: 800,
              marginBottom: 18,
            }}
          >
            <span style={{ width: 28, height: 28, borderRadius: 999, background: palette.pink, display: 'grid', placeItems: 'center' }}>
              <ArrowRight size={15} color={palette.black} />
            </span>
            LAB ACCESS
          </div>

          <h1
            style={{
              fontFamily: displayFont,
              fontWeight: 800,
              fontSize: 'clamp(42px, 6vw, 72px)',
              lineHeight: 0.86,
              letterSpacing: 0,
              marginBottom: 12,
            }}
          >
            Plan smarter,
            <br />
            build better.
          </h1>
          <p style={{ color: palette.white, opacity: 0.78, fontSize: 14, lineHeight: 1.35, marginBottom: 22 }}>
            Sign in to book machines, track checkouts, manage projects, and review lab activity.
          </p>

          {error && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                padding: '12px 14px',
                borderRadius: 8,
                marginBottom: 16,
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

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ color: '#777', fontSize: 11, fontWeight: 800 }}>EMAIL</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="Enter your email address"
                style={{ ...inputStyle, borderColor: errors.email ? palette.pink : 'transparent' }}
                {...register('email')}
              />
              {errors.email && <span style={{ color: palette.pink, fontSize: 12 }}>{errors.email.message}</span>}
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ color: '#777', fontSize: 11, fontWeight: 800 }}>PASSWORD</span>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                style={{ ...inputStyle, borderColor: errors.password ? palette.pink : 'transparent' }}
                {...register('password')}
              />
              {errors.password && <span style={{ color: palette.pink, fontSize: 12 }}>{errors.password.message}</span>}
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                minHeight: 48,
                border: 0,
                borderRadius: 999,
                background: palette.pink,
                color: palette.black,
                fontFamily: displayFont,
                fontWeight: 800,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.65 : 1,
                marginTop: 8,
              }}
            >
              {isSubmitting ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            style={{
              width: '100%',
              minHeight: 46,
              marginTop: 12,
              borderRadius: 999,
              border: `2px solid ${palette.charcoal}`,
              background: palette.black,
              color: palette.white,
              fontFamily: displayFont,
              fontWeight: 800,
              cursor: googleLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {googleLoading ? 'CONNECTING...' : 'CONTINUE WITH GOOGLE'}
          </button>

          <p style={{ marginTop: 18, color: '#8B8B8B', fontSize: 13 }}>
            New here?{' '}
            <Link to="/register" style={{ color: palette.pink, fontWeight: 800, textDecoration: 'none' }}>
              Create an account
            </Link>
          </p>
        </aside>
      </section>
    </main>
  )
}
