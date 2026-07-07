import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, AlertCircle } from 'lucide-react'
import { registerWithEmail, signInWithGoogle } from '@/services/firebase/auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

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

  const inputClasses = "w-full px-4 py-2.5 text-sm border rounded-lg bg-white/5 border-white/10 text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-tl-terracotta/50 focus:border-tl-terracotta transition-all duration-200"
  const selectClasses = "w-full px-4 py-2.5 text-sm border rounded-lg bg-[#111111] border-white/10 text-white outline-none focus:ring-2 focus:ring-tl-terracotta/50 focus:border-tl-terracotta transition-all duration-200"

  return (
    <div className="min-h-screen flex bg-tl-obsidian relative overflow-hidden">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 text-white relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-tl-terracotta flex items-center justify-center rounded-md shadow-sm">
            <span className="font-display font-extrabold text-white text-base">TL</span>
          </div>
          <div>
            <p className="font-display font-bold text-lg leading-tight">Tinkerers' Lab</p>
            <p className="text-white/50 text-xs">Ahmedabad University</p>
          </div>
        </div>
        <div>
          <h2 className="font-display font-bold text-4xl xl:text-5xl leading-tight mb-6">
            Join the Lab.<br />
            <em className="text-tl-terracotta not-italic">Start building.</em>
          </h2>
          <p className="text-white/60 text-base max-w-sm leading-relaxed">
            Register to book machines, manage your projects, 
            access workshops, and more.
          </p>
        </div>
        <div className="text-white/40 text-xs font-mono uppercase tracking-widest">
          Innovation &amp; Tinkering Lab<br />
          Ahmedabad University
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 overflow-y-auto relative z-10 scrollbar-thin">
        <div className="min-h-screen flex items-start justify-center p-6 py-12 lg:p-12">
          <div className="w-full max-w-[480px] p-8 sm:p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-500">
            {/* Mobile brand */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-9 h-9 bg-tl-terracotta flex items-center justify-center rounded-md shadow-sm">
                <span className="font-display font-extrabold text-white text-sm">TL</span>
              </div>
              <p className="font-display font-bold text-white">Tinkerers' Lab</p>
            </div>

            <div className="mb-8">
              <h2 className="font-display font-bold text-2xl text-white tracking-tight">Create an account</h2>
              <p className="text-white/60 text-sm mt-1.5">
                Already have an account?{' '}
                <Link to="/login" className="text-tl-terracotta hover:text-white hover:underline font-medium transition-colors">Sign in</Link>
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3.5 mb-6 bg-destructive/20 text-destructive-foreground border border-destructive/30 rounded-lg text-sm animate-fade-in backdrop-blur-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Registration form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/90">I am a...</label>
                <select className={selectClasses} {...register('userType')}>
                  {USER_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90">Full name <span className="text-tl-terracotta">*</span></label>
                  <input placeholder="Your name" {...register('displayName')} className={cn(inputClasses, errors.displayName && 'border-destructive focus:ring-destructive/50')} />
                  {errors.displayName && <p className="text-[0.8rem] text-destructive animate-fade-in">{errors.displayName.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90">Department <span className="text-tl-terracotta">*</span></label>
                  <input placeholder={userType === 'Student' ? 'e.g. CSE' : 'Department'} {...register('department')} className={cn(inputClasses, errors.department && 'border-destructive focus:ring-destructive/50')} />
                  {errors.department && <p className="text-[0.8rem] text-destructive animate-fade-in">{errors.department.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/90">Email <span className="text-tl-terracotta">*</span></label>
                <input type="email" placeholder="you@ahduni.edu.in" autoComplete="email" {...register('email')} className={cn(inputClasses, errors.email && 'border-destructive focus:ring-destructive/50')} />
                {errors.email && <p className="text-[0.8rem] text-destructive animate-fade-in">{errors.email.message}</p>}
              </div>

              {userType === 'Student' && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-sm font-medium text-white/90">Student ID</label>
                  <input placeholder="e.g. AU2440123" {...register('studentId')} className={inputClasses} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90">Password <span className="text-tl-terracotta">*</span></label>
                  <input type="password" placeholder="Min 6 characters" autoComplete="new-password" {...register('password')} className={cn(inputClasses, errors.password && 'border-destructive focus:ring-destructive/50')} />
                  {errors.password && <p className="text-[0.8rem] text-destructive animate-fade-in">{errors.password.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90">Confirm password <span className="text-tl-terracotta">*</span></label>
                  <input type="password" placeholder="Repeat password" autoComplete="new-password" {...register('confirmPassword')} className={cn(inputClasses, errors.confirmPassword && 'border-destructive focus:ring-destructive/50')} />
                  {errors.confirmPassword && <p className="text-[0.8rem] text-destructive animate-fade-in">{errors.confirmPassword.message}</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-tl-terracotta text-white rounded-lg text-sm font-semibold hover:bg-tl-terracotta/90 hover:shadow-lg hover:shadow-tl-terracotta/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-4"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <UserPlus size={16} />
                )}
                Create account
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

            <p className="text-center text-xs text-white/40 mt-8 px-8 leading-relaxed">
              By registering, you agree to our lab safety guidelines
              and usage policies.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
