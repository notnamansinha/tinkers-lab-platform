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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 bg-muted/30 text-foreground relative z-10 border-r border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-md shadow-sm">
            <span className="font-display font-extrabold text-primary-foreground text-base">TL</span>
          </div>
          <div>
            <p className="font-display font-bold text-lg leading-tight">Tinkerers' Lab</p>
            <p className="text-muted-foreground text-xs">Ahmedabad University</p>
          </div>
        </div>
        <div>
          <h2 className="font-display font-bold text-4xl xl:text-5xl leading-tight mb-6 tracking-tight">
            Join the Lab.<br />
            <em className="text-primary not-italic">Start building.</em>
          </h2>
          <p className="text-muted-foreground text-base max-w-sm leading-relaxed">
            Register to book machines, manage your projects, 
            access workshops, and more.
          </p>
        </div>
        <div className="text-muted-foreground/50 text-xs font-mono uppercase tracking-widest font-semibold">
          Innovation &amp; Tinkering Lab<br />
          Ahmedabad University
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 overflow-y-auto relative z-10 scrollbar-thin bg-background/50 backdrop-blur-3xl">
        <div className="min-h-screen flex items-start justify-center p-6 py-12 lg:p-12">
          <Card className="w-full max-w-[480px] shadow-2xl border-border bg-card/60 backdrop-blur-xl">
            {/* Mobile brand */}
            <CardHeader className="space-y-1 pb-6">
              <div className="lg:hidden flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-primary flex items-center justify-center rounded-md shadow-sm">
                  <span className="font-display font-extrabold text-primary-foreground text-sm">TL</span>
                </div>
                <p className="font-display font-bold text-foreground">Tinkerers' Lab</p>
              </div>

              <CardTitle className="text-2xl font-display font-bold tracking-tight">Create an account</CardTitle>
              <CardDescription className="text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium transition-colors">Sign in</Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-6 bg-destructive/10 border-destructive/20 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Registration form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>I am a...</Label>
                  <select 
                    {...register('userType')}
                    className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {USER_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full name <span className="text-primary">*</span></Label>
                    <Input placeholder="Your name" {...register('displayName')} className={cn('bg-background/50', errors.displayName && 'border-destructive focus-visible:ring-destructive')} />
                    {errors.displayName && <p className="text-[0.8rem] text-destructive">{errors.displayName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Department <span className="text-primary">*</span></Label>
                    <Input placeholder={userType === 'Student' ? 'e.g. CSE' : 'Department'} {...register('department')} className={cn('bg-background/50', errors.department && 'border-destructive focus-visible:ring-destructive')} />
                    {errors.department && <p className="text-[0.8rem] text-destructive">{errors.department.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email <span className="text-primary">*</span></Label>
                  <Input type="email" placeholder="you@ahduni.edu.in" autoComplete="email" {...register('email')} className={cn('bg-background/50', errors.email && 'border-destructive focus-visible:ring-destructive')} />
                  {errors.email && <p className="text-[0.8rem] text-destructive">{errors.email.message}</p>}
                </div>

                {userType === 'Student' && (
                  <div className="space-y-2 animate-fade-in">
                    <Label>Student ID</Label>
                    <Input placeholder="e.g. AU2440123" {...register('studentId')} className="bg-background/50" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Password <span className="text-primary">*</span></Label>
                    <Input type="password" placeholder="Min 6 characters" autoComplete="new-password" {...register('password')} className={cn('bg-background/50', errors.password && 'border-destructive focus-visible:ring-destructive')} />
                    {errors.password && <p className="text-[0.8rem] text-destructive">{errors.password.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm password <span className="text-primary">*</span></Label>
                    <Input type="password" placeholder="Repeat password" autoComplete="new-password" {...register('confirmPassword')} className={cn('bg-background/50', errors.confirmPassword && 'border-destructive focus-visible:ring-destructive')} />
                    {errors.confirmPassword && <p className="text-[0.8rem] text-destructive">{errors.confirmPassword.message}</p>}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-4 font-semibold shadow-md"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Create account
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-medium">Or continue with</span>
                </div>
              </div>

              <Button
                variant="outline"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full font-medium shadow-sm bg-background/50"
              >
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin mr-2" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Google
              </Button>
            </CardContent>
            <CardFooter className="justify-center pt-2 pb-6">
              <p className="text-center text-xs text-muted-foreground px-8 leading-relaxed">
                By registering, you agree to our lab safety guidelines
                and usage policies.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

