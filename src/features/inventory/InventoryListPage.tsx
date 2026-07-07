import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus, AlertTriangle, Package } from 'lucide-react'
import type { InventoryItem } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_COLOR = { in_stock: 'bg-green-100 text-green-700', low_stock: 'bg-orange-100 text-orange-700', out_of_stock: 'bg-red-100 text-red-700' }

export default function InventoryListPage() {
  const { isStaff } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.INVENTORY)
      const q = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as InventoryItem)
    },
    staleTime: 10 * 60 * 1000,
  })

  const filtered = items.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || i.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-accent">Inventory</p>
          <h1 className="text-2xl font-display font-bold mt-1">Inventory</h1>
          <p className="text-muted-foreground text-sm">Materials, components, consumables and hand tools.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link to="/checkout" className="flex items-center gap-1 px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted"><Package size={15} /> Tool Checkout</Link>
          {isStaff && <Link to="/inventory/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90"><Plus size={16} /> Add Item</Link>}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory…" className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All statuses</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      {/* Low stock alert */}
      {items.filter(i => i.status !== 'in_stock').length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-800">
          <AlertTriangle size={15} />
          {items.filter(i => i.status === 'out_of_stock').length} items out of stock, {items.filter(i => i.status === 'low_stock').length} low
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">Loading inventory…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No items found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-tl-ink text-white text-xs font-mono uppercase tracking-wider sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Qty</th>
                <th className="px-4 py-3 text-left">Min</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/inventory/${item.id}`)}>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{item.category}</td>
                  <td className={cn('px-4 py-3 font-mono font-bold', item.quantity === 0 ? 'text-red-600' : item.quantity <= item.minQuantity ? 'text-orange-600' : 'text-green-700')}>{item.quantity}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.minQuantity}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.unit}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.location || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[item.status]}`}>{item.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/inventory/${item.id}`} onClick={e => e.stopPropagation()} className="text-xs text-primary hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
