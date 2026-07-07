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
import type { InventoryItem } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  category: z.enum(['Raw Materials','Components','Consumables','Electronics','Mechanical Parts','Hand Tools','Handheld Power Tools','Measurement Tools','Safety Equipment','Chemicals','Other']),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0),
  minQuantity: z.coerce.number().min(0),
  unit: z.string().min(1, 'Unit required'),
  location: z.string().optional(),
  barcode: z.string().optional(),
  supplierName: z.string().optional(),
  supplierContact: z.string().optional(),
  unitCost: z.coerce.number().optional(),
})
type FormData = z.infer<typeof schema>

export default function InventoryFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { isStaff } = useAuth()
  const qc = useQueryClient()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['inventory', id],
    queryFn: () => getDocument<InventoryItem>(COLLECTIONS.INVENTORY, id!),
    enabled: isEdit,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { category: 'Consumables' as const, quantity: 0, minQuantity: 0, unit: 'pcs' },
  })

  React.useEffect(() => {
    if (existing) {
      reset({
        name: existing.name, category: existing.category as any, description: existing.description,
        quantity: existing.quantity, minQuantity: existing.minQuantity, unit: existing.unit,
        location: existing.location, barcode: existing.barcode,
        supplierName: existing.supplierName, supplierContact: existing.supplierContact, unitCost: existing.unitCost,
      })
    }
  }, [existing, reset])

  const onSubmit = async (data: FormData) => {
    if (!isStaff) return
    const status = data.quantity === 0 ? 'out_of_stock' : data.quantity <= data.minQuantity ? 'low_stock' : 'in_stock'
    try {
      if (isEdit) { await updateDocument(COLLECTIONS.INVENTORY, id!, { ...data, status }); toast.success('Updated') }
      else { const nId = await addDocument<InventoryItem>(COLLECTIONS.INVENTORY, { ...data, status } as Omit<InventoryItem, 'id'|'createdAt'|'updatedAt'>); toast.success('Added'); navigate(`/inventory/${nId}`); return }
      qc.invalidateQueries({ queryKey: ['inventory'] })
      navigate(`/inventory/${id}`)
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
          <h1 className="text-3xl font-bold tracking-tight">{isEdit ? 'Edit Item' : 'Add Inventory Item'}</h1>
          <p className="text-muted-foreground mt-1">Manage components, materials, and lab stock.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Item Information</CardTitle>
            <CardDescription>Basic details about the inventory item.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input {...register('name')} className={errors.name ? 'border-destructive' : ''} />
              {errors.name && <p className="text-[0.8rem] text-destructive">{errors.name.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Category <span className="text-destructive">*</span></Label>
              <select className={selectClasses} {...register('category')}>
                {['Raw Materials','Components','Consumables','Electronics','Mechanical Parts','Hand Tools','Handheld Power Tools','Measurement Tools','Safety Equipment','Chemicals','Other'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Quantity <span className="text-destructive">*</span></Label>
              <Input type="number" min={0} {...register('quantity')} className={errors.quantity ? 'border-destructive' : ''} />
              {errors.quantity && <p className="text-[0.8rem] text-destructive">{errors.quantity.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Min Quantity <span className="text-destructive">*</span></Label>
              <Input type="number" min={0} {...register('minQuantity')} />
            </div>
            
            <div className="space-y-2">
              <Label>Unit <span className="text-destructive">*</span></Label>
              <Input placeholder="pcs, kg, m, L..." {...register('unit')} className={errors.unit ? 'border-destructive' : ''} />
              {errors.unit && <p className="text-[0.8rem] text-destructive">{errors.unit.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="Shelf A3" {...register('location')} />
            </div>

            <div className="space-y-2">
              <Label>Barcode</Label>
              <Input {...register('barcode')} />
            </div>
            
            <div className="space-y-2">
              <Label>Unit Cost (₹)</Label>
              <Input type="number" min={0} step="0.01" {...register('unitCost')} />
            </div>
            
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input {...register('supplierName')} />
            </div>

            <div className="space-y-2">
              <Label>Supplier Contact</Label>
              <Input {...register('supplierContact')} />
            </div>

            <div className="col-span-full space-y-2">
              <Label>Description</Label>
              <Textarea rows={3} className="resize-none" {...register('description')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-12">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save changes' : 'Add item'}
          </Button>
        </div>
      </form>
    </div>
  )
}
