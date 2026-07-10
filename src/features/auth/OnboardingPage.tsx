import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { createUserProfile } from '@/services/firebase/auth'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Label } from '@/components/ui/label'
import type { UserType, UserProfile } from '@/types'

const USER_TYPES: { value: UserType; label: string; description: string }[] = [
  { value: 'Student', label: 'Student', description: 'University student working on coursework or personal projects' },
  { value: 'Professor or Faculty', label: 'Professor / Faculty', description: 'Faculty member using the lab for research or teaching' },
  { value: 'Venture Studio Startup', label: 'Venture Studio Startup', description: 'External startup partnered with Ahmedabad University' },
  { value: 'External Visitor', label: 'External Visitor', description: 'Outside individual or organization visiting the lab' },
]

const onboardingSchema = z.object({
  userType: z.enum(['Student', 'Professor or Faculty', 'Venture Studio Startup', 'External Visitor'] as const),
  contact: z.string().min(5, 'Contact number required'),
  displayName: z.string().min(2, 'Full name required'),
  // Student fields
  universityId: z.string().optional(),
  department: z.string().optional(),
  courseName: z.string().optional(),
  facultyAdvisor: z.string().optional(),
  // Professor fields
  researchArea: z.string().optional(),
  associatedCourse: z.string().optional(),
  studentsInvolved: z.string().optional(),
  // Venture Studio fields
  startupName: z.string().optional(),
  industryDomain: z.string().optional(),
  startupBrief: z.string().optional(),
  labTeamMembers: z.string().optional(),
  // External Visitor fields
  organization: z.string().optional(),
  designation: z.string().optional(),
  purposeOfVisit: z.string().optional(),
  referral: z.string().optional(),
  // Acknowledgements
  safetyAgreementAccepted: z.boolean().refine(v => v === true, 'You must accept the safety agreement'),
  termsAccepted: z.boolean().refine(v => v === true, 'You must accept the terms'),
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

type OnboardingForm = z.infer<typeof onboardingSchema>

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

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, profile, refetchProfile } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1=type, 2=details, 3=acknowledgements

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema) as any,
    defaultValues: {
      userType: 'Student',
      safetyAgreementAccepted: false,
      termsAccepted: false,
      displayName: user?.displayName || '',
    },
  })

  useEffect(() => {
    if (profile) {
      reset({
        userType: profile.userType,
        displayName: profile.displayName || user?.displayName || '',
        contact: profile.contact || '',
        universityId: profile.universityId || '',
        department: profile.department || '',
        courseName: profile.courseName || '',
        facultyAdvisor: profile.facultyAdvisor || '',
        researchArea: profile.researchArea || '',
        associatedCourse: profile.associatedCourse || '',
        studentsInvolved: profile.studentsInvolved || '',
        startupName: profile.startupName || '',
        industryDomain: profile.industryDomain || '',
        startupBrief: profile.startupBrief || '',
        labTeamMembers: profile.labTeamMembers || '',
        organization: profile.organization || '',
        designation: profile.designation || '',
        purposeOfVisit: profile.purposeOfVisit || '',
        referral: profile.referral || '',
        safetyAgreementAccepted: true,
        termsAccepted: true,
      })
    } else if (user) {
      if (user.displayName) setValue('displayName', user.displayName)
    }
  }, [profile, user, reset, setValue])

  const userType = watch('userType')
  const STEPS = ['Who are you?', 'Your details', 'Agreements']

  const handleNextStep = async () => {
    if (step === 1) {
      const ok = await trigger(['userType'])
      if (ok) setStep(2)
    } else if (step === 2) {
      const commonFields: (keyof OnboardingForm)[] = ['displayName', 'contact']
      const typeFields: Record<UserType, (keyof OnboardingForm)[]> = {
        'Student': ['universityId', 'department'],
        'Professor or Faculty': ['department', 'researchArea'],
        'Venture Studio Startup': ['startupName', 'industryDomain', 'startupBrief'],
        'External Visitor': ['organization', 'designation', 'purposeOfVisit'],
      }
      const ok = await trigger([...commonFields, ...typeFields[userType]])
      if (ok) setStep(3)
    }
  }

  const onSubmit = async (data: OnboardingForm) => {
    setError(null)
    if (!user) {
      setError('You must be signed in to complete onboarding.')
      return
    }
    try {
      await createUserProfile(user, data.displayName, {
        userType: data.userType,
        contact: data.contact,
        department: data.department,
        // Student-specific
        universityId: data.universityId,
        courseName: data.courseName,
        facultyAdvisor: data.facultyAdvisor,
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
      await refetchProfile()
      navigate('/', { replace: true })
      toast.success("Profile complete! Welcome to Tinkerers' Lab.")
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update profile')
      setStep(2)
    }
  }

  return (
    <div className="tl-shell flex-col lg:flex-row min-h-screen relative overflow-hidden bg-black text-white">
      {/* Visual / Brand Sidebar */}
      <div className="lg:w-[42%] flex flex-col justify-between p-8 md:p-12 m-4 lg:m-6 shadow-2xl relative overflow-hidden shrink-0" style={{ background: '#A3937C', borderRadius: 24 }}>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-black flex items-center justify-center rounded-full shadow-sm">
            <span className="font-bold text-pink text-xl">✿</span>
          </div>
          <div>
            <p className="font-black font-display text-xl uppercase text-black">TINKERERS LAB</p>
            <p className="text-black/60 text-xs font-bold uppercase">Ahmedabad University</p>
          </div>
        </div>
        <div className="relative z-10 mt-12 lg:mt-0">
          <h2 className="font-display font-black uppercase text-4xl xl:text-6xl leading-[0.85] mb-6 text-black">
            Complete<br />your profile.
          </h2>
          <p className="text-black/70 text-lg font-bold max-w-sm leading-tight">
            Please finalize your profile details to book machines, track checkouts, and access Tinkerers' Lab features.
          </p>
        </div>
        <div className="text-black/40 text-xs font-bold uppercase tracking-widest relative z-10 mt-12 lg:mt-0">
          Innovation & Tinkering Lab<br />Ahmedabad University
        </div>
      </div>

      {/* Profile Wizard Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 py-8 lg:p-12 relative z-10">
        <div className="w-full max-w-[560px] tl-panel-indigo shadow-2xl border-4 border-black/20 p-8 rounded-2xl">
          <div className="mb-8">
            <h1 className="font-display uppercase text-3xl font-black mb-1">Onboarding</h1>
            <p className="text-white/60 text-xs font-semibold mb-4">
              Logged in as <span className="text-pink font-bold">{user?.email}</span>
            </p>

            {/* Step progress */}
            <div className="flex items-center gap-2 mt-4">
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
            {/* STEP 1: Choose Description */}
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
              </div>
            )}

            {/* STEP 2: Profile Details */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-300 slide-in-from-right-4">
                <Field label="Full Name" required error={errors.displayName?.message}>
                  <input {...register('displayName')} placeholder="Your full name" className={cn("tl-input", errors.displayName && 'ring-2 ring-pink')} />
                </Field>
                
                <Field label="Contact Number" required error={errors.contact?.message}>
                  <input {...register('contact')} placeholder="+91 XXXXXXXXXX" className={cn("tl-input", errors.contact && 'ring-2 ring-pink')} />
                </Field>

                {/* Conditional Fields based on User Type */}
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
                      <input {...register('facultyAdvisor')} placeholder="Faculty advisor name (optional)" className="tl-input" />
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
                        <input {...register('startupName')} placeholder="Startup's name" className={cn("tl-input", errors.startupName && 'ring-2 ring-pink')} />
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

            {/* STEP 3: Agreements */}
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
                    Complete Profile
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
