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
    <div className="min-h-screen flex animate-fade-in">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-zinc-950 p-12 text-white">
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

        <div className="grid grid-cols-2 gap-4">
          {[
            ['14+', 'Bookable machines'],
            ['RBAC', 'Role-based access'],
            ['Real-time', 'Live availability'],
            ['Firebase', 'Cloud-native'],
          ].map(([val, label]) => (
            <div key={label} className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="font-mono font-semibold text-primary text-xl">{val}</p>
              <p className="text-zinc-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — sign in form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-[350px] space-y-6">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-zinc-950 flex items-center justify-center rounded-sm">
              <span className="font-display font-extrabold text-white text-sm">TL</span>
            </div>
            <div>
              <p className="font-display font-bold text-base">Tinkerers' Lab</p>
              <p className="text-muted-foreground text-xs">Ahmedabad University</p>
            </div>
          </div>

          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to sign in to your account
            </p>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Google sign in */}
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
            Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@ahduni.edu.in"
                  autoComplete="email"
                  className={cn("pl-9", errors.email && 'border-destructive')}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-[0.8rem] text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/register" className="text-xs text-muted-foreground hover:text-primary">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={cn("pl-9", errors.password && 'border-destructive')}
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-[0.8rem] text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Sign In
            </Button>
          </form>
          
          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="underline underline-offset-4 hover:text-primary">
              Register
            </Link>
          </div>

          <p className="text-center text-xs text-muted-foreground px-8">
            By clicking continue, you agree to our lab safety guidelines
            and usage policies.
          </p>
        </div>
      </div>
    </div>
  )
}
