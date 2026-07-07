import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory…" className="pl-9" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All statuses</option>
          {['in_stock','low_stock','out_of_stock'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? <div className="py-16 text-center text-muted-foreground">Loading…</div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item, idx) => (
                  <TableRow>
                    <TableCell>{filtered.length - idx}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.minQuantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.location || '—'}</TableCell>
                    <TableCell>{item.supplierName || '—'}</TableCell>
                    <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[item.status]}`}>{item.status.replace('_',' ')}</span></TableCell>
                    <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                    <TableCell>
                      <Link to={`/inventory/${item.id}/edit`} className="text-xs text-primary hover:underline">Edit</Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground border-t">
              {filtered.length} of {items.length} items · Latest first
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
