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

  const selectClasses = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

  return (
    <div className="min-h-screen flex animate-fade-in">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 bg-zinc-950 p-12 text-white">
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
          <h2 className="font-display font-bold text-3xl leading-tight mb-4">
            Join the Lab.<br />
            <span className="text-primary">Start building.</span>
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
            Register to book machines, manage your projects, 
            access workshops, and more.
          </p>
        </div>
        <div className="text-zinc-500 text-xs font-mono">
          Innovation &amp; Tinkering Lab<br />
          Ahmedabad University
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-screen flex items-start justify-center p-6 py-12">
          <div className="w-full max-w-lg space-y-6">
            {/* Mobile brand */}
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-zinc-950 flex items-center justify-center rounded-sm">
                <span className="font-display font-extrabold text-white text-sm">TL</span>
              </div>
              <p className="font-display font-bold">Tinkerers' Lab</p>
            </div>

            <div className="flex flex-col space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="underline underline-offset-4 hover:text-primary">Sign in</Link>
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Google */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full gap-2"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or register with email
                </span>
              </div>
            </div>

            {/* Registration form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>I am a...</Label>
                <select className={selectClasses} {...register('userType')}>
                  {USER_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full name <span className="text-destructive">*</span></Label>
                  <Input placeholder="Your name" {...register('displayName')} className={errors.displayName ? 'border-destructive' : ''} />
                  {errors.displayName && <p className="text-[0.8rem] text-destructive">{errors.displayName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Department <span className="text-destructive">*</span></Label>
                  <Input placeholder={userType === 'Student' ? 'e.g. CSE' : 'Department / Org'} {...register('department')} className={errors.department ? 'border-destructive' : ''} />
                  {errors.department && <p className="text-[0.8rem] text-destructive">{errors.department.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input type="email" placeholder="you@ahduni.edu.in" autoComplete="email" {...register('email')} className={errors.email ? 'border-destructive' : ''} />
                {errors.email && <p className="text-[0.8rem] text-destructive">{errors.email.message}</p>}
              </div>

              {userType === 'Student' && (
                <div className="space-y-2">
                  <Label>Student ID</Label>
                  <Input placeholder="e.g. AU2440123" {...register('studentId')} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Password <span className="text-destructive">*</span></Label>
                  <Input type="password" placeholder="Min 6 characters" autoComplete="new-password" {...register('password')} className={errors.password ? 'border-destructive' : ''} />
                  {errors.password && <p className="text-[0.8rem] text-destructive">{errors.password.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Confirm password <span className="text-destructive">*</span></Label>
                  <Input type="password" placeholder="Repeat password" autoComplete="new-password" {...register('confirmPassword')} className={errors.confirmPassword ? 'border-destructive' : ''} />
                  {errors.confirmPassword && <p className="text-[0.8rem] text-destructive">{errors.confirmPassword.message}</p>}
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full gap-2 mt-2">
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Create account
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground px-8">
              By registering, you agree to our lab safety guidelines
              and usage policies.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
