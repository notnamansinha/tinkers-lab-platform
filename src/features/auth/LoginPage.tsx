import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react'
import { signInWithGoogle, signInWithEmail } from '@/services/firebase/auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type LoginForm = z.infer<typeof loginSchema>

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
      const msg = e instanceof Error ? e.message : 'Google sign-in failed'
      setError(msg)
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
    <div className="min-h-screen flex bg-tl-obsidian relative overflow-hidden">
      {/* Subtle texture over the background is handled via global CSS body::before */}
      
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 text-white relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-sm">
            <span className="font-display font-extrabold text-primary-foreground text-base">TL</span>
          </div>
          <div>
            <p className="font-display font-bold text-lg leading-tight">Tinkerers' Lab</p>
            <p className="text-zinc-400 text-xs">Ahmedabad University</p>
          </div>
        </div>

        <div>
          <div className="text-primary font-mono text-xs uppercase tracking-widest mb-4">
            Innovation &amp; Tinkering Lab
          </div>
          <h1 className="font-display font-extrabold text-4xl xl:text-5xl leading-tight mb-6">
            Build it.<br />
            <em className="text-primary not-italic">Book it.</em><br />
            Bring it back.
          </h1>
          <p className="text-zinc-400 text-base max-w-sm leading-relaxed">
            One platform to manage equipment bookings, tool checkout, inventory, 
            workshops, and projects for the Tinkerers' Lab.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {[
            { val: '14+', label: 'Bookable machines', icon: <Wrench size={18} className="text-tl-terracotta mb-2" /> },
            { val: 'RBAC', label: 'Role-based access', icon: <Lock size={18} className="text-tl-terracotta mb-2" /> },
            { val: 'Real-time', label: 'Live availability', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-tl-terracotta mb-2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> },
            { val: 'Cloud', label: 'Firebase native', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-tl-terracotta mb-2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg> },
          ].map(({ val, label, icon }) => (
            <div key={label} className="group">
              {icon}
              <p className="font-mono font-semibold text-tl-terracotta text-xl tracking-tight transition-colors">{val}</p>
              <p className="text-white/60 text-xs mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — sign in form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-[420px] p-8 sm:p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-500">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-tl-terracotta flex items-center justify-center rounded-md shadow-sm">
              <span className="font-display font-extrabold text-white text-sm">TL</span>
            </div>
            <div>
              <p className="font-display font-bold text-base text-white">Tinkerers' Lab</p>
              <p className="text-white/50 text-xs">Ahmedabad University</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="font-display font-bold text-2xl text-white tracking-tight">Sign in</h2>
            <p className="text-white/60 text-sm mt-1.5">
              Don't have an account?{' '}
              <Link to="/register" className="text-tl-terracotta hover:text-white hover:underline font-medium transition-colors">
                Register
              </Link>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3.5 mb-6 bg-destructive/20 text-destructive-foreground border border-destructive/30 rounded-lg text-sm animate-fade-in backdrop-blur-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Email form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90" htmlFor="email">Email</label>
              <div className="relative group">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-tl-terracotta transition-colors" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@ahduni.edu.in"
                  autoComplete="email"
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg bg-white/5 border-white/10 text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-tl-terracotta/50 focus:border-tl-terracotta transition-all duration-200',
                    errors.email && 'border-destructive focus:ring-destructive/50'
                  )}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive animate-fade-in">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/90" htmlFor="password">Password</label>
                <Link to="/register" className="text-xs text-white/50 hover:text-tl-terracotta transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-tl-terracotta transition-colors" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg bg-white/5 border-white/10 text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-tl-terracotta/50 focus:border-tl-terracotta transition-all duration-200',
                    errors.password && 'border-destructive focus:ring-destructive/50'
                  )}
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive animate-fade-in">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-tl-terracotta text-white rounded-lg text-sm font-semibold hover:bg-tl-terracotta/90 hover:shadow-lg hover:shadow-tl-terracotta/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              Sign in
            </button>
          </form>

          <div className="flex items-center gap-4 text-white/40 text-xs my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="uppercase tracking-wider font-medium">Or continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google sign in (moved below) */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm font-medium text-white hover:bg-white/10 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Google
          </button>

          <p className="text-center text-xs text-white/40 mt-8 leading-relaxed">
            By signing in, you agree to follow lab safety guidelines<br />
            and the Tinkerers' Lab usage policies.
          </p>
        </div>
      </div>
    </div>
  )
}
