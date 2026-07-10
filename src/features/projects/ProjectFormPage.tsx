import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { doc, getDoc, collection, addDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { createProject } from '@/services/firebase/projects'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn, todayStr } from '@/lib/utils'
import type { Project, ExpectedEquipmentNeed } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// ── Equipment checkboxes per Spec 1 Form 1 Section 6 ────────────────────────
const EQUIPMENT_NEEDS: ExpectedEquipmentNeed[] = [
  '3D Printer', 'Laser Cutter', 'Muffle Furnace', 'Lathe Machine',
  'Sheet Bender', 'Pillar Drill', 'Table Saw', 'Mitre Saw', 'Cut-off Saw',
  'ESD Workstation', 'Oscilloscope', 'Function Generator', 'Soldering Station',
  'Hand Tools', 'Power Tools', 'Other',
]

const schema = z.object({
  title:    z.string().min(5, 'Title must be at least 5 characters'),
  abstract: z.string().min(50, 'Abstract must be at least 50 characters (describe goals and methods)'),
  contact:  z.string().min(5, 'Contact number or email required'),
  startDate: z.string().min(1, 'Start date required'),
  endDate:   z.string().optional(),
  resourceLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  expectedEquipmentNeeds: z.array(z.string()).default([]),
  equipmentNeedsOther: z.string().optional(),
  // Acknowledgements (Spec 1 §7)
  safetyAgreementAccepted: z.boolean().refine(v => v === true, 'You must accept the safety agreement'),
  termsAccepted: z.boolean().refine(v => v === true, 'You must accept the terms'),
})
type FormData = z.infer<typeof schema>

