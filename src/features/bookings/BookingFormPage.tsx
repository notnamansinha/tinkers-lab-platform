import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, Controller, type SubmitErrorHandler } from 'react-hook-form'
import { typedZodResolver } from '@/lib/form'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { createBooking, getBookingsForSlot } from '@/services/firebase/bookings'
import { getUserProjects } from '@/services/firebase/projects'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, AlertTriangle, CheckCircle2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn, todayStr } from '@/lib/utils'
import type { Equipment } from '@/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AgreementCard, FullBleedQuestionCard } from '@/components/visual'
import { AestheticDatePicker } from '@/components/common/AestheticDatePicker'

// ── Hourly time slots (9am–6pm) ──────────────────────────────────────────────
const TIME_SLOTS = [
  '09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00',
]

// ── Filament types for 3D printers (Spec 2 consumables) ─────────────────────
const FILAMENT_TYPES = ['PLA', 'PLA+', 'ABS', 'PETG', 'TPU', 'ASA', 'Resin', 'Other']
const MATERIAL_TYPES = ['Acrylic', 'MDF', 'Plywood', 'Cardboard', 'Other']

// ── Schema ───────────────────────────────────────────────────────────────────
const bookingSchema = z.object({
  equipmentId: z.string().min(1, 'Select a machine'),
  projectId:   z.string().min(1, 'Select a project — all bookings require a project'),
  date:        z.string().min(1, 'Select a date'),
  startTime:   z.string().min(1, 'Select start time'),
  endTime:     z.string().min(1, 'Select end time'),
  purpose:     z.string().min(10, 'Describe your purpose (min 10 characters)'),
  // Consumables — 3D Printer
  filamentType:            z.string().optional(),
  filamentColor:           z.string().optional(),
  filamentQuantityGrams:   z.coerce.number().optional(),
  // Consumables — Laser Cutter
  materialType:  z.string().optional(),
  materialSize:  z.string().optional(),
  // Acknowledgement
  safetyAgreementAccepted: z.boolean().refine(v => v === true, 'You must accept the safety agreement'),
}).refine(d => d.startTime < d.endTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
})
type FormData = z.infer<typeof bookingSchema>

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

