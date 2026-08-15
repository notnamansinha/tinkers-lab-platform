import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { typedZodResolver } from '@/lib/form'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { doc, getDoc, setDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Save, Loader2, Images } from 'lucide-react'
import { toast } from 'sonner'
import { cn, cleanFirestoreData } from '@/lib/utils'
import type { Equipment } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { ImageUploader } from '@/components/common/ImageUploader'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/common/FormField'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const equipmentSchema = z.object({
  machineId:         z.string().min(2, 'Machine ID required (e.g. laser-cutter)'),
  name:              z.string().min(2, 'Name required'),
  tier:              z.enum(['bookable', 'checkout', 'freely_available']),
  confirmed:         z.boolean().default(false),
  category:          z.enum(['Digital Fabrication', 'Heavy Duty', 'Tabletop Power', 'Electronics', 'Other']),
  description:       z.string().min(10, 'Description required (min 10 chars)'),
  manufacturer:      z.string().optional(),
  modelNumber:       z.string().optional(),
  serialNumber:      z.string().optional(),
  purchaseDate:      z.string().optional(),
  warrantyInfo:      z.string().optional(),
  installationDate:  z.string().optional(),
  status:            z.enum(['available', 'reserved', 'in_use', 'under_maintenance', 'out_of_service', 'retired']),
  healthStatus:      z.enum(['good', 'fair', 'poor']),
  location:          z.string().min(1, 'Location required'),
  requiresTraining:  z.boolean(),
})
type EquipmentFormData = z.infer<typeof equipmentSchema>