// ── Reusable field wrapper ───────────────────────────────────────────────────
function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {hint && <p className="text-xs text-muted-foreground -mt-1">{hint}</p>}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export default function ProjectFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const qc = useQueryClient()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const snap = await getDoc(doc(db, COLLECTIONS.PROJECTS, id!))
      if (!snap.exists()) return null
      return { id: snap.id, ...snap.data() } as Project
    },
    enabled: isEdit,
  })

  const {
    register, handleSubmit, reset, watch, control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      startDate: todayStr(),
      expectedEquipmentNeeds: [],
      safetyAgreementAccepted: false,
      termsAccepted: false,
    },
  })

  React.useEffect(() => {
    if (existing) {
      reset({
        title:    existing.title,
        abstract: existing.abstract,
        contact:  existing.contact,
        startDate: existing.startDate,
        endDate:   existing.endDate,
        resourceLink: existing.resourceLink ?? '',
        expectedEquipmentNeeds: existing.expectedEquipmentNeeds ?? [],
        equipmentNeedsOther: existing.equipmentNeedsOther ?? '',
        safetyAgreementAccepted: existing.safetyAgreementAccepted,
        termsAccepted: existing.termsAccepted,
      })
    }
  }, [existing, reset])

  const watchedNeeds = watch('expectedEquipmentNeeds')

  const onSubmit = async (data: FormData) => {
    if (!user || !profile) { toast.error('Sign in required'); return }
    try {
      if (isEdit) {
        await updateDoc(doc(db, COLLECTIONS.PROJECTS, id!), {
          title: data.title,
          abstract: data.abstract,
          contact: data.contact,
          startDate: data.startDate,
          endDate: data.endDate,
          resourceLink: data.resourceLink,
          expectedEquipmentNeeds: data.expectedEquipmentNeeds,
          equipmentNeedsOther: data.equipmentNeedsOther,
        })
        toast.success('Project updated')
        navigate(`/projects/${id}`)
      } else {
        const docId = await createProject({
          title:    data.title,
          abstract: data.abstract,
          contact:  data.contact,
          startDate: data.startDate,
          endDate:   data.endDate,
          resourceLink: data.resourceLink,
          expectedEquipmentNeeds: data.expectedEquipmentNeeds as ExpectedEquipmentNeed[],
          equipmentNeedsOther: data.equipmentNeedsOther,
          safetyAgreementAccepted: data.safetyAgreementAccepted,
          termsAccepted: data.termsAccepted,
          userId:    user.uid,
          userEmail: user.email!,
          userName:  profile.displayName,
          userType:  profile.userType,
          department: profile.department,
          universityId: profile.universityId,
          teamMembers: profile.teamMembers,
          facultyMentor: profile.facultyAdvisor,
        })
        toast.success('Project registered! Pending review by a coordinator.')
        navigate(`/projects/${docId}`)
      }
      qc.invalidateQueries({ queryKey: ['projects'] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save project')
    }
  }

  if (isLoading) return <LoadingSpinner text="Loading project…" />

  return (
    <div className="space-y-6 container py-6 mx-auto max-w-3xl animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isEdit ? 'Edit Project' : 'Register a Project'}</h1>
          <p className="text-muted-foreground mt-1">
            {isEdit ? 'Update your project details.' : 'Register once — then book machines and checkout tools against this project.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Project Details (Spec 1 §6) ──────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Describe what you are building and when.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            <Field label="Project Title" required error={errors.title?.message}>
              <Input {...register('title')} placeholder="Enter your project title" className={cn(errors.title && 'border-destructive')} />
            </Field>

            <Field label="Project Abstract" required error={errors.abstract?.message}
              hint="Describe your project, its goals, and methods. Minimum 50 characters.">
              <Textarea
                {...register('abstract')}
                rows={5}
                placeholder="What are you building? What's the goal? What methods will you use?"
                className={cn('resize-none', errors.abstract && 'border-destructive')}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Start Date" required error={errors.startDate?.message}>
                <Input type="date" {...register('startDate')} className={cn(errors.startDate && 'border-destructive')} />
              </Field>
              <Field label="Estimated End Date">
                <Input type="date" {...register('endDate')} />
              </Field>
            </div>

            <Field label="Contact Number" required error={errors.contact?.message}>
              <Input {...register('contact')} placeholder="+91 XXXXXXXXXX or your email" className={cn(errors.contact && 'border-destructive')} />
            </Field>

            <div className="space-y-3 pt-2">
              <Field label="Project Resource Link" hint="GitHub, Google Drive, Notion, or any public link (optional)">
                <Input type="url" {...register('resourceLink')} placeholder="https://github.com/your-project" />
              </Field>
              <div className="p-3 border-2 border-dashed rounded-lg bg-muted/30 text-sm text-muted-foreground flex items-center justify-between">
                <span className="font-medium">Project Documentation / File Upload</span>
                <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-[10px] font-bold uppercase tracking-wider">Coming Soon</span>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* ── Expected Equipment Needs (Spec 1 §6, checkboxes) ─────── */}
        <Card>
          <CardHeader>
            <CardTitle>Expected Equipment Needs</CardTitle>
            <CardDescription>Select all equipment you expect to use. This helps coordinators plan ahead. (Optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              control={control}
              name="expectedEquipmentNeeds"
              render={({ field }) => (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                  {EQUIPMENT_NEEDS.map((item) => {
                    const checked = field.value?.includes(item) ?? false
                    return (
                      <label key={item} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const current = field.value ?? []
                            field.onChange(
                              checked
                                ? current.filter((v: string) => v !== item)
                                : [...current, item]
                            )
                          }}
                          className="w-4 h-4 rounded accent-primary"
                        />
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">{item}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            />
            {/* Conditional "Other" text field */}
            {watchedNeeds?.includes('Other') && (
              <Field label="If Other, please specify">
                <Input {...register('equipmentNeedsOther')} placeholder="Describe the equipment you need" />
              </Field>
            )}
          </CardContent>
        </Card>

        {/* ── Acknowledgements (Spec 1 §7) — hidden in edit mode ───── */}
        {!isEdit && (
          <Card>
            <CardHeader>
              <CardTitle>Acknowledgements</CardTitle>
              <CardDescription>Please read and confirm before submitting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className={cn(
                'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors',
                errors.safetyAgreementAccepted ? 'border-destructive bg-destructive/5' : 'border-border hover:border-primary/30'
              )}>
                <input type="checkbox" {...register('safetyAgreementAccepted')} className="mt-0.5 w-4 h-4 accent-primary rounded" />
                <div>
                  <p className="text-sm font-medium">Safety Agreement <span className="text-destructive">*</span></p>
                  <p className="text-xs text-muted-foreground mt-1">
                    I agree to follow lab safety guidelines and return all tools and equipment after use.
                  </p>
                  {errors.safetyAgreementAccepted && <p className="text-xs text-destructive mt-1">{errors.safetyAgreementAccepted.message}</p>}
                </div>
              </label>

              <label className={cn(
                'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors',
                errors.termsAccepted ? 'border-destructive bg-destructive/5' : 'border-border hover:border-primary/30'
              )}>
                <input type="checkbox" {...register('termsAccepted')} className="mt-0.5 w-4 h-4 accent-primary rounded" />
                <div>
                  <p className="text-sm font-medium">Terms Agreement <span className="text-destructive">*</span></p>
                  <p className="text-xs text-muted-foreground mt-1">
                    I understand that equipment booking is subject to availability and coordinator approval.
                  </p>
                  {errors.termsAccepted && <p className="text-xs text-destructive mt-1">{errors.termsAccepted.message}</p>}
                </div>
              </label>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2 min-w-[160px]">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save Changes' : 'Submit for Review'}
          </Button>
        </div>
      </form>
    </div>
  )
}
