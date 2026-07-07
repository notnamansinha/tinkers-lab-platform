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
import type { InventoryItem } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

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
        name: existing.name, category: existing.category, description: existing.description,
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

  const inp = (hasErr: boolean) => cn('w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring', hasErr && 'border-destructive')

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-muted"><ArrowLeft size={18} /></button>
        <h1 className="text-2xl font-display font-bold">{isEdit ? 'Edit Item' : 'Add Inventory Item'}</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-lg border bg-card p-5 grid grid-cols-2 gap-4">
          <h2 className="col-span-full font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">Item Info</h2>
          <div className="space-y-1"><label className="text-sm font-medium">Name *</label><input className={inp(!!errors.name)} {...register('name')} />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
          <div className="space-y-1"><label className="text-sm font-medium">Category *</label><select className={inp(false)} {...register('category')}>{['Raw Materials','Components','Consumables','Electronics','Mechanical Parts','Hand Tools','Handheld Power Tools','Measurement Tools','Safety Equipment','Chemicals','Other'].map(c=><option key={c}>{c}</option>)}</select></div>
          <div className="space-y-1"><label className="text-sm font-medium">Quantity *</label><input type="number" min={0} className={inp(!!errors.quantity)} {...register('quantity')} />{errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}</div>
          <div className="space-y-1"><label className="text-sm font-medium">Min Quantity *</label><input type="number" min={0} className={inp(false)} {...register('minQuantity')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Unit *</label><input placeholder="pcs / kg / m / L" className={inp(!!errors.unit)} {...register('unit')} />{errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}</div>
          <div className="space-y-1"><label className="text-sm font-medium">Location</label><input placeholder="Shelf A3" className={inp(false)} {...register('location')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Barcode</label><input className={inp(false)} {...register('barcode')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Unit Cost (₹)</label><input type="number" min={0} className={inp(false)} {...register('unitCost')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Supplier</label><input className={inp(false)} {...register('supplierName')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Supplier Contact</label><input className={inp(false)} {...register('supplierContact')} /></div>
          <div className="col-span-full space-y-1"><label className="text-sm font-medium">Description</label><textarea rows={2} className={cn(inp(false), 'resize-none')} {...register('description')} /></div>
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
