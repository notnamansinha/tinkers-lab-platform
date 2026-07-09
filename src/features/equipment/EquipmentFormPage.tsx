import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/firebase'
import { getDocument, addDocument, updateDocument, COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Equipment } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const equipmentSchema = z.object({
  machineId: z.string().min(2, 'Machine ID required (e.g. laser-cutter)'),
  name: z.string().min(2, 'Name required'),
  tier: z.enum(['bookable', 'checkout', 'freely_available']),
  confirmed: z.boolean().default(false),
  category: z.enum(['Digital Fabrication', 'Heavy Duty', 'Tabletop Power', 'Electronics', 'Other']),
  description: z.string().min(10, 'Description required'),
  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyInfo: z.string().optional(),
  installationDate: z.string().optional(),
  status: z.enum(['available', 'reserved', 'in_use', 'under_maintenance', 'out_of_service', 'retired']),
  healthStatus: z.enum(['good', 'fair', 'poor']),
  location: z.string().min(1, 'Location required'),
  requiresTraining: z.boolean(),
})
type EquipmentFormData = z.infer<typeof equipmentSchema>

export default function EquipmentFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { isStaff } = useAuth()
  const queryClient = useQueryClient()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => getDocument<Equipment>(COLLECTIONS.EQUIPMENT, id!),
    enabled: isEdit,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      status: 'available',
      healthStatus: 'good',
      requiresTraining: true,
      category: 'Digital Fabrication',
    },
  })

  React.useEffect(() => {
    if (existing) {
      reset({
        machineId: existing.machineId,
        name: existing.name,
        category: existing.category as any,
        description: existing.description,
        manufacturer: existing.manufacturer,
        modelNumber: existing.modelNumber,
        serialNumber: existing.serialNumber,
        purchaseDate: existing.purchaseDate,
        warrantyInfo: existing.warrantyInfo,
        installationDate: existing.installationDate,
        status: existing.status as any,
        healthStatus: existing.healthStatus as any,
        location: existing.location,
        requiresTraining: existing.requiresTraining,
      })
    }
  }, [existing, reset])


  const onSubmit = async (data: EquipmentFormData) => {
    try {
      if (isEdit) {
        await updateDocument(COLLECTIONS.EQUIPMENT, id!, { ...data, imageUrls: existing?.imageUrls ?? [], manualUrls: existing?.manualUrls ?? [], safetyDocUrls: existing?.safetyDocUrls ?? [] })
        toast.success('Equipment updated')
      } else {
        const newId = await addDocument<Equipment>(COLLECTIONS.EQUIPMENT, { ...data, imageUrls: [], manualUrls: [], safetyDocUrls: [] })
        toast.success('Equipment added')
        navigate(`/equipment/${newId}`)
        return
      }
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      navigate(`/equipment/${id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  if (!isStaff) return <div className="py-16 text-center text-muted-foreground">Admin/staff access required.</div>
  if (isLoading) return <LoadingSpinner text="Loading…" />

  const selectClasses = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

  return (
    <div className="space-y-6 container py-6 mx-auto max-w-4xl animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isEdit ? 'Edit Equipment' : 'Add Equipment'}</h1>
          <p className="text-muted-foreground mt-1">Manage machine details, status, and tracking info.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core identifiers and descriptions for the machine.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Machine ID <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. bambu-x1c" {...register('machineId')} className={errors.machineId ? 'border-destructive' : ''} />
              {errors.machineId && <p className="text-[0.8rem] text-destructive">{errors.machineId.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Bambu X1 Carbon" {...register('name')} className={errors.name ? 'border-destructive' : ''} />
              {errors.name && <p className="text-[0.8rem] text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Category <span className="text-destructive">*</span></Label>
              <select className={selectClasses} {...register('category')}>
                {['Digital Fabrication', 'Heavy Duty', 'Tabletop Power', 'Electronics', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Location <span className="text-destructive">*</span></Label>
              <Input placeholder="Bay 1, Lab 2" {...register('location')} className={errors.location ? 'border-destructive' : ''} />
              {errors.location && <p className="text-[0.8rem] text-destructive">{errors.location.message}</p>}
            </div>

            <div className="col-span-full space-y-2">
              <Label>Description <span className="text-destructive">*</span></Label>
              <Textarea rows={3} placeholder="Brief description of the machine and what it does..." className={cn('resize-none', errors.description ? 'border-destructive' : '')} {...register('description')} />
              {errors.description && <p className="text-[0.8rem] text-destructive">{errors.description.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status & Configuration</CardTitle>
            <CardDescription>Current operational status and safety requirements.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Status <span className="text-destructive">*</span></Label>
              <select className={selectClasses} {...register('status')}>
                {['available','reserved','in_use','under_maintenance','out_of_service','retired'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Health Status <span className="text-destructive">*</span></Label>
              <select className={selectClasses} {...register('healthStatus')}>
                {['good','fair','poor'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="col-span-full flex items-center gap-3 border rounded-md p-4 bg-muted/20">
              <input type="checkbox" id="requiresTraining" {...register('requiresTraining')} className="w-4 h-4 accent-primary" />
              <div className="space-y-1">
                <Label htmlFor="requiresTraining">Requires Training to Operate</Label>
                <p className="text-sm text-muted-foreground">Users must complete certification before booking.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Details (Optional)</CardTitle>
            <CardDescription>Warranty and tracking information.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><Label>Manufacturer</Label><Input placeholder="e.g. Bambu Lab" {...register('manufacturer')} /></div>
            <div className="space-y-2"><Label>Model Number</Label><Input placeholder="X1C-PRO" {...register('modelNumber')} /></div>
            <div className="space-y-2"><Label>Serial Number</Label><Input placeholder="SN-12345" {...register('serialNumber')} /></div>
            <div className="space-y-2"><Label>Purchase Date</Label><Input type="date" {...register('purchaseDate')} /></div>
            <div className="space-y-2"><Label>Installation Date</Label><Input type="date" {...register('installationDate')} /></div>
            <div className="space-y-2"><Label>Warranty Info</Label><Input placeholder="3 years - expires Jan 2027" {...register('warrantyInfo')} /></div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-12">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save changes' : 'Add equipment'}
          </Button>
        </div>
      </form>
    </div>
  )
}
