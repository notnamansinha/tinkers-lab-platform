import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, doc, runTransaction } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Package } from 'lucide-react'
import { toast } from 'sonner'
import { serverTimestamp } from 'firebase/firestore'
import type { InventoryItem, InventoryTransaction, TransactionType } from '@/types'

const schema = z.object({
  itemId: z.string().min(1, 'Select an item'),
  type: z.enum(['issue', 'return', 'restock', 'adjustment', 'damage']),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const qc = useQueryClient()

  const { data: items = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.INVENTORY)
      const q = query(ref, orderBy('name', 'asc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as InventoryItem)
    },
    staleTime: 5 * 60 * 1000,
  })

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: { type: 'issue', quantity: 1 },
  })

  const selectedItemId = watch('itemId')
  const transactionType = watch('type')
  const selectedItem = items.find(i => i.id === selectedItemId)

  const onSubmit = async (data: FormData) => {
    if (!user || !profile) { toast.error('Please sign in'); return }
    const item = items.find(i => i.id === data.itemId)
    if (!item) { toast.error('Item not found'); return }

    const isRemoval = ['issue', 'damage'].includes(data.type)
    const delta = isRemoval ? -data.quantity : data.quantity

    if (isRemoval && item.quantity < data.quantity) {
      toast.error(`Only ${item.quantity} ${item.unit} available`)
      return
    }

    try {
      await runTransaction(db, async (tx) => {
        const itemRef = doc(db, COLLECTIONS.INVENTORY, data.itemId)
        const snap = await tx.get(itemRef)
        const current = snap.data() as InventoryItem
        const newQty = current.quantity + delta
        const newStatus = newQty === 0 ? 'out_of_stock' : newQty <= current.minQuantity ? 'low_stock' : 'in_stock'

        // Update inventory item
        tx.update(itemRef, { quantity: newQty, status: newStatus, updatedAt: serverTimestamp() })

        // Write transaction record
        const txRef = doc(collection(db, COLLECTIONS.INVENTORY_TRANSACTIONS))
        tx.set(txRef, {
          itemId: data.itemId,
          itemName: current.name,
          type: data.type,
          quantity: delta,
          quantityBefore: current.quantity,
          quantityAfter: newQty,
          userId: user.uid,
          userName: profile.displayName,
          userEmail: user.email,
          notes: data.notes || null,
          dueDate: data.dueDate || null,
          createdAt: serverTimestamp(),
        })
      })
      toast.success(`${data.type === 'issue' ? 'Issued' : data.type === 'return' ? 'Returned' : 'Updated'}: ${data.quantity} ${item.unit} of ${item.name}`)
      qc.invalidateQueries({ queryKey: ['inventory'] })
      navigate('/inventory')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Transaction failed')
    }
  }

  const inp = (hasErr: boolean) => `w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring${hasErr ? ' border-destructive' : ''}`

  return (
    <div className="space-y-6 max-w-xl animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-muted"><ArrowLeft size={18} /></button>
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-accent">Inventory</p>
          <h1 className="text-2xl font-display font-bold">Tool Checkout / Return</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border bg-card p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Transaction Type *</label>
          <select className={inp(false)} {...register('type')}>
            <option value="issue">Issue / Checkout</option>
            <option value="return">Return</option>
            <option value="restock">Restock</option>
            <option value="adjustment">Adjustment</option>
            <option value="damage">Damage / Loss</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Item *</label>
          <select className={inp(!!errors.itemId)} {...register('itemId')}>
            <option value="">— Select item —</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit} available)</option>)}
          </select>
          {errors.itemId && <p className="text-xs text-destructive">{errors.itemId.message}</p>}
          {selectedItem && (
            <div className="bg-muted/50 rounded p-2.5 text-xs text-muted-foreground flex items-center gap-2">
              <Package size={13} />
              <span>{selectedItem.category} · {selectedItem.quantity} {selectedItem.unit} available · {selectedItem.location || 'no location'}</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Quantity *</label>
          <input type="number" min={1} className={inp(!!errors.quantity)} {...register('quantity')} />
          {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
        </div>

        {transactionType === 'issue' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Expected Return Date</label>
            <input type="date" className={inp(false)} {...register('dueDate')} />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <textarea rows={2} placeholder="Purpose, condition notes…" className={`${inp(false)} resize-none`} {...register('notes')} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">
            {isSubmitting ? <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" /> : <Package size={16} />}
            Submit
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2.5 border rounded-md text-sm hover:bg-muted">Cancel</button>
        </div>
      </form>
    </div>
  )
}
