import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getDocument, addDocument, updateDocument, COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { MaintenanceRecord, Equipment } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const schema = z.object({
  equipmentId: z.string().min(1, 'Select equipment'),
  type: z.enum(['preventive','corrective','calibration','repair','inspection']),
  status: z.enum(['scheduled','in_progress','completed','cancelled']),
  title: z.string().min(3, 'Title required'),
  description: z.string().min(5, 'Description required'),
  scheduledDate: z.string().min(1, 'Date required'),
  completedDate: z.string().optional(),
  technician: z.string().min(2, 'Technician name required'),
  technicianContact: z.string().optional(),
  parts: z.string().optional(),
  laborCost: z.coerce.number().optional(),
  partsCost: z.coerce.number().optional(),
  downtimeHours: z.coerce.number().optional(),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function MaintenanceFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { isStaff } = useAuth()
  const qc = useQueryClient()

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

  const { data: existing, isLoading } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: () => getDocument<MaintenanceRecord>(COLLECTIONS.MAINTENANCE, id!),
    enabled: isEdit,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { type: 'preventive', status: 'scheduled' },
  })

  React.useEffect(() => {
    if (existing) {
      reset({
        equipmentId: existing.equipmentId, type: existing.type as any, status: existing.status as any,
        title: existing.title, description: existing.description,
        scheduledDate: existing.scheduledDate, completedDate: existing.completedDate,
        technician: existing.technician, technicianContact: existing.technicianContact,
        parts: existing.parts, laborCost: existing.laborCost, partsCost: existing.partsCost,
        downtimeHours: existing.downtimeHours, notes: existing.notes,
      })
    }
  }, [existing, reset])


  const onSubmit = async (data: FormData) => {
    if (!isStaff) return
    const eq = equipment.find(e => e.id === data.equipmentId)
    if (!eq) { toast.error('Equipment not found'); return }
    const payload = { ...data, machineId: eq.machineId, machineName: eq.name, reportUrls: existing?.reportUrls ?? [] }
    try {
      if (isEdit) { await updateDocument(COLLECTIONS.MAINTENANCE, id!, payload); toast.success('Updated') }
      else { const nId = await addDocument<MaintenanceRecord>(COLLECTIONS.MAINTENANCE, payload as Omit<MaintenanceRecord,'id'|'createdAt'|'updatedAt'>); toast.success('Scheduled'); navigate(`/maintenance/${nId}`); return }
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      navigate(`/maintenance/${id}`)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  if (!isStaff) return <div className="py-16 text-center text-muted-foreground">Staff access required.</div>
  if (isLoading) return <LoadingSpinner text="Loading…" />

  const selectClasses = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

  return (
    <div className="space-y-6 container py-6 mx-auto max-w-3xl animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isEdit ? 'Edit Maintenance' : 'Schedule Maintenance'}</h1>
          <p className="text-muted-foreground mt-1">Log and schedule maintenance tasks.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Details</CardTitle>
            <CardDescription>Core details about the task and equipment.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-full space-y-2">
              <Label>Equipment <span className="text-destructive">*</span></Label>
              <select className={selectClasses} {...register('equipmentId')}>
                <option value="">— Select equipment —</option>
                {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {errors.equipmentId && <p className="text-[0.8rem] text-destructive">{errors.equipmentId.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Type <span className="text-destructive">*</span></Label>
              <select className={selectClasses} {...register('type')}>
                {['preventive','corrective','calibration','repair','inspection'].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>Status <span className="text-destructive">*</span></Label>
              <select className={selectClasses} {...register('status')}>
                {['scheduled','in_progress','completed','cancelled'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div className="col-span-full space-y-2">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input {...register('title')} className={errors.title ? 'border-destructive' : ''} />
              {errors.title && <p className="text-[0.8rem] text-destructive">{errors.title.message}</p>}
            </div>
            
            <div className="col-span-full space-y-2">
              <Label>Description <span className="text-destructive">*</span></Label>
              <Textarea rows={3} className={cn("resize-none", errors.description ? 'border-destructive' : '')} {...register('description')} />
              {errors.description && <p className="text-[0.8rem] text-destructive">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Scheduled Date <span className="text-destructive">*</span></Label>
              <Input type="date" {...register('scheduledDate')} className={errors.scheduledDate ? 'border-destructive' : ''} />
              {errors.scheduledDate && <p className="text-[0.8rem] text-destructive">{errors.scheduledDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Completed Date</Label>
              <Input type="date" {...register('completedDate')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logistics & Costs</CardTitle>
            <CardDescription>Technician information and cost breakdown.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Technician <span className="text-destructive">*</span></Label>
              <Input {...register('technician')} className={errors.technician ? 'border-destructive' : ''} />
              {errors.technician && <p className="text-[0.8rem] text-destructive">{errors.technician.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Technician Contact</Label>
              <Input {...register('technicianContact')} />
            </div>
            <div className="col-span-full space-y-2">
              <Label>Parts Replaced/Required</Label>
              <Input placeholder="Describe parts used" {...register('parts')} />
            </div>
            <div className="space-y-2">
              <Label>Downtime (hours)</Label>
              <Input type="number" min={0} step="0.5" {...register('downtimeHours')} />
            </div>
            <div className="space-y-2">
              <Label>Labor Cost (₹)</Label>
              <Input type="number" min={0} {...register('laborCost')} />
            </div>
            <div className="space-y-2">
              <Label>Parts Cost (₹)</Label>
              <Input type="number" min={0} {...register('partsCost')} />
            </div>
            <div className="col-span-full space-y-2">
              <Label>Additional Notes</Label>
              <Textarea rows={2} className="resize-none" {...register('notes')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-12">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save changes' : 'Schedule Maintenance'}
          </Button>
        </div>
      </form>
    </div>
  )
}
