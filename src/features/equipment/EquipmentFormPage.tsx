import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getDocument, addDocument, updateDocument, COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Equipment, EquipmentStatus, EquipmentCategory } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

const equipmentSchema = z.object({
  machineId: z.string().min(2, 'Machine ID required (e.g. laser-cutter)'),
  name: z.string().min(2, 'Name required'),
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
        category: existing.category,
        description: existing.description,
        manufacturer: existing.manufacturer,
        modelNumber: existing.modelNumber,
        serialNumber: existing.serialNumber,
        purchaseDate: existing.purchaseDate,
        warrantyInfo: existing.warrantyInfo,
        installationDate: existing.installationDate,
        status: existing.status,
        healthStatus: existing.healthStatus,
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

  const Field = ({ name, label, children }: { name: string; label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {errors[name as keyof typeof errors] && (
        <p className="text-xs text-destructive">{errors[name as keyof typeof errors]?.message as string}</p>
      )}
    </div>
  )

  const inputClass = (hasError: boolean) => cn('w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring', hasError && 'border-destructive')

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-muted"><ArrowLeft size={18} /></button>
        <h1 className="text-2xl font-display font-bold">{isEdit ? 'Edit Equipment' : 'Add Equipment'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="col-span-full font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground">Basic Info</h2>
          <Field name="machineId" label="Machine ID *"><input placeholder="e.g. bambu-x1c" className={inputClass(!!errors.machineId)} {...register('machineId')} /></Field>
          <Field name="name" label="Name *"><input placeholder="Bambu X1 Carbon" className={inputClass(!!errors.name)} {...register('name')} /></Field>
          <Field name="category" label="Category *">
            <select className={inputClass(!!errors.category)} {...register('category')}>
              {['Digital Fabrication', 'Heavy Duty', 'Tabletop Power', 'Electronics', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field name="location" label="Location *"><input placeholder="Bay 1, Lab 2" className={inputClass(!!errors.location)} {...register('location')} /></Field>
          <Field name="description" label="Description *">
            <textarea rows={3} placeholder="Brief description of the machine and what it does…" className={cn(inputClass(!!errors.description), 'col-span-full resize-none')} {...register('description')} />
          </Field>
        </div>

        <div className="rounded-lg border bg-card p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="col-span-full font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground">Status & Config</h2>
          <Field name="status" label="Status *">
            <select className={inputClass(!!errors.status)} {...register('status')}>
              {['available','reserved','in_use','under_maintenance','out_of_service','retired'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </Field>
          <Field name="healthStatus" label="Health Status *">
            <select className={inputClass(!!errors.healthStatus)} {...register('healthStatus')}>
              {['good','fair','poor'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <div className="col-span-full flex items-center gap-3">
            <input type="checkbox" id="requiresTraining" {...register('requiresTraining')} className="w-4 h-4 accent-primary" />
            <label htmlFor="requiresTraining" className="text-sm font-medium">Requires training/certification to operate</label>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="col-span-full font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground">Purchase Details (optional)</h2>
          <Field name="manufacturer" label="Manufacturer"><input placeholder="e.g. Bambu Lab" className={inputClass(false)} {...register('manufacturer')} /></Field>
          <Field name="modelNumber" label="Model Number"><input placeholder="X1C-PRO" className={inputClass(false)} {...register('modelNumber')} /></Field>
          <Field name="serialNumber" label="Serial Number"><input placeholder="SN-12345" className={inputClass(false)} {...register('serialNumber')} /></Field>
          <Field name="purchaseDate" label="Purchase Date"><input type="date" className={inputClass(false)} {...register('purchaseDate')} /></Field>
          <Field name="installationDate" label="Installation Date"><input type="date" className={inputClass(false)} {...register('installationDate')} /></Field>
          <Field name="warrantyInfo" label="Warranty Info"><input placeholder="3 years — expires Jan 2027" className={inputClass(false)} {...register('warrantyInfo')} /></Field>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">
            {isSubmitting ? <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" /> : <Save size={16} />}
            {isEdit ? 'Save changes' : 'Add equipment'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2.5 border rounded-md text-sm hover:bg-muted">Cancel</button>
        </div>
      </form>
    </div>
  )
}
