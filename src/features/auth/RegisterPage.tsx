import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { registerWithEmail, signInWithGoogle } from '@/services/firebase/auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserType } from '@/types'

// ── Spec 1 Form 1: 4 user types with conditional branching ──────────────────
const USER_TYPES: { value: UserType; label: string; description: string }[] = [
  { value: 'Student', label: 'Student', description: 'University student working on coursework or personal projects' },
  { value: 'Professor or Faculty', label: 'Professor / Faculty', description: 'Faculty member using the lab for research or teaching' },
  { value: 'Venture Studio Startup', label: 'Venture Studio Startup', description: 'External startup partnered with Ahmedabad University' },
  { value: 'External Visitor', label: 'External Visitor', description: 'Outside individual or organization visiting the lab' },
]

// ── Zod schema — adapts per user type ────────────────────────────────────────
const baseSchema = z.object({
  userType: z.enum(['Student', 'Professor or Faculty', 'Venture Studio Startup', 'External Visitor'] as const),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  contact: z.string().min(5, 'Contact number required'),
  // Student fields (Spec 1 §2)
  universityId: z.string().optional(),
  displayName: z.string().min(2, 'Full name required'),
  department: z.string().optional(),
  courseName: z.string().optional(),
  facultyAdvisor: z.string().optional(),
  teamName: z.string().optional(),
  teamMembers: z.string().optional(),
  // Professor fields (Spec 1 §3)
  researchArea: z.string().optional(),
  associatedCourse: z.string().optional(),
  studentsInvolved: z.string().optional(),
  // Venture Studio fields (Spec 1 §4)
  startupName: z.string().optional(),
  industryDomain: z.string().optional(),
  startupBrief: z.string().optional(),
  labTeamMembers: z.string().optional(),
  // External Visitor fields (Spec 1 §5)
  organization: z.string().optional(),
  designation: z.string().optional(),
  purposeOfVisit: z.string().optional(),
  referral: z.string().optional(),
  // Acknowledgements (Spec 1 §7)
  safetyAgreementAccepted: z.boolean().refine(v => v === true, 'You must accept the safety agreement'),
  termsAccepted: z.boolean().refine(v => v === true, 'You must accept the terms'),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine(d => {
  if (d.userType === 'Student') return !!d.universityId && !!d.department
  return true
}, { message: 'University ID and Department required for students', path: ['universityId'] })
.refine(d => {
  if (d.userType === 'Professor or Faculty') return !!d.department && !!d.researchArea
  return true
}, { message: 'Department and Research Area required for faculty', path: ['researchArea'] })
.refine(d => {
  if (d.userType === 'Venture Studio Startup') return !!d.startupName && !!d.industryDomain && !!d.startupBrief
  return true
}, { message: 'Startup Name, Industry, and Brief required', path: ['startupName'] })
.refine(d => {
  if (d.userType === 'External Visitor') return !!d.organization && !!d.designation && !!d.purposeOfVisit
  return true
}, { message: 'Organization, Designation, and Purpose required for visitors', path: ['organization'] })

type RegisterForm = z.infer<typeof baseSchema>

// ── Reusable field component ─────────────────────────────────────────────────
function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1=type, 2=details, 3=acknowledgements

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(baseSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      userType: 'Student',
      safetyAgreementAccepted: false,
      termsAccepted: false,
    },
  })

  const userType = watch('userType')

  // Step labels for the progress indicator
  const STEPS = ['Who are you?', 'Your details', 'Agreements']

  const handleNextStep = async () => {
    if (step === 1) {
      const ok = await trigger(['userType'])
      if (ok) setStep(2)
    } else if (step === 2) {
      // Validate fields relevant to the selected user type
      const commonFields: (keyof RegisterForm)[] = ['displayName', 'email', 'password', 'confirmPassword', 'contact']
      const typeFields: Record<UserType, (keyof RegisterForm)[]> = {
        'Student': ['universityId', 'department'],
        'Professor or Faculty': ['department', 'researchArea'],
        'Venture Studio Startup': ['startupName', 'industryDomain', 'startupBrief'],
        'External Visitor': ['organization', 'designation', 'purposeOfVisit'],
      }
      const ok = await trigger([...commonFields, ...typeFields[userType]])
      if (ok) setStep(3)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      navigate('/', { replace: true })
      toast.success('Signed in with Google')
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
        userType: data.userType,
        contact: data.contact,
        department: data.department,
        // Student-specific
        universityId: data.universityId,
        courseName: data.courseName,
        facultyAdvisor: data.facultyAdvisor,
        teamName: data.teamName,
        teamMembers: data.teamMembers,
        // Professor-specific
        researchArea: data.researchArea,
        associatedCourse: data.associatedCourse,
        studentsInvolved: data.studentsInvolved,
        // Startup-specific
        startupName: data.startupName,
        industryDomain: data.industryDomain,
        startupBrief: data.startupBrief,
        labTeamMembers: data.labTeamMembers,
        // Visitor-specific
        organization: data.organization,
        designation: data.designation,
        purposeOfVisit: data.purposeOfVisit,
        referral: data.referral,
        // Acknowledgements
        safetyAgreementAccepted: data.safetyAgreementAccepted,
        termsAccepted: data.termsAccepted,
      })
      navigate('/')
      toast.success("Account created! Welcome to Tinkerers' Lab.")
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Registration failed'
      setError(msg.includes('email-already-in-use') ? 'This email is already registered.' : msg)
      setStep(2)
    }
  }

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] p-12 bg-muted/30 border-r border-border">
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
            Register once to book machines, log tool checkouts, manage your projects, and access workshops.
          </p>
        </div>
        <div className="text-muted-foreground/50 text-xs font-mono uppercase tracking-widest font-semibold">
          Innovation & Tinkering Lab<br />Ahmedabad University
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 overflow-y-auto bg-background/50 backdrop-blur-3xl">
        <div className="min-h-screen flex items-start justify-center p-6 py-12 lg:p-12">
          <Card className="w-full max-w-[520px] shadow-2xl border-border bg-card/60 backdrop-blur-xl">
            <CardHeader className="space-y-1 pb-4">
              <div className="lg:hidden flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-primary flex items-center justify-center rounded-md">
                  <span className="font-display font-extrabold text-primary-foreground text-sm">TL</span>
                </div>
                <p className="font-display font-bold text-foreground">Tinkerers' Lab</p>
              </div>
              <CardTitle className="text-2xl font-display font-bold tracking-tight">Create an account</CardTitle>
              <CardDescription>
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
              </CardDescription>

              {/* Step progress indicator */}
              <div className="flex items-center gap-2 pt-3">
                {STEPS.map((label, i) => {
                  const idx = i + 1
                  const isActive = step === idx
                  const isDone = step > idx
                  return (
                    <React.Fragment key={label}>
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          'w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors',
                          isActive ? 'bg-primary text-primary-foreground' :
                          isDone ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                        )}>
                          {isDone ? '✓' : idx}
                        </div>
                        <span className={cn('text-xs hidden sm:block', isActive ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                          {label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && <div className={cn('flex-1 h-px', step > idx ? 'bg-primary/40' : 'bg-border')} />}
                    </React.Fragment>
                  )
                })}
              </div>
            </CardHeader>

            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-5 bg-destructive/10 border-destructive/20 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                {/* ── STEP 1: Who are you? ──────────────────────────────────── */}
                {step === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <p className="text-sm text-muted-foreground">Select the option that best describes you.</p>
                    <div className="grid gap-3">
                      {USER_TYPES.map(({ value, label, description }) => (
                        <label
                          key={value}
                          className={cn(
                            'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                            watch('userType') === value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-border/80 hover:bg-muted/30'
                          )}
                        >
                          <input
                            type="radio"
                            value={value}
                            {...register('userType')}
                            className="mt-0.5 accent-primary"
                          />
                          <div>
                            <p className="font-semibold text-sm text-foreground">{label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <Button type="button" onClick={handleNextStep} className="w-full mt-2">
                      Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
                    </div>
                    <Button variant="outline" type="button" onClick={handleGoogleSignIn} disabled={googleLoading} className="w-full bg-background/50">
                      {googleLoading ? <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin mr-2" /> : (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      Continue with Google
                    </Button>
                  </div>
                )}

                {/* ── STEP 2: Conditional user details ────────────────────── */}
                {step === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-200">

                    {/* Common fields (all types) */}
                    <Field label="Full Name" required error={errors.displayName?.message}>
                      <Input {...register('displayName')} placeholder="Your full name" className={cn(errors.displayName && 'border-destructive')} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Email" required error={errors.email?.message}>
                        <Input type="email" {...register('email')} placeholder="you@ahduni.edu.in" className={cn(errors.email && 'border-destructive')} />
                      </Field>
                      <Field label="Contact" required error={errors.contact?.message}>
                        <Input {...register('contact')} placeholder="+91 XXXXXXXXXX" className={cn(errors.contact && 'border-destructive')} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Password" required error={errors.password?.message}>
                        <Input type="password" {...register('password')} placeholder="Min 6 chars" autoComplete="new-password" className={cn(errors.password && 'border-destructive')} />
                      </Field>
                      <Field label="Confirm Password" required error={errors.confirmPassword?.message}>
                        <Input type="password" {...register('confirmPassword')} placeholder="Repeat password" autoComplete="new-password" className={cn(errors.confirmPassword && 'border-destructive')} />
                      </Field>
                    </div>

                    {/* Student-specific (Spec 1 §2) */}
                    {userType === 'Student' && (
                      <div className="space-y-3 border-t border-border pt-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student Details</p>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="University ID" required error={errors.universityId?.message}>
                            <Input {...register('universityId')} placeholder="e.g. AU2440123" className={cn(errors.universityId && 'border-destructive')} />
                          </Field>
                          <Field label="Department" required error={errors.department?.message}>
                            <Input {...register('department')} placeholder="e.g. CSE" className={cn(errors.department && 'border-destructive')} />
                          </Field>
                        </div>
                        <Field label="Course / Curriculum">
                          <Input {...register('courseName')} placeholder="e.g. B.Tech CSE" />
                        </Field>
                        <Field label="Faculty Advisor">
                          <Input {...register('facultyAdvisor')} placeholder="Leave blank if not applicable" />
                        </Field>
                        <Field label="Team Name">
                          <Input {...register('teamName')} placeholder="Optional" />
                        </Field>
                        <Field label="Team Members">
                          <textarea {...register('teamMembers')} placeholder="Names and IDs of teammates" className="flex min-h-[70px] w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </Field>
                      </div>
                    )}

                    {/* Professor-specific (Spec 1 §3) */}
                    {userType === 'Professor or Faculty' && (
                      <div className="space-y-3 border-t border-border pt-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Faculty Details</p>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Department" required error={errors.department?.message}>
                            <Input {...register('department')} placeholder="e.g. Mechanical" className={cn(errors.department && 'border-destructive')} />
                          </Field>
                          <Field label="Research Area" required error={errors.researchArea?.message}>
                            <Input {...register('researchArea')} placeholder="Your research area" className={cn(errors.researchArea && 'border-destructive')} />
                          </Field>
                        </div>
                        <Field label="Associated Course">
                          <Input {...register('associatedCourse')} placeholder="e.g. ME301" />
                        </Field>
                        <Field label="Students Involved">
                          <textarea {...register('studentsInvolved')} placeholder="Names/IDs of students (optional)" className="flex min-h-[70px] w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </Field>
                      </div>
                    )}

                    {/* Venture Studio-specific (Spec 1 §4) */}
                    {userType === 'Venture Studio Startup' && (
                      <div className="space-y-3 border-t border-border pt-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Startup Details</p>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Startup Name" required error={errors.startupName?.message}>
                            <Input {...register('startupName')} placeholder="Your startup's name" className={cn(errors.startupName && 'border-destructive')} />
                          </Field>
                          <Field label="Industry / Domain" required error={errors.industryDomain?.message}>
                            <Input {...register('industryDomain')} placeholder="e.g. CleanTech" className={cn(errors.industryDomain && 'border-destructive')} />
                          </Field>
                        </div>
                        <Field label="Brief About Your Startup" required error={errors.startupBrief?.message}>
                          <textarea {...register('startupBrief')} placeholder="Describe your startup and what you're building..." className={cn('flex min-h-[80px] w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', errors.startupBrief && 'border-destructive')} />
                        </Field>
                        <Field label="Team Members Using the Lab">
                          <textarea {...register('labTeamMembers')} placeholder="Names of team members who will use the lab (optional)" className="flex min-h-[60px] w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </Field>
                      </div>
                    )}

                    {/* External Visitor-specific (Spec 1 §5) */}
                    {userType === 'External Visitor' && (
                      <div className="space-y-3 border-t border-border pt-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visitor Details</p>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Organization / Institution" required error={errors.organization?.message}>
                            <Input {...register('organization')} placeholder="Your organization" className={cn(errors.organization && 'border-destructive')} />
                          </Field>
                          <Field label="Designation / Role" required error={errors.designation?.message}>
                            <Input {...register('designation')} placeholder="e.g. Researcher" className={cn(errors.designation && 'border-destructive')} />
                          </Field>
                        </div>
                        <Field label="Purpose of Visit" required error={errors.purposeOfVisit?.message}>
                          <textarea {...register('purposeOfVisit')} placeholder="Describe why you are visiting the lab..." className={cn('flex min-h-[80px] w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', errors.purposeOfVisit && 'border-destructive')} />
                        </Field>
                        <Field label="Referral">
                          <Input {...register('referral')} placeholder="Who referred you? (optional)" />
                        </Field>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                      <Button type="button" onClick={handleNextStep} className="flex-1">
                        Continue <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Acknowledgements (Spec 1 §7) ────────────────── */}
                {step === 3 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <p className="text-sm text-muted-foreground">Please read and confirm the following before creating your account.</p>

                    <label className={cn(
                      'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors',
                      errors.safetyAgreementAccepted ? 'border-destructive bg-destructive/5' : 'border-border hover:border-primary/40'
                    )}>
                      <input
                        type="checkbox"
                        {...register('safetyAgreementAccepted')}
                        className="mt-0.5 w-4 h-4 accent-primary rounded"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">Safety Agreement <span className="text-primary">*</span></p>
                        <p className="text-xs text-muted-foreground mt-1">
                          I agree to follow lab safety guidelines and return all tools and equipment after use.
                        </p>
                        {errors.safetyAgreementAccepted && <p className="text-xs text-destructive mt-1">{errors.safetyAgreementAccepted.message}</p>}
                      </div>
                    </label>

                    <label className={cn(
                      'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors',
                      errors.termsAccepted ? 'border-destructive bg-destructive/5' : 'border-border hover:border-primary/40'
                    )}>
                      <input
                        type="checkbox"
                        {...register('termsAccepted')}
                        className="mt-0.5 w-4 h-4 accent-primary rounded"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">Terms Agreement <span className="text-primary">*</span></p>
                        <p className="text-xs text-muted-foreground mt-1">
                          I understand that equipment booking is subject to availability and coordinator approval.
                        </p>
                        {errors.termsAccepted && <p className="text-xs text-destructive mt-1">{errors.termsAccepted.message}</p>}
                      </div>
                    </label>

                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                      <Button type="submit" disabled={isSubmitting} className="flex-1 font-semibold">
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                        ) : (
                          <UserPlus className="w-4 h-4 mr-2" />
                        )}
                        Create Account
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
            <CardFooter className="justify-center pt-0 pb-6">
              <p className="text-center text-xs text-muted-foreground px-8 leading-relaxed">
                Your registration will be reviewed by a lab coordinator.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
