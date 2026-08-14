import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { typedZodResolver } from '@/lib/form'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { createProject } from '@/services/firebase/projects'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Save, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn, todayStr, cleanFirestoreData } from '@/lib/utils'
import type { Project, ExpectedEquipmentNeed } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { AestheticDatePicker } from '@/components/common/AestheticDatePicker'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AgreementCard } from '@/components/visual'

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
  resourceLink: z.string().refine(v => v === '' || /^https?:\/\//i.test(v), 'Must be a valid http(s) URL').optional().or(z.literal('')),
  expectedEquipmentNeeds: z.array(z.string()).default([]),
  equipmentNeedsOther: z.string().optional(),
  safetyAgreementAccepted: z.boolean().refine(v => v === true, 'You must accept the safety agreement'),
  termsAccepted: z.boolean().refine(v => v === true, 'You must accept the terms'),
})
type FormData = z.infer<typeof schema>

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-white">
        {label} {required && <span className="text-pink">*</span>}
      </Label>
      {hint && <p className="text-xs text-white/50 -mt-1">{hint}</p>}
      {children}
      {error && <p className="text-xs font-bold text-pink mt-1 animate-fade-in">{error}</p>}
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
    register, handleSubmit, reset, setValue, watch, control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: typedZodResolver(schema),
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
        endDate:   existing.endDate ?? '',
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
        await updateDoc(doc(db, COLLECTIONS.PROJECTS, id!), cleanFirestoreData({
          title: data.title,
          abstract: data.abstract,
          contact: data.contact,
          startDate: data.startDate,
          endDate: data.endDate || null,
          resourceLink: data.resourceLink || null,
          expectedEquipmentNeeds: data.expectedEquipmentNeeds,
          equipmentNeedsOther: data.equipmentNeedsOther || null,
          safetyAgreementAccepted: data.safetyAgreementAccepted,
          termsAccepted: data.termsAccepted,
        }))
        toast.success('Project updated')
        navigate(`/projects/${id}`)
      } else {
        const docId = await createProject({
          title:    data.title,
          abstract: data.abstract,
          contact:  data.contact,
          startDate: data.startDate,
          endDate:   data.endDate || '',
          resourceLink: data.resourceLink || '',
          expectedEquipmentNeeds: data.expectedEquipmentNeeds as ExpectedEquipmentNeed[],
          equipmentNeedsOther: data.equipmentNeedsOther || '',
          safetyAgreementAccepted: data.safetyAgreementAccepted,
          termsAccepted: data.termsAccepted,
          userId:    user.uid,
          userEmail: user.email!,
          userName:  profile.displayName || user.email!,
          userType:  profile.userType || 'student',
          department: profile.department || 'General',
          teamMembers: typeof profile.teamMembers === 'string' ? profile.teamMembers : '',
          facultyMentor: profile.facultyAdvisor || '',
        })
        toast.success('Project registered! Pending review by a coordinator.')
        navigate(`/projects/${docId}`)
      }
      qc.invalidateQueries({ queryKey: ['projects'] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save project')
    }
  }

  const onInvalid = (formErrors: any) => {
    const messages = Object.values(formErrors)
      .map((e: any) => e?.message)
      .filter(Boolean)
    if (messages.length > 0) {
      toast.error(`Form incomplete: ${messages[0]}`)
    } else {
      toast.error('Please complete all required fields correctly.')
    }
  }

  if (isLoading) return <LoadingSpinner text="Loading project…" />

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-4 animate-fade-in sm:space-y-6 sm:py-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-white/10">
          <ArrowLeft className="h-5 w-5 text-white" />
        </Button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">{isEdit ? 'Edit Project' : 'Register a Project'}</h1>
          <p className="text-white/60 text-xs sm:text-sm mt-1">
            {isEdit ? 'Update your project details.' : 'Register once — then book machines and checkout tools against this project.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <Card className="rounded-card border border-hairline bg-near-black text-white">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Project Details</CardTitle>
            <CardDescription className="text-white/60 text-xs">Describe what you are building and when.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field label="Project Title" required error={errors.title?.message}>
              <Input
                {...register('title')}
                placeholder="Enter your project title"
                className={cn('bg-black/50 border-hairline text-white placeholder:text-white/40', errors.title && 'border-pink')}
              />
            </Field>

            <Field
              label="Project Abstract"
              required
              error={errors.abstract?.message}
              hint="Describe your project, its goals, and methods. Minimum 50 characters."
            >
              <Textarea
                {...register('abstract')}
                rows={5}
                placeholder="What are you building? What's the goal? What methods will you use?"
                className={cn('resize-none bg-black/50 border-hairline text-white placeholder:text-white/40', errors.abstract && 'border-pink')}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Start Date" required error={errors.startDate?.message}>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <AestheticDatePicker
                      value={field.value}
                      onChange={field.onChange}
                      error={!!errors.startDate}
                    />
                  )}
                />
              </Field>
              <Field label="End Date" hint="Update this if your project timeline changes.">
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <AestheticDatePicker
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Optional end date"
                    />
                  )}
                />
              </Field>
            </div>

            <Field label="Contact Number" required error={errors.contact?.message}>
              <Input
                {...register('contact')}
                placeholder="+91 XXXXXXXXXX or your email"
                className={cn('bg-black/50 border-hairline text-white placeholder:text-white/40', errors.contact && 'border-pink')}
              />
            </Field>

            <div className="space-y-3 pt-2">
              <Field label="Project Resource Link" hint="GitHub, Google Drive, Notion, or any public link (optional)">
                <Input
                  type="url"
                  {...register('resourceLink')}
                  placeholder="https://github.com/your-project"
                  className="bg-black/50 border-hairline text-white placeholder:text-white/40"
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Needs */}
        <Card className="rounded-card border border-hairline bg-near-black text-white">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Expected Equipment Needs</CardTitle>
            <CardDescription className="text-white/60 text-xs">Select all equipment category types your project will likely require.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              name="expectedEquipmentNeeds"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {EQUIPMENT_NEEDS.map(item => {
                    const checked = (field.value || []).includes(item)
                    return (
                      <label
                        key={item}
                        className={cn(
                          'flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all duration-150 select-none',
                          checked
                            ? 'bg-lime border-lime text-black shadow-md shadow-lime/20'
                            : 'bg-black/40 border-hairline text-white/70 hover:border-white/30 hover:text-white'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const cur = field.value || []
                            field.onChange(
                              e.target.checked ? [...cur, item] : cur.filter(x => x !== item)
                            )
                          }}
                          className="sr-only"
                        />
                        <span
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-all',
                            checked
                              ? 'bg-black border-black text-lime font-extrabold'
                              : 'border-white/30 bg-white/5'
                          )}
                        >
                          <Check className={cn('h-3 w-3 stroke-[3]', checked ? 'opacity-100' : 'opacity-0')} />
                        </span>
                        <span className="truncate">{item}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            />

            {watchedNeeds?.includes('Other') && (
              <Field label="Specify Other Equipment">
                <Input
                  {...register('equipmentNeedsOther')}
                  placeholder="List any specialized tools required"
                  className="bg-black/50 border-hairline text-white placeholder:text-white/40"
                />
              </Field>
            )}
          </CardContent>
        </Card>

        {/* Safety Agreement */}
        <Card className="rounded-card border border-hairline bg-near-black text-white">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Safety & Terms Agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AgreementCard
              title="Lab Safety Agreement"
              required
              description="I agree to operate equipment only after receiving induction, follow all lab safety rules, wear appropriate PPE, report any damage immediately, and clean up my workstation after use."
              inputProps={{
                checked: watch('safetyAgreementAccepted'),
                onChange: (e) => {
                  setValue('safetyAgreementAccepted', e.target.checked, { shouldValidate: true })
                },
              }}
              error={errors.safetyAgreementAccepted?.message}
            />

            <AgreementCard
              title="Accuracy & Policy Confirmation"
              required
              description="I confirm that all provided details are accurate and agree to abide by all lab policy guidelines and safety terms."
              inputProps={{
                checked: watch('termsAccepted'),
                onChange: (e) => {
                  setValue('termsAccepted', e.target.checked, { shouldValidate: true })
                },
              }}
              error={errors.termsAccepted?.message}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="h-11 w-full rounded-full border-hairline bg-white/5 px-6 text-xs font-bold text-white hover:bg-white/10 sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full gap-2 rounded-full bg-lime px-8 text-xs font-bold text-black shadow-sm hover:bg-lime/90 sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> {isEdit ? 'Save Changes' : 'Submit Project'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
