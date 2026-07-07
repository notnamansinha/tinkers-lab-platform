import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, AlertCircle } from 'lucide-react'
import { registerWithEmail, signInWithGoogle } from '@/services/firebase/auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const registerSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  department: z.string().min(1, 'Department is required'),
  studentId: z.string().optional(),
  userType: z.enum(['Student', 'Faculty', 'Lab Staff', 'Venture Studio', 'External Visitor']),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})
type RegisterForm = z.infer<typeof registerSchema>

const USER_TYPES = ['Student', 'Faculty', 'Lab Staff', 'Venture Studio', 'External Visitor'] as const

export default function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { userType: 'Student' },
  })

  const userType = watch('userType')

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      navigate('/', { replace: true })
      toast.success('Signed in with Google successfully')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  const onSubmit = async (data: RegisterForm) => {
    setError(null)
    try {
      await registerWithEmail(data.email, data.password, data.displayName, {
        department: data.department,
        studentId: data.studentId,
        userType: data.userType,
      })
      navigate('/')
      toast.success('Account created! Welcome to Tinkerers\' Lab.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Registration failed'
      setError(msg.includes('email-already-in-use') ? 'This email is already registered.' : msg)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 bg-tl-ink p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-tl-orange flex items-center justify-center">
            <span className="font-display font-extrabold text-tl-ink text-base">TL</span>
          </div>
          <div>
            <p className="font-display font-bold text-lg leading-tight">Tinkerers' Lab</p>
            <p className="text-white/50 text-xs">Ahmedabad University</p>
          </div>
        </div>
        <div>
          <h2 className="font-display font-bold text-3xl leading-tight mb-4">
            Join the Lab.<br />
            <span className="text-tl-orange">Start building.</span>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Register to book machines, manage your projects, 
            access workshops, and more.
          </p>
        </div>
        <div className="text-white/30 text-xs font-mono">
          Innovation &amp; Tinkering Lab<br />
          Ahmedabad University
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-screen flex items-start justify-center p-6 py-12">
          <div className="w-full max-w-lg space-y-6">
            {/* Mobile brand */}
            <div className="lg:hidden flex items-center gap-3">
              <div className="w-9 h-9 bg-tl-ink flex items-center justify-center">
                <span className="font-display font-extrabold text-tl-orange text-sm">TL</span>
              </div>
              <p className="font-display font-bold">Tinkerers' Lab</p>
            </div>

            <div>
              <h2 className="font-display font-bold text-2xl">Create account</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border rounded-md text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-60"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>

            <div className="flex items-center gap-3 text-muted-foreground text-xs">
              <div className="flex-1 h-px bg-border" />
              <span>or register with email</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Registration form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* User type */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">I am a…</label>
                <select
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring"
                  {...register('userType')}
                >
                  {USER_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Name + email */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full name <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    placeholder="Your name"
                    className={cn('w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring', errors.displayName && 'border-destructive')}
                    {...register('displayName')}
                  />
                  {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Department <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    placeholder={userType === 'Student' ? 'e.g. CSE' : 'Department / Org'}
                    className={cn('w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring', errors.department && 'border-destructive')}
                    {...register('department')}
                  />
                  {errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email <span className="text-destructive">*</span></label>
                <input
                  type="email"
                  placeholder="you@ahduni.edu.in"
                  autoComplete="email"
                  className={cn('w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring', errors.email && 'border-destructive')}
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {userType === 'Student' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Student ID</label>
                  <input
                    type="text"
                    placeholder="e.g. AU2440123"
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring"
                    {...register('studentId')}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Password <span className="text-destructive">*</span></label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    autoComplete="new-password"
                    className={cn('w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring', errors.password && 'border-destructive')}
                    {...register('password')}
                  />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Confirm password <span className="text-destructive">*</span></label>
                  <input
                    type="password"
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    className={cn('w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring', errors.confirmPassword && 'border-destructive')}
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" />
                ) : (
                  <UserPlus size={16} />
                )}
                Create account
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
