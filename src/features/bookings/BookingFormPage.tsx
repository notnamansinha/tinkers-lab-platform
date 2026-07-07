import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { createBooking, getBookingsForSlot } from '@/services/firebase/bookings'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { cn, todayStr } from '@/lib/utils'
import type { Equipment, Booking } from '@/types'

const bookingSchema = z.object({
  equipmentId: z.string().min(1, 'Select a machine'),
  date: z.string().min(1, 'Select a date'),
  startTime: z.string().min(1, 'Select start time'),
  endTime: z.string().min(1, 'Select end time'),
  purpose: z.string().min(10, 'Describe purpose (min 10 chars)'),
  projectId: z.string().optional(),
}).refine(d => d.startTime < d.endTime, { message: 'End time must be after start time', path: ['endTime'] })

type BookingFormData = z.infer<typeof bookingSchema>

const TIME_SLOTS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00']

export default function BookingFormPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user, profile } = useAuth()
  const [slotConflicts, setSlotConflicts] = useState<Booking[]>([])

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.EQUIPMENT)
      const q = query(ref, orderBy('name', 'asc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Equipment)
    },
    staleTime: 15 * 60 * 1000,
  })

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      equipmentId: params.get('machine') || '',
      date: todayStr(),
    },
  })

  const watchEquipmentId = watch('equipmentId')
  const watchDate = watch('date')

  // Load existing bookings for selected slot to show conflicts
  const { data: existingBookings = [] } = useQuery({
    queryKey: ['bookings', 'slot', watchEquipmentId, watchDate],
    queryFn: () => getBookingsForSlot(watchEquipmentId, watchDate),
    enabled: !!watchEquipmentId && !!watchDate,
    staleTime: 60 * 1000,
  })

  const selectedEquipment = equipment.find(e => e.id === watchEquipmentId)

  const onSubmit = async (data: BookingFormData) => {
    if (!user || !profile) { toast.error('Please sign in'); return }
    const machine = equipment.find(e => e.id === data.equipmentId)
    if (!machine) { toast.error('Machine not found'); return }
    try {
      await createBooking({
        equipmentId: data.equipmentId,
        machineId: machine.machineId,
        machineName: machine.name,
        userId: user.uid,
        userEmail: user.email!,
        userName: profile.displayName,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        purpose: data.purpose,
        projectId: data.projectId,
      })
      toast.success('Booking submitted! Awaiting staff approval.')
      navigate('/bookings')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit booking')
    }
  }

  const isTimeBooked = (time: string) => existingBookings.some(b => b.startTime <= time && b.endTime > time)

  const inputClass = (hasError: boolean) => cn('w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring', hasError && 'border-destructive')

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-muted"><ArrowLeft size={18} /></button>
        <h1 className="text-2xl font-display font-bold">New Equipment Booking</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Machine select */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground">Select Machine</h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Machine *</label>
            <select className={inputClass(!!errors.equipmentId)} {...register('equipmentId')}>
              <option value="">— Select a machine —</option>
              {equipment.filter(e => ['available', 'reserved'].includes(e.status)).map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.category})</option>
              ))}
            </select>
            {errors.equipmentId && <p className="text-xs text-destructive">{errors.equipmentId.message}</p>}
          </div>
          {selectedEquipment && (
            <div className="bg-muted/50 rounded p-3 text-sm space-y-1">
              <p className="font-medium">{selectedEquipment.name}</p>
              <p className="text-muted-foreground text-xs">{selectedEquipment.description}</p>
              {selectedEquipment.requiresTraining && (
                <p className="text-orange-600 text-xs font-semibold">⚠ Training required — ensure you are certified</p>
              )}
            </div>
          )}
        </div>

        {/* Date & Time */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground">Date & Time</h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date *</label>
            <input type="date" min={todayStr()} className={inputClass(!!errors.date)} {...register('date')} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>
          {watchEquipmentId && watchDate && existingBookings.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded p-3 text-xs text-orange-800">
              <p className="font-semibold mb-1">Existing bookings on this date:</p>
              {existingBookings.map(b => <p key={b.id}>• {b.startTime}–{b.endTime} ({b.status})</p>)}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start time *</label>
              <select className={inputClass(!!errors.startTime)} {...register('startTime')}>
                <option value="">Select time</option>
                {TIME_SLOTS.slice(0, -1).map(t => <option key={t} value={t} disabled={isTimeBooked(t)}>{t}{isTimeBooked(t) ? ' (booked)' : ''}</option>)}
              </select>
              {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">End time *</label>
              <select className={inputClass(!!errors.endTime)} {...register('endTime')}>
                <option value="">Select time</option>
                {TIME_SLOTS.slice(1).map(t => <option key={t} value={t} disabled={isTimeBooked(t)}>{t}</option>)}
              </select>
              {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
            </div>
          </div>
        </div>

        {/* Purpose */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground">Purpose</h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Purpose / Description *</label>
            <textarea rows={3} placeholder="Describe what you will be working on…" className={cn(inputClass(!!errors.purpose), 'resize-none')} {...register('purpose')} />
            {errors.purpose && <p className="text-xs text-destructive">{errors.purpose.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Project ID (optional)</label>
            <input type="text" placeholder="e.g. TL-001" className={inputClass(false)} {...register('projectId')} />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">
            {isSubmitting ? <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" /> : <Calendar size={16} />}
            Submit Booking
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2.5 border rounded-md text-sm hover:bg-muted">Cancel</button>
        </div>
      </form>
    </div>
  )
}
