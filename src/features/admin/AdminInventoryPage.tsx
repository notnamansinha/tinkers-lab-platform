import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { Search } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { InventoryItem } from '@/types'
import { Link } from 'react-router-dom'

const STATUS_COLOR = { in_stock: 'bg-green-100 text-green-700', low_stock: 'bg-orange-100 text-orange-700', out_of_stock: 'bg-red-100 text-red-700' }

export default function AdminInventoryPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin', 'inventory'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.INVENTORY)
      const q = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as InventoryItem)
    },
    staleTime: 5 * 60 * 1000,
  })

  const filtered = items.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || i.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-accent">Admin · Inventory</p>
          <h1 className="text-2xl font-display font-bold mt-1">Inventory Management</h1>
          <p className="text-muted-foreground text-sm">{items.length} total items · {items.filter(i=>i.status!=='in_stock').length} require attention · Latest to oldest.</p>
        </div>
        <Link to="/inventory/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90">+ Add Item</Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory…" className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All statuses</option>
          {['in_stock','low_stock','out_of_stock'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? <div className="py-16 text-center text-muted-foreground">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-tl-ink text-white text-xs font-mono uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Qty</th>
                  <th className="px-4 py-3 text-left">Min</th>
                  <th className="px-4 py-3 text-left">Unit</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Added</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((item, idx) => (
                  <tr key={item.id} className={`hover:bg-muted/30 ${item.status !== 'in_stock' ? 'bg-orange-50/30' : ''}`}>
                    <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{filtered.length - idx}</td>
                    <td className="px-4 py-2.5 font-medium">{item.name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.category}</td>
                    <td className={`px-4 py-2.5 font-mono font-bold ${item.quantity === 0 ? 'text-red-600' : item.quantity <= item.minQuantity ? 'text-orange-600' : 'text-green-700'}`}>{item.quantity}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{item.minQuantity}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.unit}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.location || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.supplierName || '—'}</td>
                    <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[item.status]}`}>{item.status.replace('_',' ')}</span></td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <Link to={`/inventory/${item.id}/edit`} className="text-xs text-primary hover:underline">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground border-t">
              {filtered.length} of {items.length} items · Latest first
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
