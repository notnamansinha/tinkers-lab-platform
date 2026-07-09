import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { createBooking, getBookingsForSlot } from '@/services/firebase/bookings'
import { getUserProjects, userHasActiveProject } from '@/services/firebase/projects'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { cn, todayStr } from '@/lib/utils'
import type { Equipment, Project } from '@/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

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
  const { data: machines = [] } = useQuery({
    queryKey: ['equipment', 'bookable'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.EQUIPMENT)
      const q   = query(ref, where('tier', '==', 'bookable'), where('confirmed', '==', true), orderBy('name', 'asc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Equipment)
    },
    staleTime: 15 * 60 * 1000, // 15 min — equipment list rarely changes
  })

  // User's active projects for the project selector
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', 'user', user?.uid],
    queryFn: () => getUserProjects(user!.uid),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const {
    register, handleSubmit, watch, control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(bookingSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      equipmentId: params.get('machine') || '',
      date: todayStr(),
      safetyAgreementAccepted: false,
    },
  })

  const watchEquipmentId = watch('equipmentId')
  const watchDate        = watch('date')
  const watchStart       = watch('startTime')
  const selectedMachine  = machines.find(m => m.id === watchEquipmentId)
  const is3DPrinter      = selectedMachine?.category === 'Digital Fabrication' && selectedMachine?.name.toLowerCase().includes('printer')
  const isLaserCutter    = selectedMachine?.name.toLowerCase().includes('laser')

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

  // Guard: user must have a project before booking
  const hasNoProjects = !projectsLoading && projects.length === 0

  return (
    <div className="space-y-6 container py-6 mx-auto max-w-2xl animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Book a Machine</h1>
          <p className="text-muted-foreground mt-1">Reserve a time slot for a Tier 1 machine.</p>
        </div>
      </div>

      {/* No project guard */}
      {hasNoProjects && (
        <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm text-foreground">You need a registered project first</p>
            <p className="text-xs text-muted-foreground mt-1">
              All bookings must be linked to an active project.{' '}
              <button onClick={() => navigate('/projects/new')} className="text-primary underline underline-offset-2">Register a project →</button>
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Machine & Project ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Machine & Project</CardTitle>
            <CardDescription>Select the machine and which project this booking is for.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Machine" required error={errors.equipmentId?.message}>
              <select
                {...register('equipmentId')}
                className={cn(
                  'flex h-10 w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  errors.equipmentId && 'border-destructive'
                )}
              >
                <option value="">— Select a machine —</option>
                {machines.filter(m => m.status === 'available' || m.status === 'reserved').map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {machines.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">No confirmed machines available. Contact a coordinator.</p>
              )}
            </Field>

            <Field label="Project" required error={errors.projectId?.message}>
              <select
                {...register('projectId')}
                disabled={hasNoProjects}
                className={cn(
                  'flex h-10 w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                  errors.projectId && 'border-destructive'
                )}
              >
                <option value="">— Select a project —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.id} — {p.title}</option>
                ))}
              </select>
            </Field>
          </CardContent>
        </Card>

        {/* ── Date & Time ───────────────────────────────────────────── */}
        {watchEquipmentId && (
          <Card>
            <CardHeader>
              <CardTitle>Date & Time Slot</CardTitle>
              <CardDescription>
                {existingBookings.length > 0
                  ? `${existingBookings.length} slot(s) already booked on this date.`
                  : 'All slots available on selected date.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Booking Date" required error={errors.date?.message}>
                <Input type="date" {...register('date')} min={todayStr()} className={cn(errors.date && 'border-destructive')} />
              </Field>

              {watchDate && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start Time" required error={errors.startTime?.message}>
                    <Controller
                      control={control}
                      name="startTime"
                      render={({ field }) => (
                        <div className="grid grid-cols-3 gap-1.5">
                          {TIME_SLOTS.slice(0, -1).map(t => {
                            const booked = isTimeBooked(t)
                            return (
                              <button
                                key={t} type="button"
                                onClick={() => !booked && field.onChange(t)}
                                disabled={booked}
                                className={cn(
                                  'py-2 px-1 rounded-lg text-xs font-medium border-2 transition-all',
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
                        <div className="grid grid-cols-3 gap-1.5">
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
                                  'py-2 px-1 rounded-lg text-xs font-medium border-2 transition-all',
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
        {watchEquipmentId && (
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
              <div className="grid grid-cols-2 gap-4">
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
        {watchEquipmentId && (
          <label className={cn(
            'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors',
            errors.safetyAgreementAccepted ? 'border-destructive bg-destructive/5' : 'border-border hover:border-primary/40'
          )}>
            <input type="checkbox" {...register('safetyAgreementAccepted')} className="mt-0.5 w-4 h-4 accent-primary rounded" />
            <div>
              <p className="text-sm font-semibold text-foreground">Safety Agreement <span className="text-destructive">*</span></p>
              <p className="text-xs text-muted-foreground mt-1">
                I have received or will receive proper training for this machine, and I agree to follow all lab safety guidelines.
              </p>
              {errors.safetyAgreementAccepted && <p className="text-xs text-destructive mt-1">{errors.safetyAgreementAccepted.message}</p>}
            </div>
          </label>
        )}

        {/* ── Submit ────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button
            type="submit"
            disabled={isSubmitting || hasNoProjects || !watchEquipmentId}
            className="min-w-[160px] gap-2"
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
