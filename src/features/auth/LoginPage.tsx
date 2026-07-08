import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogIn, Mail, Lock, AlertCircle, Wrench } from 'lucide-react'
import { signInWithGoogle, signInWithEmail } from '@/services/firebase/auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      
      {/* Left panel — brand */}
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
          <div className="text-primary font-mono text-xs uppercase tracking-widest mb-4 font-semibold">
            Innovation &amp; Tinkering Lab
          </div>
          <h1 className="font-display font-extrabold text-4xl xl:text-5xl leading-tight mb-6 tracking-tight">
            Build it.<br />
            <em className="text-primary not-italic">Book it.</em><br />
            Bring it back.
          </h1>
          <p className="text-muted-foreground text-base max-w-sm leading-relaxed">
            One platform to manage equipment bookings, tool checkout, inventory, 
            workshops, and projects for the Tinkerers' Lab.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {[
            { val: '14+', label: 'Bookable machines', icon: <Wrench size={20} className="text-primary mb-3" /> },
            { val: 'RBAC', label: 'Role-based access', icon: <Lock size={20} className="text-primary mb-3" /> },
            { val: 'Real-time', label: 'Live availability', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px] text-primary mb-3"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> },
            { val: 'Cloud', label: 'Firebase native', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px] text-primary mb-3"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg> },
          ].map(({ val, label, icon }) => (
            <div key={label} className="group">
              {icon}
              <p className="font-display font-bold text-foreground text-2xl tracking-tight transition-colors">{val}</p>
              <p className="text-muted-foreground text-sm mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — sign in form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10 bg-background/50 backdrop-blur-3xl">
        <Card className="w-full max-w-[420px] shadow-2xl border-border bg-card/60 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-6">
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-primary flex items-center justify-center rounded-md shadow-sm">
                <span className="font-display font-extrabold text-primary-foreground text-sm">TL</span>
              </div>
              <div>
                <p className="font-display font-bold text-base text-foreground">Tinkerers' Lab</p>
                <p className="text-muted-foreground text-xs">Ahmedabad University</p>
              </div>
            </div>

            <CardTitle className="text-2xl font-display font-bold tracking-tight">Sign in</CardTitle>
            <CardDescription className="text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium transition-colors">
                Register
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6 bg-destructive/10 border-destructive/20 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@ahduni.edu.in"
                    autoComplete="email"
                    className={cn(
                      'pl-9 bg-background/50',
                      errors.email && 'border-destructive focus-visible:ring-destructive'
                    )}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/register" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={cn(
                      'pl-9 bg-background/50',
                      errors.password && 'border-destructive focus-visible:ring-destructive'
                    )}
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full mt-4 font-semibold shadow-md" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Sign in
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
            <p className="text-center text-xs text-muted-foreground leading-relaxed">
              By signing in, you agree to follow lab safety guidelines<br />
              and the Tinkerers' Lab usage policies.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

