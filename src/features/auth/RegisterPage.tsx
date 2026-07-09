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
    <div className="flex flex-col gap-1.5 w-full">
      <Label className="tl-input-label text-white/70">
        {label} {required && <span className="text-pink">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-pink mt-1 font-bold">{error}</p>}
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
    <div className="tl-shell flex-col lg:flex-row min-h-screen relative overflow-hidden">
      {/* Brand / Visual Panel */}
      <div className="lg:w-[42%] flex flex-col justify-between p-8 md:p-12 tl-panel-cream m-4 lg:m-6 shadow-2xl relative overflow-hidden shrink-0">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-black flex items-center justify-center rounded-full shadow-sm">
            <span className="font-bold text-pink text-xl">✿</span>
          </div>
          <div>
            <p className="font-black font-['Arial_Black'] text-xl uppercase tracking-tight text-black">TINKERER LAB</p>
            <p className="text-black/60 text-xs font-bold uppercase">Ahmedabad University</p>
          </div>
        </div>
        <div className="relative z-10 mt-12 lg:mt-0">
          <h2 className="font-['Arial_Black'] font-black uppercase text-4xl xl:text-6xl leading-[0.85] mb-6 tracking-tight text-black">
            Join the Lab.<br />
            <em className="text-pink not-italic block mt-2">Start building.</em>
          </h2>
          <p className="text-black/70 text-lg font-bold max-w-sm leading-tight">
            Register once to book machines, log tool checkouts, manage your projects, and access workshops.
          </p>
        </div>
        <div className="text-black/40 text-xs font-bold uppercase tracking-widest relative z-10 mt-12 lg:mt-0">
          Innovation & Tinkering Lab<br />Ahmedabad University
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 py-8 lg:p-12 relative z-10">
        <div className="w-full max-w-[560px] tl-panel-indigo shadow-2xl border-4 border-black/20">
          <div className="mb-8">
            <h1 className="font-['Arial_Black'] uppercase text-3xl font-black tracking-tight mb-2">Create an account</h1>
            <p className="text-white/70 text-sm font-bold">
              Already have an account?{' '}
              <Link to="/login" className="text-pink hover:underline">Sign in</Link>
            </p>

            {/* Step progress */}
            <div className="flex items-center gap-2 mt-6">
              {STEPS.map((label, i) => {
                const idx = i + 1
                const isActive = step === idx
                const isDone = step > idx
                return (
                  <React.Fragment key={label}>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-8 h-8 rounded-full text-sm font-black flex items-center justify-center transition-colors shadow-lg border-2',
                        isActive ? 'bg-pink text-black border-pink' :
                        isDone ? 'bg-pink text-black border-pink' : 'bg-black/20 text-white/40 border-transparent'
                      )}>
                        {isDone ? '✓' : idx}
                      </div>
                      <span className={cn('text-xs uppercase font-bold tracking-wider hidden sm:block', isActive ? 'text-white' : 'text-white/40')}>
                        {label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && <div className={cn('flex-1 h-1 rounded-full', step > idx ? 'bg-pink' : 'bg-black/20')} />}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-pink/20 border-2 border-pink text-white flex items-center gap-3 font-bold text-sm">
              <AlertCircle size={20} className="text-pink" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* STEP 1: Who are you? */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-300 slide-in-from-right-4">
                <p className="text-sm font-bold text-white/70 uppercase tracking-widest">Select the option that best describes you.</p>
                <div className="grid gap-3">
                  {USER_TYPES.map(({ value, label, description }) => (
                    <label
                      key={value}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border-4 cursor-pointer transition-all',
                        watch('userType') === value
                          ? 'border-pink bg-pink/10'
                          : 'border-black/20 bg-black/10 hover:border-white/20 hover:bg-black/20'
                      )}
                    >
                      <input type="radio" value={value} {...register('userType')} className="w-5 h-5 accent-pink" />
                      <div>
                        <p className="font-bold text-white uppercase tracking-wider">{label}</p>
                        <p className="text-xs font-semibold text-white/60 mt-1">{description}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <button type="button" onClick={handleNextStep} className="tl-pill-button w-full mt-4 flex justify-center items-center gap-2">
                  Continue <ChevronRight size={18} />
                </button>
                
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t-2 border-black/20" /></div>
                  <div className="relative flex justify-center text-xs uppercase font-black"><span className="bg-indigo px-4 text-white/40">Or</span></div>
                </div>
                
                <button type="button" onClick={handleGoogleSignIn} disabled={googleLoading} className="tl-pill-button-secondary w-full flex justify-center items-center gap-3">
                  {googleLoading ? <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with Google
                </button>
              </div>
            )}

            {/* STEP 2: Conditional user details */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-300 slide-in-from-right-4">
                <Field label="Full Name" required error={errors.displayName?.message}>
                  <input {...register('displayName')} placeholder="Your full name" className={cn("tl-input", errors.displayName && 'ring-2 ring-pink')} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Email" required error={errors.email?.message}>
                    <input type="email" {...register('email')} placeholder="you@ahduni.edu.in" className={cn("tl-input", errors.email && 'ring-2 ring-pink')} />
                  </Field>
                  <Field label="Contact" required error={errors.contact?.message}>
                    <input {...register('contact')} placeholder="+91 XXXXXXXXXX" className={cn("tl-input", errors.contact && 'ring-2 ring-pink')} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Password" required error={errors.password?.message}>
                    <input type="password" {...register('password')} placeholder="Min 6 chars" autoComplete="new-password" className={cn("tl-input", errors.password && 'ring-2 ring-pink')} />
                  </Field>
                  <Field label="Confirm Password" required error={errors.confirmPassword?.message}>
                    <input type="password" {...register('confirmPassword')} placeholder="Repeat password" autoComplete="new-password" className={cn("tl-input", errors.confirmPassword && 'ring-2 ring-pink')} />
                  </Field>
                </div>

                {/* Specifics... */}
                {userType === 'Student' && (
                  <div className="space-y-4 pt-4 border-t-2 border-black/20">
                    <p className="text-xs font-black text-pink uppercase tracking-widest">Student Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="University ID" required error={errors.universityId?.message}>
                        <input {...register('universityId')} placeholder="e.g. AU2440123" className={cn("tl-input", errors.universityId && 'ring-2 ring-pink')} />
                      </Field>
                      <Field label="Department" required error={errors.department?.message}>
                        <input {...register('department')} placeholder="e.g. CSE" className={cn("tl-input", errors.department && 'ring-2 ring-pink')} />
                      </Field>
                    </div>
                    <Field label="Course / Curriculum">
                      <input {...register('courseName')} placeholder="e.g. B.Tech CSE" className="tl-input" />
                    </Field>
                    <Field label="Faculty Advisor">
                      <input {...register('facultyAdvisor')} placeholder="Leave blank if not applicable" className="tl-input" />
                    </Field>
                    <Field label="Team Name">
                      <input {...register('teamName')} placeholder="Optional" className="tl-input" />
                    </Field>
                    <Field label="Team Members">
                      <textarea {...register('teamMembers')} placeholder="Names and IDs of teammates" className="tl-input min-h-[80px] resize-none" />
                    </Field>
                  </div>
                )}
                {userType === 'Professor or Faculty' && (
                  <div className="space-y-4 pt-4 border-t-2 border-black/20">
                    <p className="text-xs font-black text-pink uppercase tracking-widest">Faculty Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Department" required error={errors.department?.message}>
                        <input {...register('department')} placeholder="e.g. Mechanical" className={cn("tl-input", errors.department && 'ring-2 ring-pink')} />
                      </Field>
                      <Field label="Research Area" required error={errors.researchArea?.message}>
                        <input {...register('researchArea')} placeholder="Your research area" className={cn("tl-input", errors.researchArea && 'ring-2 ring-pink')} />
                      </Field>
                    </div>
                    <Field label="Associated Course">
                      <input {...register('associatedCourse')} placeholder="e.g. ME301" className="tl-input" />
                    </Field>
                    <Field label="Students Involved">
                      <textarea {...register('studentsInvolved')} placeholder="Names/IDs of students (optional)" className="tl-input min-h-[80px] resize-none" />
                    </Field>
                  </div>
                )}
                {userType === 'Venture Studio Startup' && (
                  <div className="space-y-4 pt-4 border-t-2 border-black/20">
                    <p className="text-xs font-black text-pink uppercase tracking-widest">Startup Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Startup Name" required error={errors.startupName?.message}>
                        <input {...register('startupName')} placeholder="Your startup's name" className={cn("tl-input", errors.startupName && 'ring-2 ring-pink')} />
                      </Field>
                      <Field label="Industry / Domain" required error={errors.industryDomain?.message}>
                        <input {...register('industryDomain')} placeholder="e.g. CleanTech" className={cn("tl-input", errors.industryDomain && 'ring-2 ring-pink')} />
                      </Field>
                    </div>
                    <Field label="Brief About Your Startup" required error={errors.startupBrief?.message}>
                      <textarea {...register('startupBrief')} placeholder="Describe your startup and what you're building..." className={cn("tl-input min-h-[80px] resize-none", errors.startupBrief && 'ring-2 ring-pink')} />
                    </Field>
                    <Field label="Team Members Using the Lab">
                      <textarea {...register('labTeamMembers')} placeholder="Names of team members who will use the lab (optional)" className="tl-input min-h-[80px] resize-none" />
                    </Field>
                  </div>
                )}
                {userType === 'External Visitor' && (
                  <div className="space-y-4 pt-4 border-t-2 border-black/20">
                    <p className="text-xs font-black text-pink uppercase tracking-widest">Visitor Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Organization / Institution" required error={errors.organization?.message}>
                        <input {...register('organization')} placeholder="Your organization" className={cn("tl-input", errors.organization && 'ring-2 ring-pink')} />
                      </Field>
                      <Field label="Designation / Role" required error={errors.designation?.message}>
                        <input {...register('designation')} placeholder="e.g. Researcher" className={cn("tl-input", errors.designation && 'ring-2 ring-pink')} />
                      </Field>
                    </div>
                    <Field label="Purpose of Visit" required error={errors.purposeOfVisit?.message}>
                      <textarea {...register('purposeOfVisit')} placeholder="Describe why you are visiting the lab..." className={cn("tl-input min-h-[80px] resize-none", errors.purposeOfVisit && 'ring-2 ring-pink')} />
                    </Field>
                    <Field label="Referral">
                      <input {...register('referral')} placeholder="Who referred you? (optional)" className="tl-input" />
                    </Field>
                  </div>
                )}

                <div className="flex gap-4 pt-4 mt-6 border-t-2 border-black/20">
                  <button type="button" onClick={() => setStep(1)} className="tl-pill-button-secondary flex-1 flex justify-center items-center gap-2">
                    <ChevronLeft size={18} /> Back
                  </button>
                  <button type="button" onClick={handleNextStep} className="tl-pill-button flex-1 flex justify-center items-center gap-2">
                    Continue <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Acknowledgements */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-300 slide-in-from-right-4">
                <p className="text-sm font-bold text-white/70 uppercase tracking-widest">Please read and confirm.</p>
                <label className={cn(
                  'flex items-start gap-4 p-5 rounded-xl border-4 cursor-pointer transition-colors',
                  errors.safetyAgreementAccepted ? 'border-pink bg-pink/10' : 'border-black/20 bg-black/10 hover:border-white/20'
                )}>
                  <input type="checkbox" {...register('safetyAgreementAccepted')} className="mt-1 w-5 h-5 accent-pink" />
                  <div>
                    <p className="font-bold text-white uppercase tracking-wider">Safety Agreement <span className="text-pink">*</span></p>
                    <p className="text-xs font-semibold text-white/60 mt-1">I agree to follow lab safety guidelines and return all tools and equipment after use.</p>
                    {errors.safetyAgreementAccepted && <p className="text-xs text-pink mt-2 font-bold">{errors.safetyAgreementAccepted.message}</p>}
                  </div>
                </label>
                <label className={cn(
                  'flex items-start gap-4 p-5 rounded-xl border-4 cursor-pointer transition-colors',
                  errors.termsAccepted ? 'border-pink bg-pink/10' : 'border-black/20 bg-black/10 hover:border-white/20'
                )}>
                  <input type="checkbox" {...register('termsAccepted')} className="mt-1 w-5 h-5 accent-pink" />
                  <div>
                    <p className="font-bold text-white uppercase tracking-wider">Terms Agreement <span className="text-pink">*</span></p>
                    <p className="text-xs font-semibold text-white/60 mt-1">I understand that equipment booking is subject to availability and coordinator approval.</p>
                    {errors.termsAccepted && <p className="text-xs text-pink mt-2 font-bold">{errors.termsAccepted.message}</p>}
                  </div>
                </label>

                <div className="flex gap-4 pt-4 mt-6 border-t-2 border-black/20">
                  <button type="button" onClick={() => setStep(2)} className="tl-pill-button-secondary flex-1 flex justify-center items-center gap-2">
                    <ChevronLeft size={18} /> Back
                  </button>
                  <button type="submit" disabled={isSubmitting} className="tl-pill-button flex-1 flex justify-center items-center gap-2">
                    {isSubmitting ? <div className="w-5 h-5 border-4 border-black/30 border-t-black rounded-full animate-spin" /> : <UserPlus size={18} />}
                    Create Account
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
