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
import { ArrowLeft, Calendar, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn, todayStr } from '@/lib/utils'
import type { Equipment, Booking } from '@/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

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
  
  const selectClasses = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

  return (
    <div className="space-y-6 container py-6 mx-auto max-w-2xl animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Booking</h1>
          <p className="text-muted-foreground mt-1">Reserve a machine for your project.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Machine select */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment</CardTitle>
            <CardDescription>Select the machine you want to book.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Machine <span className="text-destructive">*</span></Label>
              <select className={cn(selectClasses, errors.equipmentId ? 'border-destructive' : '')} {...register('equipmentId')}>
                <option value="">— Select a machine —</option>
                {equipment.filter(e => ['available', 'reserved'].includes(e.status)).map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.category})</option>
                ))}
              </select>
              {errors.equipmentId && <p className="text-[0.8rem] text-destructive">{errors.equipmentId.message}</p>}
            </div>
            
            {selectedEquipment && (
              <div className="bg-muted/40 rounded-lg p-4 text-sm space-y-2 border">
                <p className="font-semibold text-foreground">{selectedEquipment.name}</p>
                <p className="text-muted-foreground">{selectedEquipment.description}</p>
                {selectedEquipment.requiresTraining && (
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-500 font-medium mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <p>Training required — ensure you are certified before booking.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card>
          <CardHeader>
            <CardTitle>Date & Time</CardTitle>
            <CardDescription>Choose an available time slot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input type="date" min={todayStr()} className={errors.date ? 'border-destructive' : ''} {...register('date')} />
              {errors.date && <p className="text-[0.8rem] text-destructive">{errors.date.message}</p>}
            </div>
            
            {watchEquipmentId && watchDate && existingBookings.length > 0 && (
              <Alert variant="default" className="bg-orange-50/50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/50">
                <AlertTitle className="text-orange-800 dark:text-orange-500 flex gap-2 items-center text-sm">
                  <Calendar className="h-4 w-4" /> Existing bookings on this date:
                </AlertTitle>
                <AlertDescription className="text-orange-800/80 dark:text-orange-500/80 mt-2 space-y-1">
                  {existingBookings.map(b => (
                    <div key={b.id} className="font-mono text-xs">• {b.startTime}–{b.endTime} ({b.status})</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Start time <span className="text-destructive">*</span></Label>
                <select className={cn(selectClasses, errors.startTime ? 'border-destructive' : '')} {...register('startTime')}>
                  <option value="">Select time</option>
                  {TIME_SLOTS.slice(0, -1).map(t => <option key={t} value={t} disabled={isTimeBooked(t)}>{t}{isTimeBooked(t) ? ' (booked)' : ''}</option>)}
                </select>
                {errors.startTime && <p className="text-[0.8rem] text-destructive">{errors.startTime.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>End time <span className="text-destructive">*</span></Label>
                <select className={cn(selectClasses, errors.endTime ? 'border-destructive' : '')} {...register('endTime')}>
                  <option value="">Select time</option>
                  {TIME_SLOTS.slice(1).map(t => <option key={t} value={t} disabled={isTimeBooked(t)}>{t}</option>)}
                </select>
                {errors.endTime && <p className="text-[0.8rem] text-destructive">{errors.endTime.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purpose */}
        <Card>
          <CardHeader>
            <CardTitle>Purpose</CardTitle>
            <CardDescription>Tell us what you plan to make.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Purpose / Description <span className="text-destructive">*</span></Label>
              <Textarea 
                rows={4} 
                placeholder="Describe what you will be working on..." 
                className={cn('resize-none', errors.purpose ? 'border-destructive' : '')} 
                {...register('purpose')} 
              />
              {errors.purpose && <p className="text-[0.8rem] text-destructive">{errors.purpose.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Project ID <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input type="text" placeholder="e.g. TL-001" {...register('projectId')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-12">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            Submit Booking
          </Button>
        </div>
      </form>
    </div>
  )
}
