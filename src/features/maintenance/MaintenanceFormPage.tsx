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
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { MaintenanceRecord, Equipment } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

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
    resolver: zodResolver(schema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: { type: 'preventive', status: 'scheduled' },
  })

  // Reset form when existing data loads
  React.useEffect(() => {
    if (existing) {
      reset({
        equipmentId: existing.equipmentId,
        type: existing.type,
        status: existing.status,
        title: existing.title,
        description: existing.description,
        scheduledDate: existing.scheduledDate,
        completedDate: existing.completedDate,
        technician: existing.technician,
        technicianContact: existing.technicianContact,
        parts: existing.parts,
        laborCost: existing.laborCost,
        partsCost: existing.partsCost,
        downtimeHours: existing.downtimeHours,
        notes: existing.notes,
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

  const inp = (hasErr: boolean) => cn('w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring', hasErr && 'border-destructive')

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-muted"><ArrowLeft size={18} /></button>
        <h1 className="text-2xl font-display font-bold">{isEdit ? 'Edit Maintenance' : 'Schedule Maintenance'}</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-lg border bg-card p-5 grid grid-cols-2 gap-4">
          <h2 className="col-span-full font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">Details</h2>
          <div className="col-span-full space-y-1.5"><label className="text-sm font-medium">Equipment *</label>
            <select className={inp(!!errors.equipmentId)} {...register('equipmentId')}>
              <option value="">— Select equipment —</option>
              {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>{errors.equipmentId && <p className="text-xs text-destructive">{errors.equipmentId.message}</p>}
          </div>
          <div className="space-y-1"><label className="text-sm font-medium">Type *</label>
            <select className={inp(false)} {...register('type')}>{['preventive','corrective','calibration','repair','inspection'].map(t=><option key={t}>{t}</option>)}</select></div>
          <div className="space-y-1"><label className="text-sm font-medium">Status *</label>
            <select className={inp(false)} {...register('status')}>{['scheduled','in_progress','completed','cancelled'].map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="col-span-full space-y-1"><label className="text-sm font-medium">Title *</label>
            <input className={inp(!!errors.title)} {...register('title')} />{errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}</div>
          <div className="col-span-full space-y-1"><label className="text-sm font-medium">Description *</label>
            <textarea rows={2} className={cn(inp(!!errors.description),'resize-none')} {...register('description')} />{errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}</div>
          <div className="space-y-1"><label className="text-sm font-medium">Scheduled Date *</label>
            <input type="date" className={inp(!!errors.scheduledDate)} {...register('scheduledDate')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Completed Date</label>
            <input type="date" className={inp(false)} {...register('completedDate')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Technician *</label>
            <input className={inp(!!errors.technician)} {...register('technician')} />{errors.technician && <p className="text-xs text-destructive">{errors.technician.message}</p>}</div>
          <div className="space-y-1"><label className="text-sm font-medium">Contact</label><input className={inp(false)} {...register('technicianContact')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Parts</label><input placeholder="Describe parts used" className={inp(false)} {...register('parts')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Downtime (hours)</label><input type="number" min={0} className={inp(false)} {...register('downtimeHours')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Labor Cost (₹)</label><input type="number" min={0} className={inp(false)} {...register('laborCost')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Parts Cost (₹)</label><input type="number" min={0} className={inp(false)} {...register('partsCost')} /></div>
          <div className="col-span-full space-y-1"><label className="text-sm font-medium">Notes</label><textarea rows={2} className={cn(inp(false),'resize-none')} {...register('notes')} /></div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">
            {isSubmitting ? <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" /> : <Save size={16} />} Save
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2.5 border rounded-md text-sm hover:bg-muted">Cancel</button>
        </div>
      </form>
    </div>
  )
}
