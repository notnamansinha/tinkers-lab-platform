import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getDocument, addDocument, updateDocument, COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Workshop } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

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
    resolver: zodResolver(schema) as any,
    defaultValues: { type: 'workshop', capacity: 20, isActive: true, certificateIssued: false },
  })

  React.useEffect(() => {
    if (existing) {
      reset({
        title: existing.title, type: existing.type as any, description: existing.description,
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

  const selectClasses = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

  return (
    <div className="space-y-6 container py-6 mx-auto max-w-3xl animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isEdit ? 'Edit Workshop' : 'Create Workshop'}</h1>
          <p className="text-muted-foreground mt-1">Organize training sessions, certifications, and workshops.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Workshop Details</CardTitle>
            <CardDescription>Core details for this session.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-full space-y-2">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input {...register('title')} className={errors.title ? 'border-destructive' : ''} />
              {errors.title && <p className="text-[0.8rem] text-destructive">{errors.title.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Type <span className="text-destructive">*</span></Label>
              <select className={selectClasses} {...register('type')}>
                {['training','workshop','certification','safety_training'].map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>Capacity <span className="text-destructive">*</span></Label>
              <Input type="number" min={1} {...register('capacity')} className={errors.capacity ? 'border-destructive' : ''} />
            </div>

            <div className="col-span-full space-y-2">
              <Label>Description <span className="text-destructive">*</span></Label>
              <Textarea rows={4} className={cn("resize-none", errors.description ? 'border-destructive' : '')} {...register('description')} />
              {errors.description && <p className="text-[0.8rem] text-destructive">{errors.description.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logistics</CardTitle>
            <CardDescription>Scheduling, location, and instructor details.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input type="date" {...register('date')} className={errors.date ? 'border-destructive' : ''} />
            </div>
            <div className="space-y-2">
              <Label>Location <span className="text-destructive">*</span></Label>
              <Input {...register('location')} className={errors.location ? 'border-destructive' : ''} />
            </div>
            
            <div className="space-y-2">
              <Label>Start Time <span className="text-destructive">*</span></Label>
              <Input type="time" {...register('startTime')} className={errors.startTime ? 'border-destructive' : ''} />
            </div>
            <div className="space-y-2">
              <Label>End Time <span className="text-destructive">*</span></Label>
              <Input type="time" {...register('endTime')} className={errors.endTime ? 'border-destructive' : ''} />
            </div>
            
            <div className="space-y-2">
              <Label>Instructor <span className="text-destructive">*</span></Label>
              <Input {...register('instructor')} className={errors.instructor ? 'border-destructive' : ''} />
            </div>
            <div className="space-y-2">
              <Label>Instructor Email</Label>
              <Input type="email" {...register('instructorEmail')} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Requirements & Settings</CardTitle>
            <CardDescription>Prerequisites and session status.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Prerequisites</Label>
              <Input placeholder="e.g. Basic safety training" {...register('prerequisites')} />
            </div>
            <div className="space-y-2">
              <Label>Materials</Label>
              <Input placeholder="e.g. Laptop required" {...register('materials')} />
            </div>

            <div className="col-span-full flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isActive" {...register('isActive')} className="w-4 h-4 accent-primary" />
                <Label htmlFor="isActive">Active (open for registration)</Label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="certificateIssued" {...register('certificateIssued')} className="w-4 h-4 accent-primary" />
                <Label htmlFor="certificateIssued">Certificate issued on completion</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-12">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save changes' : 'Create Workshop'}
          </Button>
        </div>
      </form>
    </div>
  )
}
