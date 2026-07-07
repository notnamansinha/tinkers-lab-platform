import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getDocument, addDocument, updateDocument, COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Workshop } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

const schema = z.object({
  title: z.string().min(3), type: z.enum(['training','workshop','certification','safety_training']),
  description: z.string().min(5), instructor: z.string().min(2), instructorEmail: z.string().email().optional().or(z.literal('')),
  date: z.string().min(1), startTime: z.string().min(1), endTime: z.string().min(1),
  capacity: z.coerce.number().min(1), location: z.string().min(1),
  prerequisites: z.string().optional(), materials: z.string().optional(), isActive: z.boolean(), certificateIssued: z.boolean(),
})
type FormData = z.infer<typeof schema>

export default function WorkshopFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { isStaff } = useAuth()
  const qc = useQueryClient()
  const { data: existing, isLoading } = useQuery({ queryKey: ['workshops', id], queryFn: () => getDocument<Workshop>(COLLECTIONS.WORKSHOPS, id!), enabled: isEdit })
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: { type: 'workshop', capacity: 20, isActive: true, certificateIssued: false },
  })
  React.useEffect(() => {
    if (existing) {
      reset({
        title: existing.title, type: existing.type, description: existing.description,
        instructor: existing.instructor, instructorEmail: existing.instructorEmail,
        date: existing.date, startTime: existing.startTime, endTime: existing.endTime,
        capacity: existing.capacity, location: existing.location,
        prerequisites: existing.prerequisites, materials: existing.materials,
        isActive: existing.isActive, certificateIssued: existing.certificateIssued,
      })
    }
  }, [existing, reset])
  const onSubmit = async (data: FormData) => {
    if (!isStaff) return
    try {
      if (isEdit) { await updateDocument(COLLECTIONS.WORKSHOPS, id!, { ...data, materialUrls: existing?.materialUrls ?? [] }); toast.success('Updated') }
      else { const nId = await addDocument<Workshop>(COLLECTIONS.WORKSHOPS, { ...data, registeredCount: 0, materialUrls: [] } as Omit<Workshop,'id'|'createdAt'|'updatedAt'>); toast.success('Created'); navigate(`/workshops/${nId}`); return }
      qc.invalidateQueries({ queryKey: ['workshops'] }); navigate(`/workshops/${id}`)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }
  if (!isStaff) return <div className="py-16 text-center text-muted-foreground">Staff access required.</div>
  if (isLoading) return <LoadingSpinner text="Loading…" />
  const inp = (e: boolean) => cn('w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring', e && 'border-destructive')
  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-muted"><ArrowLeft size={18} /></button>
        <h1 className="text-2xl font-display font-bold">{isEdit ? 'Edit Workshop' : 'Add Workshop'}</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-lg border bg-card p-5 grid grid-cols-2 gap-4">
          <div className="col-span-full space-y-1"><label className="text-sm font-medium">Title *</label><input className={inp(!!errors.title)} {...register('title')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Type *</label><select className={inp(false)} {...register('type')}>{['training','workshop','certification','safety_training'].map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}</select></div>
          <div className="space-y-1"><label className="text-sm font-medium">Capacity *</label><input type="number" min={1} className={inp(!!errors.capacity)} {...register('capacity')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Date *</label><input type="date" className={inp(!!errors.date)} {...register('date')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Start Time *</label><input type="time" className={inp(false)} {...register('startTime')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">End Time *</label><input type="time" className={inp(false)} {...register('endTime')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Location *</label><input className={inp(!!errors.location)} {...register('location')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Instructor *</label><input className={inp(!!errors.instructor)} {...register('instructor')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Instructor Email</label><input type="email" className={inp(false)} {...register('instructorEmail')} /></div>
          <div className="col-span-full space-y-1"><label className="text-sm font-medium">Description *</label><textarea rows={2} className={cn(inp(!!errors.description),'resize-none')} {...register('description')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Prerequisites</label><input className={inp(false)} {...register('prerequisites')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Materials</label><input className={inp(false)} {...register('materials')} /></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="isActive" {...register('isActive')} className="w-4 h-4 accent-primary" /><label htmlFor="isActive" className="text-sm font-medium">Active (open for registration)</label></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="certificateIssued" {...register('certificateIssued')} className="w-4 h-4 accent-primary" /><label htmlFor="certificateIssued" className="text-sm font-medium">Certificate issued on completion</label></div>
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