export default function BookingFormPage() {
  const navigate  = useNavigate()
  const [params]  = useSearchParams()
  const { user, profile } = useAuth()
  const qc = useQueryClient()

  // Only show confirmed Tier 1 (bookable) machines — Spec 2 core decision
  const { data: machines = [], isLoading: machinesLoading, isError: machinesError } = useQuery({
    queryKey: ['equipment', 'bookable-confirmed'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.EQUIPMENT)
      const q   = query(ref, orderBy('name', 'asc'))
      const snap = await getDocs(q)
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }) as Equipment)
        .filter(m => m.tier === 'bookable' && m.confirmed === true)
    },
    staleTime: 15 * 60 * 1000, // 15 min — equipment list rarely changes
  })

  // User's active projects for the project selector
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', 'user', user?.uid],
    queryFn: () => getUserProjects(user!.uid, 'active'),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const {
    register, handleSubmit, watch, control, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: typedZodResolver(bookingSchema),
    defaultValues: {
      equipmentId: params.get('machine') || '',
      date: todayStr(),
      safetyAgreementAccepted: false,
    },
  })

  const watchEquipmentId = watch('equipmentId')
  const watchProjectId   = watch('projectId')
  const watchDate        = watch('date')
  const watchStart       = watch('startTime')
  const selectedMachine  = machines.find(m => m.id === watchEquipmentId)
  const is3DPrinter      = selectedMachine?.category === 'Digital Fabrication' && selectedMachine?.name.toLowerCase().includes('printer')
  const isLaserCutter    = selectedMachine?.name.toLowerCase().includes('laser')
  const selectableMachines = machines.filter(m => m.status === 'available' || m.status === 'reserved')

  React.useEffect(() => {
    const machineParam = params.get('machine')
    if (machineParam && machines.length > 0 && !selectableMachines.some(m => m.id === machineParam)) {
      setValue('equipmentId', '')
    }
  }, [machines, selectableMachines, params, setValue])

  const prevProjectId = React.useRef<string | undefined>(undefined)

  React.useEffect(() => {
    if (prevProjectId.current !== undefined && watchProjectId !== prevProjectId.current) {
      setValue('equipmentId', '')
    }
    prevProjectId.current = watchProjectId
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchProjectId])

  // Existing bookings for this machine + date (for conflict display)
  const { data: existingBookings = [] } = useQuery({
    queryKey: ['bookings', 'slot', watchEquipmentId, watchDate],
    queryFn:  () => getBookingsForSlot(watchEquipmentId, watchDate),
    enabled:  !!watchEquipmentId && !!watchDate,
    staleTime: 60 * 1000, // 1 min — slots can change
  })

  const isTimeBooked = (time: string) =>
    existingBookings.some(b => b.startTime <= time && b.endTime > time)

  const onSubmit = async (data: FormData) => {
    if (!user || !profile) { toast.error('Please sign in'); return }
    if (!selectedMachine)  { toast.error('Machine not found'); return }

    const selectedProject = projects.find(p => p.id === data.projectId)

    try {
      await createBooking({
        equipmentId: data.equipmentId,
        machineId:   selectedMachine.machineId,
        machineName: selectedMachine.name,
        userId:      user.uid,
        userEmail:   user.email!,
        userName:    profile.displayName,
        projectId:   data.projectId,
        projectTitle: selectedProject?.title ?? '',
        date:        data.date,
        startTime:   data.startTime,
        endTime:     data.endTime,
        purpose:     data.purpose,
        safetyAgreementAccepted: data.safetyAgreementAccepted,
        consumables: (is3DPrinter || isLaserCutter) ? {
          filamentType:            data.filamentType,
          filamentColor:           data.filamentColor,
          filamentQuantityGrams:   data.filamentQuantityGrams,
          materialType:            data.materialType,
          materialSize:            data.materialSize,
        } : undefined,
      })
      toast.success('Booking confirmed! Check your bookings page for details.')
      qc.invalidateQueries({ queryKey: ['bookings'] })
      navigate('/bookings')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create booking')
    }
  }

  const onInvalid: SubmitErrorHandler<FormData> = (formErrors) => {
    const messages = Object.values(formErrors)
      .map((e) => e?.message)
      .filter(Boolean)
    if (messages.length > 0) {
      toast.error(`Booking form incomplete: ${messages[0]}`)
    } else {
      toast.error('Please fill in all required booking fields correctly.')
    }
  }

  // Guard: user must have a project before booking
  const hasNoProjects = !projectsLoading && projects.length === 0

  return (
    <div className="mx-auto max-w-5xl space-y-5 py-4 animate-fade-in sm:space-y-6 sm:py-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-white/10">
          <ArrowLeft className="h-5 w-5 text-white" />
        </Button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Book a Machine</h1>
          <p className="text-white/60 text-xs sm:text-sm mt-1">Reserve a time slot for a Tier 1 machine.</p>
        </div>
      </div>

      {/* No project guard */}
      {hasNoProjects && (
        <div className="flex items-start gap-3 rounded-card border border-orange/40 bg-orange/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange" />
          <div>
            <p className="font-semibold text-sm text-white">You need an approved project first</p>
            <p className="text-xs text-white/50 mt-1">
              All bookings must be linked to an active project.{' '}
              <button onClick={() => navigate('/projects/new')} className="text-orange underline underline-offset-2">Register a project →</button>
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5">

        {/* ── Machine & Project ─────────────────────────────────────── */}
        <FullBleedQuestionCard
          eyebrow="New machine booking"
          title="What will you build next?"
          description="Choose your registered project first, then select a machine. Available times will appear once a machine is chosen."
          controls={(
            <>
               <Field label="Project" required error={errors.projectId?.message}>
              <select
                {...register('projectId')}
                disabled={hasNoProjects}
                className={cn(
                  'tl-input disabled:opacity-50',
                  errors.projectId && 'border-pink'
                )}
              >
                <option value="">— Select a project —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.id} — {p.title}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => navigate('/projects/new')}
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-pink px-3 py-1 text-xs font-bold text-black transition-all hover:brightness-110"
              >
                <Plus size={12} /> New Project
              </button>
            </Field>

            {watchProjectId && (
            <Field label="Machine" required error={errors.equipmentId?.message}>
              <select
                {...register('equipmentId')}
                className={cn(
                  'tl-input',
                  errors.equipmentId && 'border-pink'
                )}
                disabled={machinesLoading || machinesError || selectableMachines.length === 0}
              >
                <option value="">— Select a machine —</option>
                {selectableMachines.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {machinesLoading && (
                <p className="mt-1 text-xs text-white/40">Loading machines…</p>
              )}
              {machinesError && (
                <p className="mt-1 text-xs font-semibold text-orange">Failed to load machines. Check your connection or try refreshing.</p>
              )}
              {!machinesLoading && !machinesError && machines.length === 0 && (
                <p className="mt-1 text-xs font-semibold text-orange">No bookable machines are confirmed in the database. An admin needs to seed equipment first.</p>
              )}
              {!machinesLoading && !machinesError && machines.length > 0 && selectableMachines.length === 0 && (
                <p className="mt-1 text-xs font-semibold text-orange">All machines are currently unavailable. Check back later or contact a coordinator.</p>
              )}
            </Field>
            )}
            </>
          )}
        />

        {/* ── Date & Time ───────────────────────────────────────────── */}
        {watchProjectId && watchEquipmentId && (
          <Card className="rounded-card border border-hairline bg-near-black text-white">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Date & Time Slot</CardTitle>
              <CardDescription className="text-white/60 text-xs">
                {existingBookings.length > 0
                  ? `${existingBookings.length} slot(s) already booked on this date.`
                  : 'All slots available on selected date.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Booking Date" required error={errors.date?.message}>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => (
                    <AestheticDatePicker
                      value={field.value}
                      onChange={field.onChange}
                      minDate={todayStr()}
                      error={!!errors.date}
                    />
                  )}
                />
              </Field>

              {watchDate && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Start Time" required error={errors.startTime?.message}>
                    <Controller
                      control={control}
                      name="startTime"
                      render={({ field }) => (
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                          {TIME_SLOTS.slice(0, -1).map(t => {
                            const booked = isTimeBooked(t)
                            return (
                              <button
                                key={t} type="button"
                                onClick={() => !booked && field.onChange(t)}
                                disabled={booked}
                                className={cn(
                                   'min-h-10 rounded-lg border-2 px-1 py-2 text-xs font-medium transition-all',
                                  booked
                                    ? 'bg-destructive/10 border-destructive/20 text-destructive/50 cursor-not-allowed line-through'
                                    : field.value === t
                                      ? 'bg-primary border-primary text-primary-foreground'
                                      : 'bg-background border-border hover:border-primary/50 text-foreground'
                                )}
                              >{t}</button>
                            )
                          })}
                        </div>
                      )}
                    />
                  </Field>
                  <Field label="End Time" required error={errors.endTime?.message}>
                    <Controller
                      control={control}
                      name="endTime"
                      render={({ field }) => (
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                          {TIME_SLOTS.slice(1).map(t => {
                            const booked = isTimeBooked(t)
                            const beforeStart = watchStart && t <= watchStart
                            const disabled = booked || !!beforeStart
                            return (
                              <button
                                key={t} type="button"
                                onClick={() => !disabled && field.onChange(t)}
                                disabled={disabled}
                                className={cn(
                                   'min-h-10 rounded-lg border-2 px-1 py-2 text-xs font-medium transition-all',
                                  booked
                                    ? 'bg-destructive/10 border-destructive/20 text-destructive/50 cursor-not-allowed line-through'
                                    : beforeStart
                                      ? 'opacity-30 cursor-not-allowed border-border'
                                      : field.value === t
                                        ? 'bg-primary border-primary text-primary-foreground'
                                        : 'bg-background border-border hover:border-primary/50 text-foreground'
                                )}
                              >{t}</button>
                            )
                          })}
                        </div>
                      )}
                    />
                  </Field>
                </div>
              )}

              {existingBookings.length > 0 && (
                <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booked Slots</p>
                  {existingBookings.map(b => (
                    <div key={b.id} className="flex items-center gap-2 text-xs text-foreground">
                      <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                      {b.startTime} – {b.endTime} ({b.userName})
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Purpose ───────────────────────────────────────────────── */}
        {watchProjectId && watchEquipmentId && (
          <Card>
            <CardHeader><CardTitle>Purpose of Use</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Purpose" required error={errors.purpose?.message}>
                <Textarea
                  {...register('purpose')}
                  rows={3}
                  placeholder="What will you be making/doing on this machine?"
                  className={cn('resize-none', errors.purpose && 'border-destructive')}
                />
              </Field>
            </CardContent>
          </Card>
        )}

        {/* ── Consumables — 3D Printer (Spec 2 conditional section) ── */}
        {is3DPrinter && (
          <Card>
            <CardHeader>
              <CardTitle>Filament Details</CardTitle>
              <CardDescription>
                Logged per booking for monthly procurement planning. (Spec: "used 10kg PLA+ this month")
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Filament Type">
                  <select {...register('filamentType')} className="flex h-10 w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Select type</option>
                    {FILAMENT_TYPES.map(f => <option key={f}>{f}</option>)}
                  </select>
                </Field>
                <Field label="Color">
                  <Input {...register('filamentColor')} placeholder="e.g. Black, White" />
                </Field>
              </div>
              <Field label="Estimated Quantity (grams)">
                <Input type="number" {...register('filamentQuantityGrams')} placeholder="e.g. 150" min={1} />
              </Field>
            </CardContent>
          </Card>
        )}

        {/* ── Consumables — Laser Cutter (Spec 2 conditional section) */}
        {isLaserCutter && (
          <Card>
            <CardHeader>
              <CardTitle>Material Details</CardTitle>
              <CardDescription>
                Logged per booking for monthly procurement planning. (Spec: "20 acrylic sheets this month")
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Material Type">
                <select {...register('materialType')} className="flex h-10 w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Select material</option>
                  {MATERIAL_TYPES.map(m => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Size / Dimensions">
                <Input {...register('materialSize')} placeholder="e.g. A3, 300×200mm, 3mm thick" />
              </Field>
            </CardContent>
          </Card>
        )}

        {/* ── Safety Agreement (Spec 2 required checkbox) ───────────── */}
        {watchProjectId && watchEquipmentId && (
          <AgreementCard
            title="Safety Agreement"
            description="I have received or will receive proper training for this machine, and I agree to follow all lab safety guidelines."
            inputProps={register('safetyAgreementAccepted')}
            error={errors.safetyAgreementAccepted?.message}
            required
          />
        )}

        {/* ── Submit ────────────────────────────────────────────────── */}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">Cancel</Button>
          <Button
            type="submit"
            disabled={isSubmitting || hasNoProjects || !watchEquipmentId}
            className="w-full gap-2 sm:min-w-[160px] sm:w-auto"
          >
            {isSubmitting
              ? <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Booking…</>
              : <><CheckCircle2 className="w-4 h-4" /> Confirm Booking</>
            }
          </Button>
        </div>
      </form>
    </div>
  )
}
