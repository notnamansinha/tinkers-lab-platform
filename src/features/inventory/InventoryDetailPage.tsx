import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getDocument, getDocumentsWhere, updateDocument, COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Edit, TrendingDown, TrendingUp } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { InventoryItem, InventoryTransaction } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isStaff } = useAuth()

  const { data: item, isLoading } = useQuery({
    queryKey: ['inventory', id],
    queryFn: () => getDocument<InventoryItem>(COLLECTIONS.INVENTORY, id!),
    enabled: !!id,
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['inventoryTransactions', id],
    queryFn: () => getDocumentsWhere<InventoryTransaction>(COLLECTIONS.INVENTORY_TRANSACTIONS, 'itemId', '==', id!, 20),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <LoadingSpinner text="Loading…" />
  if (!item) return <div className="py-16 text-center text-muted-foreground">Item not found. <Link to="/inventory" className="text-primary hover:underline">← Back</Link></div>

  const statusColor = { in_stock: 'bg-green-100 text-green-700', low_stock: 'bg-orange-100 text-orange-700', out_of_stock: 'bg-red-100 text-red-700' }[item.status]

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-muted"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <p className="text-xs font-mono text-muted-foreground">{item.category}</p>
          <h1 className="text-2xl font-display font-bold">{item.name}</h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>{item.status.replace('_', ' ')}</span>
        {isStaff && <Link to={`/inventory/${id}/edit`} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-md hover:bg-muted"><Edit size={14} /> Edit</Link>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">Stock</h2>
          </div>
          <div className="text-5xl font-display font-bold mb-1">{item.quantity}</div>
          <p className="text-muted-foreground text-sm">{item.unit} in stock</p>
          <p className="text-xs text-muted-foreground mt-2">Minimum threshold: {item.minQuantity} {item.unit}</p>
          {isStaff && (
            <div className="mt-4 flex gap-2">
              <Link to={`/inventory/${id}/checkout`} className="px-3 py-1.5 text-xs border rounded hover:bg-muted">Issue Stock</Link>
              <Link to={`/inventory/${id}/restock`} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">Restock</Link>
            </div>
          )}
        </div>
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">Details</h2>
          {[['Location', item.location || '—'], ['Unit', item.unit], ['Supplier', item.supplierName || '—'], ['Contact', item.supplierContact || '—'], ['Unit Cost', item.unitCost ? `₹${item.unitCost}` : '—']].map(([k, v]) => (
            <div key={k} className="flex gap-2"><span className="text-xs text-muted-foreground w-24 shrink-0">{k}</span><span className="text-sm">{String(v)}</span></div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b"><h2 className="font-display font-semibold">Transaction History</h2></div>
        {transactions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No transactions yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-tl-ink text-white text-xs font-mono uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Qty</th>
                <th className="px-4 py-3 text-left">Before → After</th>
                <th className="px-4 py-3 text-left">By</th>
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit',
                      t.type === 'issue' || t.type === 'damage' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    )}>
                      {t.quantity < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                      {t.type}
                    </span>
                  </td>
                  <td className={cn('px-4 py-3 font-mono font-bold', t.quantity < 0 ? 'text-red-600' : 'text-green-600')}>{t.quantity > 0 ? '+' : ''}{t.quantity}</td>
                  <td className="px-4 py-3 font-mono text-xs">{t.quantityBefore} → {t.quantityAfter}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{t.userName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