export default function EquipmentFormPage() {
  const { id }     = useParams<{ id: string }>()
  const isEdit     = !!id
  const navigate   = useNavigate()
  const { isStaff } = useAuth()
  const queryClient = useQueryClient()

  // Track uploaded image URLs separately (not part of the zod schema)
  const [imageUrls, setImageUrls] = useState<string[]>([])

  const { data: existing, isLoading } = useQuery({
    queryKey: ['equipment', id],
    queryFn: async () => {
      const snap = await getDoc(doc(db, COLLECTIONS.EQUIPMENT, id!))
      if (!snap.exists()) return null
      return { ...snap.data(), id: snap.id } as Equipment
    },
    enabled: isEdit,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EquipmentFormData>({
    resolver: typedZodResolver(equipmentSchema),
    defaultValues: {
      tier:             'bookable',
      status:           'available',
      healthStatus:     'good',
      requiresTraining: true,
      category:         'Digital Fabrication',
      confirmed:        false,
    },
  })

  React.useEffect(() => {
    if (existing) {
      reset({
        machineId:        existing.machineId,
        name:             existing.name,
        tier:             existing.tier,
        confirmed:        existing.confirmed,
        category:         existing.category as EquipmentFormData['category'],
        description:      existing.description,
        manufacturer:     existing.manufacturer,
        modelNumber:      existing.modelNumber,
        serialNumber:     existing.serialNumber,
        purchaseDate:     existing.purchaseDate,
        warrantyInfo:     existing.warrantyInfo,
        installationDate: existing.installationDate,
        status:           existing.status as EquipmentFormData['status'],
        healthStatus:     existing.healthStatus as EquipmentFormData['healthStatus'],
        location:         existing.location,
        requiresTraining: existing.requiresTraining,
      })
      // Sync image URLs from Firestore into local state
      setImageUrls(existing.imageUrls ?? [])
    }
  }, [existing, reset])

  // ── Save mutation ──────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data: EquipmentFormData) => {
      const payload = cleanFirestoreData({
        ...data,
        imageUrls,
        manualUrls:    existing?.manualUrls    ?? [],
        safetyDocUrls: existing?.safetyDocUrls ?? [],
        updatedAt:     serverTimestamp(),
      })

      if (isEdit) {
        await updateDoc(doc(db, COLLECTIONS.EQUIPMENT, id!), payload)
        return id!
      } else {
        // Use machineId as deterministic document ID (idempotent like seed)
        const newDocRef = doc(collection(db, COLLECTIONS.EQUIPMENT), data.machineId)
        await setDoc(newDocRef, { ...payload, createdAt: serverTimestamp() })
        return newDocRef.id
      }
    },
    onSuccess: (docId) => {
      toast.success(isEdit ? 'Equipment updated' : 'Equipment added')
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      navigate(`/equipment/${docId}`)
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    },
  })

  const onSubmit = (data: EquipmentFormData) => saveMutation.mutate(data)

  const onInvalid = (formErrors: Record<string, { message?: string }>) => {
    const messages = Object.values(formErrors).map(e => e?.message).filter(Boolean)
    toast.error(`Please fix form errors: ${messages[0] ?? 'Check required fields'}`)
  }

  if (!isStaff) return (
    <div className="py-16 text-center text-muted-foreground">Admin/staff access required.</div>
  )
  if (isLoading) return <LoadingSpinner text="Loading…" />

  // The equipmentId used for Storage paths:
  // - edit mode: the existing Firestore doc ID
  // - create mode: the machineId the user types (used as the doc ID too)
  const storageEquipmentId = isEdit ? id! : (existing?.machineId ?? 'new-equipment')

  const selectClasses =
    'flex h-10 w-full rounded-md border border-hairline bg-near-black px-3 py-2 text-sm text-white ' +
    'placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lime ' +
    'disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="mx-auto max-w-4xl space-y-5 py-4 animate-fade-in sm:space-y-6 sm:py-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isEdit ? 'Edit Equipment' : 'Add Equipment'}</h1>
          <p className="text-muted-foreground mt-1">Manage machine details, images, and status.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid as any)} className="space-y-6">

        {/* ── Basic Information ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core identifiers and descriptions for the machine.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Machine ID" required error={errors.machineId?.message}>
              <Input
                placeholder="e.g. bambu-x1c"
                {...register('machineId')}
                className={errors.machineId ? 'border-destructive' : ''}
                disabled={isEdit}  // machineId is the doc ID — immutable after creation
              />
              {isEdit && (
                <p className="text-[11px] text-muted-foreground">Machine ID cannot be changed after creation.</p>
              )}
            </FormField>

            <FormField label="Name" required error={errors.name?.message}>
              <Input
                placeholder="Bambu X1 Carbon"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
            </FormField>

            <FormField label="Category" required>
              <select className={selectClasses} {...register('category')}>
                {['Digital Fabrication', 'Heavy Duty', 'Tabletop Power', 'Electronics', 'Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Location" required error={errors.location?.message}>
              <Input
                placeholder="Digital Fabrication Zone"
                {...register('location')}
                className={errors.location ? 'border-destructive' : ''}
              />
            </FormField>

            <FormField label="Description" required error={errors.description?.message} className="col-span-full">
              <Textarea
                rows={3}
                placeholder="Brief description of the machine and what it does…"
                className={cn('resize-none', errors.description ? 'border-destructive' : '')}
                {...register('description')}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* ── Equipment Images ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Images className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Equipment Images</CardTitle>
                <CardDescription>
                  Upload up to 5 photos. The first image is shown as the primary listing photo.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ImageUploader
              equipmentId={storageEquipmentId}
              existingUrls={imageUrls}
              onChange={setImageUrls}
            />
          </CardContent>
        </Card>

        {/* ── Status & Configuration ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Status &amp; Configuration</CardTitle>
            <CardDescription>Current operational status and safety requirements.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Tier" required error={errors.tier?.message}>
              <select className={selectClasses} {...register('tier')}>
                {(['bookable', 'checkout', 'freely_available'] as const).map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Status" required>
              <select className={selectClasses} {...register('status')}>
                {['available', 'reserved', 'in_use', 'under_maintenance', 'out_of_service', 'retired'].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Health Status" required>
              <select className={selectClasses} {...register('healthStatus')}>
                {['good', 'fair', 'poor'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FormField>

            <div /> {/* spacer */}

            {/* Requires Training checkbox */}
            <div className="col-span-full flex items-center gap-3 border rounded-md p-4 bg-muted/20">
              <input
                type="checkbox"
                id="requiresTraining"
                {...register('requiresTraining')}
                className="w-4 h-4 accent-primary"
              />
              <div className="space-y-1">
                <Label htmlFor="requiresTraining">Requires Training to Operate</Label>
                <p className="text-sm text-muted-foreground">Users must complete certification before booking.</p>
              </div>
            </div>

            {/* Confirmed checkbox */}
            <div className="col-span-full flex items-center gap-3 border rounded-md p-4 bg-muted/20">
              <input
                type="checkbox"
                id="confirmed"
                {...register('confirmed')}
                className="w-4 h-4 accent-primary"
              />
              <div className="space-y-1">
                <Label htmlFor="confirmed">Physically Confirmed in Lab</Label>
                <p className="text-sm text-muted-foreground">
                  Check when this machine is physically present. Only confirmed Tier 1 machines appear in the booking calendar.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Purchase Details ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Details <span className="text-muted-foreground font-normal text-sm">(Optional)</span></CardTitle>
            <CardDescription>Warranty and asset-tracking information.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Manufacturer"><Input placeholder="e.g. Bambu Lab"      {...register('manufacturer')}     /></FormField>
            <FormField label="Model Number"><Input placeholder="X1C-PRO"             {...register('modelNumber')}      /></FormField>
            <FormField label="Serial Number"><Input placeholder="SN-12345"           {...register('serialNumber')}     /></FormField>
            <FormField label="Purchase Date"><Input type="date"                       {...register('purchaseDate')}     /></FormField>
            <FormField label="Installation Date"><Input type="date"                   {...register('installationDate')} /></FormField>
            <FormField label="Warranty Info"><Input placeholder="3 years – Jan 2027" {...register('warrantyInfo')}     /></FormField>
          </CardContent>
        </Card>

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col-reverse gap-3 pb-6 sm:flex-row sm:justify-end sm:gap-4 sm:pb-8">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || saveMutation.isPending}
            className="w-full gap-2 sm:w-auto"
          >
            {(isSubmitting || saveMutation.isPending)
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Save className="h-4 w-4" />
            }
            {isEdit ? 'Save Changes' : 'Add Equipment'}
          </Button>
        </div>
      </form>
    </div>
  )
}
